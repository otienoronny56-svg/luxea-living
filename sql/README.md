# Luxea Living — Database Migrations & SQL Scripts

This folder contains all database schemas, table definitions, Row Level Security (RLS) policies, and Supabase Storage bucket configurations for Luxea Living.

---

## Migration Execution Order

When setting up or updating Supabase:

1. **`01_luxea_supabase_schema.sql`**  
   - Core tables: `lux_waitlist`, `lux_hosts`, `lux_properties`  
   - Row Level Security (RLS) policies for insert, read, and admin update  
   - Supabase Storage buckets: `lux_listings` and `lux_documents` with public read/write policies  
   - Realtime publication enables for live multi-client sync

---

## How to Add New SQL Files

When you need to add new features, tables, columns, or views:

1. Create a new file with sequential numbering:
   - Example: `02_bookings_and_reservations.sql`
   - Example: `03_analytics_and_audit_logs.sql`
   - Example: `04_payout_escrow_records.sql`
2. Keep each file focused on its specific change or feature.
3. Include standard `IF NOT EXISTS` guards and idempotent RLS policies.
4. Run each new script sequentially in your Supabase SQL Editor.
