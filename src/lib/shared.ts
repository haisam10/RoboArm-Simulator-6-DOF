import * as THREE from "three";
import type { RapierRigidBody } from "@react-three/rapier";
import { HOME, type Joints } from "./arm";

/**
 * Mutable, non-reactive data shared between the 3D scene (per-frame) and the
 * zustand store (event driven). Keeping this outside React avoids re-renders
 * at 60 fps.
 */
export const tip = {
  /** world position of the gripper hold point */
  pos: new THREE.Vector3(),
  /** world orientation of the gripper */
  quat: new THREE.Quaternion(),
  /** estimated world velocity of the hold point */
  vel: new THREE.Vector3(),
  prevPos: new THREE.Vector3(),
  ready: false,
};

/** the arm's *actual* (smoothed) joint values, as rendered */
export const actualJoints: Joints = { ...HOME };

/** physics bodies of every spawned object, by object id */
export const bodies = new Map<string, RapierRigidBody>();

/** keyboard state */
export const keys = new Set<string>();
