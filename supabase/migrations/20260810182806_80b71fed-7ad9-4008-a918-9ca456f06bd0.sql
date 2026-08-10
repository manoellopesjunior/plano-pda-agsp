-- 1. Private schema for internal security helpers (not exposed to the API)
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

-- 2. Repoint policies to the private helper
DROP POLICY IF EXISTS "Admin gerencia perfis" ON public.profiles;
DROP POLICY IF EXISTS "Perfil proprio visivel" ON public.profiles;
DROP POLICY IF EXISTS "Atualiza perfil proprio" ON public.profiles;
DROP POLICY IF EXISTS "Funcao propria visivel" ON public.user_roles;

CREATE POLICY "Admin gerencia perfis" ON public.profiles
  FOR ALL TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Perfil proprio visivel" ON public.profiles
  FOR SELECT TO authenticated
  USING ((auth.uid() = id) OR private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Atualiza perfil proprio" ON public.profiles
  FOR UPDATE TO authenticated
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

CREATE POLICY "Funcao propria visivel" ON public.user_roles
  FOR SELECT TO authenticated
  USING ((auth.uid() = user_id) OR private.has_role(auth.uid(), 'admin'::public.app_role));

DROP FUNCTION IF EXISTS public.has_role(uuid, public.app_role);

-- 3. Block self-service changes to sensitive profile columns
CREATE OR REPLACE FUNCTION public.guard_profile_sensitive_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL OR current_user IN ('postgres', 'service_role', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  IF private.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RETURN NEW;
  END IF;

  IF NEW.ativo IS DISTINCT FROM OLD.ativo OR NEW.email IS DISTINCT FROM OLD.email THEN
    RAISE EXCEPTION 'Alteracao de situacao ou e-mail exige perfil administrador.';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.guard_profile_sensitive_columns() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS profiles_guard_sensitive_columns ON public.profiles;
CREATE TRIGGER profiles_guard_sensitive_columns
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.guard_profile_sensitive_columns();

-- 4. Explicit admin-only write policies on user_roles
DROP POLICY IF EXISTS "Admin insere funcao" ON public.user_roles;
DROP POLICY IF EXISTS "Admin atualiza funcao" ON public.user_roles;
DROP POLICY IF EXISTS "Admin remove funcao" ON public.user_roles;

CREATE POLICY "Admin insere funcao" ON public.user_roles
  FOR INSERT TO authenticated
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admin atualiza funcao" ON public.user_roles
  FOR UPDATE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role))
  WITH CHECK (private.has_role(auth.uid(), 'admin'::public.app_role));

CREATE POLICY "Admin remove funcao" ON public.user_roles
  FOR DELETE TO authenticated
  USING (private.has_role(auth.uid(), 'admin'::public.app_role));

GRANT INSERT, UPDATE, DELETE ON public.user_roles TO authenticated;