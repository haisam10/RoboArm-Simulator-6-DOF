import { create } from "zustand";
import {
  HOME,
  JOINT_LIMITS,
  TOOL_PITCH_MAX,
  TOOL_PITCH_MIN,
  armClearsFloor,
  clamp,
  clampJoint,
  forwardKinematics,
  grabRadius,
  gripValueFor,
  solveIK,
  type JointName,
  type Joints,
  type Vec3,
} from "./lib/arm";
import { PLANETS, getPlanet } from "./lib/planets";
import { bodies, tip } from "./lib/shared";

export type ObjectKind = "cube" | "sphere" | "cylinder";
export type ControlMode = "joint" | "ik";

export interface SimObject {
  id: string;
  index: number;
  name: string;
  kind: ObjectKind;
  size: number;
  color: string;
  mass: number;
  spawn: Vec3;
}

export interface Waypoint {
  id: string;
  joints: Joints;
  /** what the gripper should do once the pose is reached */
  action: "grab" | "release";
}

export interface LogEntry {
  id: number;
  time: string;
  text: string;
  tone: "info" | "ok" | "warn";
}

export interface SimState {
  joints: Joints;
  mode: ControlMode;
  ikTarget: Vec3;
  toolPitch: number;
  ikReachable: boolean;
  servoSpeed: number;

  planetId: string;
  customG: number;

  objects: SimObject[];
  heldId: string | null;
  selectedId: string | null;
  nearest: { id: string | null; dist: number; inRange: boolean };
  eePos: Vec3;
  objectSize: number;
  spawnInGripper: boolean;

  paused: boolean;
  panelOpen: boolean;
  showHelp: boolean;
  showHint: boolean;
  ready: boolean;

  waypoints: Waypoint[];
  playing: boolean;
  playIndex: number;
  loop: boolean;

  stats: { grabs: number; releases: number; spawned: number };
  log: LogEntry[];

  // actions
  setJoint: (key: JointName, value: number) => void;
  nudgeJoint: (key: JointName, delta: number) => void;
  setJoints: (joints: Partial<Joints>) => void;
  goHome: () => void;
  setMode: (mode: ControlMode) => void;
  setIkTarget: (target: Vec3) => void;
  nudgeIk: (dTheta: number, dR: number, dY: number) => void;
  setToolPitch: (p: number) => void;
  setServoSpeed: (v: number) => void;

  setGripper: (v: number) => void;
  tryGrab: () => boolean;
  release: () => void;
  toggleGrab: () => void;

  setPlanet: (id: string) => void;
  setCustomG: (g: number) => void;

  addObject: (kind: ObjectKind, opts?: { atGripper?: boolean; size?: number }) => void;
  removeObject: (id: string) => void;
  clearObjects: () => void;
  selectObject: (id: string | null) => void;
  setObjectSize: (s: number) => void;
  setSpawnInGripper: (v: boolean) => void;
  publishTelemetry: (eePos: Vec3, nearest: { id: string | null; dist: number; inRange: boolean }) => void;

  togglePause: () => void;
  setPanelOpen: (v: boolean) => void;
  setShowHelp: (v: boolean) => void;
  setShowHint: (v: boolean) => void;
  setReady: () => void;

  addWaypoint: () => void;
  removeWaypoint: (id: string) => void;
  clearWaypoints: () => void;
  playWaypoints: () => void;
  stopPlayback: () => void;
  advancePlayback: () => void;
  setLoop: (v: boolean) => void;

  resetScene: () => void;
  pushLog: (text: string, tone?: LogEntry["tone"]) => void;
}

const PALETTE = [
  "#ef4444",
  "#f59e0b",
  "#22c55e",
  "#3b82f6",
  "#a855f7",
  "#ec4899",
  "#14b8a6",
  "#eab308",
  "#f97316",
  "#06b6d4",
];

const KIND_LABEL: Record<ObjectKind, string> = {
  cube: "Cube",
  sphere: "Sphere",
  cylinder: "Cylinder",
};

let objSeq = 1;
let wpSeq = 1;
let logSeq = 1;

const now = () =>
  new Date().toLocaleTimeString([], {
    hour12: false,
    minute: "2-digit",
    second: "2-digit",
  });

const randomSpawn = (): Vec3 => {
  // rejection-sample a spot that is not on top of an existing object
  let best: Vec3 = [0.9, 1.0, 0];
  let bestClearance = -1;
  for (let i = 0; i < 12; i++) {
    const angle = (Math.random() - 0.5) * (Math.PI * 0.9);
    const r = 0.6 + Math.random() * 0.65;
    const candidate: Vec3 = [
      Math.cos(angle) * r,
      0.9 + Math.random() * 0.5,
      -Math.sin(angle) * r,
    ];
    let clearance = Infinity;
    bodies.forEach((rb) => {
      const t = rb.translation();
      clearance = Math.min(clearance, Math.hypot(t.x - candidate[0], t.z - candidate[2]));
    });
    if (clearance > bestClearance) {
      bestClearance = clearance;
      best = candidate;
    }
    if (clearance > 0.35) break;
  }
  return best;
};

const massFor = (kind: ObjectKind, size: number) => {
  const vol =
    kind === "cube"
      ? size ** 3
      : kind === "sphere"
        ? (4 / 3) * Math.PI * (size / 2) ** 3
        : Math.PI * (size * 0.4) ** 2 * size;
  // density ≈ 700 kg/m³ (dense wood)
  return Math.max(0.1, Math.round(vol * 700 * 100) / 100);
};

export const selectPlanet = (s: SimState) => getPlanet(s.planetId);
export const selectGravity = (s: SimState) =>
  s.planetId === "custom" ? s.customG : getPlanet(s.planetId).g;

export const useSim = create<SimState>()((set, get) => {
  const solve = (target: Vec3, toolPitch: number, joints: Joints) => {
    const res = solveIK(target, toolPitch, joints);
    return {
      ikTarget: res.target,
      ikReachable: res.reachable,
      joints: { ...joints, ...res.joints },
    };
  };

  return {
    joints: { ...HOME },
    mode: "joint",
    ikTarget: forwardKinematics(HOME).tip,
    toolPitch: Math.PI,
    ikReachable: true,
    servoSpeed: 1,

    planetId: "earth",
    customG: 9.81,

    objects: [],
    heldId: null,
    selectedId: null,
    nearest: { id: null, dist: Infinity, inRange: false },
    eePos: forwardKinematics(HOME).tip,
    objectSize: 0.15,
    spawnInGripper: false,

    paused: false,
    panelOpen: typeof window === "undefined" ? true : window.innerWidth >= 1024,
    showHelp: false,
    showHint: true,
    ready: false,

    waypoints: [],
    playing: false,
    playIndex: 0,
    loop: false,

    stats: { grabs: 0, releases: 0, spawned: 0 },
    log: [
      {
        id: logSeq++,
        time: now(),
        text: "Simulator ready. Add an object and grab it!",
        tone: "info",
      },
    ],

    pushLog: (text, tone = "info") =>
      set((s) => ({
        log: [{ id: logSeq++, time: now(), text, tone }, ...s.log].slice(0, 10),
      })),

    setJoint: (key, value) => {
      const s = get();
      if (key === "gripper") {
        s.setGripper(value);
        return;
      }
      const joints = { ...s.joints, [key]: clampJoint(key, value) };
      // keep the arm above the floor (only joints that move the tip can violate it)
      if (key !== "wristRoll" && !armClearsFloor(joints) && armClearsFloor(s.joints)) return;
      const patch: Partial<SimState> = { joints };
      if (s.mode === "ik" && key !== "wristRoll") {
        // keep the IK target in sync with manual edits
        const fk = forwardKinematics(joints);
        patch.ikTarget = fk.tip;
        patch.toolPitch = clamp(fk.toolPitch, TOOL_PITCH_MIN, TOOL_PITCH_MAX);
        patch.ikReachable = true;
      }
      set(patch);
    },

    nudgeJoint: (key, delta) => get().setJoint(key, get().joints[key] + delta),

    setJoints: (partial) =>
      set((s) => {
        const joints = { ...s.joints };
        (Object.keys(partial) as JointName[]).forEach((k) => {
          const v = partial[k];
          if (v !== undefined) joints[k] = clampJoint(k, v);
        });
        return { joints };
      }),

    goHome: () => {
      const s = get();
      const joints: Joints = {
        ...HOME,
        gripper: s.heldId ? s.joints.gripper : 1,
      };
      const fk = forwardKinematics(joints);
      set({
        joints,
        ikTarget: fk.tip,
        toolPitch: Math.PI,
        ikReachable: true,
        playing: false,
      });
    },

    setMode: (mode) => {
      const s = get();
      if (mode === "ik") {
        const fk = forwardKinematics(s.joints);
        const toolPitch = clamp(fk.toolPitch, TOOL_PITCH_MIN, TOOL_PITCH_MAX);
        set({ mode, ...solve(fk.tip, toolPitch, s.joints), toolPitch });
      } else {
        set({ mode });
      }
    },

    setIkTarget: (target) => {
      const s = get();
      set(solve(target, s.toolPitch, s.joints));
    },

    nudgeIk: (dTheta, dR, dY) => {
      const s = get();
      const [x, y, z] = s.ikTarget;
      let theta = Math.atan2(-z, x) + dTheta;
      const r = Math.max(0.05, Math.hypot(x, z) + dR);
      const next: Vec3 = [Math.cos(theta) * r, y + dY, -Math.sin(theta) * r];
      set(solve(next, s.toolPitch, s.joints));
    },

    setToolPitch: (p) => {
      const s = get();
      const toolPitch = clamp(p, TOOL_PITCH_MIN, TOOL_PITCH_MAX);
      set({ toolPitch, ...solve(s.ikTarget, toolPitch, s.joints) });
    },

    setServoSpeed: (v) => set({ servoSpeed: clamp(v, 0.2, 3) }),

    setGripper: (v) => {
      const s = get();
      const value = clamp(v, 0, 1);
      set({ joints: { ...s.joints, gripper: value } });
      if (!s.heldId && value < 0.3) {
        get().tryGrab();
      } else if (s.heldId) {
        const held = s.objects.find((o) => o.id === s.heldId);
        const threshold = held ? gripValueFor(held.size) + 0.12 : 0.6;
        if (value > threshold) {
          get().release();
          set((st) => ({ joints: { ...st.joints, gripper: value } }));
        }
      }
    },

    tryGrab: () => {
      const s = get();
      if (s.heldId || !tip.ready) return false;
      let best: { obj: SimObject; dist: number } | null = null;
      for (const obj of s.objects) {
        const rb = bodies.get(obj.id);
        if (!rb) continue;
        const t = rb.translation();
        const d = Math.hypot(t.x - tip.pos.x, t.y - tip.pos.y, t.z - tip.pos.z);
        if (d <= grabRadius(obj.size) && (!best || d < best.dist)) {
          best = { obj, dist: d };
        }
      }
      if (!best) {
        get().pushLog("Gripper closed on nothing — move closer to an object.", "warn");
        return false;
      }
      set((st) => ({
        heldId: best!.obj.id,
        selectedId: best!.obj.id,
        joints: { ...st.joints, gripper: gripValueFor(best!.obj.size) },
        stats: { ...st.stats, grabs: st.stats.grabs + 1 },
      }));
      get().pushLog(`Grabbed ${best.obj.name} (${best.obj.mass} kg)`, "ok");
      return true;
    },

    release: () => {
      const s = get();
      if (!s.heldId) {
        set({ joints: { ...s.joints, gripper: 1 } });
        return;
      }
      const obj = s.objects.find((o) => o.id === s.heldId);
      const rb = s.heldId ? bodies.get(s.heldId) : undefined;
      const h = rb ? rb.translation().y : 0;
      const g = selectGravity(s);
      set((st) => ({
        heldId: null,
        joints: { ...st.joints, gripper: 1 },
        stats: { ...st.stats, releases: st.stats.releases + 1 },
      }));
      if (obj) {
        const planet = getPlanet(s.planetId);
        const fallTime = g > 0 ? Math.sqrt((2 * Math.max(0, h - obj.size / 2)) / g) : Infinity;
        get().pushLog(
          g > 0
            ? `Released ${obj.name} at ${h.toFixed(2)} m — ${planet.name} gravity ${g} m/s², lands in ~${fallTime.toFixed(2)} s`
            : `Released ${obj.name} at ${h.toFixed(2)} m — zero gravity, it floats!`,
          "info",
        );
      }
    },

    toggleGrab: () => {
      const s = get();
      if (s.heldId) {
        s.release();
        return;
      }
      const grabbed = s.tryGrab();
      if (!grabbed) {
        // nothing in reach: just toggle the gripper open/closed
        const open = s.joints.gripper > 0.5;
        set((st) => ({ joints: { ...st.joints, gripper: open ? 0 : 1 } }));
      }
    },

    setPlanet: (id) => {
      const planet = getPlanet(id);
      set({ planetId: planet.id });
      const g = planet.id === "custom" ? get().customG : planet.g;
      get().pushLog(`Gravity → ${planet.emoji} ${planet.name}: ${g} m/s²`, "info");
    },

    setCustomG: (g) => set({ customG: Math.round(clamp(g, 0, 60) * 100) / 100 }),

    addObject: (kind, opts) => {
      const s = get();
      const size = opts?.size ?? s.objectSize;
      const atGripper = opts?.atGripper ?? s.spawnInGripper;
      const index = objSeq++;
      const id = `obj-${index}`;
      const spawn: Vec3 =
        atGripper && tip.ready
          ? [tip.pos.x, tip.pos.y, tip.pos.z]
          : randomSpawn();
      const obj: SimObject = {
        id,
        index,
        name: `${KIND_LABEL[kind]} #${index}`,
        kind,
        size,
        color: PALETTE[index % PALETTE.length],
        mass: massFor(kind, size),
        spawn,
      };
      set((st) => ({
        objects: [...st.objects, obj],
        selectedId: id,
        heldId: atGripper ? id : st.heldId,
        joints: atGripper ? { ...st.joints, gripper: gripValueFor(size) } : st.joints,
        stats: { ...st.stats, spawned: st.stats.spawned + 1 },
      }));
      get().pushLog(
        atGripper
          ? `Spawned ${obj.name} inside the gripper`
          : `Spawned ${obj.name} at ${spawn[1].toFixed(1)} m height`,
        "ok",
      );
    },

    removeObject: (id) =>
      set((s) => ({
        objects: s.objects.filter((o) => o.id !== id),
        heldId: s.heldId === id ? null : s.heldId,
        selectedId: s.selectedId === id ? null : s.selectedId,
        joints: s.heldId === id ? { ...s.joints, gripper: 1 } : s.joints,
      })),

    clearObjects: () =>
      set((s) => ({
        objects: [],
        heldId: null,
        selectedId: null,
        nearest: { id: null, dist: Infinity, inRange: false },
        joints: { ...s.joints, gripper: 1 },
      })),

    selectObject: (id) => set({ selectedId: id }),
    setObjectSize: (objectSize) => set({ objectSize }),
    setSpawnInGripper: (spawnInGripper) => set({ spawnInGripper }),

    publishTelemetry: (eePos, nearest) => set({ eePos, nearest }),

    togglePause: () => set((s) => ({ paused: !s.paused })),
    setPanelOpen: (panelOpen) => set({ panelOpen }),
    setShowHelp: (showHelp) => set({ showHelp }),
    setShowHint: (showHint) => set({ showHint }),
    setReady: () => set({ ready: true }),

    addWaypoint: () => {
      const s = get();
      const action: Waypoint["action"] =
        s.heldId || s.joints.gripper < 0.5 ? "grab" : "release";
      const wp: Waypoint = { id: `wp-${wpSeq++}`, joints: { ...s.joints }, action };
      set({ waypoints: [...s.waypoints, wp] });
      get().pushLog(
        `Waypoint ${s.waypoints.length + 1} recorded (${action === "grab" ? "✊ grab" : "✋ release"})`,
        "info",
      );
    },
    removeWaypoint: (id) =>
      set((s) => ({ waypoints: s.waypoints.filter((w) => w.id !== id) })),
    clearWaypoints: () => set({ waypoints: [], playing: false, playIndex: 0 }),

    playWaypoints: () => {
      const s = get();
      if (!s.waypoints.length) return;
      const first = s.waypoints[0];
      set({
        playing: true,
        playIndex: 0,
        mode: "joint",
        joints: { ...first.joints, gripper: s.joints.gripper },
      });
      get().pushLog("Playing sequence…", "info");
    },
    stopPlayback: () => set({ playing: false }),
    advancePlayback: () => {
      const s = get();
      let next = s.playIndex + 1;
      if (next >= s.waypoints.length) {
        if (s.loop) next = 0;
        else {
          set({ playing: false });
          get().pushLog("Sequence finished", "ok");
          return;
        }
      }
      const wp = s.waypoints[next];
      set({
        playIndex: next,
        joints: { ...wp.joints, gripper: s.joints.gripper },
      });
    },
    setLoop: (loop) => set({ loop }),

    resetScene: () => {
      const fk = forwardKinematics(HOME);
      set({
        objects: [],
        heldId: null,
        selectedId: null,
        joints: { ...HOME },
        ikTarget: fk.tip,
        toolPitch: Math.PI,
        ikReachable: true,
        playing: false,
        playIndex: 0,
        nearest: { id: null, dist: Infinity, inRange: false },
      });
      get().pushLog("Scene reset", "info");
    },
  };
});

export { PLANETS, JOINT_LIMITS };

// handy for debugging / automation in the browser console
declare global {
  interface Window {
    __sim?: typeof useSim;
  }
}
if (typeof window !== "undefined") window.__sim = useSim;
