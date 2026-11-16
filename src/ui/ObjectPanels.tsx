import { deg } from "@/lib/arm";
import { selectGravity, selectPlanet, useSim, type ObjectKind } from "@/store";
import { cn } from "@/utils/cn";
import { Btn, Section, Toggle } from "./widgets";

const KIND_ICON: Record<ObjectKind, string> = {
  cube: "⬛",
  sphere: "⚪",
  cylinder: "🥫",
};

const SIZES = [
  { label: "S", value: 0.1 },
  { label: "M", value: 0.15 },
  { label: "L", value: 0.2 },
];

/* ------------------------------------------------------------------ */
/*  Objects                                                            */
/* ------------------------------------------------------------------ */
export function ObjectsPanel() {
  const objects = useSim((s) => s.objects);
  const heldId = useSim((s) => s.heldId);
  const selectedId = useSim((s) => s.selectedId);
  const objectSize = useSim((s) => s.objectSize);
  const spawnInGripper = useSim((s) => s.spawnInGripper);
  const addObject = useSim((s) => s.addObject);
  const removeObject = useSim((s) => s.removeObject);
  const clearObjects = useSim((s) => s.clearObjects);
  const selectObject = useSim((s) => s.selectObject);
  const setObjectSize = useSim((s) => s.setObjectSize);
  const setSpawnInGripper = useSim((s) => s.setSpawnInGripper);

  return (
    <Section
      title="Objects"
      icon="📦"
      right={
        <span className="rounded-md bg-black/30 px-2 py-0.5 font-mono text-[11px] text-slate-300">
          {objects.length} in scene
        </span>
      }
    >
      <div className="grid grid-cols-3 gap-1.5">
        {(Object.keys(KIND_ICON) as ObjectKind[]).map((k) => (
          <Btn key={k} variant="ghost" onClick={() => addObject(k)} className="py-2">
            <span>{KIND_ICON[k]}</span>
            <span className="capitalize">{k}</span>
          </Btn>
        ))}
      </div>

      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <span className="mr-1 text-[11px] text-slate-400">Size</span>
          {SIZES.map((s) => (
            <button
              key={s.label}
              type="button"
              onClick={() => setObjectSize(s.value)}
              className={cn(
                "h-6 w-7 rounded-md text-[11px] font-bold transition-colors",
                objectSize === s.value
                  ? "bg-cyan-500 text-slate-950"
                  : "bg-white/[0.06] text-slate-300 hover:bg-white/10",
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        <Toggle checked={spawnInGripper} onChange={setSpawnInGripper} label="Spawn in gripper" />
      </div>

      <div className="mt-3 max-h-44 space-y-1 overflow-y-auto pr-1">
        {objects.length === 0 && (
          <p className="rounded-lg border border-dashed border-white/10 px-3 py-3 text-center text-[11px] text-slate-500">
            No objects yet — add one above. It drops in from ~1 m up, pulled by the current
            planet's gravity.
          </p>
        )}
        {objects.map((o) => {
          const held = o.id === heldId;
          const sel = o.id === selectedId;
          return (
            <div
              key={o.id}
              onClick={() => selectObject(sel ? null : o.id)}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-lg border px-2 py-1.5 text-[11px] transition-colors",
                sel
                  ? "border-cyan-400/60 bg-cyan-500/10"
                  : "border-white/5 bg-white/[0.03] hover:bg-white/[0.07]",
              )}
            >
              <span
                className="h-3 w-3 shrink-0 rounded-sm"
                style={{ background: o.color, boxShadow: `0 0 8px ${o.color}88` }}
              />
              <span className="flex-1 truncate font-medium text-slate-200">{o.name}</span>
              <span className="font-mono text-slate-400">{o.mass} kg</span>
              {held && (
                <span className="rounded bg-amber-400/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-200">
                  HELD
                </span>
              )}
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  removeObject(o.id);
                }}
                className="ml-1 rounded px-1 text-slate-500 hover:bg-rose-500/20 hover:text-rose-300"
                title="Remove"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>

      {objects.length > 0 && (
        <div className="mt-2 flex justify-end">
          <Btn variant="danger" onClick={clearObjects} className="px-2 py-1">
            Clear all
          </Btn>
        </div>
      )}
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/*  Sequence / waypoints                                               */
/* ------------------------------------------------------------------ */
export function SequencePanel() {
  const waypoints = useSim((s) => s.waypoints);
  const playing = useSim((s) => s.playing);
  const playIndex = useSim((s) => s.playIndex);
  const loop = useSim((s) => s.loop);
  const addWaypoint = useSim((s) => s.addWaypoint);
  const removeWaypoint = useSim((s) => s.removeWaypoint);
  const clearWaypoints = useSim((s) => s.clearWaypoints);
  const playWaypoints = useSim((s) => s.playWaypoints);
  const stopPlayback = useSim((s) => s.stopPlayback);
  const setLoop = useSim((s) => s.setLoop);

  return (
    <Section
      title="Motion Sequence"
      icon="🎬"
      right={<Toggle checked={loop} onChange={setLoop} label="Loop" />}
    >
      <div className="grid grid-cols-3 gap-1.5">
        <Btn onClick={addWaypoint} variant="ghost">
          ⏺ Record pose
        </Btn>
        {playing ? (
          <Btn onClick={stopPlayback} variant="warn">
            ⏹ Stop
          </Btn>
        ) : (
          <Btn onClick={playWaypoints} variant="primary" disabled={!waypoints.length}>
            ▶ Play
          </Btn>
        )}
        <Btn onClick={clearWaypoints} variant="danger" disabled={!waypoints.length}>
          Clear
        </Btn>
      </div>
      <p className="mt-2 text-[10px] leading-relaxed text-slate-500">
        Record a pose while holding (or with the gripper closed) to make a <b>grab</b> step, or
        with it open to make a <b>release</b> step. Play back for an automatic pick-and-place.
      </p>
      {waypoints.length > 0 && (
        <ol className="mt-2 max-h-32 space-y-1 overflow-y-auto pr-1">
          {waypoints.map((w, i) => {
            const action = w.action === "grab" ? "✊ grab" : "✋ release";
            const active = playing && i === playIndex;
            return (
              <li
                key={w.id}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-2 py-1 text-[11px]",
                  active
                    ? "border-amber-400/60 bg-amber-400/10 text-amber-100"
                    : "border-white/5 bg-white/[0.03] text-slate-300",
                )}
              >
                <span className="w-4 font-mono text-slate-500">{i + 1}</span>
                <span className="flex-1 font-mono text-[10px]">
                  B{deg(w.joints.base).toFixed(0)}° S{deg(w.joints.shoulder).toFixed(0)}° E
                  {deg(w.joints.elbow).toFixed(0)}° W{deg(w.joints.wristPitch).toFixed(0)}°
                </span>
                <span className="text-[10px]">{action}</span>
                <button
                  type="button"
                  onClick={() => removeWaypoint(w.id)}
                  className="rounded px-1 text-slate-500 hover:text-rose-300"
                >
                  ✕
                </button>
              </li>
            );
          })}
        </ol>
      )}
    </Section>
  );
}

/* ------------------------------------------------------------------ */
/*  Telemetry + event log                                              */
/* ------------------------------------------------------------------ */
export function TelemetryPanel() {
  const eePos = useSim((s) => s.eePos);
  const nearest = useSim((s) => s.nearest);
  const heldId = useSim((s) => s.heldId);
  const objects = useSim((s) => s.objects);
  const stats = useSim((s) => s.stats);
  const log = useSim((s) => s.log);
  const planet = useSim(selectPlanet);
  const g = useSim(selectGravity);

  const held = objects.find((o) => o.id === heldId);
  const near = objects.find((o) => o.id === nearest.id);

  return (
    <Section title="Telemetry" icon="📡">
      <div className="grid grid-cols-3 gap-1.5 text-center">
        {(["X", "Y", "Z"] as const).map((axis, i) => (
          <div key={axis} className="rounded-lg bg-black/30 px-2 py-1.5">
            <div className="text-[9px] uppercase tracking-widest text-slate-500">EE {axis}</div>
            <div className="font-mono text-sm text-cyan-200">{eePos[i].toFixed(3)}</div>
          </div>
        ))}
      </div>
      <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[11px]">
        <dt className="text-slate-500">Gripper</dt>
        <dd className={cn("font-medium", held ? "text-amber-200" : "text-slate-200")}>
          {held
            ? `Holding ${held.name} (${held.mass} kg · weight ${(held.mass * g).toFixed(1)} N)`
            : "Empty"}
        </dd>
        <dt className="text-slate-500">Nearest</dt>
        <dd className={cn("font-medium", nearest.inRange ? "text-emerald-300" : "text-slate-300")}>
          {near
            ? `${near.name} · ${nearest.dist.toFixed(2)} m ${nearest.inRange ? "— in reach ✓" : ""}`
            : "—"}
        </dd>
        <dt className="text-slate-500">World</dt>
        <dd className="text-slate-200">
          {planet.emoji} {planet.name} · {g.toFixed(2)} m/s²
        </dd>
        <dt className="text-slate-500">Stats</dt>
        <dd className="font-mono text-slate-300">
          {stats.spawned} spawned · {stats.grabs} grabs · {stats.releases} drops
        </dd>
      </dl>
      <ul className="mt-3 space-y-1 border-t border-white/10 pt-2">
        {log.slice(0, 6).map((l) => (
          <li key={l.id} className="flex gap-2 text-[10.5px] leading-snug">
            <span className="shrink-0 font-mono text-slate-600">{l.time}</span>
            <span
              className={cn(
                l.tone === "ok" && "text-emerald-300",
                l.tone === "warn" && "text-amber-300",
                l.tone === "info" && "text-slate-300",
              )}
            >
              {l.text}
            </span>
          </li>
        ))}
      </ul>
    </Section>
  );
}
