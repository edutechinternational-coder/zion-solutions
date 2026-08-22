#!/usr/bin/env node
/**
 * Verificador do baseline de segurança da Zion.
 *
 * Lê security/baseline.json e reaplica cada regra aprovada sobre o estado atual
 * do repositório (migrações SQL + código-fonte). Sai com código 1 se qualquer
 * regra regredir, para que a build/CI falhe.
 */
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, extname } from "node:path";

const root = process.cwd();
const baseline = JSON.parse(readFileSync(join(root, "security/baseline.json"), "utf8"));
const PRIV = baseline.privilegedFunctions;

// ---------- carregar migrações em ordem cronológica ----------
const migDir = join(root, "supabase/migrations");
const migrations = readdirSync(migDir)
  .filter((f) => f.endsWith(".sql"))
  .sort()
  .map((f) => ({ file: f, sql: readFileSync(join(migDir, f), "utf8") }));

const allSql = migrations.map((m) => m.sql).join("\n");

/**
 * Estado final de EXECUTE por função/papel, aplicando GRANT/REVOKE na ordem.
 * chave: `${fn}:${role}` -> boolean
 */
const execState = new Map();
const ROLES = ["public", "anon", "authenticated", "service_role"];

const stmts = allSql
  .split(";")
  .map((s) => s.replace(/--[^\n]*/g, "").trim())
  .filter(Boolean);

for (const s of stmts) {
  const m = /^(GRANT|REVOKE)\s+(EXECUTE|ALL)(?:\s+PRIVILEGES)?\s+ON\s+FUNCTION\s+(?:public\.)?([a-z_]+)\s*\(([^)]*)\)\s*(?:FROM|TO)\s+(.+)$/is.exec(
    s.replace(/\s+/g, " "),
  );
  if (!m) continue;
  const [, verb, , fn, , rolesRaw] = m;
  const roles = rolesRaw
    .split(",")
    .map((r) => r.trim().toLowerCase())
    .filter((r) => ROLES.includes(r));
  for (const role of roles) {
    execState.set(`${fn}:${role}`, verb.toUpperCase() === "GRANT");
  }
}

const can = (fn, role) => execState.get(`${fn}:${role}`) === true;

// ---------- coletar arquivos de código ----------
function walk(dir, acc = []) {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry.startsWith(".")) continue;
    const p = join(dir, entry);
    if (statSync(p).isDirectory()) walk(p, acc);
    else if ([".ts", ".tsx"].includes(extname(p))) acc.push(p);
  }
  return acc;
}
const srcFiles = walk(join(root, "src")).map((p) => ({
  path: p.slice(root.length + 1),
  code: readFileSync(p, "utf8"),
}));

const isServerModule = (p) => /\.(functions|server)\.tsx?$/.test(p);

// ---------- asserções ----------
const checks = {
  no_grant_to_authenticated_on_privileged_functions() {
    return PRIV.filter((fn) => can(fn, "authenticated")).map(
      (fn) => `EXECUTE em public.${fn} ainda concedido a "authenticated"`,
    );
  },
  no_grant_to_anon_or_public_on_privileged_functions() {
    const bad = [];
    for (const fn of PRIV) {
      for (const role of ["anon", "public"]) {
        if (can(fn, role)) bad.push(`EXECUTE em public.${fn} ainda concedido a "${role}"`);
      }
    }
    return bad;
  },
  privileged_functions_granted_to_service_role() {
    return PRIV.filter((fn) => !can(fn, "service_role")).map(
      (fn) => `public.${fn} não tem GRANT EXECUTE para "service_role"`,
    );
  },
  privileged_rpc_only_in_server_modules() {
    const bad = [];
    for (const { path, code } of srcFiles) {
      if (isServerModule(path)) continue;
      for (const fn of PRIV) {
        if (new RegExp(`\\.rpc\\(\\s*["'\`]${fn}["'\`]`).test(code)) {
          bad.push(`${path} chama a RPC privilegiada "${fn}" fora de um módulo de servidor`);
        }
      }
    }
    return bad;
  },
  admin_functions_use_requireSupabaseAuth_and_assertAdmin() {
    const file = srcFiles.find((f) => f.path === "src/lib/admin.functions.ts");
    if (!file) return ["src/lib/admin.functions.ts não encontrado"];
    const bad = [];
    const count = (re) => (file.code.match(re) ?? []).length;
    const fns = count(/createServerFn\(/g);
    if (fns === 0) bad.push("nenhuma server function encontrada em admin.functions.ts");
    if (count(/requireSupabaseAuth/g) < fns)
      bad.push("há server function administrativa sem o middleware requireSupabaseAuth");
    if (count(/assertAdmin\(/g) < fns)
      bad.push("há server function administrativa sem revalidação de admin (assertAdmin)");
    return bad;
  },
  no_delete_policy_on_loans() {
    return /CREATE\s+POLICY[^;]*ON\s+public\.loans[^;]*FOR\s+DELETE/is.test(allSql)
      ? ['política de DELETE criada em public.loans (baseline exige fail-closed)']
      : [];
  },
  no_write_policy_on_payments() {
    const bad = [];
    const re = /CREATE\s+POLICY[^;]*ON\s+public\.payments[^;]*FOR\s+(INSERT|UPDATE|DELETE|ALL)/gis;
    let m;
    while ((m = re.exec(allSql))) bad.push(`política de ${m[1].toUpperCase()} criada em public.payments`);
    return bad;
  },
};

// ---------- execução ----------
let failures = 0;
console.log(`Baseline de segurança Zion (v${baseline.version}, ${baseline.updated})\n`);
for (const rule of baseline.rules) {
  const check = checks[rule.assert];
  if (!check) {
    console.log(`?  ${rule.id} — asserção "${rule.assert}" não implementada`);
    failures++;
    continue;
  }
  const problems = check();
  if (problems.length === 0) {
    console.log(`OK   ${rule.id} (${rule.status})`);
  } else {
    failures++;
    console.log(`FALHA ${rule.id} (${rule.status}) — REGRESSÃO`);
    for (const p of problems) console.log(`      - ${p}`);
    console.log(`      motivo do baseline: ${rule.rationale}`);
  }
}

console.log("");
if (failures > 0) {
  console.error(`${failures} regra(s) do baseline regrediram. Corrija antes de publicar.`);
  process.exit(1);
}
console.log("Nenhuma regressão: todas as regras aprovadas continuam válidas.");
