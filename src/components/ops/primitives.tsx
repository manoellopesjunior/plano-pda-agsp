import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

type Tone = "neutral" | "ok" | "alert" | "warn" | "signal";

const toneRing: Record<Tone, string> = {
  neutral: "border-line text-muted-foreground",
  ok: "border-ok/50 text-ok",
  alert: "border-alert/70 text-alert",
  warn: "border-warn/50 text-warn",
  signal: "border-signal/50 text-signal-soft",
};

export function Chip({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 border bg-panel-2/70 px-2 py-1 font-mono text-micro font-medium tracking-[0.1em] uppercase",
        toneRing[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function Dot({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className={cn(
        "size-1.5 shrink-0 rounded-full",
        on ? "bg-alert shadow-[0_0_8px_var(--alert)]" : "bg-ok shadow-[0_0_6px_var(--ok)]",
      )}
    />
  );
}

export function SectionTitle({
  children,
  right,
}: {
  children: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="mb-3 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-line pb-2">
      <h2 className="truncate font-display text-base2 font-bold tracking-[0.14em] uppercase text-foreground">
        {children}
      </h2>
      {right}
    </div>
  );
}

/** Alerta com dois canais: cor + rótulo textual + barra lateral. */
export function StatusMsg({
  kind,
  children,
}: {
  kind: "ok" | "alert" | "warn";
  children: ReactNode;
}) {
  const map = {
    ok: { border: "border-l-ok", bg: "bg-ok/10", text: "text-ok", label: "NORMAL" },
    alert: {
      border: "border-l-alert",
      bg: "bg-alert-bg",
      text: "text-alert",
      label: "CRÍTICO",
    },
    warn: { border: "border-l-warn", bg: "bg-warn/10", text: "text-warn", label: "ATENÇÃO" },
  }[kind];

  return (
    <div
      role="status"
      className={cn(
        "flex items-center gap-3 border border-line border-l-4 px-3 py-2",
        map.border,
        map.bg,
      )}
    >
      <span className={cn("font-mono text-micro font-semibold tracking-[0.14em]", map.text)}>
        {map.label}
      </span>
      <span className="min-w-0 flex-1 truncate text-base2 text-foreground">{children}</span>
    </div>
  );
}

export function OpsButton({
  variant = "ghost",
  className,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "ghost" | "signal" | "alert";
}) {
  const map = {
    ghost:
      "border-line bg-panel-2 text-foreground hover:border-signal/60 hover:bg-panel disabled:opacity-40",
    signal:
      "border-signal/60 bg-signal/15 text-signal-soft hover:bg-signal/25 disabled:opacity-40",
    alert: "border-alert/70 bg-alert/15 text-alert hover:bg-alert/25 disabled:opacity-40",
  }[variant];

  return (
    <button
      type="button"
      {...props}
      className={cn(
        "inline-flex items-center justify-center gap-2 border px-3 py-2 font-display text-base2 font-semibold tracking-[0.1em] uppercase transition-colors disabled:cursor-not-allowed",
        map,
        className,
      )}
    />
  );
}
