import { auth, defineMcp } from "@lovable.dev/mcp-js";
import simulateLoan from "./tools/simulate-loan";
import listMyLoans from "./tools/list-my-loans";
import listMyPayments from "./tools/list-my-payments";

const projectRef = import.meta.env["VITE_SUPABASE_PROJECT_ID"] ?? "project-ref-unset";

export default defineMcp({
  name: "monte-si-o-microcr-dito",
  title: "Monte Sião Microcrédito",
  version: "0.1.0",
  instructions:
    "Ferramentas do microcrédito Zion (Monte Sião, Manaus). Use `simulate_loan` para simular parcelas, `list_my_loans` e `list_my_payments` para consultar a conta conectada.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [simulateLoan, listMyLoans, listMyPayments],
});
