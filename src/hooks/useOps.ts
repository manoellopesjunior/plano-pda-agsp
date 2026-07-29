import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  CSV_FIELDS,
  POSTO_BY_ID,
  POSTOS,
  type Evento,
  type Nivel,
  type PostoId,
} from "@/lib/agsp";

const hora = () =>
  new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

let seq = 0;
const nextId = () => `ev-${Date.now()}-${seq++}`;

export function useOps() {
  const [alertas, setAlertas] = useState<PostoId[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [tratativa, setTratativa] = useState<PostoId | "todos" | null>(null);
  const [relogio, setRelogio] = useState(() => hora());
  const montado = useRef(false);

  useEffect(() => {
    montado.current = true;
    const t = setInterval(() => setRelogio(hora()), 1000);
    return () => clearInterval(t);
  }, []);

  const registrar = useCallback(
    (
      posto: string,
      categoria: string,
      nivel: Nivel,
      mensagem: string,
      responsavel = "—",
      motivo = "—",
    ) => {
      setEventos((prev) =>
        [
          { id: nextId(), hora: hora(), posto, categoria, nivel, mensagem, responsavel, motivo },
          ...prev,
        ].slice(0, 200),
      );
    },
    [],
  );

  const acionar = useCallback(
    (id: PostoId) => {
      setAlertas((prev) => (prev.includes(id) ? prev : [...prev, id]));
      const p = POSTO_BY_ID[id];
      registrar(p.codigo, "PDA", "critico", `Acionamento manual — ${p.nome}`);
    },
    [registrar],
  );

  const concluirTratativa = useCallback(
    (id: PostoId, responsavel: string, motivo: string, detalhe: string) => {
      setAlertas((prev) => prev.filter((a) => a !== id));
      const p = POSTO_BY_ID[id];
      registrar(
        p.codigo,
        "Tratativa",
        "info",
        detalhe.trim() || `Desarme confirmado — ${p.nome}`,
        responsavel,
        motivo,
      );
      setTratativa(null);
    },
    [registrar],
  );

  const concluirLimpeza = useCallback(
    (responsavel: string, motivo: string, detalhe: string) => {
      setAlertas([]);
      registrar(
        "TODOS",
        "Tratativa",
        "info",
        detalhe.trim() || "Central restabelecida — todos os postos desarmados",
        responsavel,
        motivo,
      );
      setTratativa(null);
    },
    [registrar],
  );

  const emAlerta = useCallback((id: PostoId) => alertas.includes(id), [alertas]);

  const csv = useMemo(() => {
    const linhas = [CSV_FIELDS.join(",")];
    for (const e of eventos) {
      linhas.push(
        CSV_FIELDS.map((f) => `"${String(e[f]).replace(/"/g, '""')}"`).join(","),
      );
    }
    return linhas.join("\n");
  }, [eventos]);

  const exportar = useCallback(() => {
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `auditoria-agsp-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }, [csv]);

  return {
    postos: POSTOS,
    alertas,
    nAlertas: alertas.length,
    emAlerta,
    eventos,
    relogio,
    tratativa,
    setTratativa,
    acionar,
    concluirTratativa,
    concluirLimpeza,
    exportar,
  };
}

export type Ops = ReturnType<typeof useOps>;
