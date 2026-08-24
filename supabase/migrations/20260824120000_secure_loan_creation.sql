-- Create loan requests only through a server-side RPC that owns the business math.
-- The browser may choose principal, term, and purpose, but cannot provide
-- installment_cents, total_due_cents, monthly_rate, user_id, or status.

DROP POLICY IF EXISTS "emprestimos criacao" ON public.loans;
REVOKE INSERT ON public.loans FROM authenticated;

CREATE UNIQUE INDEX IF NOT EXISTS one_pending_loan_per_user
  ON public.loans (user_id)
  WHERE status = 'pendente';

CREATE OR REPLACE FUNCTION public.create_loan_request(
  _actor uuid,
  _principal_cents bigint,
  _term_months int,
  _purpose text DEFAULT NULL
)
RETURNS public.loans
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _loan public.loans;
  _monthly_rate numeric := 0.02;
  _installment_cents bigint;
  _total_due_cents bigint;
  _purpose_clean text;
BEGIN
  IF _actor IS NULL THEN
    RAISE EXCEPTION 'Usuário não autenticado';
  END IF;

  IF _principal_cents NOT BETWEEN 10000 AND 100000 THEN
    RAISE EXCEPTION 'Valor solicitado fora do limite permitido';
  END IF;

  IF _term_months NOT IN (1, 2, 3, 4, 6) THEN
    RAISE EXCEPTION 'Prazo solicitado fora do limite permitido';
  END IF;

  _purpose_clean := NULLIF(left(btrim(COALESCE(_purpose, '')), 200), '');
  IF _purpose_clean IS NULL OR char_length(_purpose_clean) < 5 THEN
    RAISE EXCEPTION 'Finalidade deve ter pelo menos 5 caracteres';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.loans
    WHERE user_id = _actor AND status = 'pendente'
  ) THEN
    RAISE EXCEPTION 'Você já tem uma solicitação em análise';
  END IF;

  _installment_cents := round(
    (_principal_cents::numeric * _monthly_rate)
    / (1 - power(1 + _monthly_rate, -_term_months))
  )::bigint;
  _total_due_cents := _installment_cents * _term_months;

  INSERT INTO public.loans (
    user_id,
    principal_cents,
    term_months,
    monthly_rate,
    installment_cents,
    total_due_cents,
    purpose,
    status
  ) VALUES (
    _actor,
    _principal_cents,
    _term_months,
    _monthly_rate,
    _installment_cents,
    _total_due_cents,
    _purpose_clean,
    'pendente'
  ) RETURNING * INTO _loan;

  INSERT INTO public.audit_log (actor_id, action, entity, entity_id, details)
  VALUES (
    _actor,
    'solicitar_emprestimo',
    'loans',
    _loan.id,
    jsonb_build_object(
      'valor_centavos', _loan.principal_cents,
      'prazo_meses', _loan.term_months,
      'parcela_centavos', _loan.installment_cents,
      'total_centavos', _loan.total_due_cents
    )
  );

  RETURN _loan;
END; $function$;

REVOKE ALL ON FUNCTION public.create_loan_request(uuid, bigint, int, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_loan_request(uuid, bigint, int, text) TO service_role;
