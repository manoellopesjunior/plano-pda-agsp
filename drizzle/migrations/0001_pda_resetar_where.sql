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

  WITH d AS (DELETE FROM pda_alertas WHERE posto IS NOT NULL RETURNING posto)
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
REVOKE ALL ON FUNCTION public.pda_resetar(text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.pda_resetar(text, text, text) TO authenticated;