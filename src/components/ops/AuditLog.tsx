import type { Evento } from "@/lib/agsp";
import { cn } from "@/lib/utils";

const nivelTone: Record<Evento["nivel"], string> = {
  critico: "border-alert/70 text-alert",
  atencao: "border-warn/60 text-warn",
  info: "border-signal/50 text-signal-soft",
};

const nivelLabel: Record<Evento["nivel"], string> = {
  critico: "Crítico",
  atencao: "Atenção",
  info: "Info",
};

export function AuditLog({ eventos }: { eventos: Evento[] }) {
  if (!eventos.length) {
    return (
      <div className="border border-dashed border-line bg-panel-2 px-4 py-10 text-center">
        <p className="label-mono">Nenhum evento registrado nesta sessão</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto border border-line">
      <table className="w-full min-w-[720px] border-collapse text-left">
        <caption className="sr-only">Histórico auditável de acionamentos e tratativas</caption>
        <thead>
          <tr className="bg-panel">
            {["Hora", "Posto", "Categoria", "Nível", "Ocorrência", "Responsável", "Motivo"].map(
              (h) => (
                <th
                  key={h}
                  scope="col"
                  className="label-mono border-b border-line px-3 py-2 whitespace-nowrap"
                >
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {eventos.map((e) => (
            <tr key={e.id} className="border-b border-line/60 bg-panel-2 last:border-b-0">
              <td className="px-3 py-2 font-mono text-micro whitespace-nowrap text-muted-foreground">
                {e.hora}
              </td>
              <td className="px-3 py-2 font-mono text-micro whitespace-nowrap text-foreground">
                {e.posto}
              </td>
              <td className="px-3 py-2 text-base2 whitespace-nowrap text-muted-foreground">
                {e.categoria}
              </td>
              <td className="px-3 py-2">
                <span
                  className={cn(
                    "inline-block border px-1.5 py-0.5 font-mono text-micro font-semibold tracking-[0.08em] uppercase",
                    nivelTone[e.nivel],
                  )}
                >
                  {nivelLabel[e.nivel]}
                </span>
              </td>
              <td className="px-3 py-2 text-base2 text-foreground">{e.mensagem}</td>
              <td className="px-3 py-2 text-base2 whitespace-nowrap text-muted-foreground">
                {e.responsavel}
              </td>
              <td className="px-3 py-2 text-base2 text-muted-foreground">{e.motivo}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
