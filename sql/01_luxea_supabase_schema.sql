-- ==============================================================================
-- LUXEA LIVING — SUPABASE DATABASE SCHEMA & POLICIES (IDEMPOTENT)
-- All tables are prefixed with "lux_" to avoid collision with existing project tables.
-- Safe to re-run multiple times without duplicate policy or publication errors.
-- Run this in your Supabase Dashboard -> SQL Editor -> New Query -> Run
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. GUEST WAITLIST TABLE
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lux_waitlist (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pass_number VARCHAR(20) NOT NULL UNIQUE,
    pass_code VARCHAR(30) NOT NULL,
    full_name TEXT NOT NULL,
    email TEXT NOT NULL,
    phone TEXT,
    preferred_destinations TEXT,
    tier VARCHAR(50) DEFAULT 'Founding Circle',
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_lux_waitlist_email ON public.lux_waitlist(email);
CREATE INDEX IF NOT EXISTS idx_lux_waitlist_created_at ON public.lux_waitlist(created_at DESC);

-- Enable RLS for Waitlist
ALTER TABLE public.lux_waitlist ENABLE ROW LEVEL SECURITY;

-- Idempotent Waitlist Policies
DROP POLICY IF EXISTS "Allow public inserts into lux_waitlist" ON public.lux_waitlist;
CREATE POLICY "Allow public inserts into lux_waitlist"
ON public.lux_waitlist
FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public read of lux_waitlist" ON public.lux_waitlist;
CREATE POLICY "Allow public read of lux_waitlist"
ON public.lux_waitlist
FOR SELECT
USING (true);


-- ------------------------------------------------------------------------------
-- 2. HOST REGISTRATION TABLE (Based on LUXEA HOST REGISTRATION FORM.docx)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lux_hosts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ref_id VARCHAR(30) NOT NULL UNIQUE,
    
    -- A. Personal Details
    full_name TEXT NOT NULL,
    national_id TEXT NOT NULL,
    phone TEXT NOT NULL,
    email TEXT NOT NULL,
    kra_pin TEXT NOT NULL,
    dob DATE NOT NULL,
    
    -- B. Property Details
    property_name TEXT NOT NULL,
    property_type VARCHAR(50) NOT NULL, -- Apartment, Studio, Villa, Guest House, Other
    property_address TEXT NOT NULL,
    county TEXT NOT NULL,
    area_suburb TEXT NOT NULL,
    google_maps_link TEXT,
    
    -- C. Unit Information & Amenities
    bedrooms NUMERIC NOT NULL DEFAULT 1,
    bathrooms NUMERIC NOT NULL DEFAULT 1,
    max_guests INTEGER NOT NULL DEFAULT 2,
    amenities TEXT,
    other_amenities TEXT,
    
    -- D. Payout Details
    payout_method VARCHAR(50) NOT NULL, -- 'M-Pesa' or 'Bank Transfer'
    mpesa_name TEXT,
    mpesa_number TEXT,
    bank_name TEXT,
    bank_account_number TEXT,
    bank_account_name TEXT,
    
    -- E. Required Documents & Photos (Supabase Storage URLs)
    id_document_url TEXT,
    property_photos_urls JSONB DEFAULT '[]'::jsonb,
    business_reg_url TEXT,
    
    -- F. Declaration
    declaration_agreed BOOLEAN NOT NULL DEFAULT true,
    signature TEXT NOT NULL,
    signature_date DATE NOT NULL DEFAULT CURRENT_DATE,
    
    -- Internal Status & Review
    review_status VARCHAR(50) DEFAULT 'pending_review', -- pending_review, approved, rejected, contacted
    internal_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for host lookups
CREATE INDEX IF NOT EXISTS idx_lux_hosts_ref_id ON public.lux_hosts(ref_id);
CREATE INDEX IF NOT EXISTS idx_lux_hosts_email ON public.lux_hosts(email);
CREATE INDEX IF NOT EXISTS idx_lux_hosts_phone ON public.lux_hosts(phone);
CREATE INDEX IF NOT EXISTS idx_lux_hosts_county ON public.lux_hosts(county);
CREATE INDEX IF NOT EXISTS idx_lux_hosts_created_at ON public.lux_hosts(created_at DESC);

-- Enable RLS for Hosts
ALTER TABLE public.lux_hosts ENABLE ROW LEVEL SECURITY;

-- Idempotent Host Policies
DROP POLICY IF EXISTS "Allow public insert into lux_hosts" ON public.lux_hosts;
CREATE POLICY "Allow public insert into lux_hosts"
ON public.lux_hosts
FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow read of lux_hosts" ON public.lux_hosts;
CREATE POLICY "Allow read of lux_hosts"
ON public.lux_hosts
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Allow update of lux_hosts" ON public.lux_hosts;
CREATE POLICY "Allow update of lux_hosts"
ON public.lux_hosts
FOR UPDATE
USING (true);


-- ------------------------------------------------------------------------------
-- 3. CURATED PROPERTIES TABLE (Live listings catalog & Host management)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lux_properties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug VARCHAR(100) NOT NULL UNIQUE,
    name TEXT NOT NULL,
    category VARCHAR(50) NOT NULL,
    property_type VARCHAR(50) NOT NULL DEFAULT 'apartment',
    tagline TEXT,
    description TEXT,
    county TEXT NOT NULL,
    city TEXT NOT NULL,
    area TEXT NOT NULL,
    location_group VARCHAR(50),
    price_per_night_usd NUMERIC NOT NULL,
    price_per_night_kes NUMERIC NOT NULL,
    bedrooms INTEGER NOT NULL DEFAULT 1,
    bathrooms NUMERIC NOT NULL DEFAULT 1,
    square_feet INTEGER,
    rating NUMERIC DEFAULT 4.95,
    reviews_count INTEGER DEFAULT 10,
    cover_image_url TEXT,
    gallery_images JSONB DEFAULT '[]'::jsonb,
    amenities JSONB DEFAULT '[]'::jsonb,
    is_featured BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    
    -- Host Live Controls (Availability & Dates)
    is_available BOOLEAN DEFAULT true,
    available_from DATE,
    available_to DATE,
    blocked_dates JSONB DEFAULT '[]'::jsonb,
    host_ref_id VARCHAR(30),
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for Properties
ALTER TABLE public.lux_properties ENABLE ROW LEVEL SECURITY;

-- Idempotent Property Policies
DROP POLICY IF EXISTS "Allow public read lux_properties" ON public.lux_properties;
CREATE POLICY "Allow public read lux_properties"
ON public.lux_properties
FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Allow public insert lux_properties" ON public.lux_properties;
CREATE POLICY "Allow public insert lux_properties"
ON public.lux_properties
FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update lux_properties" ON public.lux_properties;
CREATE POLICY "Allow public update lux_properties"
ON public.lux_properties
FOR UPDATE
USING (true);


-- ------------------------------------------------------------------------------
-- 4. SUPABASE STORAGE BUCKETS: "lux_listings" & "lux_documents"
-- ------------------------------------------------------------------------------

-- 4A. Bucket for Host Documents (IDs, PINs, Business Reg)
INSERT INTO storage.buckets (id, name, public)
VALUES ('lux_documents', 'lux_documents', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Allow public uploads to lux_documents" ON storage.objects;
CREATE POLICY "Allow public uploads to lux_documents"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'lux_documents');

DROP POLICY IF EXISTS "Allow public read from lux_documents" ON storage.objects;
CREATE POLICY "Allow public read from lux_documents"
ON storage.objects
FOR SELECT
USING (bucket_id = 'lux_documents');

DROP POLICY IF EXISTS "Allow updates to lux_documents" ON storage.objects;
CREATE POLICY "Allow updates to lux_documents"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'lux_documents');


-- 4B. Bucket for Property & Listing Photos (High-Res Images uploaded by Hosts)
INSERT INTO storage.buckets (id, name, public)
VALUES ('lux_listings', 'lux_listings', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Allow public uploads to lux_listings" ON storage.objects;
CREATE POLICY "Allow public uploads to lux_listings"
ON storage.objects
FOR INSERT
WITH CHECK (bucket_id = 'lux_listings');

DROP POLICY IF EXISTS "Allow public read from lux_listings" ON storage.objects;
CREATE POLICY "Allow public read from lux_listings"
ON storage.objects
FOR SELECT
USING (bucket_id = 'lux_listings');

DROP POLICY IF EXISTS "Allow updates to lux_listings" ON storage.objects;
CREATE POLICY "Allow updates to lux_listings"
ON storage.objects
FOR UPDATE
USING (bucket_id = 'lux_listings');

DROP POLICY IF EXISTS "Allow deletes from lux_listings" ON storage.objects;
CREATE POLICY "Allow deletes from lux_listings"
ON storage.objects
FOR DELETE
USING (bucket_id = 'lux_listings');


-- ------------------------------------------------------------------------------
-- 5. ENABLE SUPABASE REALTIME (Safely handles duplicate adds)
-- ------------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'lux_properties'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.lux_properties;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'lux_hosts'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.lux_hosts;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' 
      AND schemaname = 'public' 
      AND tablename = 'lux_waitlist'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.lux_waitlist;
  END IF;
END $$;
