CREATE TYPE public.app_role AS ENUM ('admin','cliente');
CREATE TYPE public.loan_status AS ENUM ('pendente','aprovado','reprovado','quitado','atrasado');
CREATE TYPE public.address_status AS ENUM ('pendente','verificado','recusado');

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL DEFAULT '',
  cpf text,
  phone text,
  street text,
  cep text,
  neighborhood text NOT NULL DEFAULT 'Monte Sião',
  city text NOT NULL DEFAULT 'Manaus',
  state text NOT NULL DEFAULT 'AM',
  address_status public.address_status NOT NULL DEFAULT 'pendente',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);
GRANT SELECT ON public.user_roles TO authenticated;
GRANT ALL ON public.user_roles TO service_role;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role)
$$;

CREATE TABLE public.capital_pool (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  total_capital_cents bigint NOT NULL DEFAULT 690000,
  currency text NOT NULL DEFAULT 'BRL',
  origin_amount_gbp numeric NOT NULL DEFAULT 1000,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.capital_pool TO authenticated;
GRANT SELECT ON public.capital_pool TO anon;
GRANT ALL ON public.capital_pool TO service_role;
ALTER TABLE public.capital_pool ENABLE ROW LEVEL SECURITY;
INSERT INTO public.capital_pool DEFAULT VALUES;

CREATE TABLE public.loans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  principal_cents bigint NOT NULL CHECK (principal_cents BETWEEN 10000 AND 100000),
  term_months int NOT NULL CHECK (term_months BETWEEN 1 AND 12),
  monthly_rate numeric NOT NULL DEFAULT 0.02,
  installment_cents bigint NOT NULL,
  total_due_cents bigint NOT NULL,
  paid_cents bigint NOT NULL DEFAULT 0,
  purpose text,
  status public.loan_status NOT NULL DEFAULT 'pendente',
  decided_by uuid REFERENCES auth.users(id),
  decided_at timestamptz,
  decision_note text,
  first_due_date date,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.loans TO authenticated;
GRANT UPDATE ON public.loans TO authenticated;
GRANT ALL ON public.loans TO service_role;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  loan_id uuid NOT NULL REFERENCES public.loans(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount_cents bigint NOT NULL CHECK (amount_cents > 0),
  method text NOT NULL DEFAULT 'pix',
  registered_by uuid REFERENCES auth.users(id),
  paid_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.payments TO authenticated;
GRANT ALL ON public.payments TO service_role;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  action text NOT NULL,
  entity text NOT NULL,
  entity_id uuid,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_log TO authenticated;
GRANT ALL ON public.audit_log TO service_role;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "perfil proprio leitura" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "perfil proprio insercao" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);
CREATE POLICY "perfil proprio atualizacao" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

CREATE POLICY "papeis proprios leitura" ON public.user_roles FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "capital publico" ON public.capital_pool FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "emprestimos leitura" ON public.loans FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "emprestimos criacao" ON public.loans FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND status = 'pendente');
CREATE POLICY "emprestimos admin atualiza" ON public.loans FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin')) WITH CHECK (public.has_role(auth.uid(),'admin'));

CREATE POLICY "pagamentos leitura" ON public.payments FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(),'admin'));

CREATE POLICY "auditoria admin" ON public.audit_log FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

-- Capital engine
CREATE OR REPLACE FUNCTION public.capital_summary()
RETURNS TABLE (total_cents bigint, emprestado_cents bigint, recebido_cents bigint, disponivel_cents bigint)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    c.total_capital_cents,
    COALESCE((SELECT SUM(principal_cents) FROM public.loans WHERE status IN ('aprovado','atrasado')),0)::bigint,
    COALESCE((SELECT SUM(amount_cents) FROM public.payments),0)::bigint,
    (c.total_capital_cents
      - COALESCE((SELECT SUM(principal_cents) FROM public.loans WHERE status IN ('aprovado','atrasado')),0)
      + COALESCE((SELECT SUM(p.amount_cents) FROM public.payments p JOIN public.loans l ON l.id = p.loan_id WHERE l.status IN ('aprovado','atrasado','quitado')),0)
      - COALESCE((SELECT SUM(l.total_due_cents - l.principal_cents) FROM public.loans l WHERE l.status = 'quitado'),0)
    )::bigint
  FROM public.capital_pool c LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.capital_summary() TO authenticated, anon;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''))
  ON CONFLICT (id) DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'cliente')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END; $$;
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();