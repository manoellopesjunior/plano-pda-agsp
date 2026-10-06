-- Helpers privados
CREATE OR REPLACE FUNCTION private.posto_vinculado(_uid uuid)
RETURNS text LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT posto_id::text FROM public.profiles WHERE id = _uid AND ativo = true
$$;

CREATE OR REPLACE FUNCTION private.pode_operar_posto(_uid uuid, _posto text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = _uid AND ativo = true)
    AND (
      private.has_role(_uid, 'admin'::public.app_role)
      OR (private.has_role(_uid, 'oficial'::public.app_role)
          AND private.posto_vinculado(_uid) = _posto)
    )
$$;

REVOKE ALL ON FUNCTION private.posto_vinculado(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.pode_operar_posto(uuid, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION private.posto_vinculado(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION private.pode_operar_posto(uuid, text) TO authenticated;

-- pda_alertas: escrita direta bloqueada; só via RPC
DROP POLICY IF EXISTS "Operadores acionam PDA" ON public.pda_alertas;
DROP POLICY IF EXISTS "Operadores desarmam PDA" ON public.pda_alertas;
REVOKE INSERT, UPDATE, DELETE ON public.pda_alertas FROM authenticated, anon;

CREATE POLICY "Acionamento restrito ao posto vinculado"
  ON public.pda_alertas FOR INSERT TO authenticated
  WITH CHECK (private.pode_operar_posto(auth.uid(), posto) AND acionado_por = auth.uid());
CREATE POLICY "Desarme restrito ao posto vinculado"
  ON public.pda_alertas FOR DELETE TO authenticated
  USING (private.pode_operar_posto(auth.uid(), posto));

-- pda_eventos: append-only, escrita só via RPC
DROP POLICY IF EXISTS "Operadores registram eventos" ON public.pda_eventos;
REVOKE INSERT, UPDATE, DELETE, TRUNCATE ON public.pda_eventos FROM authenticated, anon;

CREATE OR REPLACE FUNCTION private.bloquear_alteracao_evento()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  RAISE EXCEPTION 'Registros de auditoria sao imutaveis.';
END;
$$;
DROP TRIGGER IF EXISTS pda_eventos_imutavel ON public.pda_eventos;
CREATE TRIGGER pda_eventos_imutavel BEFORE UPDATE ON public.pda_eventos
  FOR EACH ROW EXECUTE FUNCTION private.bloquear_alteracao_evento();

-- RPC: acionar
CREATE OR REPLACE FUNCTION public.pda_acionar(_posto text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _nome text;
  _n int;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'nao_autenticado' USING ERRCODE = '42501'; END IF;
  IF _posto NOT IN ('1','2','3','4','5','6') THEN RAISE EXCEPTION 'posto_invalido' USING ERRCODE = '22023'; END IF;
  IF NOT private.pode_operar_posto(_uid, _posto) THEN
    RAISE EXCEPTION 'sem_permissao' USING ERRCODE = '42501';
  END IF;
  SELECT COALESCE(NULLIF(nome, ''), email) INTO _nome FROM profiles WHERE id = _uid;

  INSERT INTO pda_alertas (posto, acionado_por, acionado_por_nome)
  VALUES (_posto, _uid, COALESCE(_nome, ''))
  ON CONFLICT (posto) DO NOTHING;
  GET DIAGNOSTICS _n = ROW_COUNT;
  IF _n = 0 THEN RETURN 'ja_acionado'; END IF;

  INSERT INTO pda_eventos (posto, categoria, nivel, mensagem, responsavel, motivo, autor_id)
  VALUES ('P-0' || _posto, 'PDA', 'critico', 'Acionamento manual — Posto ' || _posto,
          COALESCE(NULLIF(_nome, ''), '—'), '—', _uid);
  RETURN 'ok';
END;
$$;

-- RPC: tratar um posto
CREATE OR REPLACE FUNCTION public.pda_tratar(_posto text, _responsavel text, _motivo text, _detalhe text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _n int;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'nao_autenticado' USING ERRCODE = '42501'; END IF;
  IF _posto NOT IN ('1','2','3','4','5','6') THEN RAISE EXCEPTION 'posto_invalido' USING ERRCODE = '22023'; END IF;
  IF NOT private.pode_operar_posto(_uid, _posto) THEN
    RAISE EXCEPTION 'sem_permissao' USING ERRCODE = '42501';
  END IF;
  IF length(trim(COALESCE(_responsavel, ''))) = 0 THEN
    RAISE EXCEPTION 'responsavel_obrigatorio' USING ERRCODE = '22023';
  END IF;

  DELETE FROM pda_alertas WHERE posto = _posto;
  GET DIAGNOSTICS _n = ROW_COUNT;
  IF _n = 0 THEN RETURN 'ja_tratado'; END IF;

  INSERT INTO pda_eventos (posto, categoria, nivel, mensagem, responsavel, motivo, autor_id)
  VALUES ('P-0' || _posto, 'Tratativa', 'info',
          COALESCE(NULLIF(left(trim(_detalhe), 1000), ''), 'Desarme confirmado — Posto ' || _posto),
          left(trim(_responsavel), 200), COALESCE(NULLIF(left(trim(_motivo), 200), ''), '—'), _uid);
  RETURN 'ok';
END;
$$;

-- RPC: resetar central (somente admin)
CREATE OR REPLACE FUNCTION public.pda_resetar(_responsavel text, _motivo text, _detalhe text)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _uid uuid := auth.uid();
  _postos text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'nao_autenticado' USING ERRCODE = '42501'; END IF;
  IF NOT (private.has_role(_uid, 'admin'::public.app_role)
          AND EXISTS (SELECT 1 FROM profiles WHERE id = _uid AND ativo = true)) THEN
    RAISE EXCEPTION 'sem_permissao' USING ERRCODE = '42501';
  END IF;
  IF length(trim(COALESCE(_responsavel, ''))) = 0 THEN
    RAISE EXCEPTION 'responsavel_obrigatorio' USING ERRCODE = '22023';
  END IF;

  WITH d AS (DELETE FROM pda_alertas RETURNING posto)
  SELECT string_agg(posto, ' / ' ORDER BY posto) INTO _postos FROM d;

  INSERT INTO pda_eventos (posto, categoria, nivel, mensagem, responsavel, motivo, autor_id)
  VALUES ('TODOS', 'Tratativa', 'info',
          COALESCE(NULLIF(left(trim(_detalhe), 1000), ''),
                   'Central restabelecida — todos os postos desarmados')
            || CASE WHEN _postos IS NULL THEN ' (nenhum posto em alerta)'
                    ELSE ' (postos desarmados: ' || _postos || ')' END,
          left(trim(_responsavel), 200), COALESCE(NULLIF(left(trim(_motivo), 200), ''), '—'), _uid);
  RETURN 'ok';
END;
$$;

REVOKE ALL ON FUNCTION public.pda_acionar(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pda_tratar(text, text, text, text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.pda_resetar(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pda_acionar(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pda_tratar(text, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.pda_resetar(text, text, text) TO authenticated;