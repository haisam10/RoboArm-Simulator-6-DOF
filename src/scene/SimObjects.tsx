import { useEffect, useRef } from "react";
import * as THREE from "three";
import {
  BallCollider,
  CuboidCollider,
  CylinderCollider,
  RigidBody,
  useBeforePhysicsStep,
  useRapier,
  type RapierRigidBody,
} from "@react-three/rapier";
import type { ThreeEvent } from "@react-three/fiber";
import { bodies, tip } from "@/lib/shared";
import { useSim, type SimObject as SimObjectData } from "@/store";

export function SimObjects() {
  const objects = useSim((s) => s.objects);
  return (
    <>
      {objects.map((o) => (
        <SimObject key={o.id} obj={o} />
      ))}
    </>
  );
}

const _target = new THREE.Vector3();
const _quat = new THREE.Quaternion();

function SimObject({ obj }: { obj: SimObjectData }) {
  const body = useRef<RapierRigidBody>(null);
  const held = useSim((s) => s.heldId === obj.id);
  const selected = useSim((s) => s.selectedId === obj.id);
  const { rapier } = useRapier();

  const hold = useRef({
    active: false,
    offset: new THREE.Vector3(),
    relQuat: new THREE.Quaternion(),
  });

  // register body for grab queries
  useEffect(() => {
    const rb = body.current;
    if (rb) bodies.set(obj.id, rb);
    return () => {
      bodies.delete(obj.id);
    };
  }, [obj.id]);

  // attach / detach from the gripper
  useEffect(() => {
    const rb = body.current;
    if (!rb) return;
    const h = hold.current;
    if (held) {
      const t = rb.translation();
      const r = rb.rotation();
      h.offset.set(t.x - tip.pos.x, t.y - tip.pos.y, t.z - tip.pos.z);
      // if the object is far (e.g. spawned at the gripper) snap it in
      if (h.offset.length() > 0.5) h.offset.set(0, 0, 0);
      _quat.set(r.x, r.y, r.z, r.w);
      h.relQuat.copy(tip.quat).invert().multiply(_quat);
      h.active = true;
      rb.setBodyType(rapier.RigidBodyType.KinematicPositionBased, true);
      rb.setLinvel({ x: 0, y: 0, z: 0 }, true);
      rb.setAngvel({ x: 0, y: 0, z: 0 }, true);
    } else if (h.active) {
      h.active = false;
      rb.setBodyType(rapier.RigidBodyType.Dynamic, true);
      rb.setLinvel({ x: tip.vel.x, y: tip.vel.y, z: tip.vel.z }, true);
      rb.setAngvel({ x: 0, y: 0, z: 0 }, true);
      rb.wakeUp();
    }
  }, [held, rapier]);

  // follow the gripper while held
  useBeforePhysicsStep(() => {
    const rb = body.current;
    const h = hold.current;
    if (!rb || !h.active) return;
    // pull the object into the centre of the gripper over a few frames
    h.offset.multiplyScalar(0.82);
    _target.copy(tip.pos).add(h.offset);
    rb.setNextKinematicTranslation({ x: _target.x, y: _target.y, z: _target.z });
    _quat.copy(tip.quat).multiply(h.relQuat);
    rb.setNextKinematicRotation({ x: _quat.x, y: _quat.y, z: _quat.z, w: _quat.w });
  });

  const onClick = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    if (e.delta > 4) return;
    useSim.getState().selectObject(selected ? null : obj.id);
  };

  const half = obj.size / 2;
  const emissive = held ? "#f59e0b" : selected ? "#38bdf8" : "#000000";
  const emissiveIntensity = held ? 0.35 : selected ? 0.3 : 0;

  return (
    <RigidBody
      ref={body}
      position={obj.spawn}
      colliders={false}
      linearDamping={0.05}
      angularDamping={0.2}
      ccd
    >
      {obj.kind === "cube" && (
        <CuboidCollider args={[half, half, half]} mass={obj.mass} friction={0.9} restitution={0.15} />
      )}
      {obj.kind === "sphere" && (
        <BallCollider args={[half]} mass={obj.mass} friction={0.8} restitution={0.35} />
      )}
      {obj.kind === "cylinder" && (
        <CylinderCollider args={[half, obj.size * 0.4]} mass={obj.mass} friction={0.9} restitution={0.15} />
      )}
      <mesh castShadow receiveShadow onClick={onClick}>
        {obj.kind === "cube" && <boxGeometry args={[obj.size, obj.size, obj.size]} />}
        {obj.kind === "sphere" && <sphereGeometry args={[half, 32, 24]} />}
        {obj.kind === "cylinder" && (
          <cylinderGeometry args={[obj.size * 0.4, obj.size * 0.4, obj.size, 32]} />
        )}
        <meshStandardMaterial
          color={obj.color}
          roughness={0.4}
          metalness={0.1}
          emissive={emissive}
          emissiveIntensity={emissiveIntensity}
        />
      </mesh>
      {selected && (
        <mesh>
          {obj.kind === "sphere" ? (
            <sphereGeometry args={[half * 1.12, 24, 16]} />
          ) : (
            <boxGeometry args={[obj.size * 1.12, obj.size * 1.12, obj.size * 1.12]} />
          )}
          <meshBasicMaterial color="#38bdf8" wireframe transparent opacity={0.5} />
        </mesh>
      )}
    </RigidBody>
  );
}
