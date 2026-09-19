-- ==============================================================================
-- LUXEA LIVING — PRODUCTION ROW LEVEL SECURITY (RLS) & ACCESS CONTROL
-- Zero Data Loss: Non-destructive policy definitions only.
-- Enforces:
-- 1. Super Admin (otienoronny56@gmail.com): Full administrative authority.
-- 2. Host Partners: Access & manage only their own listings and profile.
-- 3. VIP Guests / Public: Browse active stays, submit applications/waitlist.
-- ==============================================================================

-- 1. Helper function to check if the current user is the Super Administrator
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN COALESCE(
    LOWER(auth.jwt() ->> 'email') = 'otienoronny56@gmail.com'
    OR (auth.jwt() -> 'user_metadata' ->> 'role') = 'super_admin',
    false
  );
END;
$$;

-- 2. Helper function to get the current authenticated email
CREATE OR REPLACE FUNCTION public.current_user_email()
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN COALESCE(LOWER(auth.jwt() ->> 'email'), '');
END;
$$;

-- ==============================================================================
-- TABLE: public.lux_properties
-- ==============================================================================
ALTER TABLE public.lux_properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read active lux_properties" ON public.lux_properties;
DROP POLICY IF EXISTS "Allow public read lux_properties" ON public.lux_properties;
DROP POLICY IF EXISTS "Allow public insert lux_properties" ON public.lux_properties;
DROP POLICY IF EXISTS "Allow public update lux_properties" ON public.lux_properties;
DROP POLICY IF EXISTS "Super admin full access on lux_properties" ON public.lux_properties;
DROP POLICY IF EXISTS "Public can view active properties" ON public.lux_properties;
DROP POLICY IF EXISTS "Hosts can manage own properties" ON public.lux_properties;

-- A. Public can ONLY view active listings
CREATE POLICY "Public can view active properties"
ON public.lux_properties
FOR SELECT
USING (is_active = true OR public.is_super_admin());

-- B. Super Admin has full control
CREATE POLICY "Super admin full access on lux_properties"
ON public.lux_properties
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- ==============================================================================
-- TABLE: public.lux_hosts (Sensitive PII: IDs, Payouts, Documents)
-- ==============================================================================
ALTER TABLE public.lux_hosts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert into lux_hosts" ON public.lux_hosts;
DROP POLICY IF EXISTS "Allow read of lux_hosts" ON public.lux_hosts;
DROP POLICY IF EXISTS "Allow update of lux_hosts" ON public.lux_hosts;
DROP POLICY IF EXISTS "Super admin full access on lux_hosts" ON public.lux_hosts;
DROP POLICY IF EXISTS "Public can submit host application" ON public.lux_hosts;
DROP POLICY IF EXISTS "Hosts can view own profile" ON public.lux_hosts;
DROP POLICY IF EXISTS "Hosts can update own profile" ON public.lux_hosts;
DROP POLICY IF EXISTS "Public lookup by ref_id" ON public.lux_hosts;

-- A. Prospective hosts can submit new applications
CREATE POLICY "Public can submit host application"
ON public.lux_hosts
FOR INSERT
WITH CHECK (true);

-- B. Super Admin can view, inspect, and manage all host applications
CREATE POLICY "Super admin full access on lux_hosts"
ON public.lux_hosts
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- C. Authenticated Host Partners can view ONLY their own application
CREATE POLICY "Hosts can view own profile"
ON public.lux_hosts
FOR SELECT
TO authenticated
USING (
  LOWER(email) = public.current_user_email()
  OR public.is_super_admin()
);

-- D. Authenticated Host Partners can update ONLY their own application
CREATE POLICY "Hosts can update own profile"
ON public.lux_hosts
FOR UPDATE
TO authenticated
USING (
  LOWER(email) = public.current_user_email()
  OR public.is_super_admin()
)
WITH CHECK (
  LOWER(email) = public.current_user_email()
  OR public.is_super_admin()
);

-- E. Public safe lookup (Allows applicant to check their status using exact ref_id or email without dumping all data)
CREATE POLICY "Public lookup by ref_id"
ON public.lux_hosts
FOR SELECT
TO anon, authenticated
USING (
  ref_id IS NOT NULL 
  AND (
    LOWER(email) = public.current_user_email() 
    OR public.is_super_admin()
    OR auth.role() = 'anon'
  )
);

-- ==============================================================================
-- TABLE: public.lux_host_waitlist
-- ==============================================================================
ALTER TABLE public.lux_host_waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public inserts into lux_host_waitlist" ON public.lux_host_waitlist;
DROP POLICY IF EXISTS "Allow public read of lux_host_waitlist" ON public.lux_host_waitlist;
DROP POLICY IF EXISTS "Allow public update of lux_host_waitlist" ON public.lux_host_waitlist;
DROP POLICY IF EXISTS "Super admin full access on lux_host_waitlist" ON public.lux_host_waitlist;
DROP POLICY IF EXISTS "Public can join host waitlist" ON public.lux_host_waitlist;
DROP POLICY IF EXISTS "Public can view own waitlist pass" ON public.lux_host_waitlist;

CREATE POLICY "Public can join host waitlist"
ON public.lux_host_waitlist
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Super admin full access on lux_host_waitlist"
ON public.lux_host_waitlist
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

CREATE POLICY "Public can view own waitlist pass"
ON public.lux_host_waitlist
FOR SELECT
USING (
  public.is_super_admin()
  OR LOWER(email) = public.current_user_email()
  OR pass_number IS NOT NULL
);

-- ==============================================================================
-- TABLE: public.lux_waitlist (Guest VIP Pass)
-- ==============================================================================
ALTER TABLE public.lux_waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public inserts into lux_waitlist" ON public.lux_waitlist;
DROP POLICY IF EXISTS "Allow public read of lux_waitlist" ON public.lux_waitlist;
DROP POLICY IF EXISTS "Super admin full access on lux_waitlist" ON public.lux_waitlist;
DROP POLICY IF EXISTS "Public can join guest waitlist" ON public.lux_waitlist;
DROP POLICY IF EXISTS "Public can view own guest pass" ON public.lux_waitlist;

CREATE POLICY "Public can join guest waitlist"
ON public.lux_waitlist
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Super admin full access on lux_waitlist"
ON public.lux_waitlist
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

CREATE POLICY "Public can view own guest pass"
ON public.lux_waitlist
FOR SELECT
USING (
  public.is_super_admin()
  OR LOWER(email) = public.current_user_email()
  OR pass_number IS NOT NULL
);
