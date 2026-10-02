import { useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import type { Evento, Nivel } from "@/lib/agsp";
import { gerarRelatorioPdf } from "@/lib/relatorio";
import { DIAS_RETENCAO, intervaloDia, ultimosDias } from "@/lib/turno";
import { AuditLog } from "./AuditLog";
import { Chip, OpsButton, SectionTitle } from "./primitives";

const fmtDia = (d: string) => d.split("-").reverse().join("/");

/** Relatório do administrador: histórico dos últimos 30 dias, por dia ou completo. */
export function RelatorioAdmin() {
  const dias = ultimosDias();
  const [filtro, setFiltro] = useState<string>("todos");
  const [eventos, setEventos] = useState<Evento[] | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");

  const buscar = async () => {
    setCarregando(true);
    setErro("");
    let ini: Date, fim: Date;
    if (filtro === "todos") {
      [ini] = intervaloDia(dias[dias.length - 1]);
      [, fim] = intervaloDia(dias[0]);
    } else {
      [ini, fim] = intervaloDia(filtro);
    }
    const { data, error } = await supabase
      .from("pda_eventos")
      .select("id, posto, categoria, nivel, mensagem, responsavel, motivo, created_at")
      .gte("created_at", ini.toISOString())
      .lt("created_at", fim.toISOString())
      .order("created_at", { ascending: false })
      .limit(5000);
    setCarregando(false);
    if (error) {
      setErro("Não foi possível carregar o relatório. Tente novamente.");
      return;
    }
    setEventos(
      (data ?? []).map((l) => ({
        id: l.id,
        hora: new Date(l.created_at).toLocaleString("pt-BR", {
          day: "2-digit",
          month: "2-digit",
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
        }),
        posto: l.posto,
        categoria: l.categoria,
        nivel: l.nivel as Nivel,
        mensagem: l.mensagem,
        responsavel: l.responsavel,
        motivo: l.motivo,
      })),
    );
  };

  return (
    <section className="mt-8">
      <SectionTitle
        right={eventos ? <Chip tone="signal">{eventos.length} registro(s)</Chip> : undefined}
      >
        Relatório do administrador · últimos {DIAS_RETENCAO} dias
      </SectionTitle>
      <div className="mb-3 flex flex-wrap items-end gap-3 border border-line bg-panel-2 px-4 py-3">
        <label className="grid gap-1">
          <span className="label-mono">Período</span>
          <select
            value={filtro}
            onChange={(e) => {
              setFiltro(e.target.value);
              setEventos(null);
            }}
            className="border border-line bg-panel px-3 py-2 text-base2 text-foreground"
          >
            <option value="todos">Completo ({DIAS_RETENCAO} dias)</option>
            {dias.map((d) => (
              <option key={d} value={d}>
                {fmtDia(d)}
              </option>
            ))}
          </select>
        </label>
        <OpsButton onClick={buscar} disabled={carregando}>
          {carregando ? "Buscando…" : "Buscar"}
        </OpsButton>
        <OpsButton
          onClick={() => eventos && gerarRelatorioPdf(eventos)}
          disabled={!eventos?.length}
        >
          Exportar PDF
        </OpsButton>
        {erro && <p className="text-base2 text-alert">{erro}</p>}
      </div>
      {eventos && <AuditLog eventos={eventos} />}
    </section>
  );
}
