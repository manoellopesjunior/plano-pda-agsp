import { useCallback, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";

import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/admin.shared";

export type Perfil = {
  id: string;
  nome: string;
  email: string;
  posto: string;
  ativo: boolean;
};

export function useAuth() {
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
        supabase.from("profiles").select("id, nome, email, posto, ativo").eq("id", uid).maybeSingle(),
        supabase.from("user_roles").select("role").eq("user_id", uid).maybeSingle(),
      ]);
      if (!vivo) return;
      setPerfil((p as Perfil | null) ?? null);
      setRole(((r?.role as AppRole | undefined) ?? null) as AppRole | null);
    })();

    return () => {
      vivo = false;
    };
  }, [user?.id]);

  const sair = useCallback(async () => {
    await supabase.auth.signOut();
    setPerfil(null);
    setRole(null);
  }, []);

  return {
    session,
    user,
    perfil,
    role,
    isAdmin: role === "admin",
    carregando,
    sair,
  };
}
