import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

function safeLoanRequestError(message: string | undefined): Error {
  const allowed = [
    "Usuário não autenticado",
    "Valor solicitado fora do limite permitido",
    "Prazo solicitado fora do limite permitido",
    "Finalidade deve ter pelo menos 5 caracteres",
    "Você já tem uma solicitação em análise",
  ];
  return new Error(
    message && allowed.includes(message) ? message : "Não foi possível enviar a solicitação",
  );
}

export const createLoanRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        principalCents: z.number().int().min(10_000).max(100_000),
        termMonths: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(6)]),
        purpose: z.string().trim().min(5).max(200),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: loan, error } = await supabaseAdmin.rpc("create_loan_request", {
      _actor: context.userId,
      _principal_cents: data.principalCents,
      _term_months: data.termMonths,
      _purpose: data.purpose,
    });
    if (error) throw safeLoanRequestError(error.message);
    return loan;
  });
