import { useCallback, useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";

import { Chip, OpsButton, SectionTitle } from "@/components/ops/primitives";
import { useAuth } from "@/hooks/useAuth";
import {
  alterarSenhaUsuario,
  criarUsuario,
  definirSituacaoUsuario,
  editarUsuario,
  excluirUsuario,
  listarUsuarios,
} from "@/lib/admin.functions";
import { ROLE_LABEL, type AppRole, type UsuarioAdmin } from "@/lib/admin.shared";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({
    meta: [
      { title: "Gestão de acessos — AGSP | PMAC" },
      {
        name: "description",
        content:
          "Painel administrativo do Centro de Operações da Guarda: criação de acessos, perfis, posto vinculado, troca de senha e exclusão de usuários.",
      },
      { property: "og:title", content: "Gestão de acessos — AGSP | PMAC" },
      {
        property: "og:description",
        content:
          "Painel administrativo do Centro de Operações da Guarda: criação de acessos, perfis, posto vinculado, troca de senha e exclusão de usuários.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: PainelAdmin,
});

const ROLES: AppRole[] = ["admin", "oficial", "comum"];
const POSTOS_IDS = [1, 2, 3, 4, 5, 6];

function entrada(id: string, rotulo: string, node: React.ReactNode) {
  return (
    <div key={id} className="grid gap-1.5">
      <label htmlFor={id} className="label-mono">
        {rotulo}
      </label>
      {node}
    </div>
  );
}

const inputCls =
  "w-full border border-line bg-panel-2 px-3 py-2.5 font-mono text-base2 text-foreground outline-none focus:border-signal/70";

function PainelAdmin() {
  const { isAdmin, role, perfil, sair } = useAuth();
  const listar = useServerFn(listarUsuarios);
  const criar = useServerFn(criarUsuario);
  const editar = useServerFn(editarUsuario);
  const trocarSenha = useServerFn(alterarSenhaUsuario);
  const situacao = useServerFn(definirSituacaoUsuario);
  const excluir = useServerFn(excluirUsuario);

  const [usuarios, setUsuarios] = useState<UsuarioAdmin[]>([]);
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [ocupado, setOcupado] = useState(false);

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [posto, setPosto] = useState("");
  const [novaRole, setNovaRole] = useState<AppRole>("comum");
  const [novoPostoId, setNovoPostoId] = useState<string>("");

  const [editando, setEditando] = useState<UsuarioAdmin | null>(null);
  const [edNome, setEdNome] = useState("");
  const [edPosto, setEdPosto] = useState("");
  const [edRole, setEdRole] = useState<AppRole>("comum");
  const [edPostoId, setEdPostoId] = useState<string>("");

  const recarregar = useCallback(async () => {
    try {
      setUsuarios(await listar({}));
      setErro("");
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Falha ao carregar os acessos.");
    }
  }, [listar]);

  useEffect(() => {
    if (role === "admin") void recarregar();
  }, [role, recarregar]);

  async function executar(acao: () => Promise<unknown>, mensagem: string) {
    setOcupado(true);
    setErro("");
    setAviso("");
    try {
      await acao();
      setAviso(mensagem);
      await recarregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : "Operação não concluída.");
    } finally {
      setOcupado(false);
    }
  }

  function abrirEdicao(u: UsuarioAdmin) {
    setEditando(u);
    setEdNome(u.nome);
    setEdPosto(u.posto);
    setEdRole(u.role);
    setEdPostoId(u.postoId ? String(u.postoId) : "");
  }

  if (role !== null && !isAdmin) {
    return (
      <div className="grid min-h-screen place-items-center bg-background px-4">
        <div className="max-w-md border border-line border-l-4 border-l-alert bg-alert-bg px-4 py-4 text-center">
          <p className="font-mono text-micro font-semibold tracking-[0.14em] text-alert">NEGADO</p>
          <p className="mt-2 text-base2 text-foreground">
            Área restrita ao perfil Administrador.
          </p>
          <Link to="/" className="label-mono mt-4 inline-block text-signal-soft hover:underline">
            Voltar ao painel
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="techgrid min-h-screen">
        <div className="mx-auto w-full max-w-[1100px] px-4 py-4 sm:px-6">
          <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border border-line border-l-[3px] border-l-signal bg-panel px-4 py-3">
            <div className="min-w-0">
              <h1 className="truncate font-display text-head font-bold tracking-[0.16em] uppercase text-foreground">
                Gestão de acessos
              </h1>
              <p className="label-mono truncate normal-case">
                {perfil?.nome || perfil?.email} · Administrador
              </p>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Link to="/">
                <OpsButton>Painel</OpsButton>
              </Link>
              <OpsButton variant="alert" onClick={() => void sair()}>
                Sair
              </OpsButton>
            </div>
          </header>

          {(erro || aviso) && (
            <div
              role="status"
              className={cn(
                "mt-3 border border-line border-l-4 px-3 py-2 text-base2 text-foreground",
                erro ? "border-l-alert bg-alert-bg" : "border-l-ok bg-ok/10",
              )}
            >
              {erro || aviso}
            </div>
          )}

          <section className="mt-4">
            <SectionTitle>Novo acesso</SectionTitle>
            <form
              className="grid gap-3 border border-line bg-panel-2 p-4 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                void executar(async () => {
                  await criar({
                    data: {
                      nome,
                      email,
                      senha,
                      posto,
                      postoId: novaRole === "oficial" && novoPostoId ? Number(novoPostoId) : null,
                      role: novaRole,
                    },
                  });
                  setNome("");
                  setEmail("");
                  setSenha("");
                  setPosto("");
                  setNovaRole("comum");
                  setNovoPostoId("");
                }, "Acesso criado.");
              }}
            >
              {entrada(
                "nome",
                "Nome completo",
                <input
                  id="nome"
                  className={inputCls}
                  value={nome}
                  maxLength={120}
                  onChange={(e) => setNome(e.target.value)}
                  required
                />,
              )}
              {entrada(
                "email",
                "E-mail",
                <input
                  id="email"
                  type="email"
                  className={inputCls}
                  value={email}
                  maxLength={255}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />,
              )}
              {entrada(
                "senha",
                "Senha inicial (mín. 8)",
                <input
                  id="senha"
                  type="text"
                  className={inputCls}
                  value={senha}
                  minLength={8}
                  maxLength={128}
                  onChange={(e) => setSenha(e.target.value)}
                  required
                />,
              )}
              {entrada(
                "posto",
                "Posto / graduação ou nome de guerra",
                <input
                  id="posto"
                  className={inputCls}
                  value={posto}
                  maxLength={120}
                  onChange={(e) => setPosto(e.target.value)}
                />,
              )}
              {entrada(
                "perfil",
                "Perfil",
                <select
                  id="perfil"
                  className={inputCls}
                  value={novaRole}
                  onChange={(e) => setNovaRole(e.target.value as AppRole)}
                >
                  {ROLES.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </option>
                  ))}
                </select>,
              )}
              {entrada(
                "postoId",
                "Posto vinculado (autoriza o PDA)",
                <select
                  id="postoId"
                  className={inputCls}
                  value={novoPostoId}
                  disabled={novaRole !== "oficial"}
                  onChange={(e) => setNovoPostoId(e.target.value)}
                >
                  <option value="">Nenhum</option>
                  {POSTOS_IDS.map((n) => (
                    <option key={n} value={n}>
                      Posto {n}
                    </option>
                  ))}
                </select>,
              )}
              <div className="flex items-end sm:col-span-2">
                <OpsButton variant="signal" type="submit" disabled={ocupado} className="w-full justify-center">
                  {ocupado ? "Processando…" : "Criar acesso"}
                </OpsButton>
              </div>
            </form>
          </section>

          {editando && (
            <section className="mt-4">
              <SectionTitle right={<Chip tone="signal">{editando.email}</Chip>}>
                Editar acesso
              </SectionTitle>
              <form
                className="grid gap-3 border border-line bg-panel-2 p-4 sm:grid-cols-2"
                onSubmit={(e) => {
                  e.preventDefault();
                  const alvo = editando;
                  void executar(async () => {
                    await editar({
                      data: {
                        userId: alvo.id,
                        nome: edNome,
                        posto: edPosto,
                        postoId: edRole === "oficial" && edPostoId ? Number(edPostoId) : null,
                        role: edRole,
                      },
                    });
                    setEditando(null);
                  }, "Acesso atualizado.");
                }}
              >
                {entrada(
                  "ed-nome",
                  "Nome completo",
                  <input
                    id="ed-nome"
                    className={inputCls}
                    value={edNome}
                    maxLength={120}
                    onChange={(e) => setEdNome(e.target.value)}
                    required
                  />,
                )}
                {entrada(
                  "ed-posto",
                  "Posto / graduação ou nome de guerra",
                  <input
                    id="ed-posto"
                    className={inputCls}
                    value={edPosto}
                    maxLength={120}
                    onChange={(e) => setEdPosto(e.target.value)}
                  />,
                )}
                {entrada(
                  "ed-perfil",
                  "Perfil",
                  <select
                    id="ed-perfil"
                    className={inputCls}
                    value={edRole}
                    onChange={(e) => setEdRole(e.target.value as AppRole)}
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {ROLE_LABEL[r]}
                      </option>
                    ))}
                  </select>,
                )}
                {entrada(
                  "ed-postoId",
                  "Posto vinculado (autoriza o PDA)",
                  <select
                    id="ed-postoId"
                    className={inputCls}
                    value={edPostoId}
                    disabled={edRole !== "oficial"}
                    onChange={(e) => setEdPostoId(e.target.value)}
                  >
                    <option value="">Nenhum</option>
                    {POSTOS_IDS.map((n) => (
                      <option key={n} value={n}>
                        Posto {n}
                      </option>
                    ))}
                  </select>,
                )}
                <div className="flex flex-wrap items-end gap-2 sm:col-span-2">
                  <OpsButton variant="signal" type="submit" disabled={ocupado}>
                    Salvar alterações
                  </OpsButton>
                  <OpsButton type="button" onClick={() => setEditando(null)}>
                    Cancelar
                  </OpsButton>
                </div>
              </form>
            </section>
          )}

          <section className="mt-5 pb-10">
            <SectionTitle right={<Chip tone="signal">{usuarios.length} acesso(s)</Chip>}>
              Acessos cadastrados
            </SectionTitle>

            <div className="overflow-x-auto border border-line bg-panel-2">
              <table className="w-full min-w-[760px] border-collapse text-left">
                <thead>
                  <tr className="border-b border-line bg-panel">
                    {["Nome", "Posto / graduação", "E-mail", "Perfil", "Situação", "Ações"].map(
                      (h) => (
                        <th key={h} className="label-mono px-3 py-2 font-semibold">
                          {h}
                        </th>
                      ),
                    )}
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map((u) => (
                    <tr key={u.id} className="border-b border-line align-top last:border-b-0">
                      <td className="px-3 py-3 font-display text-base2 font-bold tracking-[0.06em] uppercase text-foreground">
                        {u.nome || "—"}
                      </td>
                      <td className="px-3 py-3 text-base2 text-muted-foreground">
                        {u.posto || "—"}
                        {u.postoId ? (
                          <span className="label-mono ml-2">· PDA {u.postoId}</span>
                        ) : null}
                      </td>
                      <td className="px-3 py-3 font-mono text-micro text-muted-foreground">
                        {u.email}
                      </td>
                      <td className="px-3 py-3 text-base2 text-foreground">{ROLE_LABEL[u.role]}</td>
                      <td
                        className={cn(
                          "px-3 py-3 font-mono text-micro font-semibold tracking-[0.14em]",
                          u.ativo ? "text-ok" : "text-alert",
                        )}
                      >
                        {u.ativo ? "ATIVO" : "DESATIVADO"}
                      </td>
                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-2">
                          <OpsButton disabled={ocupado} onClick={() => abrirEdicao(u)}>
                            Editar
                          </OpsButton>
                          <OpsButton
                            disabled={ocupado}
                            onClick={() => {
                              const nova = window.prompt(`Nova senha para ${u.email} (mín. 8):`);
                              if (!nova) return;
                              if (nova.length < 8) {
                                setErro("A senha deve ter no mínimo 8 caracteres.");
                                return;
                              }
                              void executar(
                                () => trocarSenha({ data: { userId: u.id, senha: nova } }),
                                "Senha alterada.",
                              );
                            }}
                          >
                            Trocar senha
                          </OpsButton>
                          <OpsButton
                            variant={u.ativo ? "alert" : "signal"}
                            disabled={ocupado}
                            onClick={() =>
                              void executar(
                                () => situacao({ data: { userId: u.id, ativo: !u.ativo } }),
                                u.ativo ? "Acesso desativado." : "Acesso reativado.",
                              )
                            }
                          >
                            {u.ativo ? "Desativar" : "Reativar"}
                          </OpsButton>
                          <OpsButton
                            variant="alert"
                            disabled={ocupado}
                            onClick={() => {
                              if (!window.confirm(`Excluir definitivamente o acesso ${u.email}?`))
                                return;
                              void executar(
                                () => excluir({ data: { userId: u.id } }),
                                "Acesso excluído.",
                              );
                            }}
                          >
                            Excluir
                          </OpsButton>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
