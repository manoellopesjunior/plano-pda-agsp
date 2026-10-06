import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { POSTOS, type Evento, type Nivel, type PostoId } from "@/lib/agsp";
import { gerarRelatorioPdf } from "@/lib/relatorio";
import { inicioTurnoAtual } from "@/lib/turno";
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

export type Conexao = "sincronizado" | "sincronizando" | "offline";

const MSG_ERRO: Record<string, string> = {
  sem_permissao: "Operação bloqueada pelo servidor: seu perfil não tem autorização para este posto.",
  responsavel_obrigatorio: "Informe o responsável pela tratativa.",
  posto_invalido: "Posto inválido.",
  nao_autenticado: "Sessão expirada. Entre novamente.",
};
const msgErro = (e: { message?: string } | null, padrao: string) => {
  const chave = Object.keys(MSG_ERRO).find((k) => e?.message?.includes(k));
  return chave ? MSG_ERRO[chave] : padrao;
};

export function useOps(perm: OpsPermissoes, _autor?: OpsAutor) {
  const [alertas, setAlertas] = useState<PostoId[]>([]);
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [tratativa, setTratativa] = useState<PostoId | "todos" | null>(null);
  const [negado, setNegado] = useState("");
  const [relogio, setRelogio] = useState("--:--:--");
  const [sincronizando, setSincronizando] = useState(true);
  const [conexao, setConexao] = useState<Conexao>("sincronizando");
  const [ocupado, setOcupado] = useState<string | null>(null);
  const ocupadoRef = useRef(false);

  const permRef = useRef(perm);
  permRef.current = perm;

  useEffect(() => {
    setRelogio(agora());
    const t = setInterval(() => setRelogio(agora()), 1000);
    return () => clearInterval(t);
  }, []);

  const carregarAlertas = useCallback(async () => {
    const { data, error } = await supabase
      .from("pda_alertas")
      .select("posto")
      .order("created_at", { ascending: true });
    if (error) throw error;
    setAlertas((data ?? []).map((r) => r.posto as PostoId));
  }, []);

  // Trilha do turno: registros desde as 10h00 (São Paulo) — persiste a recargas.
  const carregarEventos = useCallback(async () => {
    const { data, error } = await supabase
      .from("pda_eventos")
      .select("id, posto, categoria, nivel, mensagem, responsavel, motivo, created_at")
      .gte("created_at", inicioTurnoAtual().toISOString())
      .order("created_at", { ascending: false })
      .limit(500);
    if (error) throw error;
    setEventos((data ?? []).map((l) => paraEvento(l as LinhaEvento)));
  }, []);

  /** Recarrega tudo do banco (fonte de verdade) e atualiza o indicador de enlace. */
  const sincronizar = useCallback(async () => {
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      setConexao("offline");
      return;
    }
    setConexao("sincronizando");
    try {
      await Promise.all([carregarAlertas(), carregarEventos()]);
      setConexao("sincronizado");
    } catch {
      setConexao("offline");
    } finally {
      setSincronizando(false);
    }
  }, [carregarAlertas, carregarEventos]);
  const sincronizarRef = useRef(sincronizar);
  sincronizarRef.current = sincronizar;

  // Vira o turno automaticamente às 10h00 sem precisar recarregar.
  useEffect(() => {
    let turno = inicioTurnoAtual().getTime();
    const t = setInterval(() => {
      const novo = inicioTurnoAtual().getTime();
      if (novo !== turno) {
        turno = novo;
        void carregarEventos().catch(() => setConexao("offline"));
      }
    }, 30_000);
    return () => clearInterval(t);
  }, [carregarEventos]);

  // Carga inicial + tempo real + reconciliação em queda/retorno de conexão.
  useEffect(() => {
    void sincronizarRef.current();

    const canal = supabase
      .channel("pda-sync")
      .on("postgres_changes", { event: "*", schema: "public", table: "pda_alertas" }, () => {
        void carregarAlertas().catch(() => setConexao("offline"));
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "pda_eventos" }, () => {
        void carregarEventos().catch(() => setConexao("offline"));
      })
      .subscribe((status) => {
        if (status === "SUBSCRIBED") void sincronizarRef.current();
        else if (status === "CHANNEL_ERROR" || status === "TIMED_OUT" || status === "CLOSED")
          setConexao("offline");
      });

    const aoFocar = () => {
      if (document.visibilityState === "visible") void sincronizarRef.current();
    };
    const aoVoltar = () => void sincronizarRef.current();
    const aoCair = () => setConexao("offline");
    document.addEventListener("visibilitychange", aoFocar);
    window.addEventListener("online", aoVoltar);
    window.addEventListener("offline", aoCair);
    // Verificação periódica: detecta enlace morto mesmo sem evento do navegador.
    const t = setInterval(() => void sincronizarRef.current(), 60_000);

    return () => {
      document.removeEventListener("visibilitychange", aoFocar);
      window.removeEventListener("online", aoVoltar);
      window.removeEventListener("offline", aoCair);
      clearInterval(t);
      void supabase.removeChannel(canal);
    };
  }, [carregarAlertas, carregarEventos]);

  /** Executa uma operação crítica: um por vez, sem estado otimista; ao final o banco manda. */
  const executar = useCallback(
    async (chave: string, op: () => Promise<{ data: unknown; error: { message?: string } | null }>, falha: string, avisos: Record<string, string> = {}) => {
      if (ocupadoRef.current) return false;
      ocupadoRef.current = true;
      setOcupado(chave);
      setNegado("");
      try {
        const { data, error } = await op();
        if (error) {
          setNegado(msgErro(error, falha));
          return false;
        }
        const aviso = avisos[String(data)];
        if (aviso) setNegado(aviso);
        return true;
      } catch {
        setNegado(falha);
        return false;
      } finally {
        ocupadoRef.current = false;
        setOcupado(null);
        await sincronizarRef.current();
      }
    },
    [],
  );

  const acionar = useCallback(
    async (id: PostoId) => {
      if (!permRef.current.podeAcionar(id)) {
        setNegado(`Seu perfil não tem autorização para acionar o PDA do Posto ${id}.`);
        return;
      }
      await executar(
        `acionar-${id}`,
        async () => await supabase.rpc("pda_acionar", { _posto: id }),
        "Falha ao propagar o acionamento. Verifique a conexão — o quadro mostra o estado real do servidor.",
        { ja_acionado: `O Posto ${id} já estava acionado por outro dispositivo.` },
      );
    },
    [executar],
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
      const ok = await executar(
        `tratar-${id}`,
        async () =>
          await supabase.rpc("pda_tratar", {
            _posto: id,
            _responsavel: responsavel,
            _motivo: motivo,
            _detalhe: detalhe,
          }),
        "Falha ao desarmar no servidor. O alerta continua ativo — tente novamente.",
        { ja_tratado: `O Posto ${id} já havia sido tratado por outro operador.` },
      );
      if (ok) setTratativa(null);
    },
    [executar],
  );

  const concluirLimpeza = useCallback(
    async (responsavel: string, motivo: string, detalhe: string) => {
      if (!permRef.current.podeTratar("todos")) return;
      const ok = await executar(
        "resetar",
        async () =>
          await supabase.rpc("pda_resetar", {
            _responsavel: responsavel,
            _motivo: motivo,
            _detalhe: detalhe,
          }),
        "Falha ao restabelecer a central. Nenhum posto foi desarmado — tente novamente.",
      );
      if (ok) setTratativa(null);
    },
    [executar],
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
    conexao,
    ocupado,
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
