-- ==============================================================================
-- LUXEA LIVING — AUTOMATED EMAIL DATABASE TRIGGERS (pg_net)
-- Automatically dispatches webhooks to the deployed Edge Function "luxea-mailer"
-- whenever a host partner applies or a VIP guest joins the waitlist.
-- ==============================================================================

-- 1. Ensure pg_net is available
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Trigger function for Host Registrations
CREATE OR REPLACE FUNCTION public.lux_trigger_host_welcome_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Asynchronously invoke the deployed Edge Function
    PERFORM net.http_post(
        url := 'https://abzcabiqdkmfaijnqbkf.supabase.co/functions/v1/luxea-mailer',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := json_build_object(
            'type', 'host_welcome',
            'record', row_to_json(NEW)
        )::jsonb
    );
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Prevent trigger failure from aborting user registration
    RAISE WARNING 'Host welcome email trigger exception: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- 3. Trigger function for VIP Guest Waitlist
CREATE OR REPLACE FUNCTION public.lux_trigger_guest_welcome_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    -- Asynchronously invoke the deployed Edge Function
    PERFORM net.http_post(
        url := 'https://abzcabiqdkmfaijnqbkf.supabase.co/functions/v1/luxea-mailer',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := json_build_object(
            'type', 'guest_welcome',
            'record', row_to_json(NEW)
        )::jsonb
    );
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    -- Prevent trigger failure from aborting user registration
    RAISE WARNING 'Guest welcome email trigger exception: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- 4. Idempotent Triggers on lux_hosts and lux_waitlist
DROP TRIGGER IF EXISTS trg_lux_host_welcome_email ON public.lux_hosts;
CREATE TRIGGER trg_lux_host_welcome_email
AFTER INSERT ON public.lux_hosts
FOR EACH ROW
EXECUTE FUNCTION public.lux_trigger_host_welcome_email();

DROP TRIGGER IF EXISTS trg_lux_guest_welcome_email ON public.lux_waitlist;
CREATE TRIGGER trg_lux_guest_welcome_email
AFTER INSERT ON public.lux_waitlist
FOR EACH ROW
EXECUTE FUNCTION public.lux_trigger_guest_welcome_email();
