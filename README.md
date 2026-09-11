# Luxea Living — Luxury Residences & Stays

Find a home that elevates life. Curated luxury villas, penthouses, and bespoke residences across Kenya.

## Structure
- `index.html`: Main landing page, curated collection showcase, and VIP waitlist.
- `host.html`: Founding Partner / Host registration wizard (5 steps with file uploads).
- `stays.html`: Stays catalog with filters and property details modal.
- `admin.html`: Internal management portal with Supabase live sync & CSV export.
- `assets/css/`: Modular design system (`main.css`, `components.css`, `pages/`).
- `assets/js/`: Modular JavaScript (`config.js`, `supabase.js`, `modules/`).
- `luxea_supabase_schema.sql`: SQL database schema for Supabase.

## Supabase Integration
- Project Reference: `abzcabikdkmfaijnqbkf`
- Prefix: `lux_` (`lux_hosts`, `lux_waitlist`, `lux_properties`, bucket: `lux_documents`)
