import { useEffect, useRef, type RefObject } from "react";
import { useFrame, type ThreeEvent } from "@react-three/fiber";
import { Stars, TransformControls } from "@react-three/drei";
import { CuboidCollider, CylinderCollider, RigidBody, useRapier } from "@react-three/rapier";
import * as THREE from "three";
import { JOINT_ORDER, MAX_REACH, grabRadius } from "@/lib/arm";
import { PLANETS } from "@/lib/planets";
import { actualJoints, bodies, keys, tip } from "@/lib/shared";
import { selectGravity, selectPlanet, useSim } from "@/store";

/* ------------------------------------------------------------------ */
/*  Environment: sky, lights, floor, walls                             */
/* ------------------------------------------------------------------ */
export function Environment() {
  const planet = useSim(selectPlanet);

  const onFloorClick = (e: ThreeEvent<MouseEvent>) => {
    if (e.delta > 4) return;
    const s = useSim.getState();
    if (s.mode === "ik") {
      s.setIkTarget([e.point.x, s.ikTarget[1], e.point.z]);
    } else {
      s.selectObject(null);
    }
  };

  return (
    <>
      <color attach="background" args={[planet.sky]} />
      <fog attach="fog" args={[planet.sky, 12, 45]} />
      {planet.stars && <Stars radius={70} depth={50} count={3000} factor={4} fade speed={0.4} />}

      <hemisphereLight args={[planet.sky, planet.ground, 0.55]} />
      <ambientLight intensity={0.25} />
      <directionalLight
        position={[5, 9, 4]}
        intensity={1.7}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.5}
        shadow-camera-far={30}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
        shadow-bias={-0.0004}
      />
      <directionalLight position={[-5, 4, -4]} intensity={0.45} />

      {/* floor visuals */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow onClick={onFloorClick}>
        <planeGeometry args={[60, 60]} />
        <meshStandardMaterial color={planet.ground} roughness={0.95} metalness={0} />
      </mesh>
      <gridHelper
        key={`grid-${planet.id}`}
        args={[40, 80, planet.accent, planet.grid]}
        position={[0, 0.01, 0]}
        material-transparent
        material-opacity={0.35}
        material-depthWrite={false}
      />
      {/* work pad + reach ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, 0]} receiveShadow>
        <circleGeometry args={[MAX_REACH + 0.15, 96]} />
        <meshStandardMaterial color="#0f172a" transparent opacity={0.35} roughness={1} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
        <ringGeometry args={[MAX_REACH - 0.012, MAX_REACH + 0.012, 128]} />
        <meshBasicMaterial color={planet.accent} transparent opacity={0.55} />
      </mesh>

      {/* static physics: floor, walls, ceiling, arm base */}
      <RigidBody type="fixed" colliders={false}>
        <CuboidCollider args={[30, 0.5, 30]} position={[0, -0.5, 0]} friction={1} />
        <CuboidCollider args={[0.25, 4, 5]} position={[5, 4, 0]} />
        <CuboidCollider args={[0.25, 4, 5]} position={[-5, 4, 0]} />
        <CuboidCollider args={[5, 4, 0.25]} position={[0, 4, 5]} />
        <CuboidCollider args={[5, 4, 0.25]} position={[0, 4, -5]} />
        <CuboidCollider args={[5, 0.25, 5]} position={[0, 8, 0]} />
        <CylinderCollider args={[0.2, 0.4]} position={[0, 0.2, 0]} friction={0.8} />
      </RigidBody>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  Ready flag + demo objects once the physics engine has loaded        */
/* ------------------------------------------------------------------ */
let seeded = false;
export function ReadyFlag() {
  useEffect(() => {
    const s = useSim.getState();
    s.setReady();
    if (!seeded) {
      seeded = true;
      s.addObject("cube", { atGripper: false, size: 0.15 });
      s.addObject("sphere", { atGripper: false, size: 0.15 });
      s.addObject("cylinder", { atGripper: false, size: 0.15 });
    }
  }, []);
  return null;
}

/* ------------------------------------------------------------------ */
/*  Gravity: wake every body when the planet changes                   */
/* ------------------------------------------------------------------ */
export function GravityManager() {
  const { world } = useRapier();
  const g = useSim(selectGravity);
  useEffect(() => {
    world.forEachRigidBody((b) => b.wakeUp());
  }, [g, world]);
  return null;
}

/* ------------------------------------------------------------------ */
/*  Telemetry: publish end-effector pose + nearest object at 10 Hz      */
/* ------------------------------------------------------------------ */
export function TelemetryPublisher() {
  const acc = useRef(0);
  useFrame((_, dt) => {
    acc.current += dt;
    if (acc.current < 0.1) return;
    acc.current = 0;
    const s = useSim.getState();
    let bestId: string | null = null;
    let bestDist = Infinity;
    let inRange = false;
    for (const obj of s.objects) {
      if (obj.id === s.heldId) continue;
      const rb = bodies.get(obj.id);
      if (!rb) continue;
      const t = rb.translation();
      const d = Math.hypot(t.x - tip.pos.x, t.y - tip.pos.y, t.z - tip.pos.z);
      if (d < bestDist) {
        bestDist = d;
        bestId = obj.id;
        inRange = d <= grabRadius(obj.size);
      }
    }
    const prev = s.nearest;
    const ee = s.eePos;
    const changed =
      prev.id !== bestId ||
      prev.inRange !== inRange ||
      Math.abs(prev.dist - bestDist) > 0.005 ||
      Math.abs(ee[0] - tip.pos.x) > 0.002 ||
      Math.abs(ee[1] - tip.pos.y) > 0.002 ||
      Math.abs(ee[2] - tip.pos.z) > 0.002;
    if (changed) {
      s.publishTelemetry([tip.pos.x, tip.pos.y, tip.pos.z], {
        id: bestId,
        dist: bestDist,
        inRange,
      });
    }
  });
  return null;
}

/* ------------------------------------------------------------------ */
/*  Keyboard controller                                                */
/* ------------------------------------------------------------------ */
const PLANET_KEYS = ["Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Digit7", "Digit8", "Digit9", "Digit0"];

const isTyping = (e: KeyboardEvent) => {
  const el = e.target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "INPUT") return (el as HTMLInputElement).type !== "range";
  return tag === "TEXTAREA" || tag === "SELECT" || el.isContentEditable;
};

export function KeyboardController() {
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (isTyping(e)) return;
      const s = useSim.getState();
      keys.add(e.code);
      if (
        e.code === "Space" ||
        e.code.startsWith("Arrow") ||
        e.code === "PageUp" ||
        e.code === "PageDown"
      ) {
        e.preventDefault();
      }
      if (e.repeat) return;
      switch (e.code) {
        case "Space":
          s.toggleGrab();
          break;
        case "KeyH":
          s.goHome();
          break;
        case "KeyN":
          s.addObject((["cube", "sphere", "cylinder"] as const)[Math.floor(Math.random() * 3)], {
            atGripper: false,
          });
          break;
        case "KeyB":
          s.addObject("cube", { atGripper: true });
          break;
        case "KeyM":
          s.setMode(s.mode === "ik" ? "joint" : "ik");
          break;
        case "KeyP":
          s.togglePause();
          break;
        case "Delete":
        case "Backspace":
          if (s.selectedId) s.removeObject(s.selectedId);
          break;
        case "Slash":
          if (e.shiftKey) s.setShowHelp(!s.showHelp);
          break;
        default: {
          const idx = PLANET_KEYS.indexOf(e.code);
          if (idx >= 0 && PLANETS[idx]) s.setPlanet(PLANETS[idx].id);
        }
      }
    };
    const up = (e: KeyboardEvent) => keys.delete(e.code);
    const clear = () => keys.clear();
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", clear);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", clear);
    };
  }, []);

  useFrame((_, rawDt) => {
    if (keys.size === 0) return;
    const dt = Math.min(rawDt, 0.05);
    const s = useSim.getState();
    const has = (c: string) => keys.has(c);
    const axis = (neg: string, pos: string) => (has(pos) ? 1 : 0) - (has(neg) ? 1 : 0);

    // shared: wrist roll & gripper
    const rollAxis = axis("KeyZ", "KeyX");
    if (rollAxis) s.nudgeJoint("wristRoll", rollAxis * 2.5 * dt);
    const gripAxis = axis("BracketLeft", "BracketRight");
    if (gripAxis) s.setGripper(s.joints.gripper + gripAxis * 1.5 * dt);

    if (s.mode === "joint") {
      const rate = 1.6 * dt;
      const b = axis("KeyE", "KeyQ") + axis("ArrowRight", "ArrowLeft");
      const sh = axis("KeyS", "KeyW") + axis("ArrowDown", "ArrowUp");
      const el = axis("KeyA", "KeyD");
      const wp = axis("KeyF", "KeyR") + axis("PageDown", "PageUp");
      if (b) s.nudgeJoint("base", b * rate);
      if (sh) s.nudgeJoint("shoulder", sh * rate);
      if (el) s.nudgeJoint("elbow", el * rate);
      if (wp) s.nudgeJoint("wristPitch", wp * rate);
    } else {
      const th = axis("KeyE", "KeyQ") + axis("ArrowRight", "ArrowLeft");
      const r = axis("KeyS", "KeyW") + axis("ArrowDown", "ArrowUp");
      const y = axis("KeyF", "KeyR") + axis("PageDown", "PageUp");
      if (th || r || y) s.nudgeIk(th * 1.2 * dt, r * 0.7 * dt, y * 0.7 * dt);
      const tp = axis("KeyG", "KeyT");
      if (tp) s.setToolPitch(s.toolPitch + tp * 1.2 * dt);
    }
  });
  return null;
}

/* ------------------------------------------------------------------ */
/*  Waypoint sequencer                                                 */
/* ------------------------------------------------------------------ */
export function Sequencer() {
  const timer = useRef(0);
  const stage = useRef<"move" | "dwell">("move");
  const lastIndex = useRef(-1);

  useFrame((_, dt) => {
    const s = useSim.getState();
    if (!s.playing) {
      stage.current = "move";
      timer.current = 0;
      lastIndex.current = -1;
      return;
    }
    if (lastIndex.current !== s.playIndex) {
      lastIndex.current = s.playIndex;
      stage.current = "move";
      timer.current = 0;
    }
    const wp = s.waypoints[s.playIndex];
    if (!wp) {
      s.stopPlayback();
      return;
    }
    timer.current += dt;
    if (stage.current === "move") {
      let err = 0;
      for (const k of JOINT_ORDER) {
        if (k === "gripper") continue;
        err = Math.max(err, Math.abs(actualJoints[k] - wp.joints[k]));
      }
      if (err < 0.02 || timer.current > 5) {
        if (wp.action === "grab") {
          if (!s.heldId && !s.tryGrab()) s.setJoints({ gripper: 0 });
        } else if (s.heldId) {
          s.release();
        } else {
          s.setJoints({ gripper: 1 });
        }
        stage.current = "dwell";
        timer.current = 0;
      }
    } else if (timer.current > 0.6) {
      s.advancePlayback();
    }
  });
  return null;
}

/* ------------------------------------------------------------------ */
/*  IK target gizmo (draggable)                                        */
/* ------------------------------------------------------------------ */
export function IkTargetGizmo() {
  const mode = useSim((s) => s.mode);
  const target = useSim((s) => s.ikTarget);
  const reachable = useSim((s) => s.ikReachable);
  const group = useRef<THREE.Group>(null);

  useEffect(() => {
    if (group.current) group.current.position.set(target[0], target[1], target[2]);
  }, [target]);

  if (mode !== "ik") return null;

  const color = reachable ? "#4ade80" : "#f87171";

  return (
    <>
      <group ref={group} position={target}>
        <mesh>
          <sphereGeometry args={[0.035, 16, 12]} />
          <meshBasicMaterial color={color} />
        </mesh>
        <mesh>
          <sphereGeometry args={[0.11, 16, 12]} />
          <meshBasicMaterial color={color} transparent opacity={0.15} depthWrite={false} />
        </mesh>
      </group>
      <TransformControls
        object={group as unknown as RefObject<THREE.Object3D>}
        mode="translate"
        size={0.55}
        onObjectChange={() => {
          const g = group.current;
          if (!g) return;
          useSim.getState().setIkTarget([g.position.x, g.position.y, g.position.z]);
        }}
      />
    </>
  );
}
