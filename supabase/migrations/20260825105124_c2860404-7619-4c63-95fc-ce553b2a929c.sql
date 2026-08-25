CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC, anon, authenticated;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE OR REPLACE FUNCTION private.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM PUBLIC;
REVOKE ALL ON FUNCTION private.has_role(uuid, public.app_role) FROM anon;
GRANT EXECUTE ON FUNCTION private.has_role(uuid, public.app_role) TO authenticated, service_role;

DROP POLICY "perfil proprio leitura" ON public.profiles;
CREATE POLICY "perfil proprio leitura" ON public.profiles FOR SELECT TO authenticated
USING (auth.uid() = id OR private.has_role(auth.uid(), 'admin'));

DROP POLICY "papeis proprios leitura" ON public.user_roles;
CREATE POLICY "papeis proprios leitura" ON public.user_roles FOR SELECT TO authenticated
USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'));

DROP POLICY "emprestimos admin atualiza" ON public.loans;
CREATE POLICY "emprestimos admin atualiza" ON public.loans FOR UPDATE TO authenticated
USING (private.has_role(auth.uid(), 'admin'))
WITH CHECK (private.has_role(auth.uid(), 'admin'));

DROP POLICY "emprestimos leitura" ON public.loans;
CREATE POLICY "emprestimos leitura" ON public.loans FOR SELECT TO authenticated
USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'));

DROP POLICY "pagamentos leitura" ON public.payments;
CREATE POLICY "pagamentos leitura" ON public.payments FOR SELECT TO authenticated
USING (auth.uid() = user_id OR private.has_role(auth.uid(), 'admin'));

DROP POLICY "auditoria admin" ON public.audit_log;
CREATE POLICY "auditoria admin" ON public.audit_log FOR SELECT TO authenticated
USING (private.has_role(auth.uid(), 'admin'));

REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM authenticated;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM anon;
REVOKE ALL ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO service_role;