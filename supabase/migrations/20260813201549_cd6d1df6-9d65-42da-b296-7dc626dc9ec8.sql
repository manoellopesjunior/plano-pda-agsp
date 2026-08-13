REVOKE UPDATE ON public.profiles FROM authenticated;
GRANT UPDATE (nome, posto) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;

DROP POLICY IF EXISTS "Atualiza perfil proprio" ON public.profiles;
CREATE POLICY "Atualiza perfil proprio"
ON public.profiles
FOR UPDATE
TO authenticated
USING (auth.uid() = id AND ativo = true)
WITH CHECK (auth.uid() = id AND ativo = true);