import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { POSTO_BY_ID, POSTOS, type Evento, type Nivel, type PostoId } from "@/lib/agsp";
import { gerarRelatorioPdf } from "@/lib/relatorio";
import { supabase } from "@/integrations/supabase/client";

export type OpsPermissoes = {
  podeAcionar: (alvo: PostoId) => boolean;
  podeTratar: (alvo: PostoId | "todos") => boolean;
};

export type OpsAutor = {
  id: string | null;
  nome: string;
};

const horaDe = (iso: string) =>
  new Date(iso).toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

const agora = () =>
  new Date().toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });

type LinhaEvento = {
  id: string;
  posto: string;
  categoria: string;
  nivel: string;
  mensagem: string;
  responsavel: string;
  motivo: string;
  created_at: string;
};

const paraEvento = (l: LinhaEvento): Evento => ({
  id: l.id,
  hora: horaDe(l.created_at),
  posto: l.posto,
  categoria: l.categoria,
  nivel: l.nivel as Nivel,
  mensagem: l.mensagem,
  responsavel: l.responsavel,
  motivo: l.motivo,
});

export function useOps(perm: OpsPermissoes, autor?: OpsAutor) {
  const [alertas, setAlertas] = useState<PostoId[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [tratativa, setTratativa] = useState<PostoId | "todos" | null>(null);
  const [negado, setNegado] = useState("");
  const [relogio, setRelogio] = useState("--:--:--");
  const [sincronizando, setSincronizando] = useState(true);

  // guarda sempre a versão mais recente das permissões / autor
  const permRef = useRef(perm);
  permRef.current = perm;
  const autorRef = useRef(autor);
  autorRef.current = autor;

  useEffect(() => {
    setRelogio(agora());
    const t = setInterval(() => setRelogio(agora()), 1000);
    return () => clearInterval(t);
  }, []);

  const carregarAlertas = useCallback(async () => {
    const { data } = await supabase
      .from("pda_alertas")
      .select("posto")
      .order("created_at", { ascending: true });
    setAlertas((data ?? []).map((r) => r.posto as PostoId));
  }, []);

  const carregarEventos = useCallback(async () => {
    const { data } = await supabase
      .from("pda_eventos")
      .select("id, posto, categoria, nivel, mensagem, responsavel, motivo, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    setEventos((data ?? []).map((l) => paraEvento(l as LinhaEvento)));
  }, []);

  // Carga inicial + sincronização em tempo real entre todos os dispositivos.
  useEffect(() => {
    let vivo = true;

    void (async () => {
      await Promise.all([carregarAlertas(), carregarEventos()]);
      if (vivo) setSincronizando(false);
    })();

    const canal = supabase
      .channel("pda-sync")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pda_alertas" },
        () => {
          void carregarAlertas();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pda_eventos" },
        () => {
          void carregarEventos();
        },
      )
      .subscribe();

    // Reconciliação ao voltar para a aba (rede instável / aparelho suspenso).
    const aoFocar = () => {
      if (document.visibilityState === "visible") {
        void carregarAlertas();
        void carregarEventos();
      }
    };
    document.addEventListener("visibilitychange", aoFocar);

    return () => {
      vivo = false;
      document.removeEventListener("visibilitychange", aoFocar);
      void supabase.removeChannel(canal);
    };
  }, [carregarAlertas, carregarEventos]);

  const registrar = useCallback(
    async (
      posto: string,
      categoria: string,
      nivel: Nivel,
      mensagem: string,
      responsavel = "—",
      motivo = "—",
    ) => {
      const { error } = await supabase.from("pda_eventos").insert({
        posto,
        categoria,
        nivel,
        mensagem,
        responsavel,
        motivo,
        autor_id: autorRef.current?.id ?? null,
      });
      if (error) {
        setNegado("Não foi possível registrar o evento no banco.");
        return;
      }
      void carregarEventos();
    },
    [carregarEventos],
  );

  const acionar = useCallback(
    async (id: PostoId) => {
      if (!permRef.current.podeAcionar(id)) {
        setNegado(`Seu perfil não tem autorização para acionar o PDA do Posto ${id}.`);
        return;
      }
      setNegado("");
      setAlertas((prev) => (prev.includes(id) ? prev : [...prev, id]));

      const { error } = await supabase.from("pda_alertas").insert({
        posto: id,
        acionado_por: autorRef.current?.id ?? null,
        acionado_por_nome: autorRef.current?.nome ?? "",
      });

      // 23505 = já estava acionado por outro dispositivo: estado já é o desejado.
      if (error && error.code !== "23505") {
        setNegado("Falha ao propagar o acionamento. Verifique a conexão.");
        void carregarAlertas();
        return;
      }

      if (!error) {
        const p = POSTO_BY_ID[id];
        await registrar(
          p.codigo,
          "PDA",
          "critico",
          `Acionamento manual — ${p.nome}`,
          autorRef.current?.nome || "—",
        );
      }
      void carregarAlertas();
    },
    [carregarAlertas, registrar],
  );

  const abrirTratativa = useCallback((alvo: PostoId | "todos") => {
    if (!permRef.current.podeTratar(alvo)) {
      setNegado(
        alvo === "todos"
          ? "Somente o Administrador pode resetar a central."
          : `Seu perfil não tem autorização para tratar o Posto ${alvo}.`,
      );
      return;
    }
    setNegado("");
    setTratativa(alvo);
  }, []);

  const concluirTratativa = useCallback(
    async (id: PostoId, responsavel: string, motivo: string, detalhe: string) => {
      if (!permRef.current.podeTratar(id)) return;
      setAlertas((prev) => prev.filter((a) => a !== id));
      setTratativa(null);

      const { error } = await supabase.from("pda_alertas").delete().eq("posto", id);
      if (error) {
        setNegado("Falha ao desarmar no servidor. Verifique a conexão.");
        void carregarAlertas();
        return;
      }

      const p = POSTO_BY_ID[id];
      await registrar(
        p.codigo,
        "Tratativa",
        "info",
        detalhe.trim() || `Desarme confirmado — ${p.nome}`,
        responsavel,
        motivo,
      );
      void carregarAlertas();
    },
    [carregarAlertas, registrar],
  );

  const concluirLimpeza = useCallback(
    async (responsavel: string, motivo: string, detalhe: string) => {
      if (!permRef.current.podeTratar("todos")) return;
      setAlertas([]);
      setTratativa(null);

      const { error } = await supabase.from("pda_alertas").delete().neq("posto", "");
      if (error) {
        setNegado("Falha ao restabelecer a central. Verifique a conexão.");
        void carregarAlertas();
        return;
      }

      await registrar(
        "TODOS",
        "Tratativa",
        "info",
        detalhe.trim() || "Central restabelecida — todos os postos desarmados",
        responsavel,
        motivo,
      );
      void carregarAlertas();
    },
    [carregarAlertas, registrar],
  );

  const emAlerta = useCallback((id: PostoId) => alertas.includes(id), [alertas]);

  /** Posto sem invasão, porém em prevenção porque outro posto acionou o PDA. */
  const emPrevencao = useCallback(
    (id: PostoId) => alertas.length > 0 && !alertas.includes(id),
    [alertas],
  );

  const exportarPdf = useCallback(() => {
    gerarRelatorioPdf(eventos);
  }, [eventos]);

  const postos = useMemo(() => POSTOS, []);

  return {
    postos,
    alertas,
    nAlertas: alertas.length,
    emAlerta,
    emPrevencao,
    eventos,
    relogio,
    sincronizando,
    tratativa,
    setTratativa,
    abrirTratativa,
    negado,
    limparNegado: () => setNegado(""),
    acionar,
    concluirTratativa,
    concluirLimpeza,
    exportarPdf,
  };
}

export type Ops = ReturnType<typeof useOps>;
