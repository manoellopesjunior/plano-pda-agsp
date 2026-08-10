import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/admin.shared";
import { podeAcionarPda, podeOperar, podeTratar } from "@/lib/permissoes";
import type { PostoId } from "@/lib/agsp";

export type Perfil = {
  id: string;
  nome: string;
  email: string;
  posto: string;
  postoId: number | null;
  ativo: boolean;
};

export function useAuth() {
  const navigate = useNavigate();
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [perfil, setPerfil] = useState<Perfil | null>(null);
  const [role, setRole] = useState<AppRole | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let vivo = true;

    const { data: sub } = supabase.auth.onAuthStateChange((_evento, sessao) => {
      if (!vivo) return;
      setSession(sessao);
      setUser(sessao?.user ?? null);
      if (!sessao) {
        setPerfil(null);
        setRole(null);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (!vivo) return;
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setCarregando(false);
    });

    return () => {
      vivo = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const uid = user?.id;
    if (!uid) return;
    let vivo = true;

    void (async () => {
      const [{ data: p }, { data: r }] = await Promise.all([
        supabase
          .from("profiles")
          .select("id, nome, email, posto, posto_id, ativo")
          .eq("id", uid)
          .maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", uid).maybeSingle(),
      ]);
      if (!vivo) return;
      setPerfil(
        p
          ? {
              id: p.id,
              nome: p.nome,
              email: p.email,
              posto: p.posto,
              postoId: p.posto_id ?? null,
              ativo: p.ativo,
            }
          : null,
      );
      setRole(((r?.role as AppRole | undefined) ?? null) as AppRole | null);
    })();

    return () => {
      vivo = false;
    };
  }, [user?.id]);

  const sair = useCallback(async () => {
    // 1) encerra a sessão no backend
    await supabase.auth.signOut();
    // 2) limpa imediatamente o estado local
    setSession(null);
    setUser(null);
    setPerfil(null);
    setRole(null);
    // 3) redireciona sem deixar a rota protegida no histórico
    await navigate({ to: "/auth", replace: true });
  }, [navigate]);

  const postoVinculado = perfil?.postoId ?? null;

  return {
    session,
    user,
    perfil,
    role,
    isAdmin: role === "admin",
    postoVinculado,
    podeOperar: podeOperar(role),
    podeAcionar: (alvo: PostoId) => podeAcionarPda(role, postoVinculado, alvo),
    podeTratar: (alvo: PostoId | "todos") => podeTratar(role, postoVinculado, alvo),
    carregando,
    sair,
  };
}
