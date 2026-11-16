import { selectGravity, selectPlanet, useSim } from "@/store";
import { cn } from "@/utils/cn";
import { Btn, Kbd } from "./widgets";

/* ------------------------------------------------------------------ */
/*  Top bar                                                            */
/* ------------------------------------------------------------------ */
export function TopBar() {
  const planet = useSim(selectPlanet);
  const g = useSim(selectGravity);
  const paused = useSim((s) => s.paused);
  const heldId = useSim((s) => s.heldId);
  const objects = useSim((s) => s.objects);
  const mode = useSim((s) => s.mode);
  const togglePause = useSim((s) => s.togglePause);
  const panelOpen = useSim((s) => s.panelOpen);
  const setPanelOpen = useSim((s) => s.setPanelOpen);
  const setShowHelp = useSim((s) => s.setShowHelp);
  const held = objects.find((o) => o.id === heldId);

  return (
    <div
      className={cn(
        "pointer-events-none absolute left-0 right-0 top-0 z-20 flex items-start justify-between gap-3 p-3 transition-all sm:p-4",
        panelOpen && "lg:right-[380px]",
      )}
    >
      <div className="pointer-events-auto flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2.5 rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 backdrop-blur-md">
          <div className="grid h-8 w-8 place-items-center rounded-xl bg-gradient-to-br from-orange-400 to-rose-500 text-base shadow-lg shadow-orange-500/30">
            🦾
          </div>
          <div className="leading-tight">
            <div className="whitespace-nowrap text-sm font-bold tracking-tight text-white">
              RoboArm Simulator
            </div>
            <div className="hidden whitespace-nowrap text-[10px] uppercase tracking-[0.2em] text-slate-400 sm:block">
              6-DOF · Rapier physics
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-xs backdrop-blur-md">
          <span className="text-base leading-none">{planet.emoji}</span>
          <span className="font-semibold text-white">{planet.name}</span>
          <span className="font-mono text-cyan-200">{g.toFixed(2)} m/s²</span>
        </div>

        <div
          className={cn(
            "hidden items-center gap-2 rounded-2xl border px-3 py-2 text-xs backdrop-blur-md sm:flex",
            held
              ? "border-amber-400/40 bg-amber-400/10 text-amber-100"
              : "border-white/10 bg-slate-950/70 text-slate-300",
          )}
        >
          <span className={cn("h-2 w-2 rounded-full", held ? "bg-amber-400" : "bg-slate-500")} />
          {held ? `Holding ${held.name}` : "Gripper empty"}
          <span className="text-slate-500">·</span>
          <span className="uppercase tracking-wider text-slate-400">{mode === "ik" ? "IK" : "FK"}</span>
        </div>
      </div>

      <div className="pointer-events-auto flex items-center gap-1.5">
        <Btn
          onClick={togglePause}
          variant={paused ? "warn" : "ghost"}
          className="whitespace-nowrap bg-slate-950/70 backdrop-blur-md"
        >
          {paused ? "▶ Resume" : "⏸ Pause"}
        </Btn>
        <Btn onClick={() => setShowHelp(true)} className="bg-slate-950/70 backdrop-blur-md" title="Keyboard shortcuts (?)">
          ?
        </Btn>
        <Btn
          onClick={() => setPanelOpen(!panelOpen)}
          className="whitespace-nowrap bg-slate-950/70 backdrop-blur-md"
          title="Toggle control panel"
        >
          {panelOpen ? "Hide panel ›" : "‹ Controls"}
        </Btn>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Bottom action bar                                                  */
/* ------------------------------------------------------------------ */
export function ActionBar() {
  const heldId = useSim((s) => s.heldId);
  const nearest = useSim((s) => s.nearest);
  const toggleGrab = useSim((s) => s.toggleGrab);
  const addObject = useSim((s) => s.addObject);
  const goHome = useSim((s) => s.goHome);
  const panelOpen = useSim((s) => s.panelOpen);

  return (
    <div
      className={cn(
        "pointer-events-none absolute bottom-3 left-0 right-0 z-20 flex justify-center px-3 transition-all sm:bottom-5",
        panelOpen && "lg:right-[380px]",
      )}
    >
      <div className="pointer-events-auto flex flex-wrap items-center justify-center gap-1.5 rounded-2xl border border-white/10 bg-slate-950/75 p-2 backdrop-blur-md">
        <Btn
          onClick={toggleGrab}
          variant={heldId ? "warn" : nearest.inRange ? "primary" : "ghost"}
          className="min-w-[150px] px-4 py-2 text-sm"
        >
          {heldId ? "✋ Release" : nearest.inRange ? "✊ Grab" : "✊ Grab / Close"}
          <Kbd>Space</Kbd>
        </Btn>
        <span className="mx-1 hidden h-6 w-px bg-white/10 sm:block" />
        <Btn onClick={() => addObject("cube")}>⬛ Cube</Btn>
        <Btn onClick={() => addObject("sphere")}>⚪ Sphere</Btn>
        <Btn onClick={() => addObject("cylinder")}>🥫 Cylinder</Btn>
        <Btn onClick={() => addObject("cube", { atGripper: true })} title="Spawn a cube directly in the gripper (B)">
          🎯 In gripper
        </Btn>
        <span className="mx-1 hidden h-6 w-px bg-white/10 sm:block" />
        <Btn onClick={goHome}>
          ⌂ Home <Kbd>H</Kbd>
        </Btn>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Loading overlay (while the Rapier WASM physics engine boots)        */
/* ------------------------------------------------------------------ */
export function LoadingOverlay() {
  const ready = useSim((s) => s.ready);
  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-50 flex items-center justify-center bg-slate-950 transition-opacity duration-500",
        ready ? "opacity-0" : "opacity-100",
      )}
    >
      <div className="flex flex-col items-center gap-3">
        <div className="grid h-14 w-14 place-items-center rounded-2xl bg-gradient-to-br from-orange-400 to-rose-500 text-2xl shadow-xl shadow-orange-500/30">
          🦾
        </div>
        <div className="text-sm font-semibold text-white">Booting physics engine…</div>
        <div className="h-1 w-40 overflow-hidden rounded-full bg-white/10">
          <div className="h-full w-1/2 animate-[slide_1s_ease-in-out_infinite] rounded-full bg-cyan-400" />
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Quick-start hint                                                   */
/* ------------------------------------------------------------------ */
export function QuickStart() {
  const show = useSim((s) => s.showHint);
  const setShowHint = useSim((s) => s.setShowHint);
  const setShowHelp = useSim((s) => s.setShowHelp);
  if (!show) return null;
  return (
    <div className="pointer-events-auto absolute bottom-24 left-3 z-20 hidden w-72 rounded-2xl border border-white/10 bg-slate-950/75 p-3.5 text-[11px] leading-relaxed text-slate-300 backdrop-blur-md sm:bottom-24 md:block">
      <div className="mb-1.5 flex items-center justify-between">
        <span className="text-xs font-bold text-white">Quick start</span>
        <button
          type="button"
          onClick={() => setShowHint(false)}
          className="rounded px-1 text-slate-500 hover:text-white"
        >
          ✕
        </button>
      </div>
      <ol className="list-decimal space-y-1 pl-4">
        <li>
          Move the arm with <Kbd>Q</Kbd><Kbd>E</Kbd> <Kbd>W</Kbd><Kbd>S</Kbd> <Kbd>A</Kbd>
          <Kbd>D</Kbd> <Kbd>R</Kbd><Kbd>F</Kbd> or the sliders. Switch to{" "}
          <b className="text-cyan-200">Target (IK)</b> mode to drag the gripper directly.
        </li>
        <li>
          Hover the gripper over an object — the ring turns{" "}
          <span className="font-semibold text-emerald-300">green</span>. Press <Kbd>Space</Kbd>{" "}
          to grab.
        </li>
        <li>
          Lift it up and press <Kbd>Space</Kbd> again: it falls under the selected planet's
          gravity. Try the Moon, Jupiter or Zero-G!
        </li>
      </ol>
      <button
        type="button"
        onClick={() => setShowHelp(true)}
        className="mt-2 text-[11px] font-semibold text-cyan-300 hover:text-cyan-200"
      >
        All shortcuts →
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Help modal                                                         */
/* ------------------------------------------------------------------ */
export function HelpModal() {
  const show = useSim((s) => s.showHelp);
  const setShowHelp = useSim((s) => s.setShowHelp);
  if (!show) return null;

  const rows: [string, React.ReactNode][] = [
    ["Grab / release (or close / open gripper)", <Kbd>Space</Kbd>],
    ["Base yaw", <><Kbd>Q</Kbd> <Kbd>E</Kbd></>],
    ["Shoulder (FK) / Reach in–out (IK)", <><Kbd>W</Kbd> <Kbd>S</Kbd></>],
    ["Elbow (FK)", <><Kbd>A</Kbd> <Kbd>D</Kbd></>],
    ["Wrist pitch (FK) / Height (IK)", <><Kbd>R</Kbd> <Kbd>F</Kbd></>],
    ["Tool pitch (IK)", <><Kbd>T</Kbd> <Kbd>G</Kbd></>],
    ["Wrist roll", <><Kbd>Z</Kbd> <Kbd>X</Kbd></>],
    ["Gripper close / open", <><Kbd>[</Kbd> <Kbd>]</Kbd></>],
    ["Arrow keys mirror Q/E/W/S", <><Kbd>←</Kbd> <Kbd>→</Kbd> <Kbd>↑</Kbd> <Kbd>↓</Kbd></>],
    ["Home pose", <Kbd>H</Kbd>],
    ["Spawn random object / spawn in gripper", <><Kbd>N</Kbd> <Kbd>B</Kbd></>],
    ["Toggle FK / IK mode", <Kbd>M</Kbd>],
    ["Pause physics", <Kbd>P</Kbd>],
    ["Delete selected object", <Kbd>Del</Kbd>],
    ["Planet presets", <><Kbd>1</Kbd> … <Kbd>0</Kbd></>],
    ["Orbit / zoom / pan camera", <span className="text-slate-400">drag · wheel · right-drag</span>],
  ];

  return (
    <div
      className="absolute inset-0 z-40 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onClick={() => setShowHelp(false)}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-slate-950/95 p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-sm font-bold text-white">Keyboard & mouse controls</h3>
          <Btn onClick={() => setShowHelp(false)} className="px-2 py-1">
            ✕
          </Btn>
        </div>
        <ul className="divide-y divide-white/5 text-xs">
          {rows.map(([label, keys], i) => (
            <li key={i} className="flex items-center justify-between gap-3 py-1.5">
              <span className="text-slate-300">{label}</span>
              <span className="flex items-center gap-1">{keys}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
          How to pick & drop: move the gripper over an object until the ring turns{" "}
          <span className="text-emerald-300">green</span>, press <Kbd>Space</Kbd> to grab, lift it
          up, then press <Kbd>Space</Kbd> again — it falls at the selected planet's gravity.
        </p>
      </div>
    </div>
  );
}
