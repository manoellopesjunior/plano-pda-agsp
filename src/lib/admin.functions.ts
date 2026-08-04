import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const BAN_FOREVER = "876000h";

export type UsuarioAdmin = {
  id: string;
  nome: string;
  email: string;
  posto: string;
  ativo: boolean;
  role: "admin" | "oficial" | "sentinela";
  criadoEm: string;
};

const roleSchema = z.enum(["admin", "oficial", "sentinela"]);

const criarSchema = z.object({
  nome: z.string().trim().min(2).max(120),
  email: z.string().trim().email().max(255),
  senha: z.string().min(8).max(128),
  posto: z.string().trim().max(120).default(""),
  role: roleSchema,
});

const senhaSchema = z.object({
  userId: z.string().uuid(),
  senha: z.string().min(8).max(128),
});

const ativoSchema = z.object({ userId: z.string().uuid(), ativo: z.boolean() });
const idSchema = z.object({ userId: z.string().uuid() });

async function exigirAdmin(context: { supabase: any; userId: string }) {
  const { data, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Acesso negado: perfil administrador exigido.");
}

export const listarUsuarios = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<UsuarioAdmin[]> => {
    await exigirAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const [{ data: perfis, error: e1 }, { data: funcoes, error: e2 }] = await Promise.all([
      supabaseAdmin
        .from("profiles")
        .select("id, nome, email, posto, ativo, created_at")
        .order("created_at", { ascending: true }),
      supabaseAdmin.from("user_roles").select("user_id, role"),
    ]);
    if (e1) throw new Error(e1.message);
    if (e2) throw new Error(e2.message);

    const mapa = new Map((funcoes ?? []).map((f) => [f.user_id, f.role]));
    return (perfis ?? []).map((p) => ({
      id: p.id,
      nome: p.nome,
      email: p.email,
      posto: p.posto,
      ativo: p.ativo,
      role: (mapa.get(p.id) ?? "sentinela") as UsuarioAdmin["role"],
      criadoEm: p.created_at,
    }));
  });

export const criarUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => criarSchema.parse(input))
  .handler(async ({ data, context }) => {
    await exigirAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: criado, error } = await supabaseAdmin.auth.admin.createUser({
      email: data.email,
      password: data.senha,
      email_confirm: true,
      user_metadata: { nome: data.nome, posto: data.posto, role: data.role },
    });
    if (error || !criado.user) throw new Error(error?.message ?? "Falha ao criar acesso.");

    await supabaseAdmin
      .from("profiles")
      .update({ nome: data.nome, email: data.email, posto: data.posto })
      .eq("id", criado.user.id);
    await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: criado.user.id, role: data.role }, { onConflict: "user_id,role" });

    return { ok: true };
  });

export const alterarSenhaUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => senhaSchema.parse(input))
  .handler(async ({ data, context }) => {
    await exigirAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.senha,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const definirSituacaoUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => ativoSchema.parse(input))
  .handler(async ({ data, context }) => {
    await exigirAdmin(context);
    if (data.userId === context.userId && !data.ativo) {
      throw new Error("Não é possível desativar o próprio acesso.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      ban_duration: data.ativo ? "none" : BAN_FOREVER,
    });
    if (error) throw new Error(error.message);

    const { error: e2 } = await supabaseAdmin
      .from("profiles")
      .update({ ativo: data.ativo })
      .eq("id", data.userId);
    if (e2) throw new Error(e2.message);
    return { ok: true };
  });

export const excluirUsuario = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => idSchema.parse(input))
  .handler(async ({ data, context }) => {
    await exigirAdmin(context);
    if (data.userId === context.userId) {
      throw new Error("Não é possível excluir o próprio acesso.");
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
