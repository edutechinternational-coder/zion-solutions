# Security process — Zion

## Automated checks

### 1. GitHub Actions — `.github/workflows/security-gate.yml`

Runs on every pull request, every push to `main`, weekly on a schedule, and on demand.
A failure blocks the pull request. It covers:

| Check | Fails the build when |
| --- | --- |
| Typecheck (`tsc --noEmit`) | Type errors, including unsafe data shapes from the database client |
| Lint (`eslint`) | Lint rule violations |
| `bun audit --audit-level=moderate` | Any dependency with a known moderate-or-worse vulnerability |
| Production build | The app fails to build |
| CodeQL (`security-extended`) | Static analysis finds an injection, XSS, or similar code-level flaw |
| Gitleaks | A credential, API key, or token is committed anywhere in history |

To make this a real merge gate, mark these jobs as **required status checks** in
GitHub under Settings → Branches → Branch protection rules for `main`.

### 2. Wiz (workspace-wide)

Connected at the workspace level. Scans run automatically for every project and
results appear in the project's Security tab.

## Checks that cannot run in CI

Database-level findings — row level security policies, table grants, and
`SECURITY DEFINER` function permissions — require backend credentials that are
not exposed to GitHub Actions. These are covered by the Lovable security scanner
in the Security tab.

**Run that scan and resolve or consciously accept every finding before publishing.**
Accepted findings and the reasoning behind them are recorded in the project's
security memory so future scans do not re-flag settled decisions.

## Pre-publish checklist

1. CI green on `main`.
2. Lovable security scan run, with no new unresolved findings.
3. Any new database table has: GRANTs, RLS enabled, and policies scoped to `auth.uid()` or an admin role check.
4. Any new `SECURITY DEFINER` function has `EXECUTE` revoked from `anon` unless it is deliberately public.

## Baseline de regras aprovadas e alerta de regressão

`security/baseline.json` congela as regras já resolvidas ou aceitas conscientemente
(ex.: `SUPA_authenticated_security_definer_function_executable` = *fixed*,
`payments_missing_write_policies` = *accepted*).

Para confirmar em segundos que nada regrediu:

```bash
bun run security:baseline
```

O script `scripts/check-security-baseline.mjs` reaplica cada regra sobre o estado
atual do repositório (grants efetivos nas migrações, chamadas de RPC privilegiada
fora de módulos de servidor, guardas `requireSupabaseAuth` + `assertAdmin`,
políticas fail-closed em `loans`/`payments`) e sai com código 1 na primeira
regressão. O mesmo comando roda no job `audit` do workflow **Security Gate**,
então uma regressão reprova o PR.

Ao resolver ou aceitar um novo finding, adicione a regra correspondente ao
baseline junto com a asserção que a verifica.
