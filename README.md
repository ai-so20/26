# AI PROCESS V1 — independent 26 project

GitHub: ai-so20/26. Supabase: amgeyannjsslzmoowcmd (ai-so20'26). Vercel: 26.
No legacy project files, data, credentials or deployments are modified.

## Implemented

Email-free username/password signup with name and phone, admin approval, opaque server sessions in Secure/HttpOnly cookies, forced temporary-password change, admin reset with session revocation.
Mobile-first white/blue user and admin views, process selection, valuation/PnL, time remaining, valuation chart and history, admin approval, process registration/restart, capital addition, profit/loss adjustments, schedule/target updates, current-value termination and privileged audit.
Database uses ap_private tables (RLS enabled, no public schema/table grants) and a gateway requiring a server-only secret plus session validation. Public requests never receive password hashes or session tokens. Internal target values are omitted from member process responses.

## Deliberately disabled

Automated 3-minute reflection and scheduler remain disabled during UI/identity verification. No cron job is installed. Normal-expiry automation and target-tracking payout engine will be verified later.
The service is an internal simulation, not a representation of real trading results or a guaranteed return.

## Checks

npm test / npm run build. 15 Node tests (9 calculation, 6 API boundary/session checks).
scripts/live-flow.mjs accepts disposable QA credentials on stdin and tests the deployed API without printing cookies. test/database-flow.sql uses in-memory placeholders and a rollback-only transaction to verify actual DB flows without leaving sample accounts or processes.
The DB bootstrap secret and initial admin password are never committed. Server variables: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, AP_GATEWAY_KEY. Production only; preview deployments do not share production credentials.

## Database

The exact clean database setup is recorded in db/001_identity_operations.sql. Local function modules are combined into that setup for version control. Seed settings and administrator via the authorized setup workflow, not this migration. Private schema access is denied by default. Supabase advisor flags the secret-protected gateway because the anon role can invoke it; the gateway rejects all calls without its 256-bit server key, and checks opaque session and role for protected actions.
