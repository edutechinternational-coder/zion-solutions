import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Confirms the caller holds the admin role, using the caller's own RLS-scoped
 * client. Throws otherwise. Never uses the service-role client to decide this.
 */
export async function assertAdmin(
  supabase: SupabaseClient<Database>,
  userId: string,
): Promise<void> {
  const { data, error } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();

  if (error) throw new Error("Não foi possível validar suas permissões");
  if (!data) throw new Error("Acesso restrito à operação");
}

/** Maps database errors to safe, user-facing messages. */
export function safeDbError(message: string | undefined, fallback: string): Error {
  const allowed = [
    "Apenas administradores podem decidir solicitações",
    "Solicitação não encontrada",
    "Solicitação já foi decidida",
    "Capital livre insuficiente para aprovar este empréstimo",
    "Empréstimo não encontrado",
    "Empréstimo não está ativo",
    "Valor inválido",
  ];
  return new Error(message && allowed.includes(message) ? message : fallback);
}
