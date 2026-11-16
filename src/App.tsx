import { Scene } from "./scene/Scene";
import { ActionBar, HelpModal, LoadingOverlay, QuickStart, TopBar } from "./ui/Overlay";
import { Panel } from "./ui/Panel";
import { useSim } from "./store";
import { cn } from "./utils/cn";

export default function App() {
  const panelOpen = useSim((s) => s.panelOpen);
  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-slate-950 text-slate-100 select-none">
      <div
        className={cn(
          "absolute inset-y-0 left-0 right-0 transition-[right] duration-300",
          panelOpen && "lg:right-[380px]",
        )}
      >
        <Scene />
      </div>
      <TopBar />
      <QuickStart />
      <ActionBar />
      <Panel />
      <HelpModal />
      <LoadingOverlay />
    </div>
  );
}
