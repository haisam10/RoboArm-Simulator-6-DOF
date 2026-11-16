import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/utils/cn";

export function Section({
  title,
  icon,
  right,
  children,
  className,
}: {
  title: string;
  icon?: ReactNode;
  right?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border border-white/10 bg-white/[0.04] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]",
        className,
      )}
    >
      <header className="mb-3 flex items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-300">
          {icon && <span className="text-sm leading-none">{icon}</span>}
          {title}
        </h2>
        {right}
      </header>
      {children}
    </section>
  );
}

type BtnVariant = "primary" | "ghost" | "danger" | "accent" | "warn";

export function Btn({
  variant = "ghost",
  active,
  className,
  children,
  onClick,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; active?: boolean }) {
  const styles: Record<BtnVariant, string> = {
    primary:
      "bg-cyan-500 text-slate-950 hover:bg-cyan-400 shadow-[0_0_20px_-4px_rgba(34,211,238,0.6)]",
    accent: "bg-orange-500 text-slate-950 hover:bg-orange-400",
    warn: "bg-amber-400 text-slate-950 hover:bg-amber-300",
    danger: "bg-rose-500/15 text-rose-300 hover:bg-rose-500/25 border border-rose-400/30",
    ghost:
      "bg-white/[0.06] text-slate-200 hover:bg-white/[0.12] border border-white/10",
  };
  return (
    <button
      type="button"
      onClick={(e) => {
        onClick?.(e);
        e.currentTarget.blur();
      }}
      className={cn(
        "inline-flex items-center justify-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-40",
        styles[variant],
        active && "ring-2 ring-cyan-400/70 bg-cyan-500/20 text-cyan-100",
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}

export function Slider({
  label,
  value,
  min,
  max,
  step = 0.01,
  onChange,
  format,
  disabled,
  hint,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  onChange: (v: number) => void;
  format?: (v: number) => string;
  disabled?: boolean;
  hint?: string;
}) {
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <label className={cn("block", disabled && "opacity-40")}>
      <div className="mb-1 flex items-baseline justify-between text-[11px]">
        <span className="font-medium text-slate-300">
          {label}
          {hint && <span className="ml-1.5 text-[10px] text-slate-500">{hint}</span>}
        </span>
        <span className="font-mono tabular-nums text-cyan-200">
          {format ? format(value) : value.toFixed(2)}
        </span>
      </div>
      <input
        type="range"
        className="sim-range"
        style={{ ["--pct" as string]: `${pct}%` }}
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        onPointerUp={(e) => e.currentTarget.blur()}
      />
    </label>
  );
}

export function Seg<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
}) {
  return (
    <div className="grid auto-cols-fr grid-flow-col rounded-lg bg-black/30 p-0.5 text-xs">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={cn(
            "rounded-md px-2 py-1.5 font-semibold transition-colors",
            o.value === value
              ? "bg-cyan-500 text-slate-950 shadow"
              : "text-slate-300 hover:bg-white/10",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center gap-2 text-[11px] font-medium text-slate-300"
    >
      <span
        className={cn(
          "relative h-4 w-7 rounded-full transition-colors",
          checked ? "bg-cyan-500" : "bg-white/15",
        )}
      >
        <span
          className={cn(
            "absolute top-0.5 h-3 w-3 rounded-full bg-white transition-all",
            checked ? "left-3.5" : "left-0.5",
          )}
        />
      </span>
      {label}
    </button>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex min-w-[1.4rem] items-center justify-center rounded border border-white/15 bg-white/10 px-1 font-mono text-[10px] text-slate-200">
      {children}
    </kbd>
  );
}
