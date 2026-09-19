-- ==============================================================================
-- LUXEA LIVING — USER PROFILES & ROLE-BASED ACCESS CONTROL (RLS)
-- Table: public.lux_profiles
-- Purpose: Public-facing user profile registry for all auth.users.
-- Allows Super Admins (Ronald Otieno & Dennis Barasa) to see all users and change roles.
-- ==============================================================================

-- 1. Create public.lux_profiles table
CREATE TABLE IF NOT EXISTS public.lux_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT NOT NULL UNIQUE,
    full_name TEXT,
    avatar_url TEXT,
    phone TEXT,
    role VARCHAR(50) NOT NULL DEFAULT 'member', -- 'super_admin', 'admin', 'host', 'member'
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Indexes for fast lookup
CREATE INDEX IF NOT EXISTS idx_lux_profiles_email ON public.lux_profiles(email);
CREATE INDEX IF NOT EXISTS idx_lux_profiles_role ON public.lux_profiles(role);

-- 3. Automatic Trigger on auth.users -> public.lux_profiles
CREATE OR REPLACE FUNCTION public.handle_new_user_profile()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    assigned_role VARCHAR(50);
    user_name TEXT;
BEGIN
    -- Determine role
    IF LOWER(NEW.email) IN ('otienoronny56@gmail.com', 'dennbarasa@gmail.com') THEN
        assigned_role := 'super_admin';
    ELSIF (NEW.raw_user_meta_data ->> 'role') = 'host' THEN
        assigned_role := 'host';
    ELSE
        assigned_role := COALESCE(NEW.raw_user_meta_data ->> 'role', 'member');
    END IF;

    -- Determine full name
    user_name := COALESCE(
        NEW.raw_user_meta_data ->> 'full_name',
        NEW.raw_user_meta_data ->> 'name',
        split_part(NEW.email, '@', 1)
    );

    INSERT INTO public.lux_profiles (id, email, full_name, role, avatar_url, phone)
    VALUES (
        NEW.id,
        LOWER(NEW.email),
        user_name,
        assigned_role,
        NEW.raw_user_meta_data ->> 'avatar_url',
        NEW.raw_user_meta_data ->> 'phone'
    )
    ON CONFLICT (id) DO UPDATE SET
        email = EXCLUDED.email,
        full_name = COALESCE(public.lux_profiles.full_name, EXCLUDED.full_name),
        role = CASE 
            WHEN LOWER(EXCLUDED.email) IN ('otienoronny56@gmail.com', 'dennbarasa@gmail.com') THEN 'super_admin'
            ELSE public.lux_profiles.role
        END,
        updated_at = NOW();

    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_user_profile();

-- 4. Backfill existing auth.users into public.lux_profiles
INSERT INTO public.lux_profiles (id, email, full_name, role, avatar_url, phone, created_at, updated_at)
SELECT 
    u.id,
    LOWER(u.email),
    COALESCE(u.raw_user_meta_data ->> 'full_name', u.raw_user_meta_data ->> 'name', split_part(u.email, '@', 1)),
    CASE 
        WHEN LOWER(u.email) IN ('otienoronny56@gmail.com', 'dennbarasa@gmail.com') THEN 'super_admin'
        WHEN (u.raw_user_meta_data ->> 'role') = 'host' THEN 'host'
        ELSE 'member'
    END,
    u.raw_user_meta_data ->> 'avatar_url',
    u.raw_user_meta_data ->> 'phone',
    u.created_at,
    NOW()
FROM auth.users u
ON CONFLICT (id) DO UPDATE SET
    role = CASE 
        WHEN LOWER(EXCLUDED.email) IN ('otienoronny56@gmail.com', 'dennbarasa@gmail.com') THEN 'super_admin'
        ELSE public.lux_profiles.role
    END,
    full_name = COALESCE(public.lux_profiles.full_name, EXCLUDED.full_name),
    updated_at = NOW();

-- 5. Update Super Admin helper function to include Dennis Barasa & role lookups
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
BEGIN
  RETURN COALESCE(
    LOWER(auth.jwt() ->> 'email') IN ('otienoronny56@gmail.com', 'dennbarasa@gmail.com')
    OR (auth.jwt() -> 'user_metadata' ->> 'role') IN ('super_admin', 'admin')
    OR EXISTS (
      SELECT 1 FROM public.lux_profiles
      WHERE id = auth.uid() AND role IN ('super_admin', 'admin')
    ),
    false
  );
END;
$$;

-- 6. Row Level Security on public.lux_profiles
ALTER TABLE public.lux_profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Super admins can manage all profiles" ON public.lux_profiles;
DROP POLICY IF EXISTS "Users can read all profiles" ON public.lux_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON public.lux_profiles;

-- Super Admins have full access to view, update roles, and manage all profiles
CREATE POLICY "Super admins can manage all profiles"
ON public.lux_profiles
FOR ALL
TO authenticated
USING (public.is_super_admin())
WITH CHECK (public.is_super_admin());

-- Authenticated users can view profile names/roles
CREATE POLICY "Users can read all profiles"
ON public.lux_profiles
FOR SELECT
TO authenticated
USING (true);

-- Authenticated users can update their own personal profile
CREATE POLICY "Users can update own profile"
ON public.lux_profiles
FOR UPDATE
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());
