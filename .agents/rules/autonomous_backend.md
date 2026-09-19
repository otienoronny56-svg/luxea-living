# Autonomous Backend & Supabase Execution Rule

## Direct Access Granted
The developer has granted full autonomous control of the Supabase backend (`abzcabiqdkmfaijnqbkf`).
The Personal Access Token is stored in `.env` as `SUPABASE_ACCESS_TOKEN`.

## Operating Principles
1. **Never ask the user to manually run migrations, queries, or deployments in the Supabase Dashboard.**
2. **Execute Database Migrations Directly**:
   - Use `node scripts/runSql.js <path-to-sql>` or invoke the Supabase Management API directly (`POST https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`).
3. **Deploy Edge Functions Directly**:
   - Run `node scripts/deployFunction.js` to build and deploy edge functions (e.g. `luxea-mailer`).
4. **Auth & Configuration Management**:
   - Manage Supabase Auth settings programmatically via `PATCH https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`.
5. **Continuous Autonomy**:
   - Inspect, migrate, configure, deploy, and verify changes autonomously.
