import type { Evento } from "@/lib/agsp";
import { inicioTurnoAtual } from "@/lib/turno";
import { cn } from "@/lib/utils";
import { SectionTitle } from "./primitives";

const tom: Record<Evento["nivel"], string> = {
  critico: "bg-alert",
  atencao: "bg-warn",
  info: "bg-signal",
};

export function ResumoTurno({ eventos, falta }: { eventos: Evento[]; falta: string }) {
  const inicio = inicioTurnoAtual().toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
  const acionamentos = eventos.filter((e) => e.nivel === "critico").length;
  const tratativas = eventos.filter((e) => e.responsavel && e.responsavel !== "—").length;
  const ultimos = eventos.slice(0, 5);

  const dados = [
    { r: "Início do turno", v: inicio },
    { r: "Trilha reinicia em", v: falta },
    { r: "Acionamentos", v: String(acionamentos), alerta: acionamentos > 0 },
    { r: "Registros", v: String(eventos.length) },
  ];

  return (
    <div>
      <SectionTitle>Resumo do turno</SectionTitle>
      <dl className="grid grid-cols-2 gap-px border border-line bg-line">
        {dados.map((d) => (
          <div key={d.r} className="bg-panel-2 px-3 py-2.5">
            <dt className="label-mono">{d.r}</dt>
            <dd
              className={cn(
                "mt-1 font-display text-lead font-bold tracking-[0.06em] tabular-nums",
                d.alerta ? "text-alert" : "text-foreground",
              )}
            >
              {d.v}
            </dd>
          </div>
        ))}
      </dl>
      <div className="mt-3 border border-line bg-panel-2">
        <p className="label-mono border-b border-line bg-panel px-3 py-2">Últimos eventos</p>
        {ultimos.length ? (
          <ul className="divide-y divide-line">
            {ultimos.map((e) => (
              <li key={e.id} className="grid grid-cols-[auto_auto_minmax(0,1fr)] items-center gap-3 px-3 py-2">
                <i aria-hidden className={cn("size-2", tom[e.nivel])} />
                <span className="font-mono text-micro text-muted-foreground tabular-nums">{e.hora}</span>
                <span className="truncate text-base2 text-foreground">
                  <b className="font-display tracking-[0.08em] uppercase">
                    {e.posto === "TODOS" ? "Todos" : `Posto ${e.posto.replace(/\D/g, "") || e.posto}`}
                  </b>{" "}
                  — {e.mensagem}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="label-mono px-3 py-4 text-center normal-case">
            Nenhuma ocorrência neste turno
          </p>
        )}
      </div>
    </div>
  );
}
