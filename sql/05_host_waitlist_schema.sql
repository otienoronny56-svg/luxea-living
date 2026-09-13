-- ==============================================================================
-- LUXEA LIVING — HOST WAITLIST SCHEMA & AUTOMATION (IDEMPOTENT)
-- Table: public.lux_host_waitlist
-- Purpose: Captures high-intent luxury property owners & estate managers
-- Safe to re-run multiple times in Supabase SQL Editor
-- ==============================================================================

-- 1. Create Host Waitlist Table
CREATE TABLE IF NOT EXISTS public.lux_host_waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pass_number VARCHAR(30) NOT NULL UNIQUE,
    pass_code VARCHAR(30) NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    property_name TEXT,
    property_type VARCHAR(100) NOT NULL, -- Luxury Villa, Sky Penthouse, Lakefront Estate, Safari Lodge, Serviced Suite, etc.
    region TEXT NOT NULL,                -- Nairobi (Karen/Westlands/Runda), Coast (Diani/Watamu), Rift Valley, etc.
    bedrooms NUMERIC DEFAULT 1,
    operational_status VARCHAR(100),     -- Live on Airbnb/Booking, Brand New & Ready, In Refurbishment
    portfolio_link TEXT,                 -- Airbnb link, Instagram, Google Drive, or website
    notes TEXT,
    tier VARCHAR(50) DEFAULT 'Founding Host Partner',
    commission_perk VARCHAR(100) DEFAULT '0% for 90 Days',
    status VARCHAR(50) DEFAULT 'waitlisted', -- waitlisted, contacted, approved, converted
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indexes for efficient lookup and search
CREATE INDEX IF NOT EXISTS idx_lux_host_waitlist_email ON public.lux_host_waitlist(email);
CREATE INDEX IF NOT EXISTS idx_lux_host_waitlist_region ON public.lux_host_waitlist(region);
CREATE INDEX IF NOT EXISTS idx_lux_host_waitlist_created_at ON public.lux_host_waitlist(created_at DESC);

-- 3. Row Level Security (RLS)
ALTER TABLE public.lux_host_waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public inserts into lux_host_waitlist" ON public.lux_host_waitlist;
CREATE POLICY "Allow public inserts into lux_host_waitlist"
ON public.lux_host_waitlist
FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read of lux_host_waitlist" ON public.lux_host_waitlist;
CREATE POLICY "Allow public read of lux_host_waitlist"
ON public.lux_host_waitlist
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Allow public update of lux_host_waitlist" ON public.lux_host_waitlist;
CREATE POLICY "Allow public update of lux_host_waitlist"
ON public.lux_host_waitlist
FOR UPDATE
USING (true);

-- 4. Automated Email Trigger to Edge Function (pg_net)
CREATE OR REPLACE FUNCTION public.lux_trigger_host_waitlist_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    PERFORM net.http_post(
        url := 'https://abzcabiqdkmfaijnqbkf.supabase.co/functions/v1/luxea-mailer',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := json_build_object(
            'type', 'host_waitlist_welcome',
            'record', row_to_json(NEW)
        )::jsonb
    );
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Host waitlist email trigger exception: %', SQLERRM;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_lux_host_waitlist_email ON public.lux_host_waitlist;
CREATE TRIGGER trg_lux_host_waitlist_email
AFTER INSERT ON public.lux_host_waitlist
FOR EACH ROW
EXECUTE FUNCTION public.lux_trigger_host_waitlist_email();
