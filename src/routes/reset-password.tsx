import { useEffect, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { OpsButton } from "@/components/ops/primitives";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Redefinir senha — AGSP | PMAC" },
      {
        name: "description",
        content:
          "Defina uma nova senha de acesso ao Centro de Operações da Guarda do Arsenal de Guerra de São Paulo.",
      },
      { property: "og:title", content: "Redefinir senha — AGSP | PMAC" },
      {
        property: "og:description",
        content:
          "Defina uma nova senha de acesso ao Centro de Operações da Guarda do Arsenal de Guerra de São Paulo.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: RedefinirSenha,
});

function RedefinirSenha() {
  const navigate = useNavigate();
  const [pronto, setPronto] = useState(false);
  const [senha, setSenha] = useState("");
  const [confirma, setConfirma] = useState("");
  const [erro, setErro] = useState("");
  const [ok, setOk] = useState(false);
  const [ocupado, setOcupado] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === "PASSWORD_RECOVERY" || evento === "SIGNED_IN") setPronto(true);
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session) setPronto(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");

    if (senha.length < 8) {
      setErro("A senha deve ter no mínimo 8 caracteres.");
      return;
    }
    if (senha !== confirma) {
      setErro("As senhas não conferem.");
      return;
    }

    setOcupado(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setOcupado(false);

    if (error) {
      setErro("Não foi possível redefinir a senha. Solicite um novo link.");
      return;
    }
    setOk(true);
    setTimeout(() => void navigate({ to: "/", replace: true }), 1500);
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <main className="w-full max-w-md">
        <header className="border border-line border-l-[3px] border-l-signal bg-panel px-4 py-4">
          <h1 className="font-display text-head font-bold tracking-[0.16em] uppercase text-foreground">
            Nova senha
          </h1>
          <p className="label-mono normal-case">PMAC · AGSP — Centro de Operações da Guarda</p>
        </header>

        <section className="border border-line border-t-0 bg-panel-2 px-4 py-5">
          {!pronto ? (
            <p className="text-base2 text-muted-foreground">
              Validando o link de redefinição… Abra esta página pelo link enviado ao seu e-mail.
            </p>
          ) : ok ? (
            <div className="border border-line border-l-4 border-l-ok bg-ok/10 px-3 py-2">
              <span className="font-mono text-micro font-semibold tracking-[0.14em] text-ok">
                CONCLUÍDO
              </span>
              <p className="mt-1 text-base2 text-foreground">
                Senha alterada. Redirecionando para o painel…
              </p>
            </div>
          ) : (
            <form onSubmit={salvar} className="grid gap-4">
              <div className="grid gap-1.5">
                <label htmlFor="nova" className="label-mono">
                  Nova senha
                </label>
                <input
                  id="nova"
                  type="password"
                  autoComplete="new-password"
                  value={senha}
                  maxLength={128}
                  onChange={(e) => setSenha(e.target.value)}
                  className="w-full border border-line bg-panel-2 px-3 py-2.5 font-mono text-base2 text-foreground outline-none focus:border-signal/70"
                />
              </div>
              <div className="grid gap-1.5">
                <label htmlFor="conf" className="label-mono">
                  Confirmar senha
                </label>
                <input
                  id="conf"
                  type="password"
                  autoComplete="new-password"
                  value={confirma}
                  maxLength={128}
                  onChange={(e) => setConfirma(e.target.value)}
                  className="w-full border border-line bg-panel-2 px-3 py-2.5 font-mono text-base2 text-foreground outline-none focus:border-signal/70"
                />
              </div>

              {erro && (
                <div
                  role="alert"
                  className="border border-line border-l-4 border-l-alert bg-alert-bg px-3 py-2 text-base2 text-foreground"
                >
                  {erro}
                </div>
              )}

              <OpsButton
                variant="signal"
                type="submit"
                disabled={ocupado}
                className="w-full justify-center"
              >
                {ocupado ? "Salvando…" : "Salvar nova senha"}
              </OpsButton>
            </form>
          )}
        </section>
      </main>
    </div>
  );
}
