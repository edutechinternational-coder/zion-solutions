import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "../supabase";

export default defineTool({
  name: "list_my_payments",
  title: "Meus pagamentos",
  description: "Lista os pagamentos registrados nos empréstimos da conta conectada.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_args, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Não autenticado" }], isError: true };
    }
    const { data, error } = await supabaseForUser(ctx)
      .from("payments")
      .select("id, loan_id, amount_cents, method, paid_at")
      .eq("user_id", ctx.getUserId()!)
      .order("paid_at", { ascending: false });
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    const payments = (data ?? []).map((p) => ({
      id: p.id,
      loan_id: p.loan_id,
      amount_cents: p.amount_cents,
      method: p.method,
      paid_at: p.paid_at,
    }));
    return {
      content: [{ type: "text", text: JSON.stringify(payments) }],
      structuredContent: { payments },
    };
  },
});
