CREATE OR REPLACE FUNCTION public.create_loan_request(
  _actor uuid,
  _principal_cents bigint,
  _term_months integer,
  _purpose text
)
RETURNS public.loans
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rate numeric := 0.02;
  _factor numeric;
  _installment bigint;
  _loan public.loans;
BEGIN
  IF _actor IS NULL THEN RAISE EXCEPTION 'Usuário não autenticado'; END IF;
  IF _principal_cents < 10000 OR _principal_cents > 100000 THEN
    RAISE EXCEPTION 'Valor solicitado fora do limite permitido';
  END IF;
  IF _term_months NOT IN (1,2,3,4,6) THEN
    RAISE EXCEPTION 'Prazo solicitado fora do limite permitido';
  END IF;
  IF _purpose IS NULL OR length(btrim(_purpose)) < 5 THEN
    RAISE EXCEPTION 'Finalidade deve ter pelo menos 5 caracteres';
  END IF;
  IF EXISTS (SELECT 1 FROM public.loans WHERE user_id = _actor AND status = 'pendente') THEN
    RAISE EXCEPTION 'Você já tem uma solicitação em análise';
  END IF;

  _factor := (_rate * power(1 + _rate, _term_months)) / (power(1 + _rate, _term_months) - 1);
  _installment := round(_principal_cents * _factor);

  INSERT INTO public.loans (user_id, principal_cents, term_months, monthly_rate,
                            installment_cents, total_due_cents, purpose, status)
  VALUES (_actor, _principal_cents, _term_months, _rate,
          _installment, _installment * _term_months, btrim(_purpose), 'pendente')
  RETURNING * INTO _loan;

  INSERT INTO public.audit_log (actor_id, action, entity, entity_id, details)
  VALUES (_actor, 'solicitar_emprestimo', 'loans', _loan.id,
          jsonb_build_object('valor_centavos', _principal_cents, 'prazo_meses', _term_months));

  RETURN _loan;
END; $$;

REVOKE ALL ON FUNCTION public.create_loan_request(uuid, bigint, integer, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_loan_request(uuid, bigint, integer, text) FROM anon;
REVOKE ALL ON FUNCTION public.create_loan_request(uuid, bigint, integer, text) FROM authenticated;
GRANT EXECUTE ON FUNCTION public.create_loan_request(uuid, bigint, integer, text) TO service_role;