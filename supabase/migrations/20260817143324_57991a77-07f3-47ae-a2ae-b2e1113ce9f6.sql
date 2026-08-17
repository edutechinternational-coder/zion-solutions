REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.capital_summary() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.capital_summary() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.decide_loan(_loan_id uuid, _approve boolean, _note text DEFAULT NULL)
RETURNS public.loans
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _loan public.loans;
  _disponivel bigint;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
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
    UPDATE public.loans SET status='aprovado', decided_by=auth.uid(), decided_at=now(),
      decision_note=_note, first_due_date = (current_date + interval '30 days')::date
    WHERE id=_loan_id RETURNING * INTO _loan;
  ELSE
    UPDATE public.loans SET status='reprovado', decided_by=auth.uid(), decided_at=now(), decision_note=_note
    WHERE id=_loan_id RETURNING * INTO _loan;
  END IF;

  INSERT INTO public.audit_log (actor_id, action, entity, entity_id, details)
  VALUES (auth.uid(), CASE WHEN _approve THEN 'aprovar_emprestimo' ELSE 'reprovar_emprestimo' END,
          'loans', _loan_id, jsonb_build_object('nota', _note, 'valor_centavos', _loan.principal_cents));

  RETURN _loan;
END; $$;
REVOKE EXECUTE ON FUNCTION public.decide_loan(uuid, boolean, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decide_loan(uuid, boolean, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.register_payment(_loan_id uuid, _amount_cents bigint, _method text DEFAULT 'pix')
RETURNS public.loans
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _loan public.loans;
BEGIN
  IF NOT public.has_role(auth.uid(),'admin') THEN
    RAISE EXCEPTION 'Apenas administradores podem registrar pagamentos';
  END IF;
  IF _amount_cents <= 0 THEN RAISE EXCEPTION 'Valor inválido'; END IF;

  SELECT * INTO _loan FROM public.loans WHERE id=_loan_id FOR UPDATE;
  IF _loan.id IS NULL THEN RAISE EXCEPTION 'Empréstimo não encontrado'; END IF;
  IF _loan.status NOT IN ('aprovado','atrasado') THEN RAISE EXCEPTION 'Empréstimo não está ativo'; END IF;

  INSERT INTO public.payments (loan_id, user_id, amount_cents, method, registered_by)
  VALUES (_loan_id, _loan.user_id, _amount_cents, _method, auth.uid());

  UPDATE public.loans
  SET paid_cents = paid_cents + _amount_cents,
      status = CASE WHEN paid_cents + _amount_cents >= total_due_cents THEN 'quitado'::public.loan_status ELSE status END
  WHERE id=_loan_id RETURNING * INTO _loan;

  INSERT INTO public.audit_log (actor_id, action, entity, entity_id, details)
  VALUES (auth.uid(), 'registrar_pagamento', 'loans', _loan_id,
          jsonb_build_object('valor_centavos', _amount_cents, 'metodo', _method));

  RETURN _loan;
END; $$;
REVOKE EXECUTE ON FUNCTION public.register_payment(uuid, bigint, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_payment(uuid, bigint, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.mark_late_loans()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.loans SET status='atrasado'
  WHERE status='aprovado' AND first_due_date IS NOT NULL AND first_due_date < current_date AND paid_cents = 0;
$$;
REVOKE EXECUTE ON FUNCTION public.mark_late_loans() FROM PUBLIC, anon, authenticated;