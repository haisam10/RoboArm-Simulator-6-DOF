/**
 * Robot arm geometry + kinematics (all lengths in metres, angles in radians).
 *
 * Convention:
 *  - `base` rotates the turret about the world Y axis. With base = 0 the arm
 *    extends along +X.
 *  - `shoulder`, `elbow`, `wristPitch` are measured from "straight up" in the
 *    arm's vertical plane; positive leans forward (towards the reach direction).
 *  - `wristRoll` spins the gripper about its own axis.
 *  - `gripper` is 0 (closed) … 1 (fully open).
 */

export const ARM = {
  baseHeight: 0.12,
  turretHeight: 0.28,
  /** world height of the shoulder pivot */
  shoulderY: 0.4,
  /** upper arm length */
  L1: 0.75,
  /** forearm length */
  L2: 0.65,
  /** wrist pivot → hold point (between the finger tips) */
  L3: 0.2,
  /** finger half–gap when closed / extra travel when open */
  fingerMinHalfGap: 0.015,
  fingerTravel: 0.105,
  fingerThickness: 0.025,
} as const;

export const MAX_REACH = ARM.L1 + ARM.L2 + ARM.L3;

export type JointName =
  | "base"
  | "shoulder"
  | "elbow"
  | "wristPitch"
  | "wristRoll"
  | "gripper";

export interface Joints {
  base: number;
  shoulder: number;
  elbow: number;
  wristPitch: number;
  wristRoll: number;
  gripper: number;
}

export const JOINT_ORDER: JointName[] = [
  "base",
  "shoulder",
  "elbow",
  "wristPitch",
  "wristRoll",
  "gripper",
];

export const JOINT_LIMITS: Record<JointName, [number, number]> = {
  base: [-Math.PI, Math.PI],
  shoulder: [-0.6, 2.1],
  elbow: [-0.35, 2.8],
  wristPitch: [-2.1, 2.1],
  wristRoll: [-Math.PI, Math.PI],
  gripper: [0, 1],
};

/** max joint speed (rad/s or units/s) used by the servo smoothing */
export const JOINT_SPEED: Record<JointName, number> = {
  base: 2.2,
  shoulder: 1.8,
  elbow: 2.2,
  wristPitch: 3,
  wristRoll: 4,
  gripper: 3,
};

export const JOINT_META: { key: JointName; label: string; short: string }[] = [
  { key: "base", label: "Base Yaw", short: "J1" },
  { key: "shoulder", label: "Shoulder", short: "J2" },
  { key: "elbow", label: "Elbow", short: "J3" },
  { key: "wristPitch", label: "Wrist Pitch", short: "J4" },
  { key: "wristRoll", label: "Wrist Roll", short: "J5" },
  { key: "gripper", label: "Gripper", short: "J6" },
];

export const HOME: Joints = {
  base: 0,
  shoulder: 0.52,
  elbow: 1.57,
  wristPitch: 1.05,
  wristRoll: 0,
  gripper: 1,
};

/** tool pitch limits (angle of gripper from vertical-up; π = pointing down) */
export const TOOL_PITCH_MIN = Math.PI / 2; // horizontal
export const TOOL_PITCH_MAX = Math.PI + 0.35;

export const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const deg = (rad: number) => (rad * 180) / Math.PI;
export const rad = (d: number) => (d * Math.PI) / 180;
export const wrapPi = (a: number) => {
  let x = a;
  while (x > Math.PI) x -= Math.PI * 2;
  while (x < -Math.PI) x += Math.PI * 2;
  return x;
};

export const clampJoint = (key: JointName, v: number) =>
  clamp(v, JOINT_LIMITS[key][0], JOINT_LIMITS[key][1]);

/** Servo-style motion: exponential approach with a speed cap. */
export function approach(
  current: number,
  target: number,
  maxSpeed: number,
  dt: number,
): number {
  const delta = target - current;
  if (Math.abs(delta) < 1e-5) return target;
  const maxStep = maxSpeed * dt;
  const step = clamp(delta * Math.min(1, dt * 9), -maxStep, maxStep);
  return current + step;
}

export type Vec3 = [number, number, number];

export interface FKResult {
  elbow: Vec3;
  wrist: Vec3;
  tip: Vec3;
  toolPitch: number;
}

export function forwardKinematics(j: Joints): FKResult {
  const a1 = j.shoulder;
  const a2 = a1 + j.elbow;
  const a3 = a2 + j.wristPitch;
  const r1 = ARM.L1 * Math.sin(a1);
  const h1 = ARM.shoulderY + ARM.L1 * Math.cos(a1);
  const r2 = r1 + ARM.L2 * Math.sin(a2);
  const h2 = h1 + ARM.L2 * Math.cos(a2);
  const r3 = r2 + ARM.L3 * Math.sin(a3);
  const h3 = h2 + ARM.L3 * Math.cos(a3);
  const c = Math.cos(j.base);
  const s = Math.sin(j.base);
  const w = (r: number, h: number): Vec3 => [r * c, h, -r * s];
  return { elbow: w(r1, h1), wrist: w(r2, h2), tip: w(r3, h3), toolPitch: a3 };
}

/** true when no part of the arm would be pushed through the floor */
export function armClearsFloor(j: Joints): boolean {
  const fk = forwardKinematics(j);
  return fk.tip[1] >= 0.035 && fk.wrist[1] >= 0.09 && fk.elbow[1] >= 0.12;
}

export interface IKResult {
  joints: Pick<Joints, "base" | "shoulder" | "elbow" | "wristPitch">;
  /** the (possibly clamped) target that was actually solved for */
  target: Vec3;
  reachable: boolean;
}

/** Clamp a desired tool position into the arm's workspace. */
export function clampTarget(t: Vec3): Vec3 {
  let [x, y, z] = t;
  y = clamp(y, 0.04, 2.2);
  let r = Math.hypot(x, z);
  const minR = 0.15;
  const maxR = MAX_REACH - 0.02;
  if (r < 1e-4) {
    x = minR;
    z = 0;
    r = minR;
  }
  const rc = clamp(r, minR, maxR);
  if (rc !== r) {
    x = (x / r) * rc;
    z = (z / r) * rc;
  }
  return [x, y, z];
}

/**
 * Analytic IK: base yaw from atan2, then a planar 2-link solve for the wrist
 * position with the tool held at `toolPitch` (π = straight down).
 */
export function solveIK(
  desired: Vec3,
  toolPitch: number,
  current: Joints,
): IKResult {
  const target = clampTarget(desired);
  const [x, y, z] = target;

  // base yaw – pick the equivalent angle nearest the current one
  let base = Math.atan2(-z, x);
  base = current.base + wrapPi(base - current.base);
  base = clampJoint("base", base);

  const r = Math.hypot(x, z);
  const h = y - ARM.shoulderY;

  // wrist position in the (r,h) plane
  let wr = r - ARM.L3 * Math.sin(toolPitch);
  let wh = h - ARM.L3 * Math.cos(toolPitch);

  let d = Math.hypot(wr, wh);
  const maxD = ARM.L1 + ARM.L2 - 1e-3;
  const minD = Math.abs(ARM.L1 - ARM.L2) + 1e-3;
  let reachable = d <= maxD && d >= minD;
  const dc = clamp(d, minD, maxD);
  if (d > 1e-6 && dc !== d) {
    wr = (wr / d) * dc;
    wh = (wh / d) * dc;
    d = dc;
  }

  const cosE = (d * d - ARM.L1 * ARM.L1 - ARM.L2 * ARM.L2) / (2 * ARM.L1 * ARM.L2);
  const elbowRaw = Math.acos(clamp(cosE, -1, 1));
  const shoulderRaw =
    Math.atan2(wr, wh) -
    Math.atan2(ARM.L2 * Math.sin(elbowRaw), ARM.L1 + ARM.L2 * Math.cos(elbowRaw));
  const wristRaw = toolPitch - shoulderRaw - elbowRaw;

  const shoulder = clampJoint("shoulder", shoulderRaw);
  const elbow = clampJoint("elbow", elbowRaw);
  const wristPitch = clampJoint("wristPitch", wristRaw);
  if (
    Math.abs(shoulder - shoulderRaw) > 1e-3 ||
    Math.abs(elbow - elbowRaw) > 1e-3 ||
    Math.abs(wristPitch - wristRaw) > 1e-3
  ) {
    reachable = false;
  }

  return { joints: { base, shoulder, elbow, wristPitch }, target, reachable };
}

/** gripper value such that the fingers just touch an object of `size` width */
export function gripValueFor(size: number) {
  const halfGapCenter = size / 2 + ARM.fingerThickness / 2;
  return clamp((halfGapCenter - ARM.fingerMinHalfGap) / ARM.fingerTravel, 0, 1);
}

/** half distance between the finger centres for a gripper value */
export function fingerHalfGap(g: number) {
  return ARM.fingerMinHalfGap + clamp(g, 0, 1) * ARM.fingerTravel;
}

/** how close (m) the hold point must be to an object's centre to grab it */
export function grabRadius(size: number) {
  return 0.2 + size * 0.6;
}
