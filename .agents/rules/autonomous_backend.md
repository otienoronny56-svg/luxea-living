# Autonomous Backend & Supabase Execution Rule

## Direct Access Granted
The developer has granted full autonomous control of the Supabase backend (`abzcabiqdkmfaijnqbkf`).
The Personal Access Token is stored in `.env` as `SUPABASE_ACCESS_TOKEN`.

## Operating Principles
1. **🚨 ZERO DATA LOSS MANDATE**:
   - **NEVER DROP TABLES, NEVER DROP COLUMNS, NEVER TRUNCATE.**
   - All migrations must be strictly non-destructive (e.g. `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`).
   - If a table or column is obsolete, it must never be dropped automatically. The agent must explain clearly what the table/column is, what data is inside it, and leave any deletion to be performed manually by the developer in the Supabase Dashboard.
2. **Never ask the user to manually run safe migrations, queries, or deployments in the Supabase Dashboard.**
3. **Execute Database Migrations Directly**:
   - Use `node scripts/runSql.js <path-to-sql>` or invoke the Supabase Management API directly (`POST https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`).
4. **Deploy Edge Functions Directly**:
   - Run `node scripts/deployFunction.js` to build and deploy edge functions (e.g. `luxea-mailer`).
5. **Auth & Configuration Management**:
   - Manage Supabase Auth settings programmatically via `PATCH https://api.supabase.com/v1/projects/${PROJECT_REF}/config/auth`.
6. **Continuous Autonomy with Absolute Safety**:
   - Inspect, migrate, configure, deploy, and verify changes autonomously without destructive actions.
