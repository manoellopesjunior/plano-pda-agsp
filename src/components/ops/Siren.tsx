import { cn } from "@/lib/utils";

/** Sirene: só anima quando ligada. Desligada é cinza e estática. */
export function Siren({ on, size = 22 }: { on: boolean; size?: number }) {
  return (
    <span
      className="relative grid shrink-0 place-items-center"
      style={{ width: size + 8, height: size + 8 }}
      aria-hidden
    >
      {on && (
        <span
          className="absolute inset-0 rounded-full border border-alert/60"
          style={{ animation: "alert-ring 1.4s ease-out infinite" }}
        />
      )}
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        className={cn(
          "transition-[filter,opacity] duration-300",
          on
            ? "text-alert drop-shadow-[0_0_6px_var(--alert)]"
            : "text-muted-foreground/35 grayscale",
        )}
      >
        <path
          d="M12 3.5a5.2 5.2 0 0 0-5.2 5.2v5.1h10.4V8.7A5.2 5.2 0 0 0 12 3.5Z"
          fill="currentColor"
          opacity={on ? 1 : 0.7}
        />
        <rect x="4.6" y="14.4" width="14.8" height="2.6" fill="currentColor" />
        <rect x="6.4" y="17.8" width="11.2" height="2.2" fill="currentColor" opacity=".6" />
        {on && (
          <g style={{ animation: "alert-breathe 1.1s ease-in-out infinite" }}>
            <path d="M3 7.4 0.6 6.2M21 7.4l2.4-1.2M12 1.6V0" stroke="currentColor" strokeWidth="1.6" />
          </g>
        )}
      </svg>
    </span>
  );
}
