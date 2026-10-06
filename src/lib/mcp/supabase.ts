import { createClient } from "@supabase/supabase-js";
import type { ToolContext } from "@lovable.dev/mcp-js";
import type { Database } from "@/integrations/supabase/types";

type RuntimeGlobals = typeof globalThis & {
  process?: { env?: Record<string, string | undefined> };
};

function env(names: readonly string[]): string | undefined {
  const runtime = globalThis as RuntimeGlobals;
  for (const n of names) {
    const v = runtime.process?.env?.[n]?.trim();
    if (v) return v;
  }
  return undefined;
}

function url(): string {
  return (
    env(["SUPABASE_URL", "VITE_SUPABASE_URL"]) ??
    (import.meta.env["VITE_SUPABASE_URL"] as string | undefined) ??
    ""
  );
}

function key(): string {
  return (
    env(["SUPABASE_PUBLISHABLE_KEY", "VITE_SUPABASE_PUBLISHABLE_KEY"]) ??
    (import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] as string | undefined) ??
    ""
  );
}

/** Forwards the verified bearer token so RLS runs as the signed-in user. */
export function supabaseForUser(ctx: ToolContext) {
  const token = ctx.getToken();
  if (!token) throw new Error("Token OAuth verificado é obrigatório");
  return createClient<Database>(url(), key(), {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
