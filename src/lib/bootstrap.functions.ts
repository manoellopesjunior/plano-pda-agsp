import { createServerFn } from "@tanstack/react-start";

export const bootstrapAdmin = createServerFn({ method: "POST" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const email = "manoel_junior2023@outlook.com";

  const { data: criado, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password: "Fox40028922?",
    email_confirm: true,
    user_metadata: { nome: "Manoel Junior", posto: "Administrador", role: "admin" },
  });

  if (error) return { ok: false, message: error.message };

  await supabaseAdmin
    .from("user_roles")
    .upsert({ user_id: criado.user!.id, role: "admin" }, { onConflict: "user_id,role" });

  return { ok: true, id: criado.user!.id };
});
