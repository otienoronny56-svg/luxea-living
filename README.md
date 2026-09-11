# Luxea Living — Luxury Residences & Stays

Find a home that elevates life. Curated luxury villas, penthouses, and bespoke residences across Kenya.

## Project Structure
- `index.html`: Main landing page, curated collection showcase, and VIP waitlist.
- `stays/`: Stays catalog with location/category filters, near-me sorting, and details modal.
- `host/`: Founding Partner / Host registration wizard (5 steps with Supabase file uploads).
- `admin/`: Super Admin Console with authentication gateway (`otienoronny56@gmail.com`), host vetting, inspections, and live availability controls.
  - `admin/login/`: Direct login redirect entry point.
- `waitlist/`: Standalone VIP founding membership waitlist page.
- `sql/`: Database schemas and migrations (`01_luxea_supabase_schema.sql`).
- `docs/`: Reference documents and onboarding resources.
- `assets/css/`: Modular design system (`main.css`, `components.css`, `pages/`).
- `assets/js/`: Modular JavaScript (`config.js`, `supabase.js`, `modules/`).

## Supabase Integration
- Project Reference: `abzcabikdkmfaijnqbkf`
- Database Tables: `lux_hosts`, `lux_properties`, `lux_waitlist`
- Storage Buckets: `lux_listings` (property photos), `lux_documents` (host IDs, verification)
