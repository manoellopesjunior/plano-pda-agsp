import sat from "@/assets/agsp-satelite-v2.jpg.asset.json";
import type { Posto, PostoId } from "@/lib/agsp";
import { cn } from "@/lib/utils";

/**
 * Cada "câmera" é um recorte ampliado da ortofoto na coordenada do posto.
 * Evita placeholders genéricos e mantém a leitura do terreno real.
 */
function Feed({
  posto,
  on,
  featured,
}: {
  posto: Posto;
  on: boolean;
  featured?: boolean;
}) {
  return (
    <figure
      className={cn(
        "group relative overflow-hidden border bg-[#02060c]",
        on ? "border-alert" : "border-line",
        featured ? "sm:col-span-2 sm:row-span-2" : "",
      )}
    >
      <div className={cn("relative w-full", featured ? "aspect-[16/10]" : "aspect-[16/10]")}>
        <div
          className="absolute inset-0 bg-cover brightness-[.78] contrast-[1.1] grayscale-[.35]"
          style={{
            backgroundImage: `url(${sat.url})`,
            backgroundSize: "420%",
            backgroundPosition: `${posto.x}% ${posto.y}%`,
          }}
          aria-hidden
        />
        <div
          aria-hidden
          className="absolute inset-0 bg-[repeating-linear-gradient(0deg,rgba(0,0,0,.28)_0px,rgba(0,0,0,.28)_1px,transparent_1px,transparent_3px)]"
        />
        {on && <div aria-hidden className="absolute inset-0 bg-alert/20" />}

        <div className="absolute inset-x-0 top-0 grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 bg-[linear-gradient(180deg,rgba(2,8,14,.9),transparent)] px-2 py-1.5">
          <span className="label-mono truncate">{posto.codigo}</span>
          <span
            className={cn(
              "flex shrink-0 items-center gap-1 font-mono text-micro font-semibold tracking-[0.1em]",
              on ? "text-alert" : "text-ok",
            )}
          >
            <i
              className={cn(
                "size-1.5 rounded-full",
                on ? "bg-alert" : "bg-ok",
              )}
              style={on ? { animation: "alert-breathe 1.1s ease-in-out infinite" } : undefined}
            />
            {on ? "ALERTA" : "REC"}
          </span>
        </div>

        <figcaption className="absolute inset-x-0 bottom-0 bg-[linear-gradient(180deg,transparent,rgba(2,8,14,.92))] px-2 pt-6 pb-1.5">
          <p className="truncate font-display text-base2 font-semibold tracking-[0.08em] uppercase text-foreground">
            {posto.nome}
          </p>
          {featured && (
            <p className="label-mono mt-0.5 truncate normal-case">{posto.desc}</p>
          )}
        </figcaption>
      </div>
    </figure>
  );
}

export function CameraGrid({
  postos,
  emAlerta,
  destaque,
}: {
  postos: Posto[];
  emAlerta: (id: PostoId) => boolean;
  destaque?: PostoId | null;
}) {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {postos.map((p) => (
        <Feed key={p.id} posto={p} on={emAlerta(p.id)} featured={destaque === p.id} />
      ))}
    </div>
  );
}

export function MiniCams({
  postos,
  emAlerta,
}: {
  postos: Posto[];
  emAlerta: (id: PostoId) => boolean;
}) {
  return (
    <div className="grid grid-cols-3 gap-px bg-line">
      {postos.map((p) => {
        const on = emAlerta(p.id);
        return (
          <div key={p.id} className="relative aspect-[16/10] overflow-hidden bg-[#02060c]">
            <div
              className="absolute inset-0 bg-cover brightness-[.7] grayscale-[.5]"
              style={{
                backgroundImage: `url(${sat.url})`,
                backgroundSize: "420%",
                backgroundPosition: `${p.x}% ${p.y}%`,
              }}
              aria-hidden
            />
            {on && <div aria-hidden className="absolute inset-0 bg-alert/25 ring-1 ring-alert" />}
            <span className="absolute bottom-0 left-0 right-0 bg-[rgba(2,8,14,.8)] px-1 font-mono text-micro font-medium tracking-[0.08em] text-foreground/80">
              {p.codigo}
            </span>
          </div>
        );
      })}
    </div>
  );
}
