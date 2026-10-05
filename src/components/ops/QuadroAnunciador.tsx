import type { ReactNode } from "react";
import type { PostoId } from "@/lib/agsp";
import { cn } from "@/lib/utils";
import { Siren } from "./Siren";

interface Props {
  postos: PostoId[];
  emAlerta: (id: PostoId) => boolean;
  emPrevencao: (id: PostoId) => boolean;
  /** Ação opcional exibida na base de cada janela (somente perfis operacionais). */
  acao?: (id: PostoId) => ReactNode;
}

/** Quadro anunciador: janelas grandes no estilo de painel de alarme industrial. */
export function QuadroAnunciador({ postos, emAlerta, emPrevencao, acao }: Props) {
  const ativos = postos.filter(emAlerta);
  return (
    <section className="border border-signal/35 bg-panel">
      <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-b border-line px-4 py-3">
        <h2 className="truncate font-display text-head font-bold tracking-[0.16em] uppercase text-foreground">
          Quadro anunciador
        </h2>
        <span
          className={cn(
            "font-mono text-base2 font-semibold tracking-[0.12em] uppercase",
            ativos.length ? "text-alert" : "text-ok",
          )}
        >
          {ativos.length ? `PDA · Posto ${ativos.join(" / ")}` : "Perímetro íntegro"}
        </span>
      </header>
      <ul className="grid grid-cols-2 gap-2 p-2 md:grid-cols-3">
        {postos.map((id) => {
          const on = emAlerta(id);
          const prev = emPrevencao(id);
          const estado = on ? "Crítico" : prev ? "Atenção" : "Normal";
          const conteudoAcao = acao?.(id);
          return (
            <li
              key={id}
              className={cn(
                "relative grid border border-l-[4px]",
                on
                  ? "border-alert border-l-alert bg-alert-bg"
                  : prev
                    ? "border-warn/60 border-l-warn bg-warn/12"
                    : "border-line border-l-ok bg-panel-2",
              )}
              style={on || prev ? { animation: "alert-breathe 1.2s ease-in-out infinite" } : undefined}
            >
              <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2 px-4 pt-3">
                <span className="label-mono">Posto</span>
                <Siren tone={on ? "alert" : prev ? "warn" : "off"} size={26} />
              </div>
              <p
                className={cn(
                  "px-4 font-display text-[clamp(3.5rem,8vw,6rem)] leading-none font-bold tabular-nums",
                  on ? "text-alert" : prev ? "text-warn" : "text-foreground",
                )}
              >
                {id}
              </p>
              <p
                className={cn(
                  "mt-2 border-t px-4 py-2 font-mono text-base2 font-semibold tracking-[0.16em] uppercase",
                  on
                    ? "border-alert/50 text-alert"
                    : prev
                      ? "border-warn/40 text-warn"
                      : "border-line text-ok",
                )}
              >
                {estado}
              </p>
              {conteudoAcao && <div className="border-t border-line px-3 py-2">{conteudoAcao}</div>}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
