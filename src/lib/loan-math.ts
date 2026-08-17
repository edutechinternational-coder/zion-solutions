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
