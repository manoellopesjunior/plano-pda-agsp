/** Horário (São Paulo, UTC-3) em que a trilha de auditoria do turno reinicia. */
export const HORA_RESET_TURNO = 10;
/** Quantos dias de histórico o relatório do administrador consulta. */
export const DIAS_RETENCAO = 30;

const SP_OFFSET_MS = 3 * 60 * 60 * 1000; // São Paulo: UTC-3, sem horário de verão

/** Início do turno atual: última ocorrência das 10h00 em São Paulo. */
export function inicioTurnoAtual(agora = new Date()): Date {
  const sp = new Date(agora.getTime() - SP_OFFSET_MS);
  const reset = Date.UTC(sp.getUTCFullYear(), sp.getUTCMonth(), sp.getUTCDate(), HORA_RESET_TURNO);
  let inicio = reset + SP_OFFSET_MS;
  if (inicio > agora.getTime()) inicio -= 24 * 60 * 60 * 1000;
  return new Date(inicio);
}

/** Intervalo [início, fim) de um dia civil em São Paulo (yyyy-mm-dd). */
export function intervaloDia(dia: string): [Date, Date] {
  const [a, m, d] = dia.split("-").map(Number);
  const ini = Date.UTC(a, m - 1, d) + SP_OFFSET_MS;
  return [new Date(ini), new Date(ini + 24 * 60 * 60 * 1000)];
}

/** Lista dos últimos N dias (hoje primeiro) em yyyy-mm-dd, horário de São Paulo. */
export function ultimosDias(n = DIAS_RETENCAO): string[] {
  const hoje = new Date(Date.now() - SP_OFFSET_MS);
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(Date.UTC(hoje.getUTCFullYear(), hoje.getUTCMonth(), hoje.getUTCDate() - i));
    return d.toISOString().slice(0, 10);
  });
}

/** Próximo reset da trilha (próximas 10h00 em São Paulo). */
export function proximoReset(agora = new Date()): Date {
  return new Date(inicioTurnoAtual(agora).getTime() + 24 * 60 * 60 * 1000);
}

/** Tempo restante até o próximo reset, ex.: "21h45m". */
export function faltaParaReset(agora = new Date()): string {
  const min = Math.max(0, Math.floor((proximoReset(agora).getTime() - agora.getTime()) / 60000));
  return `${Math.floor(min / 60)}h${String(min % 60).padStart(2, "0")}m`;
}
