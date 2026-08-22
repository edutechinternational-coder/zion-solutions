
-- Recreate privileged functions to take an explicit actor id (service_role calls have no auth.uid()).
DROP FUNCTION IF EXISTS public.decide_loan(uuid, boolean, text);
DROP FUNCTION IF EXISTS public.register_payment(uuid, bigint, text);

CREATE OR REPLACE FUNCTION public.decide_loan(_actor uuid, _loan_id uuid, _approve boolean, _note text DEFAULT NULL)
RETURNS public.loans
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _loan public.loans;
  _disponivel bigint;
BEGIN
  IF _actor IS NULL OR NOT public.has_role(_actor,'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem decidir solicitações';
  END IF;

  SELECT * INTO _loan FROM public.loans WHERE id = _loan_id FOR UPDATE;
  IF _loan.id IS NULL THEN RAISE EXCEPTION 'Solicitação não encontrada'; END IF;
  IF _loan.status <> 'pendente' THEN RAISE EXCEPTION 'Solicitação já foi decidida'; END IF;

  IF _approve THEN
    SELECT disponivel_cents INTO _disponivel FROM public.capital_summary();
    IF _loan.principal_cents > _disponivel THEN
      RAISE EXCEPTION 'Capital livre insuficiente para aprovar este empréstimo';
    END IF;
    UPDATE public.loans SET status='aprovado', decided_by=_actor, decided_at=now(),
      decision_note=_note, first_due_date = (current_date + interval '30 days')::date
    WHERE id=_loan_id RETURNING * INTO _loan;
  ELSE
    UPDATE public.loans SET status='reprovado', decided_by=_actor, decided_at=now(), decision_note=_note
    WHERE id=_loan_id RETURNING * INTO _loan;
  END IF;

  INSERT INTO public.audit_log (actor_id, action, entity, entity_id, details)
  VALUES (_actor, CASE WHEN _approve THEN 'aprovar_emprestimo' ELSE 'reprovar_emprestimo' END,
          'loans', _loan_id, jsonb_build_object('nota', _note, 'valor_centavos', _loan.principal_cents));

  RETURN _loan;
END; $function$;

CREATE OR REPLACE FUNCTION public.register_payment(_actor uuid, _loan_id uuid, _amount_cents bigint, _method text DEFAULT 'pix')
RETURNS public.loans
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _loan public.loans;
BEGIN
  IF _actor IS NULL OR NOT public.has_role(_actor,'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem registrar pagamentos';
  END IF;
  IF _amount_cents <= 0 THEN RAISE EXCEPTION 'Valor inválido'; END IF;

  SELECT * INTO _loan FROM public.loans WHERE id=_loan_id FOR UPDATE;
  IF _loan.id IS NULL THEN RAISE EXCEPTION 'Empréstimo não encontrado'; END IF;
  IF _loan.status NOT IN ('aprovado','atrasado') THEN RAISE EXCEPTION 'Empréstimo não está ativo'; END IF;

  INSERT INTO public.payments (loan_id, user_id, amount_cents, method, registered_by)
  VALUES (_loan_id, _loan.user_id, _amount_cents, _method, _actor);

  UPDATE public.loans
  SET paid_cents = paid_cents + _amount_cents,
      status = CASE WHEN paid_cents + _amount_cents >= total_due_cents THEN 'quitado'::public.loan_status ELSE status END
  WHERE id=_loan_id RETURNING * INTO _loan;

  INSERT INTO public.audit_log (actor_id, action, entity, entity_id, details)
  VALUES (_actor, 'registrar_pagamento', 'loans', _loan_id,
          jsonb_build_object('valor_centavos', _amount_cents, 'metodo', _method));

  RETURN _loan;
END; $function$;

-- Only the server (service_role) may execute privileged SECURITY DEFINER functions.
REVOKE ALL ON FUNCTION public.decide_loan(uuid, uuid, boolean, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.register_payment(uuid, uuid, bigint, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.capital_summary() FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON FUNCTION public.decide_loan(uuid, uuid, boolean, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.register_payment(uuid, uuid, bigint, text) TO service_role;
GRANT EXECUTE ON FUNCTION public.capital_summary() TO service_role;
