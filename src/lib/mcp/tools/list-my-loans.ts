import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_loans",
  title: "Meus empréstimos",
  description: "Lista os empréstimos da conta conectada, com status e valores pagos.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    const { data, error } = await supabaseForUser(ctx)
      .from("loans")
      .select(
        "id, principal_cents, term_months, installment_cents, total_due_cents, paid_cents, status, first_due_date, created_at",
      )
      .eq("user_id", ctx.getUserId()!)
      .order("created_at", { ascending: false });
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const loans = (data ?? []).map((l) => ({
      id: l.id,
      principal_cents: l.principal_cents,
      term_months: l.term_months,
      installment_cents: l.installment_cents,
      total_due_cents: l.total_due_cents,
      paid_cents: l.paid_cents,
      status: l.status,
      first_due_date: l.first_due_date,
      created_at: l.created_at,
    }));
    return { content: [{ type: "text", text: JSON.stringify(loans) }], structuredContent: { loans } };
  },
});
