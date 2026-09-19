# STRICT DATABASE SAFETY RULE — ZERO DATA LOSS

## 🚨 ABSOLUTE RESTRICTION: NEVER DROP TABLES OR COLUMNS

1. **NEVER execute `DROP TABLE`, `DROP COLUMN`, `TRUNCATE`, or `CASCADE` drops** on any database (Supabase, PostgreSQL, etc.).
2. **NEVER execute destructive schema alterations** that delete existing columns, tables, or stored user/client data.
3. **Additive Schema Modifications Only**:
   - Only use `CREATE TABLE IF NOT EXISTS`, `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`, and additive migrations.
   - If a field is obsolete, mark it deprecated or nullable—**never drop it**.
4. **Manual Deletion Policy**:
   - If a table or column ever needs to be removed, the agent **MUST NOT** execute it.
   - The agent must stop, explain in plain language:
     1. Exactly which table or column is affected.
     2. What data is currently in it.
     3. Why it was considered for removal and alternative non-destructive approaches.
   - The developer will perform the deletion manually in the dashboard only if they explicitly choose to do so.
