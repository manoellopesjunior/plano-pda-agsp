import { z } from "zod";

export const BAN_FOREVER = "876000h";

export type UsuarioAdmin = {
  id: string;
  nome: string;
  email: string;
  posto: string;
  ativo: boolean;
  role: AppRole;
  criadoEm: string;
};

export type AppRole = "admin" | "oficial" | "sentinela";

export const ROLE_LABEL: Record<AppRole, string> = {
  admin: "Administrador",
  oficial: "Oficial de Dia",
  sentinela: "Sentinela",
};

export const roleSchema = z.enum(["admin", "oficial", "sentinela"]);

export const criarSchema = z.object({
  nome: z.string().trim().min(2, "Informe o nome").max(120),
  email: z.string().trim().email("E-mail inválido").max(255),
  senha: z.string().min(8, "Mínimo de 8 caracteres").max(128),
  posto: z.string().trim().max(120).default(""),
  role: roleSchema,
});

export const senhaSchema = z.object({
  userId: z.string().uuid(),
  senha: z.string().min(8).max(128),
});

export const ativoSchema = z.object({ userId: z.string().uuid(), ativo: z.boolean() });
export const idSchema = z.object({ userId: z.string().uuid() });

type AdminCtx = {
  supabase: {
    from: (table: string) => {
      select: (cols: string) => {
        eq: (col: string, value: unknown) => {
          eq: (col: string, value: unknown) => {
            maybeSingle: () => Promise<{ data: unknown; error: unknown }>;
          };
        };
      };
    };
  };
  userId: string;
};

export async function exigirAdmin(context: AdminCtx) {
  // Verificação server-side com o token do próprio usuário (RLS aplicada).
  const { data, error } = await context.supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", context.userId)
    .eq("role", "admin")
    .maybeSingle();

  if (error || !data) {
    throw new Error("Acesso negado: perfil administrador exigido.");
  }
}
