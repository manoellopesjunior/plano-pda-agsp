ALTER TYPE public.app_role RENAME VALUE 'sentinela' TO 'comum';

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS posto_id smallint;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_posto_id_range CHECK (posto_id IS NULL OR (posto_id BETWEEN 1 AND 6));

CREATE OR REPLACE FUNCTION public.guard_profile_sensitive_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF auth.uid() IS NULL OR current_user IN ('postgres', 'service_role', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  IF private.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.ativo IS DISTINCT FROM OLD.ativo
     OR NEW.email IS DISTINCT FROM OLD.email
     OR NEW.posto_id IS DISTINCT FROM OLD.posto_id THEN
    RAISE EXCEPTION 'Alteracao de situacao, e-mail ou posto vinculado exige perfil administrador.';
  END IF;

  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, nome, email, posto, posto_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data ->> 'nome', ''),
    COALESCE(NEW.email, ''),
    COALESCE(NEW.raw_user_meta_data ->> 'posto', ''),
    NULLIF(NEW.raw_user_meta_data ->> 'posto_id', '')::smallint
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (
    NEW.id,
    COALESCE((NEW.raw_user_meta_data ->> 'role')::public.app_role, 'comum')
  )
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$function$;