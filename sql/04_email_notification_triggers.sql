-- ==============================================================================
-- LUXEA LIVING — AUTOMATED EMAIL DATABASE TRIGGERS (pg_net)
-- Automatically dispatches webhooks to the deployed Edge Function "luxea-mailer"
-- 1. When host registers -> 'host_waiting_verification'
-- 2. When host review_status is updated to 'approved' -> 'host_approved'
-- 3. When guest registers -> 'guest_welcome'
-- ==============================================================================

-- 1. Ensure pg_net is available
CREATE EXTENSION IF NOT EXISTS pg_net;

-- 2. Trigger function for Host Registrations (Stage 1: Waiting Verification)
CREATE OR REPLACE FUNCTION public.lux_trigger_host_waiting_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    PERFORM net.http_post(
        url := 'https://abzcabiqdkmfaijnqbkf.supabase.co/functions/v1/luxea-mailer',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := json_build_object(
            'type', 'host_waiting_verification',
            'record', row_to_json(NEW)
        )::jsonb
    );
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Host waiting email trigger exception: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- 3. Trigger function for Host Approval (Stage 2: Verification Approved & Activation Link)
CREATE OR REPLACE FUNCTION public.lux_trigger_host_approved_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    IF NEW.review_status = 'approved' AND (OLD.review_status IS DISTINCT FROM 'approved') THEN
        PERFORM net.http_post(
            url := 'https://abzcabiqdkmfaijnqbkf.supabase.co/functions/v1/luxea-mailer',
            headers := '{"Content-Type": "application/json"}'::jsonb,
            body := json_build_object(
                'type', 'host_approved',
                'record', row_to_json(NEW)
            )::jsonb
        );
    END IF;
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'Host approved email trigger exception: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- 4. Trigger function for VIP Guest Waitlist
CREATE OR REPLACE FUNCTION public.lux_trigger_guest_welcome_email()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
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
    RAISE WARNING 'Guest welcome email trigger exception: %', SQLERRM;
    RETURN NEW;
END;
$$;

-- 5. Idempotent Triggers on lux_hosts and lux_waitlist
DROP TRIGGER IF EXISTS trg_lux_host_waiting_email ON public.lux_hosts;
CREATE TRIGGER trg_lux_host_waiting_email
AFTER INSERT ON public.lux_hosts
FOR EACH ROW
EXECUTE FUNCTION public.lux_trigger_host_waiting_email();

DROP TRIGGER IF EXISTS trg_lux_host_approved_email ON public.lux_hosts;
CREATE TRIGGER trg_lux_host_approved_email
AFTER UPDATE OF review_status ON public.lux_hosts
FOR EACH ROW
EXECUTE FUNCTION public.lux_trigger_host_approved_email();

DROP TRIGGER IF EXISTS trg_lux_guest_welcome_email ON public.lux_waitlist;
CREATE TRIGGER trg_lux_guest_welcome_email
AFTER INSERT ON public.lux_waitlist
FOR EACH ROW
EXECUTE FUNCTION public.lux_trigger_guest_welcome_email();
