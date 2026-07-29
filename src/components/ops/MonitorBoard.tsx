import { POSTO_BY_ID, type PostoId } from "@/lib/agsp";
import { cn } from "@/lib/utils";
import { Siren } from "./Siren";

interface Props {
  titulo: string;
  variante: "ct" | "guarda";
  postos: PostoId[];
  emAlerta: (id: PostoId) => boolean;
}

export function MonitorBoard({ titulo, variante, postos, emAlerta }: Props) {
  const ativos = postos.filter(emAlerta).length;

  return (
    <section
      className={cn(
        "border bg-panel-2",
        variante === "ct" ? "border-signal/35" : "border-warn/30",
      )}
    >
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-line bg-panel px-3 py-2">
        <h3 className="truncate font-display text-base2 font-bold tracking-[0.14em] uppercase text-foreground">
          {titulo}
        </h3>
        <span
          className={cn(
            "shrink-0 font-mono text-micro font-semibold tracking-[0.12em] uppercase",
            ativos ? "text-alert" : "text-ok",
          )}
        >
          {ativos ? `${ativos} ativo${ativos > 1 ? "s" : ""}` : "silencioso"}
        </span>
      </header>

      <ul className="grid grid-cols-1 gap-px bg-line sm:grid-cols-2">
        {postos.map((id) => {
          const on = emAlerta(id);
          const p = POSTO_BY_ID[id];
          return (
            <li
              key={id}
              className={cn(
                "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-2.5 transition-colors",
                on ? "bg-alert-bg" : "bg-panel-2",
              )}
            >
              <div className="min-w-0">
                <p
                  className={cn(
                    "truncate font-display text-base2 font-bold tracking-[0.1em] uppercase",
                    on ? "text-alert" : "text-foreground",
                  )}
                >
                  Posto {id}
                </p>
                <p className="label-mono truncate normal-case">{p.nome}</p>
              </div>
              <Siren on={on} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
