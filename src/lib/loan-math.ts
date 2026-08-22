export const MONTHLY_RATE = 0.02;
export const MIN_PRINCIPAL_CENTS = 10000; // R$ 100
export const MAX_PRINCIPAL_CENTS = 100000; // R$ 1.000
export const TERMS = [1, 2, 3, 4, 6] as const;

export type Simulation = {
  principalCents: number;
  termMonths: number;
  installmentCents: number;
  totalCents: number;
  interestCents: number;
};

/** Juros compostos (Tabela Price): parcela fixa sobre saldo devedor. */
export function simulate(principalCents: number, termMonths: number): Simulation {
  const i = MONTHLY_RATE;
  const factor = (principalCents * i) / (1 - Math.pow(1 + i, -termMonths));
  const installmentCents = Math.round(factor);
  const totalCents = installmentCents * termMonths;
  return {
    principalCents,
    termMonths,
    installmentCents,
    totalCents,
    interestCents: totalCents - principalCents,
  };
}

export function brl(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

export function formatDate(value?: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("pt-BR");
}

export const LOAN_STATUS_LABEL: Record<string, string> = {
  pendente: "Em análise",
  aprovado: "Ativo",
  reprovado: "Reprovado",
  quitado: "Quitado",
  atrasado: "Em atraso",
};

export type Installment = {
  number: number;
  dueDate: string | null;
  amountCents: number;
  paidCents: number;
  status: "quitada" | "parcial" | "aberta" | "atrasada";
};

function addMonths(iso: string, months: number): string {
  const d = new Date(`${iso}T12:00:00`);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() < day) d.setDate(0);
  return d.toISOString().slice(0, 10);
}

/** Distribui o valor já pago sobre as parcelas, na ordem de vencimento. */
export function buildSchedule(loan: {
  term_months: number;
  installment_cents: number;
  total_due_cents: number;
  paid_cents: number;
  first_due_date: string | null;
}): Installment[] {
  const hoje = new Date().toISOString().slice(0, 10);
  let restante = loan.paid_cents;
  const parcelas: Installment[] = [];

  for (let n = 1; n <= loan.term_months; n++) {
    const amountCents =
      n === loan.term_months
        ? loan.total_due_cents - loan.installment_cents * (loan.term_months - 1)
        : loan.installment_cents;
    const paidCents = Math.max(0, Math.min(amountCents, restante));
    restante -= paidCents;
    const dueDate = loan.first_due_date ? addMonths(loan.first_due_date, n - 1) : null;

    let status: Installment["status"];
    if (paidCents >= amountCents) status = "quitada";
    else if (dueDate && dueDate < hoje) status = "atrasada";
    else if (paidCents > 0) status = "parcial";
    else status = "aberta";

    parcelas.push({ number: n, dueDate, amountCents, paidCents, status });
  }

  return parcelas;
}

export const INSTALLMENT_STATUS_LABEL: Record<Installment["status"], string> = {
  quitada: "Paga",
  parcial: "Parcial",
  aberta: "A vencer",
  atrasada: "Em atraso",
};
