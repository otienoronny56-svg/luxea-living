-- ==============================================================================
-- LUXEA LIVING — STRICT PRODUCTION SECURITY, PRIVACY & RLS HARDENING
-- Migration: 09_strict_security_privacy_rls.sql
-- ZERO DATA LOSS: Strictly additive schema changes (NO DROP TABLE/COLUMN/TRUNCATE)
--
-- What this migration enforces:
-- 1. Private schema for internal RLS helpers & webhook secret (not exposed to API)
-- 2. Server-only role authority (never trusts user_metadata) + anti-escalation triggers
-- 3. Scrubs plaintext `initial_password` leaked into auth.users.raw_user_meta_data
-- 4. Strict zero-leak RLS on ALL lux_* tables (zero anonymous PII dumps)
-- 5. Column-level privacy on lux_laundry_partners (hides mpesa_number & email from anon)
-- 6. Private lux_documents bucket (admin/owner only) & protected lux_listings bucket
-- 7. Authenticated pg_net DB triggers with internal webhook secret & fixed search_path
-- ==============================================================================

-- ------------------------------------------------------------------------------
-- 1. PRIVATE INTERNAL SCHEMA & WEBHOOK SECRET STORE
-- ------------------------------------------------------------------------------
CREATE SCHEMA IF NOT EXISTS private;
REVOKE ALL ON SCHEMA private FROM PUBLIC;
REVOKE ALL ON SCHEMA private FROM anon;
GRANT USAGE ON SCHEMA private TO authenticated, service_role;

CREATE TABLE IF NOT EXISTS private.internal_config (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE private.internal_config ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE private.internal_config FROM PUBLIC, anon, authenticated;
GRANT SELECT ON TABLE private.internal_config TO service_role;

INSERT INTO private.internal_config (key, value)
VALUES ('webhook_secret', encode(extensions.gen_random_bytes(32), 'hex'))
ON CONFLICT (key) DO NOTHING;

-- Service-role-only verifier RPC for Edge Functions to validate DB webhook secret
CREATE OR REPLACE FUNCTION public.verify_luxea_webhook_secret(p_secret TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_stored TEXT;
BEGIN
    IF p_secret IS NULL OR length(p_secret) < 16 THEN
        RETURN false;
    END IF;
    SELECT value INTO v_stored
    FROM private.internal_config
    WHERE key = 'webhook_secret';

    RETURN v_stored IS NOT NULL AND v_stored = p_secret;
END;
$$;

REVOKE ALL ON FUNCTION public.verify_luxea_webhook_secret(TEXT) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.verify_luxea_webhook_secret(TEXT) TO service_role;

-- ------------------------------------------------------------------------------
-- 2. ADDITIVE OWNERSHIP COLUMNS & INDEXES (ZERO DATA LOSS)
-- ------------------------------------------------------------------------------
ALTER TABLE public.lux_hosts
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

ALTER TABLE public.lux_properties
    ADD COLUMN IF NOT EXISTS owner_id UUID REFERENCES auth.users(id);

ALTER TABLE public.lux_laundry_partners
    ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id);

ALTER TABLE public.lux_laundry_orders
    ADD COLUMN IF NOT EXISTS customer_user_id UUID REFERENCES auth.users(id);

CREATE INDEX IF NOT EXISTS idx_lux_hosts_user_id ON public.lux_hosts(user_id);
CREATE INDEX IF NOT EXISTS idx_lux_hosts_lower_email ON public.lux_hosts(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_lux_properties_owner_id ON public.lux_properties(owner_id);
CREATE INDEX IF NOT EXISTS idx_lux_properties_host_ref_id ON public.lux_properties(host_ref_id);
CREATE INDEX IF NOT EXISTS idx_lux_laundry_partners_user_id ON public.lux_laundry_partners(user_id);
CREATE INDEX IF NOT EXISTS idx_lux_laundry_orders_customer_user_id ON public.lux_laundry_orders(customer_user_id);
CREATE INDEX IF NOT EXISTS idx_lux_waitlist_lower_email ON public.lux_waitlist(LOWER(email));
CREATE INDEX IF NOT EXISTS idx_lux_host_waitlist_lower_email ON public.lux_host_waitlist(LOWER(email));

-- Backfill ownership links non-destructively
UPDATE public.lux_hosts h
SET user_id = p.id
FROM public.lux_profiles p
WHERE h.user_id IS NULL
  AND LOWER(h.email) = LOWER(p.email);

UPDATE public.lux_properties prop
SET owner_id = h.user_id
FROM public.lux_hosts h
WHERE prop.owner_id IS NULL
  AND prop.host_ref_id IS NOT NULL
  AND prop.host_ref_id = h.ref_id
  AND h.user_id IS NOT NULL;

UPDATE public.lux_laundry_partners lp
SET user_id = p.id
FROM public.lux_profiles p
WHERE lp.user_id IS NULL
  AND lp.email IS NOT NULL
  AND LOWER(lp.email) = LOWER(p.email);

-- Sync authoritative lux_profiles.role into auth.users.raw_app_meta_data
-- and scrub any plaintext `initial_password` previously stored in raw_user_meta_data
UPDATE auth.users u
SET raw_app_meta_data = COALESCE(u.raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', p.role)
FROM public.lux_profiles p
WHERE u.id = p.id
  AND COALESCE(u.raw_app_meta_data ->> 'role', '') IS DISTINCT FROM p.role;

UPDATE auth.users
SET raw_user_meta_data = raw_user_meta_data - 'initial_password'
WHERE raw_user_meta_data ? 'initial_password';

-- ------------------------------------------------------------------------------
-- 3. PRIVATE AUTHORIZATION HELPER FUNCTIONS (NEVER TRUST user_metadata)
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION private.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.lux_profiles
        WHERE id = (SELECT auth.uid())
          AND role = 'super_admin'
          AND COALESCE(is_suspended, false) = false
    );
$$;

CREATE OR REPLACE FUNCTION private.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.lux_profiles
        WHERE id = (SELECT auth.uid())
          AND role IN ('super_admin', 'admin')
          AND COALESCE(is_suspended, false) = false
    );
$$;

CREATE OR REPLACE FUNCTION private.is_approved_host()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
    SELECT EXISTS (
        SELECT 1
        FROM public.lux_profiles
        WHERE id = (SELECT auth.uid())
          AND role = 'host'
          AND COALESCE(is_suspended, false) = false
    );
$$;

CREATE OR REPLACE FUNCTION private.current_user_email()
RETURNS TEXT
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = ''
AS $$
    SELECT CASE
        WHEN (SELECT auth.uid()) IS NULL THEN ''
        ELSE LOWER(COALESCE((SELECT auth.jwt() ->> 'email'), ''))
    END;
$$;

CREATE OR REPLACE FUNCTION private.is_host_owner(p_host_ref_id TEXT)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = ''
AS $$
    SELECT p_host_ref_id IS NOT NULL
      AND (SELECT auth.uid()) IS NOT NULL
      AND EXISTS (
          SELECT 1
          FROM public.lux_hosts h
          WHERE h.ref_id = p_host_ref_id
            AND COALESCE(h.is_suspended, false) = false
            AND (
                h.user_id = (SELECT auth.uid())
                OR (h.user_id IS NULL AND LOWER(h.email) = LOWER(COALESCE((SELECT auth.jwt() ->> 'email'), '')))
            )
      );
$$;

REVOKE ALL ON FUNCTION private.is_super_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_admin() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_approved_host() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.current_user_email() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION private.is_host_owner(TEXT) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION private.is_super_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_approved_host() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.current_user_email() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION private.is_host_owner(TEXT) TO authenticated, service_role;

-- Replace legacy public helper functions as SECURITY INVOKER with pinned search_path
CREATE OR REPLACE FUNCTION public.current_user_email()
RETURNS TEXT
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = ''
AS $$
    SELECT CASE
        WHEN (SELECT auth.uid()) IS NULL THEN ''
        ELSE LOWER(COALESCE((SELECT auth.jwt() ->> 'email'), ''))
    END;
$$;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY INVOKER
STABLE
SET search_path = ''
AS $$
    SELECT CASE
        WHEN (SELECT auth.uid()) IS NULL THEN false
        ELSE (SELECT private.is_admin())
    END;
$$;

REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, service_role;

-- ------------------------------------------------------------------------------
-- 4. ANTI-ESCALATION & INTEGRITY TRIGGERS
-- ------------------------------------------------------------------------------

-- 4A. Secure new-user profile sync (NEVER reads raw_user_meta_data.role!)
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_app_role TEXT;
    v_assigned_role VARCHAR(50);
    v_user_name TEXT;
    v_has_approved_host BOOLEAN;
BEGIN
    v_app_role := LOWER(COALESCE(NEW.raw_app_meta_data ->> 'role', ''));

    SELECT EXISTS (
        SELECT 1
        FROM public.lux_hosts
        WHERE LOWER(email) = LOWER(NEW.email)
          AND review_status = 'approved'
          AND COALESCE(is_suspended, false) = false
    ) INTO v_has_approved_host;

    IF v_app_role IN ('super_admin', 'admin', 'host', 'laundry_partner', 'member') THEN
        v_assigned_role := v_app_role;
    ELSIF v_has_approved_host AND NEW.email_confirmed_at IS NOT NULL THEN
        v_assigned_role := 'host';
    ELSE
        v_assigned_role := 'member';
    END IF;

    v_user_name := COALESCE(
        NULLIF(trim(NEW.raw_user_meta_data ->> 'full_name'), ''),
        NULLIF(trim(NEW.raw_user_meta_data ->> 'name'), ''),
        split_part(NEW.email, '@', 1)
    );

    INSERT INTO public.lux_profiles (id, email, full_name, role, avatar_url, phone)
    VALUES (
        NEW.id,
        LOWER(NEW.email),
        v_user_name,
        v_assigned_role,
        NEW.raw_user_meta_data ->> 'avatar_url',
        NEW.raw_user_meta_data ->> 'phone'
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(public.lux_profiles.full_name, EXCLUDED.full_name),
        updated_at = NOW();

    -- Link any existing host application with matching confirmed email
    IF NEW.email_confirmed_at IS NOT NULL THEN
        UPDATE public.lux_hosts
        SET user_id = NEW.id
        WHERE user_id IS NULL
          AND LOWER(email) = LOWER(NEW.email);
    END IF;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.handle_new_user_profile() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_profile();

-- 4B. Block self-privilege-escalation on public.lux_profiles
CREATE OR REPLACE FUNCTION public.lux_prevent_profile_privilege_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_jwt_role TEXT := COALESCE(current_setting('request.jwt.claim.role', true), '');
    v_is_super BOOLEAN;
    v_is_admin BOOLEAN;
    v_remaining_super_admins INT;
BEGIN
    -- Allow Postgres migrations / service_role backend operations
    IF current_user IN ('postgres', 'supabase_admin') OR v_jwt_role = 'service_role' THEN
        IF NEW.role IS DISTINCT FROM OLD.role THEN
            UPDATE auth.users
            SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', NEW.role)
            WHERE id = NEW.id;
        END IF;
        RETURN NEW;
    END IF;

    v_is_super := (SELECT private.is_super_admin());
    v_is_admin := (SELECT private.is_admin());

    -- Non-admins can NEVER modify privileged columns
    IF NOT v_is_admin THEN
        IF NEW.role IS DISTINCT FROM OLD.role
           OR NEW.is_suspended IS DISTINCT FROM OLD.is_suspended
           OR NEW.notes IS DISTINCT FROM OLD.notes
           OR NEW.email IS DISTINCT FROM OLD.email THEN
            RAISE EXCEPTION 'Unauthorized: cannot modify protected profile fields'
                USING ERRCODE = '42501';
        END IF;
        RETURN NEW;
    END IF;

    -- Only super_admin can assign or revoke super_admin / admin roles
    IF (NEW.role IS DISTINCT FROM OLD.role)
       AND (NEW.role IN ('super_admin', 'admin') OR OLD.role IN ('super_admin', 'admin'))
       AND NOT v_is_super THEN
        RAISE EXCEPTION 'Unauthorized: only super_admin can manage administrative roles'
            USING ERRCODE = '42501';
    END IF;

    -- Prevent accidentally removing the last active super_admin
    IF OLD.role = 'super_admin' AND (NEW.role <> 'super_admin' OR COALESCE(NEW.is_suspended, false) = true) THEN
        SELECT count(*) INTO v_remaining_super_admins
        FROM public.lux_profiles
        WHERE role = 'super_admin'
          AND COALESCE(is_suspended, false) = false
          AND id <> OLD.id;

        IF v_remaining_super_admins < 1 THEN
            RAISE EXCEPTION 'Cannot demote or suspend the last remaining super_admin'
                USING ERRCODE = '42501';
        END IF;
    END IF;

    -- Keep auth.users.raw_app_meta_data synced when role changes
    IF NEW.role IS DISTINCT FROM OLD.role THEN
        UPDATE auth.users
        SET raw_app_meta_data = COALESCE(raw_app_meta_data, '{}'::jsonb) || jsonb_build_object('role', NEW.role)
        WHERE id = NEW.id;
    END IF;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.lux_prevent_profile_privilege_escalation() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_lux_prevent_profile_escalation ON public.lux_profiles;
CREATE TRIGGER trg_lux_prevent_profile_escalation
BEFORE UPDATE ON public.lux_profiles
FOR EACH ROW
EXECUTE FUNCTION public.lux_prevent_profile_privilege_escalation();

-- 4C. Enforce integrity on lux_hosts (prevent self-approval & note tampering)
CREATE OR REPLACE FUNCTION public.lux_enforce_host_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_jwt_role TEXT := COALESCE(current_setting('request.jwt.claim.role', true), '');
    v_is_admin BOOLEAN;
BEGIN
    IF current_user IN ('postgres', 'supabase_admin') OR v_jwt_role = 'service_role' THEN
        RETURN NEW;
    END IF;

    v_is_admin := (SELECT private.is_admin());

    IF TG_OP = 'INSERT' THEN
        IF NOT v_is_admin THEN
            NEW.review_status := 'pending_review';
            NEW.is_suspended := false;
            NEW.is_delisted := false;
            NEW.internal_notes := NULL;
            IF (SELECT auth.uid()) IS NOT NULL THEN
                NEW.user_id := (SELECT auth.uid());
            ELSE
                NEW.user_id := NULL;
            END IF;
        END IF;
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' AND NOT v_is_admin THEN
        IF NEW.review_status IS DISTINCT FROM OLD.review_status
           OR NEW.is_suspended IS DISTINCT FROM OLD.is_suspended
           OR NEW.is_delisted IS DISTINCT FROM OLD.is_delisted
           OR NEW.internal_notes IS DISTINCT FROM OLD.internal_notes
           OR NEW.ref_id IS DISTINCT FROM OLD.ref_id
           OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
            RAISE EXCEPTION 'Unauthorized: cannot modify protected host review fields'
                USING ERRCODE = '42501';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.lux_enforce_host_integrity() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_lux_enforce_host_integrity ON public.lux_hosts;
CREATE TRIGGER trg_lux_enforce_host_integrity
BEFORE INSERT OR UPDATE ON public.lux_hosts
FOR EACH ROW
EXECUTE FUNCTION public.lux_enforce_host_integrity();

-- 4D. Enforce integrity on lux_laundry_partners
CREATE OR REPLACE FUNCTION public.lux_enforce_laundry_partner_integrity()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_jwt_role TEXT := COALESCE(current_setting('request.jwt.claim.role', true), '');
    v_is_admin BOOLEAN;
BEGIN
    IF current_user IN ('postgres', 'supabase_admin') OR v_jwt_role = 'service_role' THEN
        RETURN NEW;
    END IF;

    v_is_admin := (SELECT private.is_admin());

    IF TG_OP = 'INSERT' AND NOT v_is_admin THEN
        NEW.status := 'pending';
        NEW.rating := 5.0;
        NEW.completed_orders_count := 0;
        IF (SELECT auth.uid()) IS NOT NULL THEN
            NEW.user_id := (SELECT auth.uid());
        END IF;
        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' AND NOT v_is_admin THEN
        IF NEW.status IS DISTINCT FROM OLD.status
           OR NEW.rating IS DISTINCT FROM OLD.rating
           OR NEW.completed_orders_count IS DISTINCT FROM OLD.completed_orders_count
           OR NEW.ref_id IS DISTINCT FROM OLD.ref_id
           OR NEW.user_id IS DISTINCT FROM OLD.user_id THEN
            RAISE EXCEPTION 'Unauthorized: cannot modify protected laundry partner fields'
                USING ERRCODE = '42501';
        END IF;
    END IF;

    RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.lux_enforce_laundry_partner_integrity() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_lux_enforce_laundry_partner_integrity ON public.lux_laundry_partners;
CREATE TRIGGER trg_lux_enforce_laundry_partner_integrity
BEFORE INSERT OR UPDATE ON public.lux_laundry_partners
FOR EACH ROW
EXECUTE FUNCTION public.lux_enforce_laundry_partner_integrity();

-- ------------------------------------------------------------------------------
-- 5. STRICT ROW LEVEL SECURITY POLICIES (DROP ALL LEGACY PERMISSIVE POLICIES)
-- ------------------------------------------------------------------------------

-- === TABLE 1: public.lux_profiles ===
ALTER TABLE public.lux_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Public can view profiles" ON public.lux_profiles;
DROP POLICY IF EXISTS "Users can read all profiles" ON public.lux_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.lux_profiles;
DROP POLICY IF EXISTS "Super admins can manage all profiles" ON public.lux_profiles;
DROP POLICY IF EXISTS "lux_profiles_select_own_or_admin" ON public.lux_profiles;
DROP POLICY IF EXISTS "lux_profiles_update_own_or_admin" ON public.lux_profiles;
DROP POLICY IF EXISTS "lux_profiles_admin_insert" ON public.lux_profiles;
DROP POLICY IF EXISTS "lux_profiles_super_admin_delete" ON public.lux_profiles;

CREATE POLICY "lux_profiles_select_own_or_admin"
ON public.lux_profiles FOR SELECT
TO authenticated
USING (
    id = (SELECT auth.uid())
    OR (SELECT private.is_admin())
);

CREATE POLICY "lux_profiles_update_own_or_admin"
ON public.lux_profiles FOR UPDATE
TO authenticated
USING (
    id = (SELECT auth.uid())
    OR (SELECT private.is_admin())
)
WITH CHECK (
    id = (SELECT auth.uid())
    OR (SELECT private.is_admin())
);

CREATE POLICY "lux_profiles_admin_insert"
ON public.lux_profiles FOR INSERT
TO authenticated
WITH CHECK ((SELECT private.is_super_admin()));

CREATE POLICY "lux_profiles_super_admin_delete"
ON public.lux_profiles FOR DELETE
TO authenticated
USING ((SELECT private.is_super_admin()));

-- === TABLE 2: public.lux_hosts (STRICT KYC / PAYOUT PRIVACY) ===
ALTER TABLE public.lux_hosts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public insert into lux_hosts" ON public.lux_hosts;
DROP POLICY IF EXISTS "Allow read of lux_hosts" ON public.lux_hosts;
DROP POLICY IF EXISTS "Allow update of lux_hosts" ON public.lux_hosts;
DROP POLICY IF EXISTS "Public can submit host application" ON public.lux_hosts;
DROP POLICY IF EXISTS "Public lookup by ref_id" ON public.lux_hosts;
DROP POLICY IF EXISTS "Hosts can view own profile" ON public.lux_hosts;
DROP POLICY IF EXISTS "Hosts can update own profile" ON public.lux_hosts;
DROP POLICY IF EXISTS "Super admin full access on lux_hosts" ON public.lux_hosts;
DROP POLICY IF EXISTS "lux_hosts_public_apply" ON public.lux_hosts;
DROP POLICY IF EXISTS "lux_hosts_select_own_or_admin" ON public.lux_hosts;
DROP POLICY IF EXISTS "lux_hosts_update_own_or_admin" ON public.lux_hosts;
DROP POLICY IF EXISTS "lux_hosts_delete_super_admin" ON public.lux_hosts;

-- Applicants can submit new host applications (trigger forces pending_review)
CREATE POLICY "lux_hosts_public_apply"
ON public.lux_hosts FOR INSERT
TO anon, authenticated
WITH CHECK (
    review_status = 'pending_review'
    AND COALESCE(is_suspended, false) = false
    AND COALESCE(is_delisted, false) = false
    AND internal_notes IS NULL
);

-- ONLY authenticated owner or verified admin can read host KYC/payout rows
CREATE POLICY "lux_hosts_select_own_or_admin"
ON public.lux_hosts FOR SELECT
TO authenticated
USING (
    (SELECT private.is_admin())
    OR user_id = (SELECT auth.uid())
    OR (user_id IS NULL AND LOWER(email) = (SELECT private.current_user_email()))
);

-- ONLY authenticated owner or verified admin can update (trigger locks review_status)
CREATE POLICY "lux_hosts_update_own_or_admin"
ON public.lux_hosts FOR UPDATE
TO authenticated
USING (
    (SELECT private.is_admin())
    OR user_id = (SELECT auth.uid())
    OR (user_id IS NULL AND LOWER(email) = (SELECT private.current_user_email()))
)
WITH CHECK (
    (SELECT private.is_admin())
    OR user_id = (SELECT auth.uid())
    OR (user_id IS NULL AND LOWER(email) = (SELECT private.current_user_email()))
);

CREATE POLICY "lux_hosts_delete_super_admin"
ON public.lux_hosts FOR DELETE
TO authenticated
USING ((SELECT private.is_super_admin()));

-- === TABLE 3: public.lux_properties ===
ALTER TABLE public.lux_properties ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read active lux_properties" ON public.lux_properties;
DROP POLICY IF EXISTS "Allow public read lux_properties" ON public.lux_properties;
DROP POLICY IF EXISTS "Allow public insert lux_properties" ON public.lux_properties;
DROP POLICY IF EXISTS "Allow public update lux_properties" ON public.lux_properties;
DROP POLICY IF EXISTS "Public can insert properties" ON public.lux_properties;
DROP POLICY IF EXISTS "Public can update properties" ON public.lux_properties;
DROP POLICY IF EXISTS "Public can view active properties" ON public.lux_properties;
DROP POLICY IF EXISTS "Public can view all properties" ON public.lux_properties;
DROP POLICY IF EXISTS "Super admin full access on lux_properties" ON public.lux_properties;
DROP POLICY IF EXISTS "Hosts can manage own properties" ON public.lux_properties;
DROP POLICY IF EXISTS "lux_properties_anon_select_active" ON public.lux_properties;
DROP POLICY IF EXISTS "lux_properties_auth_select" ON public.lux_properties;
DROP POLICY IF EXISTS "lux_properties_auth_insert" ON public.lux_properties;
DROP POLICY IF EXISTS "lux_properties_auth_update" ON public.lux_properties;
DROP POLICY IF EXISTS "lux_properties_auth_delete" ON public.lux_properties;

CREATE POLICY "lux_properties_anon_select_active"
ON public.lux_properties FOR SELECT
TO anon
USING (is_active = true);

CREATE POLICY "lux_properties_auth_select"
ON public.lux_properties FOR SELECT
TO authenticated
USING (
    is_active = true
    OR (SELECT private.is_admin())
    OR owner_id = (SELECT auth.uid())
    OR (SELECT private.is_host_owner(host_ref_id))
);

CREATE POLICY "lux_properties_auth_insert"
ON public.lux_properties FOR INSERT
TO authenticated
WITH CHECK (
    (SELECT private.is_admin())
    OR (
        (SELECT private.is_approved_host())
        AND owner_id = (SELECT auth.uid())
    )
);

CREATE POLICY "lux_properties_auth_update"
ON public.lux_properties FOR UPDATE
TO authenticated
USING (
    (SELECT private.is_admin())
    OR owner_id = (SELECT auth.uid())
    OR (SELECT private.is_host_owner(host_ref_id))
)
WITH CHECK (
    (SELECT private.is_admin())
    OR owner_id = (SELECT auth.uid())
    OR (SELECT private.is_host_owner(host_ref_id))
);

CREATE POLICY "lux_properties_auth_delete"
ON public.lux_properties FOR DELETE
TO authenticated
USING (
    (SELECT private.is_admin())
    OR owner_id = (SELECT auth.uid())
    OR (SELECT private.is_host_owner(host_ref_id))
);

-- === TABLE 4: public.lux_waitlist (GUEST VIP WAITLIST — ZERO ANON READ) ===
ALTER TABLE public.lux_waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public inserts into lux_waitlist" ON public.lux_waitlist;
DROP POLICY IF EXISTS "Allow public read of lux_waitlist" ON public.lux_waitlist;
DROP POLICY IF EXISTS "Public can join guest waitlist" ON public.lux_waitlist;
DROP POLICY IF EXISTS "Public can view own guest pass" ON public.lux_waitlist;
DROP POLICY IF EXISTS "Super admin full access on lux_waitlist" ON public.lux_waitlist;
DROP POLICY IF EXISTS "lux_waitlist_public_insert" ON public.lux_waitlist;
DROP POLICY IF EXISTS "lux_waitlist_auth_select" ON public.lux_waitlist;
DROP POLICY IF EXISTS "lux_waitlist_admin_update" ON public.lux_waitlist;
DROP POLICY IF EXISTS "lux_waitlist_admin_delete" ON public.lux_waitlist;

CREATE POLICY "lux_waitlist_public_insert"
ON public.lux_waitlist FOR INSERT
TO anon, authenticated
WITH CHECK (COALESCE(status, 'active') = 'active');

CREATE POLICY "lux_waitlist_auth_select"
ON public.lux_waitlist FOR SELECT
TO authenticated
USING (
    (SELECT private.is_admin())
    OR LOWER(email) = (SELECT private.current_user_email())
);

CREATE POLICY "lux_waitlist_admin_update"
ON public.lux_waitlist FOR UPDATE
TO authenticated
USING ((SELECT private.is_admin()))
WITH CHECK ((SELECT private.is_admin()));

CREATE POLICY "lux_waitlist_admin_delete"
ON public.lux_waitlist FOR DELETE
TO authenticated
USING ((SELECT private.is_super_admin()));

-- === TABLE 5: public.lux_host_waitlist (ZERO ANON READ) ===
ALTER TABLE public.lux_host_waitlist ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public inserts into lux_host_waitlist" ON public.lux_host_waitlist;
DROP POLICY IF EXISTS "Allow public read of lux_host_waitlist" ON public.lux_host_waitlist;
DROP POLICY IF EXISTS "Allow public update of lux_host_waitlist" ON public.lux_host_waitlist;
DROP POLICY IF EXISTS "Public can join host waitlist" ON public.lux_host_waitlist;
DROP POLICY IF EXISTS "Public can view own waitlist pass" ON public.lux_host_waitlist;
DROP POLICY IF EXISTS "Super admin full access on lux_host_waitlist" ON public.lux_host_waitlist;
DROP POLICY IF EXISTS "lux_host_waitlist_public_insert" ON public.lux_host_waitlist;
DROP POLICY IF EXISTS "lux_host_waitlist_auth_select" ON public.lux_host_waitlist;
DROP POLICY IF EXISTS "lux_host_waitlist_admin_update" ON public.lux_host_waitlist;
DROP POLICY IF EXISTS "lux_host_waitlist_admin_delete" ON public.lux_host_waitlist;

CREATE POLICY "lux_host_waitlist_public_insert"
ON public.lux_host_waitlist FOR INSERT
TO anon, authenticated
WITH CHECK (COALESCE(status, 'waitlisted') = 'waitlisted');

CREATE POLICY "lux_host_waitlist_auth_select"
ON public.lux_host_waitlist FOR SELECT
TO authenticated
USING (
    (SELECT private.is_admin())
    OR LOWER(email) = (SELECT private.current_user_email())
);

CREATE POLICY "lux_host_waitlist_admin_update"
ON public.lux_host_waitlist FOR UPDATE
TO authenticated
USING ((SELECT private.is_admin()))
WITH CHECK ((SELECT private.is_admin()));

CREATE POLICY "lux_host_waitlist_admin_delete"
ON public.lux_host_waitlist FOR DELETE
TO authenticated
USING ((SELECT private.is_super_admin()));

-- === TABLE 6: public.lux_laundry_partners (COLUMN PRIVACY + STRICT RLS) ===
ALTER TABLE public.lux_laundry_partners ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read laundry partners" ON public.lux_laundry_partners;
DROP POLICY IF EXISTS "Allow public insert laundry partners" ON public.lux_laundry_partners;
DROP POLICY IF EXISTS "Allow public update laundry partners" ON public.lux_laundry_partners;
DROP POLICY IF EXISTS "lux_laundry_partners_anon_select_approved" ON public.lux_laundry_partners;
DROP POLICY IF EXISTS "lux_laundry_partners_auth_select" ON public.lux_laundry_partners;
DROP POLICY IF EXISTS "lux_laundry_partners_public_apply" ON public.lux_laundry_partners;
DROP POLICY IF EXISTS "lux_laundry_partners_auth_update" ON public.lux_laundry_partners;
DROP POLICY IF EXISTS "lux_laundry_partners_super_admin_delete" ON public.lux_laundry_partners;

-- Column-level restriction: anon can NEVER read private mpesa_number or email
REVOKE SELECT ON public.lux_laundry_partners FROM anon;
GRANT SELECT (
    id, ref_id, business_name, contact_person, phone,
    coverage_areas, services_offered,
    price_wash_fold_per_kg, price_linen_turnover_set, price_dry_clean_suit,
    express_available, status, rating, completed_orders_count, created_at
) ON public.lux_laundry_partners TO anon;

CREATE POLICY "lux_laundry_partners_anon_select_approved"
ON public.lux_laundry_partners FOR SELECT
TO anon
USING (status = 'approved');

CREATE POLICY "lux_laundry_partners_auth_select"
ON public.lux_laundry_partners FOR SELECT
TO authenticated
USING (
    status = 'approved'
    OR (SELECT private.is_admin())
    OR user_id = (SELECT auth.uid())
);

CREATE POLICY "lux_laundry_partners_public_apply"
ON public.lux_laundry_partners FOR INSERT
TO anon, authenticated
WITH CHECK (COALESCE(status, 'pending') = 'pending');

CREATE POLICY "lux_laundry_partners_auth_update"
ON public.lux_laundry_partners FOR UPDATE
TO authenticated
USING (
    (SELECT private.is_admin())
    OR user_id = (SELECT auth.uid())
)
WITH CHECK (
    (SELECT private.is_admin())
    OR user_id = (SELECT auth.uid())
);

CREATE POLICY "lux_laundry_partners_super_admin_delete"
ON public.lux_laundry_partners FOR DELETE
TO authenticated
USING ((SELECT private.is_super_admin()));

-- === TABLE 7: public.lux_laundry_orders (STRICT ORDER PRIVACY) ===
ALTER TABLE public.lux_laundry_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow public read laundry orders" ON public.lux_laundry_orders;
DROP POLICY IF EXISTS "Allow public insert laundry orders" ON public.lux_laundry_orders;
DROP POLICY IF EXISTS "Allow public update laundry orders" ON public.lux_laundry_orders;
DROP POLICY IF EXISTS "lux_laundry_orders_public_insert" ON public.lux_laundry_orders;
DROP POLICY IF EXISTS "lux_laundry_orders_auth_select" ON public.lux_laundry_orders;
DROP POLICY IF EXISTS "lux_laundry_orders_auth_update" ON public.lux_laundry_orders;
DROP POLICY IF EXISTS "lux_laundry_orders_super_admin_delete" ON public.lux_laundry_orders;

CREATE POLICY "lux_laundry_orders_public_insert"
ON public.lux_laundry_orders FOR INSERT
TO anon, authenticated
WITH CHECK (
    COALESCE(status, 'requested') = 'requested'
    AND COALESCE(payment_status, 'pending') = 'pending'
    AND (customer_user_id IS NULL OR customer_user_id = (SELECT auth.uid()))
);

CREATE POLICY "lux_laundry_orders_auth_select"
ON public.lux_laundry_orders FOR SELECT
TO authenticated
USING (
    (SELECT private.is_admin())
    OR customer_user_id = (SELECT auth.uid())
    OR (customer_email IS NOT NULL AND LOWER(customer_email) = (SELECT private.current_user_email()))
    OR EXISTS (
        SELECT 1
        FROM public.lux_laundry_partners lp
        WHERE lp.id = assigned_partner_id
          AND lp.user_id = (SELECT auth.uid())
          AND lp.status = 'approved'
    )
);

CREATE POLICY "lux_laundry_orders_auth_update"
ON public.lux_laundry_orders FOR UPDATE
TO authenticated
USING (
    (SELECT private.is_admin())
    OR EXISTS (
        SELECT 1
        FROM public.lux_laundry_partners lp
        WHERE lp.id = assigned_partner_id
          AND lp.user_id = (SELECT auth.uid())
          AND lp.status = 'approved'
    )
)
WITH CHECK (
    (SELECT private.is_admin())
    OR EXISTS (
        SELECT 1
        FROM public.lux_laundry_partners lp
        WHERE lp.id = assigned_partner_id
          AND lp.user_id = (SELECT auth.uid())
          AND lp.status = 'approved'
    )
);

CREATE POLICY "lux_laundry_orders_super_admin_delete"
ON public.lux_laundry_orders FOR DELETE
TO authenticated
USING ((SELECT private.is_super_admin()));

-- ------------------------------------------------------------------------------
-- 6. STORAGE BUCKET HARDENING (PRIVATE KYC DOCS + PROTECTED LISTING PHOTOS)
-- ------------------------------------------------------------------------------

-- 6A. Make lux_documents PRIVATE with strict MIME & 10 MB size cap
UPDATE storage.buckets
SET public = false,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
WHERE id = 'lux_documents';

-- 6B. Cap lux_listings to image MIME types & 10 MB
UPDATE storage.buckets
SET public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp']
WHERE id = 'lux_listings';

-- Drop legacy wide-open storage policies for lux_* buckets
DROP POLICY IF EXISTS "Allow public uploads to lux_documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read from lux_documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow updates to lux_documents" ON storage.objects;
DROP POLICY IF EXISTS "Allow public uploads to lux_listings" ON storage.objects;
DROP POLICY IF EXISTS "Allow public read from lux_listings" ON storage.objects;
DROP POLICY IF EXISTS "Allow updates to lux_listings" ON storage.objects;
DROP POLICY IF EXISTS "Allow deletes from lux_listings" ON storage.objects;

DROP POLICY IF EXISTS "lux_documents_dropoff_insert" ON storage.objects;
DROP POLICY IF EXISTS "lux_documents_private_select" ON storage.objects;
DROP POLICY IF EXISTS "lux_documents_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "lux_documents_admin_delete" ON storage.objects;
DROP POLICY IF EXISTS "lux_listings_public_select" ON storage.objects;
DROP POLICY IF EXISTS "lux_listings_controlled_insert" ON storage.objects;
DROP POLICY IF EXISTS "lux_listings_anon_host_app_insert" ON storage.objects;
DROP POLICY IF EXISTS "lux_listings_auth_insert" ON storage.objects;
DROP POLICY IF EXISTS "lux_listings_owner_or_admin_update" ON storage.objects;
DROP POLICY IF EXISTS "lux_listings_owner_or_admin_delete" ON storage.objects;

-- lux_documents: Write-only dropoff for applicants, read/manage ONLY by admin or owner
CREATE POLICY "lux_documents_dropoff_insert"
ON storage.objects FOR INSERT
TO anon, authenticated
WITH CHECK (
    bucket_id = 'lux_documents'
    AND (storage.foldername(name))[1] IN ('host_ids', 'business_reg')
);

CREATE POLICY "lux_documents_private_select"
ON storage.objects FOR SELECT
TO authenticated
USING (
    bucket_id = 'lux_documents'
    AND (
        (SELECT private.is_admin())
        OR owner = (SELECT auth.uid())
    )
);

CREATE POLICY "lux_documents_admin_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'lux_documents'
    AND (SELECT private.is_admin())
)
WITH CHECK (
    bucket_id = 'lux_documents'
    AND (SELECT private.is_admin())
);

CREATE POLICY "lux_documents_admin_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'lux_documents'
    AND (SELECT private.is_admin())
);

-- lux_listings: Public read, controlled upload, owner/admin-only update & delete
CREATE POLICY "lux_listings_public_select"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'lux_listings');

CREATE POLICY "lux_listings_anon_host_app_insert"
ON storage.objects FOR INSERT
TO anon
WITH CHECK (
    bucket_id = 'lux_listings'
    AND (storage.foldername(name))[1] = 'host_applications'
);

CREATE POLICY "lux_listings_auth_insert"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
    bucket_id = 'lux_listings'
    AND (
        (storage.foldername(name))[1] = 'host_applications'
        OR (
            (
                (SELECT private.is_admin())
                OR (SELECT private.is_approved_host())
            )
            AND (storage.foldername(name))[1] IN ('properties', 'hosts')
        )
    )
);

CREATE POLICY "lux_listings_owner_or_admin_update"
ON storage.objects FOR UPDATE
TO authenticated
USING (
    bucket_id = 'lux_listings'
    AND (
        (SELECT private.is_admin())
        OR owner = (SELECT auth.uid())
    )
)
WITH CHECK (
    bucket_id = 'lux_listings'
    AND (
        (SELECT private.is_admin())
        OR owner = (SELECT auth.uid())
    )
);

CREATE POLICY "lux_listings_owner_or_admin_delete"
ON storage.objects FOR DELETE
TO authenticated
USING (
    bucket_id = 'lux_listings'
    AND (
        (SELECT private.is_admin())
        OR owner = (SELECT auth.uid())
    )
);

-- ------------------------------------------------------------------------------
-- 7. HARDEN AUTOMATED EMAIL TRIGGERS (WEBHOOK SECRET + FIXED SEARCH PATH)
-- ------------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.lux_trigger_host_waiting_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_secret TEXT;
BEGIN
    SELECT value INTO v_secret FROM private.internal_config WHERE key = 'webhook_secret';
    PERFORM net.http_post(
        url := 'https://abzcabiqdkmfaijnqbkf.supabase.co/functions/v1/luxea-mailer',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-luxea-webhook-secret', COALESCE(v_secret, '')
        ),
        body := jsonb_build_object(
            'type', 'host_waiting_verification',
            'record', to_jsonb(NEW)
        )
    );
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Host waiting email trigger exception: %', SQLERRM;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.lux_trigger_host_approved_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_secret TEXT;
BEGIN
    IF NEW.review_status = 'approved' AND (OLD.review_status IS DISTINCT FROM 'approved') THEN
        SELECT value INTO v_secret FROM private.internal_config WHERE key = 'webhook_secret';
        PERFORM net.http_post(
            url := 'https://abzcabiqdkmfaijnqbkf.supabase.co/functions/v1/luxea-mailer',
            headers := jsonb_build_object(
                'Content-Type', 'application/json',
                'x-luxea-webhook-secret', COALESCE(v_secret, '')
            ),
            body := jsonb_build_object(
                'type', 'host_approved',
                'record', to_jsonb(NEW)
            )
        );
    END IF;
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Host approved email trigger exception: %', SQLERRM;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.lux_trigger_guest_welcome_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_secret TEXT;
BEGIN
    SELECT value INTO v_secret FROM private.internal_config WHERE key = 'webhook_secret';
    PERFORM net.http_post(
        url := 'https://abzcabiqdkmfaijnqbkf.supabase.co/functions/v1/luxea-mailer',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-luxea-webhook-secret', COALESCE(v_secret, '')
        ),
        body := jsonb_build_object(
            'type', 'guest_welcome',
            'record', to_jsonb(NEW)
        )
    );
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Guest welcome email trigger exception: %', SQLERRM;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.lux_trigger_host_waitlist_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
    v_secret TEXT;
BEGIN
    SELECT value INTO v_secret FROM private.internal_config WHERE key = 'webhook_secret';
    PERFORM net.http_post(
        url := 'https://abzcabiqdkmfaijnqbkf.supabase.co/functions/v1/luxea-mailer',
        headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'x-luxea-webhook-secret', COALESCE(v_secret, '')
        ),
        body := jsonb_build_object(
            'type', 'host_waitlist_welcome',
            'record', to_jsonb(NEW)
        )
    );
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Host waitlist email trigger exception: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- Legacy unused trigger function: harden search_path & revoke public execution (non-destructive)
CREATE OR REPLACE FUNCTION public.lux_trigger_host_welcome_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    RETURN NEW;
END;
$$;

-- Remove duplicate legacy trigger on lux_hosts (keeping trg_lux_host_waiting_email)
DROP TRIGGER IF EXISTS trg_lux_host_welcome_email ON public.lux_hosts;

-- Revoke direct RPC execution of all trigger functions from PUBLIC, anon, authenticated
REVOKE ALL ON FUNCTION public.lux_trigger_host_waiting_email() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.lux_trigger_host_approved_email() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.lux_trigger_guest_welcome_email() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.lux_trigger_host_waitlist_email() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.lux_trigger_host_welcome_email() FROM PUBLIC, anon, authenticated;
