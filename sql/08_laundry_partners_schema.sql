-- ==============================================================================
-- LUXEA LIVING — LAUNDRY & VALET LINEN SERVICE PARTNERS
-- 100% SAFE & NON-DESTRUCTIVE (Uses IF NOT EXISTS, NO DROP TABLE)
-- Tables:
--   1. public.lux_laundry_partners (Registered laundry & dry cleaning providers)
--   2. public.lux_laundry_orders (Guest valet & host turnover laundry requests)
-- ==============================================================================

-- 1. LAUNDRY PARTNERS TABLE
CREATE TABLE IF NOT EXISTS public.lux_laundry_partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ref_id VARCHAR(50) UNIQUE,
  business_name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255) NOT NULL,
  phone VARCHAR(50) NOT NULL,
  email VARCHAR(255) UNIQUE,
  mpesa_number VARCHAR(50),
  coverage_areas JSONB DEFAULT '["Westlands", "Kilimani", "Ruaka", "Roysambu"]'::jsonb,
  services_offered JSONB DEFAULT '{"wash_fold": true, "dry_cleaning": true, "linen_turnover": true, "steam_pressing": true}'::jsonb,
  price_wash_fold_per_kg NUMERIC(10,2) DEFAULT 250.00,
  price_linen_turnover_set NUMERIC(10,2) DEFAULT 1500.00,
  price_dry_clean_suit NUMERIC(10,2) DEFAULT 900.00,
  express_available BOOLEAN DEFAULT true,
  status VARCHAR(50) DEFAULT 'approved', -- 'pending', 'approved', 'paused'
  rating NUMERIC(2,1) DEFAULT 5.0,
  completed_orders_count INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. LAUNDRY ORDERS TABLE
CREATE TABLE IF NOT EXISTS public.lux_laundry_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number VARCHAR(50) UNIQUE NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  customer_phone VARCHAR(50) NOT NULL,
  customer_email VARCHAR(255),
  order_type VARCHAR(50) DEFAULT 'guest_valet', -- 'guest_valet' or 'host_turnover'
  property_name VARCHAR(255),
  unit_number VARCHAR(100),
  location_area VARCHAR(100) NOT NULL,
  pickup_date DATE NOT NULL,
  pickup_time_slot VARCHAR(50) NOT NULL,
  service_type VARCHAR(100) DEFAULT 'Wash & Fold',
  estimated_weight_or_items VARCHAR(255),
  special_instructions TEXT,
  total_amount_kes NUMERIC(10,2) NOT NULL DEFAULT 0.00,
  payment_status VARCHAR(50) DEFAULT 'pending', -- 'pending', 'paid', 'cash_on_delivery'
  status VARCHAR(50) DEFAULT 'requested', -- 'requested', 'accepted', 'picked_up', 'in_process', 'out_for_delivery', 'delivered', 'cancelled'
  assigned_partner_id UUID REFERENCES public.lux_laundry_partners(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safe indexes for fast queries
CREATE INDEX IF NOT EXISTS idx_lux_laundry_orders_partner ON public.lux_laundry_orders(assigned_partner_id);
CREATE INDEX IF NOT EXISTS idx_lux_laundry_orders_status ON public.lux_laundry_orders(status);
CREATE INDEX IF NOT EXISTS idx_lux_laundry_orders_area ON public.lux_laundry_orders(location_area);

-- Enable RLS
ALTER TABLE public.lux_laundry_partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lux_laundry_orders ENABLE ROW LEVEL SECURITY;

-- Idempotent RLS Policies
DROP POLICY IF EXISTS "Allow public read laundry partners" ON public.lux_laundry_partners;
CREATE POLICY "Allow public read laundry partners"
ON public.lux_laundry_partners FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Allow public insert laundry partners" ON public.lux_laundry_partners;
CREATE POLICY "Allow public insert laundry partners"
ON public.lux_laundry_partners FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update laundry partners" ON public.lux_laundry_partners;
CREATE POLICY "Allow public update laundry partners"
ON public.lux_laundry_partners FOR UPDATE
USING (true);

DROP POLICY IF EXISTS "Allow public read laundry orders" ON public.lux_laundry_orders;
CREATE POLICY "Allow public read laundry orders"
ON public.lux_laundry_orders FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Allow public insert laundry orders" ON public.lux_laundry_orders;
CREATE POLICY "Allow public insert laundry orders"
ON public.lux_laundry_orders FOR INSERT
WITH CHECK (true);

DROP POLICY IF EXISTS "Allow public update laundry orders" ON public.lux_laundry_orders;
CREATE POLICY "Allow public update laundry orders"
ON public.lux_laundry_orders FOR UPDATE
USING (true);
