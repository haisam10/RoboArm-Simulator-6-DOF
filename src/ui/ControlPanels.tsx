import {
  JOINT_LIMITS,
  JOINT_META,
  MAX_REACH,
  TOOL_PITCH_MAX,
  TOOL_PITCH_MIN,
  deg,
} from "@/lib/arm";
import { PLANETS } from "@/lib/planets";
import { selectGravity, selectPlanet, useSim } from "@/store";
import { cn } from "@/utils/cn";
import { Btn, Section, Seg, Slider } from "./widgets";

/* ------------------------------------------------------------------ */
/*  Gravity / planet                                                   */
/* ------------------------------------------------------------------ */
export function GravityPanel() {
  const planet = useSim(selectPlanet);
  const g = useSim(selectGravity);
  const customG = useSim((s) => s.customG);
  const setPlanet = useSim((s) => s.setPlanet);
  const setCustomG = useSim((s) => s.setCustomG);

  const fall1m = g > 0 ? Math.sqrt(2 / g) : Infinity;

  return (
    <Section
      title="World Gravity"
      icon="🪐"
      right={
        <span className="rounded-md bg-black/30 px-2 py-0.5 font-mono text-[11px] text-cyan-200">
          g = {g.toFixed(2)} m/s²
        </span>
      }
    >
      <div className="grid grid-cols-3 gap-1.5">
        {PLANETS.map((p) => {
          const active = p.id === planet.id;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => setPlanet(p.id)}
              title={p.fact}
              className={cn(
                "group flex flex-col items-start rounded-xl border px-2 py-1.5 text-left transition-all",
                active
                  ? "border-cyan-400/70 bg-cyan-500/15 shadow-[0_0_18px_-6px_rgba(34,211,238,0.9)]"
                  : "border-white/10 bg-white/[0.04] hover:border-white/25 hover:bg-white/[0.08]",
              )}
            >
              <span className="flex w-full items-center justify-between">
                <span className="text-base leading-none">{p.emoji}</span>
                <span
                  className="h-1.5 w-1.5 rounded-full"
                  style={{ background: p.accent, boxShadow: `0 0 8px ${p.accent}` }}
                />
              </span>
              <span className="mt-1 text-[11px] font-semibold text-slate-100">{p.name}</span>
              <span className="font-mono text-[10px] text-slate-400">
                {p.id === "custom" ? `${customG}` : p.g} m/s²
              </span>
            </button>
          );
        })}
      </div>

      {planet.id === "custom" && (
        <div className="mt-3">
          <Slider
            label="Custom gravity"
            value={customG}
            min={0}
            max={60}
            step={0.05}
            onChange={setCustomG}
            format={(v) => `${v.toFixed(2)} m/s²`}
          />
        </div>
      )}

      <p className="mt-3 text-[11px] leading-relaxed text-slate-400">
        <span className="text-slate-200">{planet.fact}</span>{" "}
        {g > 0 ? (
          <>
            A 1 kg object weighs <b className="text-cyan-200">{g.toFixed(2)} N</b>; dropping from
            1 m takes <b className="text-cyan-200">{fall1m.toFixed(2)} s</b>.
          </>
        ) : (
          <>Released objects keep whatever velocity the gripper gave them.</>
        )}
      </p>
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/*  Arm control                                                        */
/* ------------------------------------------------------------------ */
const fmtDeg = (v: number) => `${deg(v).toFixed(0)}°`;

export function ArmPanel() {
  const joints = useSim((s) => s.joints);
  const mode = useSim((s) => s.mode);
  const ikTarget = useSim((s) => s.ikTarget);
  const toolPitch = useSim((s) => s.toolPitch);
  const reachable = useSim((s) => s.ikReachable);
  const servoSpeed = useSim((s) => s.servoSpeed);
  const heldId = useSim((s) => s.heldId);
  const playing = useSim((s) => s.playing);

  const setJoint = useSim((s) => s.setJoint);
  const setMode = useSim((s) => s.setMode);
  const setIkTarget = useSim((s) => s.setIkTarget);
  const nudgeIk = useSim((s) => s.nudgeIk);
  const setToolPitch = useSim((s) => s.setToolPitch);
  const setServoSpeed = useSim((s) => s.setServoSpeed);
  const goHome = useSim((s) => s.goHome);

  const r = Math.hypot(ikTarget[0], ikTarget[2]);

  return (
    <Section
      title="Arm Control"
      icon="🦾"
      right={
        <Btn onClick={goHome} className="px-2 py-1" title="Home pose (H)">
          ⌂ Home
        </Btn>
      }
    >
      <Seg
        value={mode}
        onChange={setMode}
        options={[
          { value: "joint", label: "Joint (FK)" },
          { value: "ik", label: "Target (IK)" },
        ]}
      />

      {playing && (
        <p className="mt-2 rounded-md bg-amber-400/10 px-2 py-1 text-[11px] text-amber-200">
          ▶ Sequence playing — manual control resumes when it stops.
        </p>
      )}

      {mode === "joint" ? (
        <div className="mt-3 space-y-2.5">
          {JOINT_META.map((j) => (
            <Slider
              key={j.key}
              label={j.label}
              hint={j.short}
              value={joints[j.key]}
              min={JOINT_LIMITS[j.key][0]}
              max={JOINT_LIMITS[j.key][1]}
              step={j.key === "gripper" ? 0.01 : 0.005}
              onChange={(v) => setJoint(j.key, v)}
              format={
                j.key === "gripper"
                  ? (v) => (heldId ? `holding · ${(v * 100).toFixed(0)}%` : `${(v * 100).toFixed(0)}% open`)
                  : fmtDeg
              }
            />
          ))}
        </div>
      ) : (
        <div className="mt-3 space-y-2.5">
          <div
            className={cn(
              "flex items-center justify-between rounded-lg px-2 py-1 text-[11px]",
              reachable ? "bg-emerald-500/10 text-emerald-200" : "bg-rose-500/10 text-rose-200",
            )}
          >
            <span>{reachable ? "● Target reachable" : "● Out of reach — arm stretching"}</span>
            <span className="font-mono">r = {r.toFixed(2)} / {MAX_REACH.toFixed(2)} m</span>
          </div>
          <Slider
            label="Target X"
            value={ikTarget[0]}
            min={-MAX_REACH}
            max={MAX_REACH}
            step={0.005}
            onChange={(v) => setIkTarget([v, ikTarget[1], ikTarget[2]])}
            format={(v) => `${v.toFixed(2)} m`}
          />
          <Slider
            label="Target Y (height)"
            value={ikTarget[1]}
            min={0.04}
            max={2.0}
            step={0.005}
            onChange={(v) => setIkTarget([ikTarget[0], v, ikTarget[2]])}
            format={(v) => `${v.toFixed(2)} m`}
          />
          <Slider
            label="Target Z"
            value={ikTarget[2]}
            min={-MAX_REACH}
            max={MAX_REACH}
            step={0.005}
            onChange={(v) => setIkTarget([ikTarget[0], ikTarget[1], v])}
            format={(v) => `${v.toFixed(2)} m`}
          />
          <Slider
            label="Tool pitch"
            hint="180° = straight down"
            value={toolPitch}
            min={TOOL_PITCH_MIN}
            max={TOOL_PITCH_MAX}
            step={0.01}
            onChange={setToolPitch}
            format={fmtDeg}
          />
          <div className="grid grid-cols-3 gap-1.5 pt-1">
            <Btn onClick={() => nudgeIk(0.15, 0, 0)}>↺ Rotate</Btn>
            <Btn onClick={() => nudgeIk(0, 0.1, 0)}>Reach +</Btn>
            <Btn onClick={() => nudgeIk(0, 0, 0.1)}>Up ▲</Btn>
            <Btn onClick={() => nudgeIk(-0.15, 0, 0)}>↻ Rotate</Btn>
            <Btn onClick={() => nudgeIk(0, -0.1, 0)}>Reach −</Btn>
            <Btn onClick={() => nudgeIk(0, 0, -0.1)}>Down ▼</Btn>
          </div>
          <Slider
            label="Wrist Roll"
            hint="J5"
            value={joints.wristRoll}
            min={JOINT_LIMITS.wristRoll[0]}
            max={JOINT_LIMITS.wristRoll[1]}
            step={0.005}
            onChange={(v) => setJoint("wristRoll", v)}
            format={fmtDeg}
          />
          <Slider
            label="Gripper"
            hint="J6"
            value={joints.gripper}
            min={0}
            max={1}
            step={0.01}
            onChange={(v) => setJoint("gripper", v)}
            format={(v) => (heldId ? `holding · ${(v * 100).toFixed(0)}%` : `${(v * 100).toFixed(0)}% open`)}
          />
          <p className="text-[10px] leading-relaxed text-slate-500">
            Tip: drag the green gizmo in the 3D view, or click anywhere on the floor to move the
            target there.
          </p>
        </div>
      )}

      <div className="mt-3 border-t border-white/10 pt-3">
        <Slider
          label="Servo speed"
          value={servoSpeed}
          min={0.2}
          max={3}
          step={0.05}
          onChange={setServoSpeed}
          format={(v) => `${v.toFixed(2)}×`}
        />
      </div>
    </Section>
  );
}
