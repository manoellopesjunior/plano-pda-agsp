import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/bootstrap-admin")({
  server: {
    handlers: {
      POST: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email: "manoel_junior2023@outlook.com",
          password: "Fox40028922?",
          email_confirm: true,
          user_metadata: { nome: "Manoel Junior", posto: "Administrador", role: "admin" },
        });
        if (error) return Response.json({ ok: false, message: error.message }, { status: 400 });
        await supabaseAdmin
          .from("user_roles")
          .upsert({ user_id: data.user!.id, role: "admin" }, { onConflict: "user_id,role" });
        return Response.json({ ok: true, id: data.user!.id });
      },
    },
  },
});
