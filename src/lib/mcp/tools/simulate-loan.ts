import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { MAX_PRINCIPAL_CENTS, MIN_PRINCIPAL_CENTS, TERMS, brl, simulate } from "@/lib/loan-math";

export default defineTool({
  name: "simulate_loan",
  title: "Simular empréstimo",
  description: "Calcula parcela e total de um microcrédito Zion (2% ao mês, Tabela Price).",
  inputSchema: {
    valor_reais: z
      .number()
      .min(MIN_PRINCIPAL_CENTS / 100)
      .max(MAX_PRINCIPAL_CENTS / 100)
      .describe("Valor pedido em reais (R$ 100 a R$ 1.000)."),
    meses: z
      .number()
      .int()
      .refine((m) => (TERMS as readonly number[]).includes(m), "Prazos: 1, 2, 3, 4 ou 6 meses")
      .describe("Prazo em meses: 1, 2, 3, 4 ou 6."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: ({ valor_reais, meses }) => {
    const s = simulate(Math.round(valor_reais * 100), meses);
    return {
      content: [
        {
          type: "text",
          text: `${brl(s.principalCents)} em ${s.termMonths}x de ${brl(s.installmentCents)} · total ${brl(s.totalCents)} · juros ${brl(s.interestCents)}`,
        },
      ],
      structuredContent: { ...s },
    };
  },
});
