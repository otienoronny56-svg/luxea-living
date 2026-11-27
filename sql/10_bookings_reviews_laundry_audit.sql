-- ============================================================================
-- LUXEA LIVING — MIGRATION 10: BOOKINGS, HOST CALENDAR, REVIEWS/COMPLAINTS,
-- TRUST CREDITS & LAUNDRY AUDIT (STRICTLY ADDITIVE, FULL RLS, ZERO DATA LOSS)
-- ============================================================================

-- 1. ADDITIVE COLUMNS ON EXISTING TABLES
ALTER TABLE public.lux_laundry_partners
  ADD COLUMN IF NOT EXISTS photos_urls jsonb DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS trust_credits integer NOT NULL DEFAULT 100,
  ADD COLUMN IF NOT EXISTS internal_notes text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS turnaround text DEFAULT 'Same-day express';

ALTER TABLE public.lux_hosts
  ADD COLUMN IF NOT EXISTS trust_credits integer NOT NULL DEFAULT 100;

ALTER TABLE public.lux_properties
  ADD COLUMN IF NOT EXISTS trust_credits integer NOT NULL DEFAULT 100;

-- Grant read on newly added non-sensitive laundry partner columns to anon/authenticated
GRANT SELECT (photos_urls, trust_credits, turnaround, address) ON public.lux_laundry_partners TO anon, authenticated;

-- Seed the 5 Nairobi launch laundry partners into real DB rows if missing
INSERT INTO public.lux_laundry_partners (
  ref_id, business_name, contact_person, phone, coverage_areas, services_offered,
  price_wash_fold_per_kg, price_linen_turnover_set, price_dry_clean_suit,
  express_available, status, rating, completed_orders_count, trust_credits, turnaround, address
)
VALUES
  ('LXL-2026-WEST', 'Spotless Valet & Dry Cleaners', 'Mary Wanjiku', '0712 345 678',
   '["Westlands","Parklands","Riverside"]'::jsonb, '["Wash & Fold","Dry Cleaning","Host Linen"]'::jsonb,
   250, 1500, 900, true, 'approved', 4.9, 68, 145, 'Same-day 4-6 hrs', 'Westlands Commercial Centre, Nairobi'),
  ('LXL-2026-KILI', 'LinenCraft Host Turnover Specialists', 'Kevin Otieno', '0722 890 123',
   '["Kilimani","Kileleshwa","Lavington"]'::jsonb, '["Host Linen","Wash & Fold","Steam Press"]'::jsonb,
   220, 1400, 850, true, 'approved', 5.0, 94, 170, 'Rapid turnover for hosts', 'Argwings Kodhek Rd, Kilimani'),
  ('LXL-2026-RUAK', 'FreshBreeze Eco-Laundry Hub', 'Grace Muthoni', '0733 456 789',
   '["Ruaka","Two Rivers","Rosslyn"]'::jsonb, '["Eco Wash","Host Linen","Dry Cleaning"]'::jsonb,
   200, 1300, 800, true, 'approved', 4.8, 51, 130, 'Next-day or 6-hr express', 'Limuru Rd, Ruaka'),
  ('LXL-2026-ROYS', 'Safari Sparkle Express Laundromat', 'Samuel Kiprop', '0701 234 567',
   '["Roysambu","Garden Estate","Thika Road"]'::jsonb, '["Wash & Fold","Host Linen","Express Bike"]'::jsonb,
   220, 1400, 850, true, 'approved', 4.9, 43, 125, 'Fast doorstep bike pickup', 'TRM Drive, Roysambu'),
  ('LXL-2026-KAREN', 'Prestige Fabric & Villa Valet', 'Brenda Cherono', '0720 998 877',
   '["Karen","Langata","Hardy"]'::jsonb, '["Villa Linen","Dry Cleaning","Delicate Care"]'::jsonb,
   280, 1600, 950, true, 'approved', 5.0, 36, 150, 'Same-day concierge pickup', 'Karen Shopping Centre, Nairobi')
ON CONFLICT (ref_id) DO NOTHING;

-- 2. LEAN BOOKINGS & HOST LEDGER TABLE
CREATE TABLE IF NOT EXISTS public.lux_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_code text UNIQUE NOT NULL,
  property_id uuid REFERENCES public.lux_properties(id) ON DELETE SET NULL,
  property_name text NOT NULL,
  host_ref_id text,
  owner_id uuid,
  guest_user_id uuid,
  guest_name text NOT NULL,
  guest_phone text,
  guest_email text,
  guests_count integer NOT NULL DEFAULT 2,
  check_in date NOT NULL,
  check_out date NOT NULL,
  nights integer GENERATED ALWAYS AS (GREATEST(1, (check_out - check_in))) STORED,
  total_kes numeric(12,2) NOT NULL DEFAULT 0,
  amount_paid_kes numeric(12,2) NOT NULL DEFAULT 0,
  payment_method text NOT NULL DEFAULT 'M-Pesa',
  mpesa_code text,
  payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('unpaid', 'deposit', 'paid', 'refunded')),
  source text NOT NULL DEFAULT 'luxea' CHECK (source IN ('luxea', 'manual', 'whatsapp', 'airbnb', 'booking_com')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'checked_in', 'checked_out', 'cancelled')),
  auto_laundry boolean NOT NULL DEFAULT false,
  laundry_order_id uuid,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT chk_lux_bookings_dates CHECK (check_out >= check_in)
);

CREATE INDEX IF NOT EXISTS idx_lux_bookings_property_dates ON public.lux_bookings (property_id, check_in, check_out);
CREATE INDEX IF NOT EXISTS idx_lux_bookings_owner_id ON public.lux_bookings (owner_id);
CREATE INDEX IF NOT EXISTS idx_lux_bookings_host_ref ON public.lux_bookings (host_ref_id);
CREATE INDEX IF NOT EXISTS idx_lux_bookings_guest_user ON public.lux_bookings (guest_user_id);
CREATE INDEX IF NOT EXISTS idx_lux_bookings_status_checkout ON public.lux_bookings (status, check_out);

-- Trigger: enforce safe defaults for public/guest booking requests & auto-populate owner_id/host_ref_id
CREATE OR REPLACE FUNCTION public.lux_bookings_before_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_prop record;
  v_is_admin boolean;
  v_is_owner boolean;
BEGIN
  NEW.updated_at := now();

  IF NEW.booking_code IS NULL OR length(trim(NEW.booking_code)) = 0 THEN
    NEW.booking_code := 'LXB-' || to_char(now(), 'YYMMDD') || '-' || upper(substring(replace(gen_random_uuid()::text, '-', ''), 1, 4));
  END IF;

  -- Resolve property owner_id and host_ref_id automatically
  IF NEW.property_id IS NOT NULL THEN
    SELECT owner_id, host_ref_id, name INTO v_prop
    FROM public.lux_properties
    WHERE id = NEW.property_id;

    IF FOUND THEN
      IF NEW.owner_id IS NULL THEN NEW.owner_id := v_prop.owner_id; END IF;
      IF NEW.host_ref_id IS NULL THEN NEW.host_ref_id := v_prop.host_ref_id; END IF;
      IF NEW.property_name IS NULL OR length(trim(NEW.property_name)) = 0 THEN
        NEW.property_name := v_prop.name;
      END IF;
    END IF;
  END IF;

  v_is_admin := private.is_admin();
  v_is_owner := (auth.uid() IS NOT NULL AND (NEW.owner_id = auth.uid() OR (NEW.host_ref_id IS NOT NULL AND private.is_host_owner(NEW.host_ref_id))));

  -- Guests / anonymous users can only create pending 'luxea' requests with unpaid status
  IF TG_OP = 'INSERT' AND NOT v_is_admin AND NOT v_is_owner THEN
    NEW.source := 'luxea';
    NEW.status := 'pending';
    NEW.amount_paid_kes := 0;
    NEW.payment_status := 'unpaid';
    IF auth.uid() IS NOT NULL THEN
      NEW.guest_user_id := auth.uid();
    END IF;
  END IF;

  -- Auto-compute payment_status when host/admin updates amounts
  IF NEW.payment_status <> 'refunded' THEN
    IF NEW.amount_paid_kes >= NEW.total_kes AND NEW.total_kes > 0 THEN
      NEW.payment_status := 'paid';
    ELSIF NEW.amount_paid_kes > 0 THEN
      NEW.payment_status := 'deposit';
    ELSE
      NEW.payment_status := 'unpaid';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_lux_bookings_before_write
  BEFORE INSERT OR UPDATE ON public.lux_bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.lux_bookings_before_write();

ALTER TABLE public.lux_bookings ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "lux_bookings_admin_all" ON public.lux_bookings
    FOR ALL TO authenticated
    USING (private.is_admin())
    WITH CHECK (private.is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "lux_bookings_host_select" ON public.lux_bookings
    FOR SELECT TO authenticated
    USING (
      owner_id = (SELECT auth.uid())
      OR (host_ref_id IS NOT NULL AND private.is_host_owner(host_ref_id))
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "lux_bookings_host_insert" ON public.lux_bookings
    FOR INSERT TO authenticated
    WITH CHECK (
      private.is_approved_host()
      AND (
        owner_id = (SELECT auth.uid())
        OR (host_ref_id IS NOT NULL AND private.is_host_owner(host_ref_id))
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "lux_bookings_host_update" ON public.lux_bookings
    FOR UPDATE TO authenticated
    USING (
      owner_id = (SELECT auth.uid())
      OR (host_ref_id IS NOT NULL AND private.is_host_owner(host_ref_id))
    )
    WITH CHECK (
      owner_id = (SELECT auth.uid())
      OR (host_ref_id IS NOT NULL AND private.is_host_owner(host_ref_id))
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "lux_bookings_guest_select_own" ON public.lux_bookings
    FOR SELECT TO authenticated
    USING (guest_user_id = (SELECT auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "lux_bookings_public_request_insert" ON public.lux_bookings
    FOR INSERT TO anon, authenticated
    WITH CHECK (
      property_id IS NOT NULL
      AND length(trim(guest_name)) >= 2
      AND check_out >= check_in
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Safe Public RPC: returns ONLY booked date ranges (zero guest PII leaked!)
CREATE OR REPLACE FUNCTION public.get_property_booked_dates(p_property_id uuid)
RETURNS TABLE (check_in date, check_out date, status text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT b.check_in, b.check_out, b.status
  FROM public.lux_bookings b
  WHERE b.property_id = p_property_id
    AND b.status IN ('pending', 'confirmed', 'checked_in')
    AND b.check_out >= CURRENT_DATE
  ORDER BY b.check_in ASC;
$$;

GRANT EXECUTE ON FUNCTION public.get_property_booked_dates(uuid) TO anon, authenticated;

-- 3. REVIEWS, COMPLAINTS & TRUST CREDIT SYSTEM
CREATE TABLE IF NOT EXISTS public.lux_reviews_complaints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_type text NOT NULL CHECK (target_type IN ('stay', 'host', 'laundry')),
  target_id text NOT NULL,
  target_name text,
  booking_id uuid REFERENCES public.lux_bookings(id) ON DELETE SET NULL,
  kind text NOT NULL DEFAULT 'review' CHECK (kind IN ('review', 'complaint')),
  rating integer CHECK (rating BETWEEN 1 AND 5),
  category text,
  reviewer_user_id uuid,
  reviewer_name text NOT NULL,
  reviewer_phone text,
  comment text NOT NULL,
  status text NOT NULL DEFAULT 'published' CHECK (status IN ('published', 'open', 'resolved', 'dismissed')),
  admin_resolution text,
  credit_delta integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lux_rc_target ON public.lux_reviews_complaints (target_type, target_id);
CREATE INDEX IF NOT EXISTS idx_lux_rc_kind_status ON public.lux_reviews_complaints (kind, status);
CREATE INDEX IF NOT EXISTS idx_lux_rc_created ON public.lux_reviews_complaints (created_at DESC);

CREATE OR REPLACE FUNCTION public.lux_reviews_before_write()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  NEW.updated_at := now();

  IF TG_OP = 'INSERT' AND NOT private.is_admin() THEN
    NEW.admin_resolution := NULL;
    IF auth.uid() IS NOT NULL THEN
      NEW.reviewer_user_id := auth.uid();
    END IF;
    IF NEW.kind = 'complaint' THEN
      NEW.status := 'open';
    ELSE
      NEW.status := 'published';
    END IF;
  END IF;

  -- Compute deterministic trust credit delta
  IF NEW.kind = 'complaint' THEN
    IF NEW.status = 'open' THEN
      NEW.credit_delta := -15;
    ELSIF NEW.status = 'resolved' THEN
      NEW.credit_delta := -5;
    ELSE
      NEW.credit_delta := 0;
    END IF;
  ELSE
    IF NEW.status = 'published' THEN
      NEW.credit_delta := CASE COALESCE(NEW.rating, 5)
        WHEN 5 THEN 10
        WHEN 4 THEN 5
        WHEN 3 THEN 0
        WHEN 2 THEN -5
        ELSE -10
      END;
    ELSE
      NEW.credit_delta := 0;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_lux_reviews_before_write
  BEFORE INSERT OR UPDATE ON public.lux_reviews_complaints
  FOR EACH ROW
  EXECUTE FUNCTION public.lux_reviews_before_write();

-- After-write trigger: recalculate live trust_credits & rating on stay/host/laundry
CREATE OR REPLACE FUNCTION public.lux_reviews_sync_scores()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_type text := COALESCE(NEW.target_type, OLD.target_type);
  v_id text := COALESCE(NEW.target_id, OLD.target_id);
  v_avg numeric;
  v_cnt integer;
  v_credits integer;
BEGIN
  SELECT
    ROUND(AVG(rating)::numeric, 2),
    COUNT(*) FILTER (WHERE kind = 'review' AND status = 'published'),
    GREATEST(0, 100 + COALESCE(SUM(credit_delta), 0))
  INTO v_avg, v_cnt, v_credits
  FROM public.lux_reviews_complaints
  WHERE target_type = v_type AND target_id = v_id;

  IF v_type = 'stay' THEN
    UPDATE public.lux_properties
    SET
      rating = COALESCE(v_avg, rating),
      reviews_count = COALESCE(v_cnt, reviews_count),
      trust_credits = COALESCE(v_credits, 100)
    WHERE id::text = v_id OR slug = v_id;
  ELSIF v_type = 'host' THEN
    UPDATE public.lux_hosts
    SET trust_credits = COALESCE(v_credits, 100)
    WHERE ref_id = v_id OR id::text = v_id;
  ELSIF v_type = 'laundry' THEN
    UPDATE public.lux_laundry_partners
    SET
      rating = COALESCE(v_avg, rating),
      trust_credits = COALESCE(v_credits, 100)
    WHERE ref_id = v_id OR id::text = v_id;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

CREATE OR REPLACE TRIGGER trg_lux_reviews_sync_scores
  AFTER INSERT OR UPDATE OR DELETE ON public.lux_reviews_complaints
  FOR EACH ROW
  EXECUTE FUNCTION public.lux_reviews_sync_scores();

ALTER TABLE public.lux_reviews_complaints ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY "lux_rc_admin_all" ON public.lux_reviews_complaints
    FOR ALL TO authenticated
    USING (private.is_admin())
    WITH CHECK (private.is_admin());
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "lux_rc_public_published_reviews" ON public.lux_reviews_complaints
    FOR SELECT TO anon, authenticated
    USING (kind = 'review' AND status = 'published');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "lux_rc_own_submissions_select" ON public.lux_reviews_complaints
    FOR SELECT TO authenticated
    USING (reviewer_user_id = (SELECT auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "lux_rc_public_insert" ON public.lux_reviews_complaints
    FOR INSERT TO anon, authenticated
    WITH CHECK (
      length(trim(reviewer_name)) >= 2
      AND length(trim(comment)) >= 3
      AND target_type IN ('stay', 'host', 'laundry')
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
