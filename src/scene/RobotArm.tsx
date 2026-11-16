import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import {
  ARM,
  JOINT_ORDER,
  JOINT_SPEED,
  approach,
  fingerHalfGap,
} from "@/lib/arm";
import { actualJoints, tip } from "@/lib/shared";
import { useSim } from "@/store";

const ORANGE = "#f97316";
const DARK = "#1e293b";
const STEEL = "#94a3b8";
const CYAN = "#22d3ee";

const COLOR_IDLE = new THREE.Color("#22d3ee");
const COLOR_READY = new THREE.Color("#4ade80");
const COLOR_HOLD = new THREE.Color("#fbbf24");

export function RobotArm() {
  const root = useRef<THREE.Group>(null);
  const turret = useRef<THREE.Group>(null);
  const shoulder = useRef<THREE.Group>(null);
  const elbow = useRef<THREE.Group>(null);
  const wrist = useRef<THREE.Group>(null);
  const roll = useRef<THREE.Group>(null);
  const fingerL = useRef<THREE.Mesh>(null);
  const fingerR = useRef<THREE.Mesh>(null);
  const holdPoint = useRef<THREE.Group>(null);
  const ringMat = useRef<THREE.MeshBasicMaterial>(null);
  const laser = useRef<THREE.Mesh>(null);
  const floorRing = useRef<THREE.Mesh>(null);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const s = useSim.getState();
    const target = s.joints;

    for (const key of JOINT_ORDER) {
      actualJoints[key] = approach(
        actualJoints[key],
        target[key],
        JOINT_SPEED[key] * s.servoSpeed,
        dt,
      );
    }

    if (
      !turret.current ||
      !shoulder.current ||
      !elbow.current ||
      !wrist.current ||
      !roll.current ||
      !fingerL.current ||
      !fingerR.current ||
      !holdPoint.current ||
      !root.current
    )
      return;

    turret.current.rotation.y = actualJoints.base;
    shoulder.current.rotation.z = -actualJoints.shoulder;
    elbow.current.rotation.z = -actualJoints.elbow;
    wrist.current.rotation.z = -actualJoints.wristPitch;
    roll.current.rotation.y = actualJoints.wristRoll;
    const gap = fingerHalfGap(actualJoints.gripper);
    fingerL.current.position.x = -gap;
    fingerR.current.position.x = gap;

    root.current.updateMatrixWorld(true);
    holdPoint.current.getWorldPosition(tip.pos);
    holdPoint.current.getWorldQuaternion(tip.quat);
    if (tip.ready && dt > 0) {
      const vx = (tip.pos.x - tip.prevPos.x) / dt;
      const vy = (tip.pos.y - tip.prevPos.y) / dt;
      const vz = (tip.pos.z - tip.prevPos.z) / dt;
      tip.vel.x += (vx - tip.vel.x) * 0.5;
      tip.vel.y += (vy - tip.vel.y) * 0.5;
      tip.vel.z += (vz - tip.vel.z) * 0.5;
    }
    tip.prevPos.copy(tip.pos);
    tip.ready = true;

    // feedback colours
    if (ringMat.current) {
      const c = s.heldId ? COLOR_HOLD : s.nearest.inRange ? COLOR_READY : COLOR_IDLE;
      ringMat.current.color.lerp(c, 0.25);
    }
    if (laser.current && floorRing.current) {
      const y = Math.max(0.001, tip.pos.y);
      laser.current.position.set(tip.pos.x, y / 2, tip.pos.z);
      laser.current.scale.y = y;
      floorRing.current.position.set(tip.pos.x, 0.004, tip.pos.z);
      const m = floorRing.current.material as THREE.MeshBasicMaterial;
      const lm = laser.current.material as THREE.MeshBasicMaterial;
      m.color.copy(ringMat.current ? ringMat.current.color : COLOR_IDLE);
      lm.color.copy(m.color);
    }
  }, -1);

  return (
    <group ref={root}>
      {/* ---------- base ---------- */}
      <mesh position={[0, ARM.baseHeight / 2, 0]} castShadow receiveShadow>
        <cylinderGeometry args={[0.36, 0.42, ARM.baseHeight, 48]} />
        <meshStandardMaterial color="#1f2533" metalness={0.7} roughness={0.35} />
      </mesh>
      <mesh position={[0, ARM.baseHeight + 0.002, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.29, 0.33, 64]} />
        <meshBasicMaterial color={CYAN} transparent opacity={0.85} />
      </mesh>
      {/* bolts */}
      {[0, 1, 2, 3, 4, 5].map((i) => {
        const a = (i / 6) * Math.PI * 2;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * 0.38, ARM.baseHeight + 0.01, Math.sin(a) * 0.38]}
          >
            <cylinderGeometry args={[0.018, 0.018, 0.02, 12]} />
            <meshStandardMaterial color={STEEL} metalness={0.9} roughness={0.3} />
          </mesh>
        );
      })}

      {/* ---------- turret (J1) ---------- */}
      <group ref={turret} position={[0, ARM.baseHeight, 0]}>
        <mesh position={[0, ARM.turretHeight / 2, 0]} castShadow receiveShadow>
          <cylinderGeometry args={[0.23, 0.27, ARM.turretHeight, 48]} />
          <meshStandardMaterial color={ORANGE} metalness={0.3} roughness={0.45} />
        </mesh>
        {/* direction marker */}
        <mesh position={[0.2, ARM.turretHeight * 0.6, 0]}>
          <boxGeometry args={[0.12, 0.05, 0.05]} />
          <meshStandardMaterial color={DARK} />
        </mesh>

        {/* ---------- shoulder (J2) ---------- */}
        <group ref={shoulder} position={[0, ARM.turretHeight, 0]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
            <cylinderGeometry args={[0.14, 0.14, 0.3, 32]} />
            <meshStandardMaterial color={DARK} metalness={0.6} roughness={0.4} />
          </mesh>
          <RoundedBox
            args={[0.17, ARM.L1, 0.13]}
            radius={0.03}
            smoothness={4}
            position={[0, ARM.L1 / 2, 0]}
            castShadow
          >
            <meshStandardMaterial color={ORANGE} metalness={0.3} roughness={0.45} />
          </RoundedBox>
          {/* hydraulic detail */}
          <mesh position={[0.1, ARM.L1 * 0.45, 0]}>
            <cylinderGeometry args={[0.025, 0.025, ARM.L1 * 0.6, 16]} />
            <meshStandardMaterial color={STEEL} metalness={0.9} roughness={0.25} />
          </mesh>

          {/* ---------- elbow (J3) ---------- */}
          <group ref={elbow} position={[0, ARM.L1, 0]}>
            <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
              <cylinderGeometry args={[0.11, 0.11, 0.26, 32]} />
              <meshStandardMaterial color={DARK} metalness={0.6} roughness={0.4} />
            </mesh>
            <RoundedBox
              args={[0.13, ARM.L2, 0.1]}
              radius={0.025}
              smoothness={4}
              position={[0, ARM.L2 / 2, 0]}
              castShadow
            >
              <meshStandardMaterial color={ORANGE} metalness={0.3} roughness={0.45} />
            </RoundedBox>
            {/* little sensor */}
            <mesh position={[0, ARM.L2 * 0.7, 0.07]}>
              <boxGeometry args={[0.06, 0.06, 0.03]} />
              <meshStandardMaterial color={DARK} />
            </mesh>
            <mesh position={[0, ARM.L2 * 0.7, 0.088]}>
              <circleGeometry args={[0.015, 16]} />
              <meshBasicMaterial color="#4ade80" />
            </mesh>

            {/* ---------- wrist pitch (J4) ---------- */}
            <group ref={wrist} position={[0, ARM.L2, 0]}>
              <mesh rotation={[Math.PI / 2, 0, 0]} castShadow>
                <cylinderGeometry args={[0.08, 0.08, 0.2, 32]} />
                <meshStandardMaterial color={DARK} metalness={0.6} roughness={0.4} />
              </mesh>

              {/* ---------- wrist roll (J5) + gripper (J6) ---------- */}
              <group ref={roll}>
                <mesh position={[0, 0.045, 0]} castShadow>
                  <cylinderGeometry args={[0.055, 0.07, 0.07, 32]} />
                  <meshStandardMaterial color={STEEL} metalness={0.8} roughness={0.3} />
                </mesh>
                {/* palm */}
                <mesh position={[0, 0.095, 0]} castShadow>
                  <boxGeometry args={[0.28, 0.04, 0.09]} />
                  <meshStandardMaterial color={DARK} metalness={0.6} roughness={0.4} />
                </mesh>
                {/* fingers */}
                <mesh ref={fingerL} position={[-0.12, 0.18, 0]} castShadow>
                  <boxGeometry args={[ARM.fingerThickness, 0.14, 0.07]} />
                  <meshStandardMaterial color={STEEL} metalness={0.7} roughness={0.35} />
                </mesh>
                <mesh ref={fingerR} position={[0.12, 0.18, 0]} castShadow>
                  <boxGeometry args={[ARM.fingerThickness, 0.14, 0.07]} />
                  <meshStandardMaterial color={STEEL} metalness={0.7} roughness={0.35} />
                </mesh>
                {/* hold point + grab zone indicator */}
                <group ref={holdPoint} position={[0, ARM.L3, 0]}>
                  <mesh rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[0.085, 0.005, 8, 40]} />
                    <meshBasicMaterial ref={ringMat} color={CYAN} transparent opacity={0.9} />
                  </mesh>
                </group>
              </group>
            </group>
          </group>
        </group>
      </group>

      {/* ---------- world-space helpers: laser + floor marker ---------- */}
      <mesh ref={laser}>
        <cylinderGeometry args={[0.003, 0.003, 1, 6]} />
        <meshBasicMaterial color={CYAN} transparent opacity={0.35} depthWrite={false} />
      </mesh>
      <mesh ref={floorRing} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.05, 0.075, 40]} />
        <meshBasicMaterial color={CYAN} transparent opacity={0.85} side={THREE.DoubleSide} depthWrite={false} />
      </mesh>
    </group>
  );
}
