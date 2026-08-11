CREATE TABLE public.pda_alertas (
  posto text PRIMARY KEY CHECK (posto IN ('1','2','3','4','5','6')),
  acionado_por uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  acionado_por_nome text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.pda_alertas TO authenticated;
GRANT ALL ON public.pda_alertas TO service_role;

ALTER TABLE public.pda_alertas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Alertas visiveis a autenticados"
  ON public.pda_alertas FOR SELECT TO authenticated USING (true);

CREATE POLICY "Operadores acionam PDA"
  ON public.pda_alertas FOR INSERT TO authenticated
  WITH CHECK (
    private.has_role(auth.uid(), 'admin'::public.app_role)
    OR private.has_role(auth.uid(), 'oficial'::public.app_role)
  );

CREATE POLICY "Operadores desarmam PDA"
  ON public.pda_alertas FOR DELETE TO authenticated
  USING (
    private.has_role(auth.uid(), 'admin'::public.app_role)
    OR private.has_role(auth.uid(), 'oficial'::public.app_role)
  );

CREATE TABLE public.pda_eventos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  posto text NOT NULL,
  categoria text NOT NULL,
  nivel text NOT NULL DEFAULT 'info',
  mensagem text NOT NULL DEFAULT '',
  responsavel text NOT NULL DEFAULT '—',
  motivo text NOT NULL DEFAULT '—',
  autor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX pda_eventos_created_at_idx ON public.pda_eventos (created_at DESC);

GRANT SELECT, INSERT ON public.pda_eventos TO authenticated;
GRANT ALL ON public.pda_eventos TO service_role;

ALTER TABLE public.pda_eventos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Eventos visiveis a autenticados"
  ON public.pda_eventos FOR SELECT TO authenticated USING (true);

CREATE POLICY "Operadores registram eventos"
  ON public.pda_eventos FOR INSERT TO authenticated
  WITH CHECK (
    private.has_role(auth.uid(), 'admin'::public.app_role)
    OR private.has_role(auth.uid(), 'oficial'::public.app_role)
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.pda_alertas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.pda_eventos;