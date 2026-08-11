import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";

import { OpsButton } from "@/components/ops/primitives";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Acesso restrito — AGSP | PMAC" },
      {
        name: "description",
        content:
          "Autenticação do Centro de Operações da Guarda do Arsenal de Guerra de São Paulo. Acesso restrito ao efetivo autorizado.",
      },
      { property: "og:title", content: "Acesso restrito — AGSP | PMAC" },
      {
        property: "og:description",
        content:
          "Autenticação do Centro de Operações da Guarda do Arsenal de Guerra de São Paulo. Acesso restrito ao efetivo autorizado.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: TelaAcesso,
});

const ERRO_GENERICO = "Usuário ou senha inválidos.";

function Campo({
  id,
  rotulo,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { id: string; rotulo: string }) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor={id} className="label-mono">
        {rotulo}
      </label>
      <input
        id={id}
        {...props}
        className="w-full border border-line bg-panel-2 px-3 py-2.5 font-mono text-base2 text-foreground outline-none transition-colors placeholder:text-muted-foreground focus:border-signal/70"
      />
    </div>
  );
}

function TelaAcesso() {
  const navigate = useNavigate();
  const [modo, setModo] = useState<"login" | "recuperar">("login");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [aviso, setAviso] = useState("");
  const [ocupado, setOcupado] = useState(false);

  async function entrar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setAviso("");

    if (!email.trim() || senha.length < 1) {
      setErro(ERRO_GENERICO);
      return;
    }

    setOcupado(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim().toLowerCase(),
      password: senha,
    });

    if (error || !data.user) {
      setOcupado(false);
      setErro(ERRO_GENERICO);
      return;
    }

    const { data: perfil } = await supabase
      .from("profiles")
      .select("ativo")
      .eq("id", data.user.id)
      .maybeSingle();

    if (perfil && perfil.ativo === false) {
      await supabase.auth.signOut();
      setOcupado(false);
      setErro(ERRO_GENERICO);
      return;
    }

    setOcupado(false);
    void navigate({ to: "/", replace: true });
  }

  async function recuperar(e: React.FormEvent) {
    e.preventDefault();
    setErro("");
    setAviso("");

    if (!email.trim()) {
      setErro("Informe o e-mail cadastrado.");
      return;
    }

    setOcupado(true);
    await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setOcupado(false);
    setAviso(
      "Se este e-mail estiver cadastrado, um link de redefinição foi enviado. Verifique a caixa de entrada e o spam.",
    );
  }

  return (
    <div className="grid min-h-screen place-items-center bg-background px-4 py-10">
      <div className="techgrid pointer-events-none fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(62,198,224,.07),transparent_60%)]" />

      <main className="relative w-full max-w-md">
        <header className="border border-line border-l-[3px] border-l-signal bg-[linear-gradient(100deg,var(--panel-2),var(--panel)_55%,var(--panel-2))] px-4 py-4">
          <div className="flex items-center gap-3">
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
              <h1 className="font-display text-head font-bold tracking-[0.16em] uppercase text-foreground">
                PMAC · AGSP
              </h1>
              <p className="label-mono normal-case">Centro de Operações da Guarda</p>
            </div>
          </div>
        </header>

        <section className="border border-line border-t-0 bg-panel-2 px-4 py-5">
          <p className="label-mono mb-4">
            {modo === "login" ? "Acesso restrito ao efetivo autorizado" : "Redefinição de senha"}
          </p>

          <form onSubmit={modo === "login" ? entrar : recuperar} className="grid gap-4">
            <Campo
              id="email"
              rotulo="E-mail"
              type="email"
              autoComplete="username"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nome@dominio"
              maxLength={255}
            />

            {modo === "login" && (
              <Campo
                id="senha"
                rotulo="Senha"
                type="password"
                autoComplete="current-password"
                value={senha}
                onChange={(e) => setSenha(e.target.value)}
                placeholder="••••••••"
                maxLength={128}
              />
            )}

            {erro && (
              <div
                role="alert"
                className="border border-line border-l-4 border-l-alert bg-alert-bg px-3 py-2"
              >
                <span className="font-mono text-micro font-semibold tracking-[0.14em] text-alert">
                  NEGADO
                </span>
                <p className="mt-1 text-base2 text-foreground">{erro}</p>
              </div>
            )}

            {aviso && (
              <div
                role="status"
                className="border border-line border-l-4 border-l-ok bg-ok/10 px-3 py-2"
              >
                <span className="font-mono text-micro font-semibold tracking-[0.14em] text-ok">
                  ENVIADO
                </span>
                <p className="mt-1 text-base2 text-foreground">{aviso}</p>
              </div>
            )}

            <OpsButton
              variant="signal"
              type="submit"
              disabled={ocupado}
              className="w-full justify-center"
            >
              {ocupado
                ? "Processando…"
                : modo === "login"
                  ? "Autenticar"
                  : "Enviar link de redefinição"}
            </OpsButton>
          </form>

          <button
            type="button"
            onClick={() => {
              setModo(modo === "login" ? "recuperar" : "login");
              setErro("");
              setAviso("");
            }}
            className="mt-4 font-mono text-micro tracking-[0.1em] uppercase text-signal-soft underline-offset-4 hover:underline"
          >
            {modo === "login" ? "Esqueci minha senha" : "Voltar para o acesso"}
          </button>
        </section>

        <p className="label-mono mt-3 normal-case text-muted-foreground">
          Uso exclusivo do serviço. Tentativas de acesso são registradas.
        </p>
      </main>
    </div>
  );
}
