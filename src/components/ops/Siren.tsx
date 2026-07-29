import { cn } from "@/lib/utils";

export type SirenTone = "off" | "warn" | "alert";

/**
 * Sirene: vermelha no posto invadido, laranja nos demais postos em prevenção,
 * cinza e estática quando a central está silenciosa.
 */
export function Siren({ tone, size = 22 }: { tone: SirenTone; size?: number }) {
  const on = tone !== "off";
  return (
    <span
      className="relative grid shrink-0 place-items-center"
      style={{ width: size + 8, height: size + 8 }}
      aria-hidden
    >
      {on && (
        <span
          className={cn(
            "absolute inset-0 rounded-full border",
            tone === "alert" ? "border-alert/60" : "border-warn/60",
          )}
          style={{ animation: "alert-ring 1.4s ease-out infinite" }}
        />
      )}
      <svg
        viewBox="0 0 24 24"
        width={size}
        height={size}
        className={cn(
          "transition-[filter,opacity] duration-300",
          tone === "alert" && "text-alert drop-shadow-[0_0_6px_var(--alert)]",
          tone === "warn" && "text-warn drop-shadow-[0_0_6px_var(--warn)]",
          tone === "off" && "text-muted-foreground/35 grayscale",
        )}
        style={on ? { animation: "alert-breathe 1.1s ease-in-out infinite" } : undefined}
      >
        <path
          d="M12 3.5a5.2 5.2 0 0 0-5.2 5.2v5.1h10.4V8.7A5.2 5.2 0 0 0 12 3.5Z"
          fill="currentColor"
          opacity={on ? 1 : 0.7}
        />
        <rect x="4.6" y="14.4" width="14.8" height="2.6" fill="currentColor" />
        <rect x="6.4" y="17.8" width="11.2" height="2.2" fill="currentColor" opacity=".6" />
        {on && (
          <path
            d="M3 7.4 0.6 6.2M21 7.4l2.4-1.2M12 1.6V0"
            stroke="currentColor"
            strokeWidth="1.6"
          />
        )}
      </svg>
    </span>
  );
}
