/**
 * LUXEA LIVING — HARDENED COMMUNICATIONS & ADMIN OPERATIONS EDGE FUNCTION
 * Supabase Edge Function (Deno)
 *
 * Security controls enforced:
 * 1. Strict Origin CORS allowlist (no wildcard *)
 * 2. DB Webhook actions require valid `x-luxea-webhook-secret` (verified against private.internal_config)
 *    OR a verified Admin JWT
 * 3. Admin actions (`admin_provision_user`, `admin_get_signed_doc_url`) require a verified
 *    Supabase Auth JWT + active `super_admin` / `admin` role in `public.lux_profiles`
 * 4. Public `sync_auth_user` password-overwrite endpoint permanently removed (403)
 * 5. Host activation links use real cryptographically signed Supabase Auth generate_link tokens
 * 6. Public `lookup_host_status` requires BOTH exact ref_id + exact email and returns ONLY non-PII status
 * 7. All HTML email interpolations are strictly escaped against HTML/XSS injection
 */

const ALLOWED_ORIGINS = new Set([
  'https://luxealiving.co.ke',
  'https://www.luxealiving.co.ke',
  'https://partners.luxealiving.co.ke',
  'http://localhost:3000',
  'http://localhost:5500',
  'http://localhost:8080',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:5500',
  'http://127.0.0.1:8080',
]);

function getCorsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get('origin') || '';
  const allowOrigin = ALLOWED_ORIGINS.has(origin) ? origin : 'https://luxealiving.co.ke';
  return {
    'Access-Control-Allow-Origin': allowOrigin,
    'Vary': 'Origin',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-luxea-webhook-secret',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  };
}

function jsonResponse(body: unknown, status: number, corsHeaders: Record<string, string>) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

function escHtml(value: unknown): string {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function safeHttpUrl(value: unknown): string {
  const str = String(value ?? '').trim();
  if (!str) return '';
  try {
    const u = new URL(str);
    if (u.protocol === 'https:' || u.protocol === 'http:') return u.toString();
  } catch {
    // invalid URL
  }
  return '';
}

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY') || '';
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') || 'https://abzcabiqdkmfaijnqbkf.supabase.co';
const SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
const ADMIN_EMAIL = 'otienoronny56@gmail.com';
const APP_BASE_URL = 'https://luxealiving.co.ke';

function getSenderEmail(displayName: string = 'Luxea Living'): string {
  const custom = Deno.env.get('SENDER_EMAIL');
  let emailAddr = 'concierge@luxealiving.co.ke';
  if (custom) {
    const match = custom.match(/<([^>]+)>/);
    emailAddr = match ? match[1] : custom.trim();
  }
  return `"${displayName}" <${emailAddr}>`;
}

// In-memory 60-second deduplication cache & lightweight rate limiter
const recentDispatches = new Map<string, number>();
const lookupRateLimits = new Map<string, { count: number; resetAt: number }>();

function isDuplicate(type: string, email: string): boolean {
  if (!email) return false;
  const key = `${type}:${email.toLowerCase().trim()}`;
  const now = Date.now();
  const lastTime = recentDispatches.get(key);
  if (lastTime && now - lastTime < 60000) return true;
  recentDispatches.set(key, now);
  if (recentDispatches.size > 500) {
    for (const [k, t] of recentDispatches.entries()) {
      if (now - t > 120000) recentDispatches.delete(k);
    }
  }
  return false;
}

function checkLookupRateLimit(key: string): boolean {
  const now = Date.now();
  const entry = lookupRateLimits.get(key);
  if (!entry || now > entry.resetAt) {
    lookupRateLimits.set(key, { count: 1, resetAt: now + 60000 });
    return true;
  }
  if (entry.count >= 10) return false;
  entry.count += 1;
  return true;
}

// =========================================================================
// AUTHENTICATION & AUTHORIZATION HELPERS
// =========================================================================

async function verifyWebhookSecret(req: Request): Promise<boolean> {
  const secret = req.headers.get('x-luxea-webhook-secret') || '';
  if (!secret || secret.length < 16 || !SERVICE_ROLE_KEY) return false;
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/verify_luxea_webhook_secret`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ p_secret: secret }),
    });
    if (!res.ok) return false;
    const valid = await res.json();
    return valid === true;
  } catch {
    return false;
  }
}

interface VerifiedAdmin {
  id: string;
  email: string;
  role: 'super_admin' | 'admin';
  full_name: string;
}

async function verifyAdminJwt(req: Request): Promise<VerifiedAdmin | null> {
  const authHeader = req.headers.get('authorization') || '';
  if (!authHeader.startsWith('Bearer ') || !SERVICE_ROLE_KEY) return null;
  const jwt = authHeader.slice(7).trim();
  if (!jwt || jwt.length < 20) return null;

  try {
    // 1. Validate JWT directly with Supabase Auth server
    const userRes = await fetch(`${SUPABASE_URL}/auth/v1/user`, {
      method: 'GET',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${jwt}`,
      },
    });
    if (!userRes.ok) return null;
    const authUser = await userRes.json();
    if (!authUser || !authUser.id) return null;

    // 2. Verify authoritative role & suspension state in public.lux_profiles
    const profRes = await fetch(
      `${SUPABASE_URL}/rest/v1/lux_profiles?id=eq.${encodeURIComponent(authUser.id)}&select=id,email,full_name,role,is_suspended&limit=1`,
      {
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
      }
    );
    if (!profRes.ok) return null;
    const rows = await profRes.json();
    const prof = Array.isArray(rows) ? rows[0] : null;
    if (!prof || prof.is_suspended === true) return null;
    if (prof.role !== 'super_admin' && prof.role !== 'admin') return null;

    return {
      id: prof.id,
      email: prof.email,
      role: prof.role,
      full_name: prof.full_name || prof.email,
    };
  } catch {
    return null;
  }
}

async function authAdminRequest(endpoint: string, method: string = 'GET', body?: unknown) {
  const res = await fetch(`${SUPABASE_URL}/auth/v1/admin/${endpoint}`, {
    method,
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => null);
  return { ok: res.ok, status: res.status, data };
}

async function restUpsert(table: string, data: unknown, onConflict?: string) {
  const url = onConflict
    ? `${SUPABASE_URL}/rest/v1/${table}?on_conflict=${encodeURIComponent(onConflict)}`
    : `${SUPABASE_URL}/rest/v1/${table}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'Prefer': 'resolution=merge-duplicates',
    },
    body: JSON.stringify(data),
  });
  return res.ok;
}

async function findAuthUserByEmail(cleanEmail: string) {
  // Query lux_profiles first for O(1) lookup, fallback to auth admin search
  try {
    const profRes = await fetch(
      `${SUPABASE_URL}/rest/v1/lux_profiles?email=eq.${encodeURIComponent(cleanEmail)}&select=id,email,role&limit=1`,
      {
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
      }
    );
    if (profRes.ok) {
      const rows = await profRes.json();
      if (Array.isArray(rows) && rows[0]?.id) {
        const uRes = await authAdminRequest(`users/${rows[0].id}`, 'GET');
        if (uRes.ok && uRes.data?.id) return uRes.data;
      }
    }
  } catch {
    // fallback below
  }

  const listRes = await authAdminRequest('users?per_page=1000', 'GET');
  return listRes.data?.users?.find((u: any) => u.email?.toLowerCase() === cleanEmail) || null;
}

async function generateSignedHostActivationLink(hostEmail: string, hostName: string, refId: string): Promise<string> {
  const cleanEmail = hostEmail.toLowerCase().trim();
  const redirectTo = `${APP_BASE_URL}/host/activate/?ref=${encodeURIComponent(refId)}`;

  try {
    const existing = await findAuthUserByEmail(cleanEmail);

    if (existing) {
      // Promote existing non-admin user to host via app_metadata (never downgrading admins)
      const currentRole = existing.app_metadata?.role;
      const nextRole = (currentRole === 'super_admin' || currentRole === 'admin') ? currentRole : 'host';
      await authAdminRequest(`users/${existing.id}`, 'PUT', {
        app_metadata: { ...(existing.app_metadata || {}), role: nextRole },
      });
      await restUpsert('lux_profiles', {
        id: existing.id,
        email: cleanEmail,
        full_name: hostName || existing.user_metadata?.full_name || cleanEmail.split('@')[0],
        role: nextRole,
        updated_at: new Date().toISOString(),
      }, 'id');

      const linkRes = await authAdminRequest('generate_link', 'POST', {
        type: 'recovery',
        email: cleanEmail,
        options: { redirect_to: redirectTo },
      });
      if (linkRes.ok && linkRes.data?.action_link) {
        return linkRes.data.action_link;
      }
    } else {
      // Generate a cryptographically signed one-time invite link
      const inviteRes = await authAdminRequest('generate_link', 'POST', {
        type: 'invite',
        email: cleanEmail,
        data: { full_name: hostName, ref_id: refId },
        options: { redirect_to: redirectTo },
      });
      if (inviteRes.ok && inviteRes.data?.user?.id) {
        await authAdminRequest(`users/${inviteRes.data.user.id}`, 'PUT', {
          app_metadata: { role: 'host' },
        });
        await restUpsert('lux_profiles', {
          id: inviteRes.data.user.id,
          email: cleanEmail,
          full_name: hostName,
          role: 'host',
          updated_at: new Date().toISOString(),
        }, 'id');
      }
      if (inviteRes.ok && inviteRes.data?.action_link) {
        return inviteRes.data.action_link;
      }
    }
  } catch (err) {
    console.warn('generateSignedHostActivationLink error:', err);
  }

  return `${APP_BASE_URL}/host/activate/?ref=${encodeURIComponent(refId)}`;
}

async function sendResendEmail(payload: { from: string; to: string[]; subject: string; html: string }) {
  if (!RESEND_API_KEY) return { skipped: 'RESEND_API_KEY missing' };
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });
  return await res.json().catch(() => ({ ok: res.ok }));
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405, corsHeaders);
  }

  try {
    const payload = await req.json().catch(() => ({}));
    let emailType = String(payload.type || payload.event || '').trim();
    let record = payload.record || payload.data || payload;

    // Detect Supabase Database Webhook payloads
    if (payload.table === 'lux_hosts') {
      if (payload.type === 'INSERT') {
        emailType = 'host_waiting_verification';
        record = payload.record || {};
      } else if (payload.type === 'UPDATE' && payload.record?.review_status === 'approved') {
        emailType = 'host_approved';
        record = payload.record || {};
      }
    } else if (payload.table === 'lux_waitlist' && payload.type === 'INSERT') {
      emailType = 'guest_welcome';
      record = payload.record || {};
    } else if (payload.table === 'lux_host_waitlist' && payload.type === 'INSERT') {
      emailType = 'host_waitlist_welcome';
      record = payload.record || {};
    }

    // =========================================================================
    // 0. PERMANENTLY DISABLED INSECURE ENDPOINT
    // =========================================================================
    if (emailType === 'sync_auth_user' || emailType === 'ensure_auth_user') {
      return jsonResponse(
        { error: 'This endpoint has been permanently disabled for security.' },
        403,
        corsHeaders
      );
    }

    // =========================================================================
    // 1. PUBLIC PRIVACY-SAFE HOST STATUS LOOKUP (Requires BOTH exact ref + email)
    // =========================================================================
    if (emailType === 'lookup_host_status') {
      const clientIp = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown';
      if (!checkLookupRateLimit(clientIp)) {
        return jsonResponse({ error: 'Too many lookup requests. Please wait a minute.' }, 429, corsHeaders);
      }

      const refId = String(record.ref_id || record.refId || '').trim();
      const email = String(record.email || '').trim().toLowerCase();

      if (!refId || !email || !email.includes('@')) {
        return jsonResponse(
          { found: false, error: 'Both Reference ID and Registered Email are required.' },
          400,
          corsHeaders
        );
      }

      const url = `${SUPABASE_URL}/rest/v1/lux_hosts?ref_id=ilike.${encodeURIComponent(refId)}&email=ilike.${encodeURIComponent(email)}&select=ref_id,property_name,review_status,created_at&limit=1`;
      const res = await fetch(url, {
        headers: {
          'apikey': SERVICE_ROLE_KEY,
          'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        },
      });
      const rows = res.ok ? await res.json() : [];
      const match = Array.isArray(rows) ? rows[0] : null;

      if (!match) {
        return jsonResponse({ found: false }, 200, corsHeaders);
      }

      return jsonResponse({
        found: true,
        application: {
          ref_id: match.ref_id,
          property_name: match.property_name,
          review_status: match.review_status || 'pending_review',
          created_at: match.created_at,
        },
      }, 200, corsHeaders);
    }

    // =========================================================================
    // 2. ADMIN-ONLY OPERATIONS (Strictly require verified Admin JWT)
    // =========================================================================
    if (emailType === 'admin_get_signed_doc_url') {
      const admin = await verifyAdminJwt(req);
      if (!admin) {
        return jsonResponse({ error: 'Unauthorized: verified admin session required.' }, 401, corsHeaders);
      }

      const rawPath = String(record.path || record.url || '').trim();
      if (!rawPath) {
        return jsonResponse({ error: 'Document path is required.' }, 400, corsHeaders);
      }

      // Extract object path inside lux_documents if a legacy full URL was stored
      let objectPath = rawPath;
      const marker = '/lux_documents/';
      const idx = rawPath.indexOf(marker);
      if (idx !== -1) {
        objectPath = decodeURIComponent(rawPath.slice(idx + marker.length).split('?')[0]);
      }
      objectPath = objectPath.replace(/^\/+/, '');
      if (!objectPath || objectPath.includes('..')) {
        return jsonResponse({ error: 'Invalid document path.' }, 400, corsHeaders);
      }

      const signRes = await fetch(
        `${SUPABASE_URL}/storage/v1/object/sign/lux_documents/${objectPath.split('/').map(encodeURIComponent).join('/')}`,
        {
          method: 'POST',
          headers: {
            'apikey': SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ expiresIn: 300 }),
        }
      );

      const signData = await signRes.json().catch(() => null);
      if (!signRes.ok || !signData?.signedURL) {
        return jsonResponse({ error: signData?.message || 'Could not sign document URL.' }, 404, corsHeaders);
      }

      const signedUrl = signData.signedURL.startsWith('http')
        ? signData.signedURL
        : `${SUPABASE_URL}/storage/v1${signData.signedURL}`;

      return jsonResponse({ success: true, signedUrl, expiresIn: 300 }, 200, corsHeaders);
    }

    if (emailType === 'admin_provision_user') {
      const admin = await verifyAdminJwt(req);
      if (!admin) {
        return jsonResponse({ error: 'Unauthorized: verified admin session required.' }, 401, corsHeaders);
      }

      const email = String(record.email || '').toLowerCase().trim();
      const password = String(record.password || '').trim();
      const fullName = String(record.full_name || record.fullName || 'User').trim();
      const requestedRole = String(record.role || 'member').toLowerCase().trim();
      const allowedRoles = ['member', 'host', 'laundry_partner', 'admin', 'super_admin'];
      const role = allowedRoles.includes(requestedRole) ? requestedRole : 'member';

      if ((role === 'super_admin' || role === 'admin') && admin.role !== 'super_admin') {
        return jsonResponse({ error: 'Forbidden: only super_admin can provision admin accounts.' }, 403, corsHeaders);
      }
      if (!email || !email.includes('@')) {
        return jsonResponse({ error: 'Valid email is required.' }, 400, corsHeaders);
      }
      if (password && password.length < 10) {
        return jsonResponse({ error: 'Password must be at least 10 characters.' }, 400, corsHeaders);
      }

      const phone = String(record.phone || '').trim();
      const avatarUrl = safeHttpUrl(record.avatar_url);
      const bio = String(record.bio || '').trim();
      const propertyName = String(record.property_name || '').trim();
      const propertyType = String(record.property_type || 'Apartment').trim();
      const county = String(record.county || 'Nairobi').trim();
      const area = String(record.area || 'Westlands').trim();
      const propertyPhoto = safeHttpUrl(record.property_photo_url || (Array.isArray(record.property_photos_urls) ? record.property_photos_urls[0] : ''));
      const sendEmail = record.send_credentials_email !== false && record.send_credentials !== false;

      const effectivePassword = password || `Lx!${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}9A`;
      let authUserId: string | null = null;
      const existing = await findAuthUserByEmail(email);

      if (existing) {
        authUserId = existing.id;
        const updatePayload: Record<string, unknown> = {
          app_metadata: { ...(existing.app_metadata || {}), role },
          user_metadata: {
            full_name: fullName,
            avatar_url: avatarUrl || existing.user_metadata?.avatar_url || null,
            phone: phone || existing.user_metadata?.phone || null,
          },
        };
        if (password) updatePayload.password = password;
        await authAdminRequest(`users/${authUserId}`, 'PUT', updatePayload);
      } else {
        const createRes = await authAdminRequest('users', 'POST', {
          email,
          password: effectivePassword,
          email_confirm: true,
          app_metadata: { role },
          user_metadata: {
            full_name: fullName,
            avatar_url: avatarUrl || null,
            phone: phone || null,
          },
        });
        if (!createRes.ok || !createRes.data?.id) {
          return jsonResponse(
            { error: createRes.data?.msg || createRes.data?.message || 'Failed to provision auth user.' },
            400,
            corsHeaders
          );
        }
        authUserId = createRes.data.id;
      }

      if (authUserId) {
        await restUpsert('lux_profiles', {
          id: authUserId,
          email,
          full_name: fullName,
          role,
          avatar_url: avatarUrl || null,
          phone: phone || null,
          bio: bio || null,
          updated_at: new Date().toISOString(),
        }, 'id');
      }

      let hostRefId = record.ref_id || null;
      if (role === 'host') {
        hostRefId = hostRefId || `LXH-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;
        await restUpsert('lux_hosts', {
          ref_id: hostRefId,
          user_id: authUserId,
          full_name: fullName,
          national_id: 'ADMIN-VERIFIED',
          phone: phone || 'N/A',
          email,
          kra_pin: 'ON-FILE',
          dob: '1990-01-01',
          property_name: propertyName || `${fullName}'s Residence`,
          property_type: propertyType,
          property_address: `${area}, ${county}`,
          county,
          area_suburb: area,
          payout_method: 'M-Pesa',
          signature: fullName,
          review_status: 'approved',
          host_bio: bio,
          avatar_url: avatarUrl || null,
          property_photos_urls: propertyPhoto ? [propertyPhoto] : [],
          updated_at: new Date().toISOString(),
        }, 'ref_id');
      }

      if (sendEmail && RESEND_API_KEY) {
        const roleLabel =
          role === 'super_admin' ? 'Super Administrator' :
          role === 'admin' ? 'System Administrator' :
          role === 'host' ? 'Verified Host Partner' : 'VIP Circle Member';
        const portalUrl =
          role === 'super_admin' || role === 'admin'
            ? `${APP_BASE_URL}/admin/`
            : role === 'host'
            ? `${APP_BASE_URL}/host/?mode=manage`
            : `${APP_BASE_URL}/stays/`;

        // Generate a secure recovery link so the new user sets their own password safely
        const recoveryRes = await authAdminRequest('generate_link', 'POST', {
          type: 'recovery',
          email,
          options: { redirect_to: portalUrl },
        });
        const setupUrl = recoveryRes.ok && recoveryRes.data?.action_link ? recoveryRes.data.action_link : portalUrl;

        await sendResendEmail({
          from: getSenderEmail('Luxea Living Executive Office'),
          to: [email],
          subject: `Your Luxea Living Account Has Been Provisioned [${roleLabel}]`,
          html: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background-color: #0B0806; color: #EDE8E3; padding: 36px 16px;">
              <div style="max-width: 560px; margin: 0 auto; background: #130E0A; border: 1px solid #D4AF37; border-radius: 12px; padding: 32px;">
                <div style="text-align: center; margin-bottom: 24px;">
                  <div style="font-size: 22px; letter-spacing: 5px; font-weight: 700; color: #D4AF37;">LUXEA LIVING</div>
                  <div style="font-size: 11px; letter-spacing: 2px; color: #A0958C; text-transform: uppercase; margin-top: 4px;">Executive Onboarding Dispatch</div>
                </div>
                <h2 style="color: #FFFFFF; font-size: 20px; margin: 0 0 12px;">Welcome, ${escHtml(fullName)}</h2>
                <p style="color: #C5BCB3; font-size: 13px; line-height: 1.6; margin: 0 0 20px;">
                  Your Luxea Living account has been created and verified by executive administration with the role of <strong>${escHtml(roleLabel)}</strong>.
                </p>
                <table width="100%" cellpadding="0" cellspacing="0" style="background: #0E0A07; border: 1px solid rgba(178, 135, 86, 0.25); border-radius: 8px; margin-bottom: 24px; font-size: 13px;">
                  <tr>
                    <td style="padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #8F847C;">Login Email</td>
                    <td style="padding: 10px 14px; border-bottom: 1px solid rgba(255,255,255,0.05); color: #EDE8E3; font-weight: 600; text-align: right;">${escHtml(email)}</td>
                  </tr>
                  <tr>
                    <td style="padding: 10px 14px; color: #8F847C;">Access Role</td>
                    <td style="padding: 10px 14px; color: #4ADE80; font-weight: 600; text-align: right;">${escHtml(roleLabel)}</td>
                  </tr>
                </table>
                <div style="text-align: center; margin: 24px 0;">
                  <a href="${escHtml(setupUrl)}" style="background: linear-gradient(135deg, #D4AF37 0%, #B28756 100%); color: #0B0806; font-weight: 700; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-size: 13px; display: inline-block;">
                    Set Your Password &amp; Enter Portal ↗
                  </a>
                </div>
                <p style="font-size: 12px; color: #8F847C; line-height: 1.5; margin: 0;">
                  For your security, passwords are never sent in plain text over email. Use the secure one-time link above or sign in with Google using this email.
                </p>
              </div>
            </div>
          `,
        });
      }

      return jsonResponse({
        success: true,
        user: { id: authUserId, email, full_name: fullName, role, refId: hostRefId },
      }, 200, corsHeaders);
    }

    // =========================================================================
    // 3. AUTOMATED EMAIL DISPATCHES (REQUIRE VALID DB WEBHOOK SECRET OR ADMIN JWT)
    // =========================================================================
    const isTrustedWebhook = await verifyWebhookSecret(req);
    const verifiedAdmin = isTrustedWebhook ? null : await verifyAdminJwt(req);

    if (!isTrustedWebhook && !verifiedAdmin) {
      return jsonResponse(
        { error: 'Unauthorized: missing valid webhook secret or admin authorization.' },
        401,
        corsHeaders
      );
    }

    if (!RESEND_API_KEY) {
      return jsonResponse({ error: 'Email service unconfigured (missing secret).' }, 500, corsHeaders);
    }

    const results: unknown[] = [];

    // 3A. STAGE 1: HOST APPLICATION RECEIVED & WAITING FOR VERIFICATION
    if (emailType === 'host_waiting_verification') {
      const hostEmail = String(record.email || '').trim().toLowerCase();
      const hostName = escHtml(record.full_name || record.fullName || 'Host Partner');
      const refId = escHtml(record.ref_id || record.refId || 'LXH-PENDING');
      const rawRefId = String(record.ref_id || record.refId || 'LXH-PENDING');
      const propName = escHtml(record.property_name || record.propertyName || 'Curated Residence');
      const propType = escHtml(record.property_type || record.propertyType || 'Residence');
      const location = escHtml(`${record.area_suburb || record.area || 'Nairobi'}, ${record.county || 'Kenya'}`);
      const bedrooms = escHtml(record.bedrooms || 1);
      const payoutMethod = escHtml(record.payout_method || 'Registered Account');

      if (hostEmail && !isDuplicate('host_waiting_verification', hostEmail)) {
        const waitingHtml = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Application Received | Luxea Living</title></head>
<body style="margin:0;padding:0;background-color:#0B0806;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#EDE8E3;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0B0806;padding:40px 16px;"><tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#130E0A;border:1px solid rgba(178,135,86,0.3);border-radius:12px;overflow:hidden;">
      <tr><td style="padding:36px 40px 24px;text-align:center;border-bottom:1px solid rgba(178,135,86,0.15);">
        <div style="font-size:22px;letter-spacing:5px;font-weight:700;color:#D4AF37;margin-bottom:6px;">LUXEA LIVING</div>
        <div style="font-size:11px;letter-spacing:2px;color:#A0958C;text-transform:uppercase;">Curated Residences • Host Onboarding Desk</div>
      </td></tr>
      <tr><td style="padding:36px 40px;">
        <div style="display:inline-block;background:rgba(234,179,8,0.12);border:1px solid rgba(234,179,8,0.4);border-radius:20px;padding:5px 14px;font-size:11px;color:#FACC15;font-weight:700;margin-bottom:16px;">⏳ APPLICATION RECEIVED — VERIFICATION IN PROGRESS</div>
        <h1 style="font-size:22px;color:#FFFFFF;margin:0 0 16px;">Thank You, ${hostName}</h1>
        <p style="font-size:14px;line-height:1.7;color:#C5BCB3;margin:0 0 24px;">Your property registration for <strong style="color:#EDE8E3;">${propName}</strong> has been logged into the Luxea Living property registry for compliance &amp; quality review.</p>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(11,8,6,0.7);border:1px solid #B28756;border-radius:8px;margin-bottom:24px;">
          <tr><td style="padding:18px 24px;">
            <div style="font-size:11px;color:#8F847C;text-transform:uppercase;letter-spacing:1.5px;">Application Tracking Ref ID</div>
            <div style="font-size:20px;color:#D4AF37;font-family:monospace;font-weight:700;margin-top:4px;">${refId}</div>
            <div style="font-size:12px;color:#FACC15;margin-top:6px;font-weight:600;">Current Status: Pending Curatorial Audit</div>
          </td></tr>
        </table>
        <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.02);border:1px solid rgba(255,255,255,0.08);border-radius:8px;margin-bottom:24px;font-size:13px;">
          <tr><td style="padding:12px 16px;color:#8F847C;">Property</td><td style="padding:12px 16px;color:#EDE8E3;font-weight:600;text-align:right;">${propName} (${propType} • ${bedrooms} Bed)</td></tr>
          <tr><td style="padding:12px 16px;color:#8F847C;">Location</td><td style="padding:12px 16px;color:#EDE8E3;font-weight:600;text-align:right;">${location}</td></tr>
          <tr><td style="padding:12px 16px;color:#8F847C;">Payout Channel</td><td style="padding:12px 16px;color:#4ADE80;font-weight:600;text-align:right;">${payoutMethod}</td></tr>
        </table>
        <p style="font-size:13px;color:#C5BCB3;line-height:1.6;">Our concierge desk typically completes review within <strong>24–48 business hours</strong>. Once approved, you will receive a secure one-time activation link.</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

        const waitingResult = await sendResendEmail({
          from: getSenderEmail('Luxea Living | Partner Desk'),
          to: [hostEmail],
          subject: `Application Received: Under Verification & Audit [${rawRefId}] | Luxea Living`,
          html: waitingHtml,
        });
        results.push({ recipient: hostEmail, type: 'host_waiting_verification', resend: waitingResult });

        // Alert Admin (fixes previous undefined SENDER_EMAIL bug)
        const dossierUrl = `${APP_BASE_URL}/admin/host-dossier.html?ref=${encodeURIComponent(rawRefId)}`;
        await sendResendEmail({
          from: getSenderEmail('Luxea Living | Admin Alert'),
          to: [ADMIN_EMAIL],
          subject: `⚡ Action Required: New Host Application — ${String(record.full_name || 'Host')} [${rawRefId}]`,
          html: `
            <div style="font-family:sans-serif;background:#0B0806;color:#EDE8E3;padding:28px;">
              <div style="max-width:560px;margin:0 auto;background:#140F0B;border:1px solid #B28756;border-radius:12px;padding:28px;">
                <h2 style="color:#FFFFFF;margin:0 0 12px;">${hostName} submitted a new property</h2>
                <p style="color:#C5BCB3;font-size:13px;">Ref: <strong>${refId}</strong> • ${propName} (${location}) • Payout: ${payoutMethod}</p>
                <div style="margin-top:20px;text-align:center;">
                  <a href="${escHtml(dossierUrl)}" style="display:inline-block;background:#D4AF37;color:#0B0806;font-weight:700;padding:12px 24px;border-radius:8px;text-decoration:none;">Open Protected Host Dossier ↗</a>
                </div>
              </div>
            </div>`,
        });
      }
    }

    // 3B. STAGE 2: HOST APPROVED — GENERATE SIGNED ONE-TIME ACTIVATION LINK
    if (emailType === 'host_approved' || emailType === 'host_verification_approved') {
      const hostEmail = String(record.email || '').trim().toLowerCase();
      const rawName = String(record.full_name || record.fullName || 'Host Partner');
      const rawRefId = String(record.ref_id || record.refId || 'LXH-PARTNER');
      const hostName = escHtml(rawName);
      const refId = escHtml(rawRefId);
      const propName = escHtml(record.property_name || record.propertyName || 'Curated Residence');

      if (hostEmail && !isDuplicate('host_approved', hostEmail)) {
        const signedActivationUrl = await generateSignedHostActivationLink(hostEmail, rawName, rawRefId);

        const approvedHtml = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><title>Verification Approved | Luxea Living</title></head>
<body style="margin:0;padding:0;background-color:#0B0806;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#EDE8E3;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0B0806;padding:40px 16px;"><tr><td align="center">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background-color:#130E0A;border:1px solid rgba(74,222,128,0.4);border-radius:12px;overflow:hidden;">
      <tr><td style="padding:36px 40px 24px;text-align:center;border-bottom:1px solid rgba(74,222,128,0.2);">
        <div style="font-size:22px;letter-spacing:5px;font-weight:700;color:#D4AF37;">LUXEA LIVING</div>
        <div style="font-size:11px;letter-spacing:2px;color:#4ADE80;text-transform:uppercase;font-weight:700;margin-top:6px;">Verification Ratified</div>
      </td></tr>
      <tr><td style="padding:36px 40px;">
        <h1 style="font-size:24px;color:#FFFFFF;margin:0 0 16px;">Congratulations, ${hostName}!</h1>
        <p style="font-size:14px;line-height:1.7;color:#C5BCB3;margin:0 0 24px;">Your residence <strong style="color:#EDE8E3;">${propName}</strong> (${refId}) has passed our curatorial audit. Use your private, one-time activation link below to set your password and enter the Host Partner Suite:</p>
        <div style="text-align:center;margin:28px 0;">
          <a href="${escHtml(signedActivationUrl)}" style="display:inline-block;background:#D4AF37;color:#0B0806;font-weight:700;font-size:14px;text-decoration:none;padding:16px 36px;border-radius:8px;">Set Password &amp; Activate Host Suite ↗</a>
        </div>
        <p style="font-size:12px;color:#8F847C;line-height:1.5;">This activation link is cryptographically signed for ${escHtml(hostEmail)}. Do not forward it to anyone.</p>
      </td></tr>
    </table>
  </td></tr></table>
</body></html>`;

        const approvedResult = await sendResendEmail({
          from: getSenderEmail('Luxea Living | Partner Desk'),
          to: [hostEmail],
          subject: `🎉 Verification Approved! Activate Your Luxea Host Account [${rawRefId}]`,
          html: approvedHtml,
        });
        results.push({ recipient: hostEmail, type: 'host_approved', resend: approvedResult });
      }
    }

    // 3C. VIP GUEST WAITLIST WELCOME
    if (emailType === 'guest_welcome' || emailType === 'waitlist_signup') {
      const guestEmail = String(record.email || '').trim().toLowerCase();
      const guestName = escHtml(record.full_name || record.name || 'Founding Circle Member');
      const passNumber = escHtml(record.pass_number || 'LX-FOUNDING');
      const passCode = escHtml(record.pass_code || '');
      const destinations = escHtml(record.preferred_destinations || 'Nairobi & Coast Curated Stays');

      if (guestEmail && !isDuplicate('guest_welcome', guestEmail)) {
        const guestResult = await sendResendEmail({
          from: getSenderEmail('Luxea Living | Private Stays'),
          to: [guestEmail],
          subject: `Welcome to the Founding Circle — Your Luxea Living Pass [${String(record.pass_number || 'LX')}]`,
          html: `<div style="font-family:sans-serif;background:#0B0806;color:#EDE8E3;padding:36px 16px;"><div style="max-width:580px;margin:0 auto;background:#130E0A;border:1px solid #B28756;border-radius:12px;padding:32px;"><div style="text-align:center;color:#D4AF37;font-size:20px;letter-spacing:4px;font-weight:700;margin-bottom:20px;">LUXEA LIVING</div><h1 style="color:#FFF;font-size:22px;">Welcome to Quiet Luxury, ${guestName}</h1><p style="color:#C5BCB3;font-size:14px;line-height:1.7;">You are inducted into the Luxea Living Founding Circle.</p><div style="background:#1C1510;border:1px solid #D4AF37;border-radius:10px;padding:18px;margin:20px 0;"><div style="color:#D4AF37;font-family:monospace;font-size:15px;font-weight:700;">Pass: ${passNumber} • Key: ${passCode}</div><div style="color:#A0958C;font-size:12px;margin-top:6px;">Preferred Locales: ${destinations}</div></div></div></div>`,
        });
        results.push({ recipient: guestEmail, type: 'guest_welcome', resend: guestResult });

        await sendResendEmail({
          from: getSenderEmail('Luxea Living System'),
          to: [ADMIN_EMAIL],
          subject: `✨ New VIP Founding Member: ${String(record.full_name || 'Guest')} (${String(record.pass_number || '')})`,
          html: `<div style="font-family:sans-serif;background:#0B0806;color:#EDE8E3;padding:24px;"><h2 style="color:#D4AF37;">New Founding Circle Induction</h2><p><strong>Guest:</strong> ${guestName} (${escHtml(guestEmail)})</p><p><strong>Pass:</strong> ${passNumber} (${passCode})</p><p><strong>Destinations:</strong> ${destinations}</p></div>`,
        });
      }
    }

    // 3D. FOUNDING HOST WAITLIST WELCOME
    if (emailType === 'host_waitlist_welcome' || emailType === 'host_waitlist' || emailType === 'partner_waitlist') {
      const hostEmail = String(record.email || '').trim().toLowerCase();
      const hostName = escHtml(record.full_name || record.fullName || 'Founding Partner');
      const passNumber = escHtml(record.pass_number || record.passNumber || '#LXA-HOST');
      const passCode = escHtml(record.pass_code || record.passCode || 'LXA-FOUNDING');
      const propName = escHtml(record.property_name || record.propertyName || 'Luxury Residence');
      const propType = escHtml(record.property_type || record.propertyType || 'Villa');
      const region = escHtml(record.region || 'Kenya');
      const bedrooms = escHtml(record.bedrooms || 1);
      const phone = escHtml(record.phone || 'Not provided');
      const portfolioLink = safeHttpUrl(record.portfolio_link || record.portfolioLink);
      const notes = escHtml(record.notes || '');

      if (hostEmail && !isDuplicate('host_waitlist_welcome', hostEmail)) {
        const hostResult = await sendResendEmail({
          from: getSenderEmail('Luxea Living | Partner Desk'),
          to: [hostEmail],
          subject: `Founding Host Partner Pass [${String(record.pass_number || 'LXA')}] — Welcome to Luxea Living`,
          html: `<div style="font-family:sans-serif;background:#0B0806;color:#EDE8E3;padding:36px 16px;"><div style="max-width:600px;margin:0 auto;background:#140E0A;border:1px solid #D4AF37;border-radius:12px;padding:32px;"><div style="text-align:center;color:#D4AF37;font-size:22px;letter-spacing:5px;font-weight:700;margin-bottom:20px;">LUXEA LIVING</div><h1 style="color:#FFF;font-size:22px;">Welcome to the Circle, ${hostName}.</h1><p style="color:#C5BCB3;font-size:14px;line-height:1.7;">Your founding host pass for <strong style="color:#FFF;">${propName}</strong> (${propType} • ${bedrooms} Beds, ${region}) is locked with <strong>0% Commission for 90 Days</strong>.</p><div style="background:#1C1510;border:1px solid #D4AF37;border-radius:10px;padding:18px;margin:20px 0;"><div style="color:#D4AF37;font-family:monospace;font-size:15px;font-weight:700;">Pass: ${passNumber} • Partner Key: ${passCode}</div></div></div></div>`,
        });
        results.push({ recipient: hostEmail, type: 'host_waitlist_welcome', resend: hostResult });

        await sendResendEmail({
          from: getSenderEmail('Luxea Partner Alert'),
          to: [ADMIN_EMAIL],
          subject: `🌟 New Host Partner Waitlist: ${String(record.full_name || 'Host')} (${String(record.region || 'Kenya')})`,
          html: `<div style="font-family:sans-serif;background:#0B0806;color:#EDE8E3;padding:24px;"><h2 style="color:#D4AF37;">New Founding Host Waitlist Submission</h2><p><strong>Host:</strong> ${hostName} (${escHtml(hostEmail)} • ${phone})</p><p><strong>Property:</strong> ${propName} (${propType}, ${bedrooms} Beds, ${region})</p>${portfolioLink ? `<p><strong>Portfolio:</strong> <a href="${escHtml(portfolioLink)}" style="color:#38BDF8;">${escHtml(portfolioLink)}</a></p>` : ''}${notes ? `<p><strong>Notes:</strong> ${notes}</p>` : ''}<p><strong>Pass:</strong> ${passNumber} (${passCode})</p></div>`,
        });
      }
    }

    return jsonResponse({ success: true, dispatched: results.length, results }, 200, corsHeaders);
  } catch (err: any) {
    console.error('Mailer engine exception:', err);
    return jsonResponse({ error: 'Internal server error' }, 500, corsHeaders);
  }
});
