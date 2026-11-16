import { useSim } from "@/store";
import { cn } from "@/utils/cn";
import { ArmPanel, GravityPanel } from "./ControlPanels";
import { ObjectsPanel, SequencePanel, TelemetryPanel } from "./ObjectPanels";
import { Btn } from "./widgets";

export function Panel() {
  const open = useSim((s) => s.panelOpen);
  const setPanelOpen = useSim((s) => s.setPanelOpen);
  const resetScene = useSim((s) => s.resetScene);

  return (
    <aside
      className={cn(
        "absolute inset-y-0 right-0 z-30 flex w-full max-w-[380px] flex-col border-l border-white/10 bg-slate-950/80 backdrop-blur-xl transition-transform duration-300 ease-out",
        open ? "translate-x-0" : "translate-x-full",
      )}
    >
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div>
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-slate-200">
            Control Deck
          </div>
          <div className="text-[10px] text-slate-500">Gravity · kinematics · objects · sequences</div>
        </div>
        <div className="flex items-center gap-1.5">
          <Btn variant="danger" onClick={resetScene} className="px-2 py-1">
            Reset
          </Btn>
          <Btn onClick={() => setPanelOpen(false)} className="px-2 py-1" title="Hide panel">
            ✕
          </Btn>
        </div>
      </div>
      <div className="sim-scroll flex-1 space-y-3 overflow-y-auto p-3 pb-24 lg:pb-3">
        <GravityPanel />
        <ArmPanel />
        <ObjectsPanel />
        <SequencePanel />
        <TelemetryPanel />
      </div>
    </aside>
  );
}
