import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";

import { AuditLog } from "@/components/ops/AuditLog";
import { CameraGrid, MiniCams } from "@/components/ops/CameraGrid";
import { MonitorBoard } from "@/components/ops/MonitorBoard";
import { TacticalMap } from "@/components/ops/TacticalMap";
import { TratativaForm } from "@/components/ops/TratativaForm";
import { Chip, OpsButton, SectionTitle, StatusMsg } from "@/components/ops/primitives";
import { useOps } from "@/hooks/useOps";
import { GUARDA1_POSTOS, POSTOS, TELAS, type PostoId, type Tela } from "@/lib/agsp";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "AGSP — Centro de Operações da Guarda | PMAC" },
      {
        name: "description",
        content:
          "Painel operacional do Arsenal de Guerra de São Paulo: mapa tático dos seis postos, quadros de sirene da CT e da Guarda 1, câmeras e auditoria de acionamentos.",
      },
      { property: "og:title", content: "AGSP — Centro de Operações da Guarda" },
      {
        property: "og:description",
        content:
          "Mapa tático, quadros de monitoramento, câmeras e trilha de auditoria dos postos de sentinela do AGSP.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: CentroOperacoes,
});

const TODOS: PostoId[] = ["1", "2", "3", "4", "5", "6"];

function CentroOperacoes() {
  const ops = useOps();
  const [tela, setTela] = useState<Tela>("Visão Geral");
  const [selecionado, setSelecionado] = useState<PostoId | null>(null);

  const postoAtivo = useMemo(
    () => POSTOS.find((p) => p.id === selecionado) ?? null,
    [selecionado],
  );

  const abrirTratativa = (alvo: PostoId | "todos") => ops.setTratativa(alvo);

  return (
    <div className="min-h-screen bg-background">
      <div className="techgrid min-h-screen bg-[radial-gradient(ellipse_at_top,rgba(62,198,224,.07),transparent_60%)]">
        <div className="mx-auto w-full max-w-[1500px] px-4 py-4 sm:px-6">
          {/* Cabeçalho */}
          <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border border-line border-l-[3px] border-l-signal bg-[linear-gradient(100deg,var(--panel-2),var(--panel)_55%,var(--panel-2))] px-4 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="grid size-11 shrink-0 place-items-center border border-signal/40 bg-panel-2">
                <svg viewBox="0 0 24 24" className="size-6 text-signal" fill="none">
                  <path
                    d="M12 2.5 4 5.5v6c0 5 3.4 8.7 8 10 4.6-1.3 8-5 8-10v-6l-8-3Z"
                    stroke="currentColor"
                    strokeWidth="1.6"
                  />
                  <path d="M12 8v8M8 12h8" stroke="currentColor" strokeWidth="1.4" />
                </svg>
              </span>
              <div className="min-w-0">
                <h1 className="truncate font-display text-head font-bold tracking-[0.16em] uppercase text-foreground">
                  PMAC · AGSP
                </h1>
                <p className="label-mono truncate normal-case">
                  Centro de Operações da Guarda — Arsenal de Guerra de São Paulo
                </p>
              </div>
            </div>
            <div className="hidden shrink-0 items-center gap-2 sm:flex">
              <Chip tone="signal">
                <i className="size-1.5 rounded-full bg-ok" />
                Enlace ativo
              </Chip>
              <Chip tone={ops.nAlertas ? "alert" : "ok"}>
                {ops.nAlertas ? `${ops.nAlertas} alerta` : "Perímetro íntegro"}
              </Chip>
              <Chip>{ops.relogio}</Chip>
            </div>
          </header>

          {/* Navegação */}
          <nav
            aria-label="Telas do centro de operações"
            className="mt-3 grid grid-cols-2 gap-px border border-line bg-line sm:grid-cols-5"
          >
            {TELAS.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTela(t)}
                aria-current={tela === t ? "page" : undefined}
                className={cn(
                  "px-3 py-2.5 font-display text-base2 font-semibold tracking-[0.12em] uppercase transition-colors",
                  tela === t
                    ? "bg-signal/15 text-signal-soft shadow-[inset_0_-2px_0_var(--signal)]"
                    : "bg-panel-2 text-muted-foreground hover:bg-panel hover:text-foreground",
                )}
              >
                {t}
              </button>
            ))}
          </nav>

          {/* Régua de estado dos postos */}
          <ul className="mt-3 grid gap-px border border-line bg-line [grid-template-columns:repeat(auto-fit,minmax(120px,1fr))]">
            {POSTOS.map((p) => {
              const on = ops.emAlerta(p.id);
              return (
                <li
                  key={p.id}
                  className={cn(
                    "grid grid-cols-[auto_minmax(0,1fr)] items-center gap-2 px-3 py-2",
                    on ? "bg-alert-bg" : "bg-panel-2",
                  )}
                >
                  <i
                    aria-hidden
                    className={cn("size-2 rounded-full", on ? "bg-alert" : "bg-ok")}
                    style={on ? { animation: "alert-breathe 1.2s ease-in-out infinite" } : undefined}
                  />
                  <div className="min-w-0">
                    <p className="label-mono truncate">{p.codigo}</p>
                    <p
                      className={cn(
                        "truncate font-display text-base2 font-bold tracking-[0.08em] uppercase",
                        on ? "text-alert" : "text-ok",
                      )}
                    >
                      {on ? "Alerta" : "Normal"}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>

          {/* Barra de estado + ações */}
          <div className="mt-3 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
            <StatusMsg kind={ops.nAlertas ? "alert" : "ok"}>
              {ops.nAlertas
                ? `${ops.nAlertas} posto(s) com acionamento de PDA pendente de tratativa`
                : "Todos os seis postos de sentinela operando dentro da normalidade"}
            </StatusMsg>
            <div className="flex flex-wrap gap-2">
              <OpsButton
                variant="alert"
                disabled={!ops.nAlertas}
                onClick={() => abrirTratativa("todos")}
              >
                Resetar central
              </OpsButton>
              <OpsButton disabled={!ops.eventos.length} onClick={ops.exportar}>
                Exportar CSV
              </OpsButton>
            </div>
          </div>

          {ops.tratativa && (
            <div className="mt-3">
              <TratativaForm
                alvo={ops.tratativa}
                onCancelar={() => ops.setTratativa(null)}
                onConfirmar={(resp, motivo, detalhe) =>
                  ops.tratativa === "todos"
                    ? ops.concluirLimpeza(resp, motivo, detalhe)
                    : ops.concluirTratativa(ops.tratativa as PostoId, resp, motivo, detalhe)
                }
              />
            </div>
          )}

          <main className="mt-4 pb-10">
            {tela === "Visão Geral" && (
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1.45fr)_minmax(0,1fr)]">
                <section>
                  <SectionTitle right={<Chip tone="signal">Tempo real</Chip>}>
                    Perímetro
                  </SectionTitle>
                  <TacticalMap
                    postos={POSTOS}
                    emAlerta={ops.emAlerta}
                    selecionado={selecionado}
                    onSelect={setSelecionado}
                    relogio={ops.relogio}
                    nAlertas={ops.nAlertas}
                  />
                  <div className="mt-3">
                    <p className="label-mono mb-2">Miniaturas de câmera</p>
                    <MiniCams postos={POSTOS} emAlerta={ops.emAlerta} />
                  </div>
                </section>

                <section className="grid content-start gap-4">
                  <div>
                    <SectionTitle>Quadros de sirene</SectionTitle>
                    <div className="grid gap-3">
                      <MonitorBoard
                        titulo="CT — Quadro de monitoramento"
                        variante="ct"
                        postos={TODOS}
                        emAlerta={ops.emAlerta}
                      />
                      <MonitorBoard
                        titulo="Guarda 1 — Quadro de monitoramento"
                        variante="guarda"
                        postos={GUARDA1_POSTOS}
                        emAlerta={ops.emAlerta}
                      />
                    </div>
                  </div>

                  <div>
                    <SectionTitle>
                      {postoAtivo ? `Posto ${postoAtivo.id}` : "Simulador de PDA"}
                    </SectionTitle>
                    {postoAtivo ? (
                      <div className="border border-line bg-panel-2 p-4">
                        <p className="font-display text-lead font-bold tracking-[0.1em] uppercase text-foreground">
                          {postoAtivo.nome}
                        </p>
                        <p className="mt-1 text-base2 text-muted-foreground">{postoAtivo.desc}</p>
                        <p className="label-mono mt-2">
                          {postoAtivo.lat.toFixed(5)} / {postoAtivo.lon.toFixed(5)}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2">
                          {ops.emAlerta(postoAtivo.id) ? (
                            <OpsButton
                              variant="alert"
                              onClick={() => abrirTratativa(postoAtivo.id)}
                            >
                              Tratar acionamento
                            </OpsButton>
                          ) : (
                            <OpsButton variant="signal" onClick={() => ops.acionar(postoAtivo.id)}>
                              Acionar PDA
                            </OpsButton>
                          )}
                          <OpsButton onClick={() => setSelecionado(null)}>Fechar</OpsButton>
                        </div>
                      </div>
                    ) : (
                      <div className="border border-dashed border-line bg-panel-2 px-4 py-6 text-center">
                        <p className="label-mono normal-case">
                          Selecione um pino no mapa para acionar ou tratar um posto
                        </p>
                      </div>
                    )}
                  </div>
                </section>
              </div>
            )}

            {tela === "Mapa" && (
              <section className="mx-auto max-w-4xl">
                <SectionTitle right={<Chip tone="signal">Ortofoto AGSP</Chip>}>
                  Mapa tático ampliado
                </SectionTitle>
                <TacticalMap
                  postos={POSTOS}
                  emAlerta={ops.emAlerta}
                  selecionado={selecionado}
                  onSelect={setSelecionado}
                  relogio={ops.relogio}
                  nAlertas={ops.nAlertas}
                />
              </section>
            )}

            {tela === "Câmeras" && (
              <section>
                <SectionTitle right={<Chip tone="ok">6 canais</Chip>}>
                  Circuito de câmeras
                </SectionTitle>
                <CameraGrid postos={POSTOS} emAlerta={ops.emAlerta} destaque={selecionado} />
              </section>
            )}

            {tela === "Quadros" && (
              <section className="grid gap-4 lg:grid-cols-2">
                <div className="grid content-start gap-3">
                  <MonitorBoard
                    titulo="CT — Quadro de monitoramento"
                    variante="ct"
                    postos={TODOS}
                    emAlerta={ops.emAlerta}
                  />
                  <MonitorBoard
                    titulo="Guarda 1 — Quadro de monitoramento"
                    variante="guarda"
                    postos={GUARDA1_POSTOS}
                    emAlerta={ops.emAlerta}
                  />
                </div>
                <div>
                  <SectionTitle>Situação operacional</SectionTitle>
                  <ul className="grid gap-px border border-line bg-line">
                    {POSTOS.map((p) => {
                      const on = ops.emAlerta(p.id);
                      return (
                        <li
                          key={p.id}
                          className={cn(
                            "grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-3 py-3",
                            on ? "bg-alert-bg" : "bg-panel-2",
                          )}
                        >
                          <div className="min-w-0">
                            <p className="truncate font-display text-base2 font-bold tracking-[0.1em] uppercase text-foreground">
                              {p.codigo} · {p.nome}
                            </p>
                            <p className="label-mono truncate normal-case">{p.desc}</p>
                          </div>
                          {on ? (
                            <OpsButton
                              variant="alert"
                              className="shrink-0"
                              onClick={() => abrirTratativa(p.id)}
                            >
                              Tratar
                            </OpsButton>
                          ) : (
                            <OpsButton
                              variant="signal"
                              className="shrink-0"
                              onClick={() => ops.acionar(p.id)}
                            >
                              Acionar
                            </OpsButton>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </section>
            )}

            {tela === "Auditoria" && (
              <section>
                <SectionTitle
                  right={
                    <Chip tone="signal">{ops.eventos.length} registro(s)</Chip>
                  }
                >
                  Trilha de auditoria
                </SectionTitle>
                <AuditLog eventos={ops.eventos} />
              </section>
            )}
          </main>

          <footer className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 border-t border-line py-4">
            <p className="label-mono truncate normal-case">
              Sistema demonstrativo — dados operacionais simulados
            </p>
            <span className="label-mono shrink-0">Build 5.0</span>
          </footer>
        </div>
      </div>
    </div>
  );
}
