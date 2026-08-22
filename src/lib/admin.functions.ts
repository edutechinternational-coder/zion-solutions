import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { assertAdmin, safeDbError } from "./admin.server";

export const getCapitalSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin.rpc("capital_summary");
    if (error) throw safeDbError(error.message, "Não foi possível carregar o capital");
    return (Array.isArray(data) ? data[0] : data) ?? null;
  });

export const decideLoan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        loanId: z.string().uuid(),
        approve: z.boolean(),
        note: z.string().trim().max(500).optional(),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("decide_loan", {
      _loan_id: data.loanId,
      _approve: data.approve,
      _note: data.note ?? null,
    });
    if (error) throw safeDbError(error.message, "Ação não concluída");
    return { ok: true as const };
  });

export const registerPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) =>
    z
      .object({
        loanId: z.string().uuid(),
        amountCents: z.number().int().positive().max(100_000_000),
        method: z.enum(["pix", "dinheiro", "transferencia"]).default("pix"),
      })
      .parse(data),
  )
  .handler(async ({ context, data }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("register_payment", {
      _loan_id: data.loanId,
      _amount_cents: data.amountCents,
      _method: data.method,
    });
    if (error) throw safeDbError(error.message, "Pagamento não registrado");
    return { ok: true as const };
  });
