import { type PostoId } from "@/lib/agsp";
import { cn } from "@/lib/utils";
import { Siren, type SirenTone } from "./Siren";

interface Props {
  titulo?: string;
  postos: PostoId[];
  emAlerta: (id: PostoId) => boolean;
  emPrevencao: (id: PostoId) => boolean;
  destaque?: boolean;
}

export function MonitorBoard({
  titulo = "Quadro de postos",
  postos,
  emAlerta,
  emPrevencao,
  destaque = false,
}: Props) {
  const ativos = postos.filter(emAlerta).length;

  return (
    <section className="border border-signal/35 bg-panel-2">
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

      <ul className="grid grid-cols-2 gap-px bg-line sm:grid-cols-3">
        {postos.map((id) => {
          const on = emAlerta(id);
          const prev = emPrevencao(id);
          const tone: SirenTone = on ? "alert" : prev ? "warn" : "off";
          return (
            <li
              key={id}
              className={cn(
                "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-2 px-3 py-2.5 transition-colors",
                on ? "bg-alert-bg" : prev ? "bg-warn/12" : "bg-panel-2",
              )}
              style={
                on || prev
                  ? { animation: "alert-breathe 1.2s ease-in-out infinite" }
                  : undefined
              }
            >
              <div className="min-w-0">
                <p
                  className={cn(
                    "truncate font-display text-base2 font-bold tracking-[0.1em] uppercase",
                    on ? "text-alert" : prev ? "text-warn" : "text-foreground",
                  )}
                >
                  Posto {id}
                </p>
                <p
                  className={cn(
                    "font-mono text-micro tracking-[0.12em] uppercase",
                    on ? "text-alert" : prev ? "text-warn" : "text-muted-foreground",
                  )}
                >
                  {on ? "Crítico" : prev ? "Atenção" : "Normal"}
                </p>
              </div>
              <Siren tone={tone} size={18} />
            </li>
          );
        })}
      </ul>
    </section>
  );
}
