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
