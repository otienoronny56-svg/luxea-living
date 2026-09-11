/**
 * LUXEA LIVING — AUTOMATED COMMUNICATIONS EDGE ENGINE
 * Supabase Edge Function (Deno)
 * 
 * Powered by Resend with verified domain: luxealiving.co.ke
 * Completely secure: RESEND_API_KEY is an encrypted environment secret in Supabase.
 * 
 * Features:
 * 1. Stage 1: Host Application Received & Verification In Progress (host_waiting_verification)
 * 2. Stage 2: Host Property Approved & Account Activation Invitation (host_approved)
 * 3. Guest VIP Founding Circle Welcome & Digital Pass (guest_welcome)
 * 4. Executive Realtime Super Admin Alerts
 */

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY');
const SENDER_EMAIL = Deno.env.get('SENDER_EMAIL') || 'LUXEA LIVING Concierge <concierge@luxealiving.co.ke>';
const ADMIN_EMAIL = 'otienoronny56@gmail.com';
const APP_BASE_URL = 'https://luxealiving.co.ke';

// In-memory 60-second deduplication cache to prevent duplicate sends
const recentDispatches = new Map<string, number>();

function isDuplicate(type: string, email: string): boolean {
  if (!email) return false;
  const key = `${type}:${email.toLowerCase().trim()}`;
  const now = Date.now();
  const lastTime = recentDispatches.get(key);
  if (lastTime && now - lastTime < 60000) {
    return true;
  }
  recentDispatches.set(key, now);
  // Housekeeping
  if (recentDispatches.size > 500) {
    for (const [k, t] of recentDispatches.entries()) {
      if (now - t > 120000) recentDispatches.delete(k);
    }
  }
  return false;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!RESEND_API_KEY) {
      console.error('Missing RESEND_API_KEY in environment');
      return new Response(JSON.stringify({ error: 'Email service unconfigured (missing secret)' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = await req.json().catch(() => ({}));
    console.log('Received mailer dispatch payload:', JSON.stringify(payload, null, 2));

    let emailType = payload.type || payload.event || '';
    let record = payload.record || payload.data || payload;

    // Detect Supabase Database Webhook & Trigger payloads
    if (payload.table === 'lux_hosts') {
      if (payload.type === 'INSERT') {
        emailType = 'host_waiting_verification';
        record = payload.record || {};
      } else if (payload.type === 'UPDATE' && payload.record && payload.record.review_status === 'approved') {
        emailType = 'host_approved';
        record = payload.record || {};
      }
    } else if (payload.table === 'lux_waitlist' && payload.type === 'INSERT') {
      emailType = 'guest_welcome';
      record = payload.record || {};
    }

    const results = [];

    // =========================================================================
    // 1. STAGE 1: HOST APPLICATION RECEIVED & WAITING FOR VERIFICATION
    // =========================================================================
    if (
      emailType === 'host_waiting_verification' ||
      emailType === 'host_welcome' ||
      emailType === 'host_registration'
    ) {
      const hostEmail = record.email;
      const hostName = record.full_name || record.fullName || 'Host Partner';
      const refId = record.ref_id || record.refId || 'LXH-PENDING';
      const propName = record.property_name || record.propertyName || 'Curated Residence';
      const propType = record.property_type || record.propertyType || 'Residence';
      const location = `${record.area_suburb || record.area || 'Nairobi'}, ${record.county || 'Kenya'}`;
      const bedrooms = record.bedrooms || 1;
      const payoutMethod = record.payout_method || (record.payoutDetails && record.payoutDetails.method) || 'Registered Account';

      if (hostEmail) {
        if (isDuplicate('host_waiting_verification', hostEmail)) {
          console.log(`⏳ Debounced duplicate host_waiting_verification send for ${hostEmail}`);
          results.push({ recipient: hostEmail, type: 'host_waiting_verification', status: 'debounced_duplicate' });
        } else {
          const waitingHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Application Received — Verification In Progress | Luxea Living</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0B0806; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #EDE8E3;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0B0806; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #130E0A; border: 1px solid rgba(178, 135, 86, 0.3); border-radius: 12px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6);">
          
          <!-- Header Banner -->
          <tr>
            <td style="padding: 36px 40px 24px; text-align: center; border-bottom: 1px solid rgba(178, 135, 86, 0.15); background: linear-gradient(180deg, rgba(178, 135, 86, 0.08) 0%, rgba(19, 14, 10, 0) 100%);">
              <div style="font-size: 22px; letter-spacing: 5px; font-weight: 700; color: #D4AF37; margin-bottom: 6px;">LUXEA LIVING</div>
              <div style="font-size: 11px; letter-spacing: 2px; color: #A0958C; text-transform: uppercase;">Curated Residences • Host Onboarding Desk</div>
            </td>
          </tr>

          <!-- Hero Body -->
          <tr>
            <td style="padding: 36px 40px;">
              <!-- Verification Pending Status Chip -->
              <div style="display: inline-block; background: rgba(234, 179, 8, 0.12); border: 1px solid rgba(234, 179, 8, 0.4); border-radius: 20px; padding: 5px 14px; font-size: 11px; color: #FACC15; font-weight: 700; letter-spacing: 1px; margin-bottom: 16px;">
                ⏳ APPLICATION RECEIVED — VERIFICATION IN PROGRESS
              </div>
              <h1 style="font-size: 22px; color: #FFFFFF; font-weight: 600; margin: 0 0 16px; line-height: 1.3;">
                Thank You, ${hostName}
              </h1>
              <p style="font-size: 14px; line-height: 1.7; color: #C5BCB3; margin: 0 0 24px;">
                Your property registration for <strong style="color: #EDE8E3;">${propName}</strong> has been logged into the Luxea Living property registry. Before any stay goes live, our curation committee conducts a mandatory compliance &amp; standard verification.
              </p>

              <!-- Reference Badge Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: rgba(11, 8, 6, 0.7); border: 1px solid #B28756; border-radius: 8px; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 18px 24px;">
                    <div style="font-size: 11px; color: #8F847C; text-transform: uppercase; letter-spacing: 1.5px;">Application Tracking Ref ID</div>
                    <div style="font-size: 20px; color: #D4AF37; font-family: monospace; font-weight: 700; letter-spacing: 1px; margin-top: 4px;">
                      ${refId}
                    </div>
                    <div style="font-size: 12px; color: #FACC15; margin-top: 6px; font-weight: 600;">
                      Current Status: Pending Curatorial Audit
                    </div>
                  </td>
                </tr>
              </table>

              <!-- Property Summary Card -->
              <div style="font-size: 12px; color: #D4AF37; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; margin-bottom: 12px;">
                Submitted Asset Information
              </div>
              <table width="100%" cellpadding="0" cellspacing="0" style="background: rgba(255, 255, 255, 0.02); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: 8px; margin-bottom: 28px;">
                <tr>
                  <td style="padding: 14px 18px; border-bottom: 1px solid rgba(255, 255, 255, 0.05); font-size: 13px; color: #8F847C;">Property Name</td>
                  <td style="padding: 14px 18px; border-bottom: 1px solid rgba(255, 255, 255, 0.05); font-size: 13px; color: #EDE8E3; font-weight: 600; text-align: right;">${propName}</td>
                </tr>
                <tr>
                  <td style="padding: 14px 18px; border-bottom: 1px solid rgba(255, 255, 255, 0.05); font-size: 13px; color: #8F847C;">Classification</td>
                  <td style="padding: 14px 18px; border-bottom: 1px solid rgba(255, 255, 255, 0.05); font-size: 13px; color: #EDE8E3; font-weight: 600; text-align: right;">${propType} • ${bedrooms} Bedroom(s)</td>
                </tr>
                <tr>
                  <td style="padding: 14px 18px; border-bottom: 1px solid rgba(255, 255, 255, 0.05); font-size: 13px; color: #8F847C;">Location</td>
                  <td style="padding: 14px 18px; border-bottom: 1px solid rgba(255, 255, 255, 0.05); font-size: 13px; color: #EDE8E3; font-weight: 600; text-align: right;">${location}</td>
                </tr>
                <tr>
                  <td style="padding: 14px 18px; font-size: 13px; color: #8F847C;">Payout Channel</td>
                  <td style="padding: 14px 18px; font-size: 13px; color: #4ADE80; font-weight: 600; text-align: right;">${payoutMethod}</td>
                </tr>
              </table>

              <!-- What We Are Verifying -->
              <div style="font-size: 12px; color: #D4AF37; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; margin-bottom: 14px;">
                The 3-Point Luxea Verification Procedure
              </div>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                <tr>
                  <td width="32" valign="top" style="padding-top: 2px;">
                    <div style="width: 22px; height: 22px; border-radius: 50%; background: #B28756; color: #0B0806; font-size: 12px; font-weight: 700; text-align: center; line-height: 22px;">1</div>
                  </td>
                  <td style="padding-bottom: 16px;">
                    <strong style="color: #FFFFFF; font-size: 13px;">Regulatory &amp; Identity Audit</strong>
                    <div style="font-size: 12px; color: #A0958C; line-height: 1.5; margin-top: 2px;">
                      Verification of National ID/Passport, KRA PIN compliance, and property title / operating authority.
                    </div>
                  </td>
                </tr>
                <tr>
                  <td width="32" valign="top" style="padding-top: 2px;">
                    <div style="width: 22px; height: 22px; border-radius: 50%; background: #B28756; color: #0B0806; font-size: 12px; font-weight: 700; text-align: center; line-height: 22px;">2</div>
                  </td>
                  <td style="padding-bottom: 16px;">
                    <strong style="color: #FFFFFF; font-size: 13px;">Physical or Digital Property Inspection</strong>
                    <div style="font-size: 12px; color: #A0958C; line-height: 1.5; margin-top: 2px;">
                      Audit of WiFi speeds (minimum 50Mbps), acoustic quality, air conditioning, furnishing condition, and safety equipment.
                    </div>
                  </td>
                </tr>
                <tr>
                  <td width="32" valign="top" style="padding-top: 2px;">
                    <div style="width: 22px; height: 22px; border-radius: 50%; background: #B28756; color: #0B0806; font-size: 12px; font-weight: 700; text-align: center; line-height: 22px;">3</div>
                  </td>
                  <td>
                    <strong style="color: #FFFFFF; font-size: 13px;">Official Approval &amp; Password Setup Invitation</strong>
                    <div style="font-size: 12px; color: #A0958C; line-height: 1.5; margin-top: 2px;">
                      Once verified, you will receive an official approval email with a link to activate your host account, set a secure password, or continue with Google.
                    </div>
                  </td>
                </tr>
              </table>

              <div style="background: rgba(178, 135, 86, 0.08); border-left: 3px solid #D4AF37; padding: 14px 18px; margin-bottom: 26px; border-radius: 4px;">
                <div style="font-size: 12px; color: #D4AF37; font-weight: bold;">Expected Verification Timeframe</div>
                <div style="font-size: 13px; color: #C5BCB3; margin-top: 4px; line-height: 1.5;">
                  Our concierge desk typically completes review within <strong>24 to 48 business hours</strong>. You do not need to resubmit your application.
                </div>
              </div>

              <!-- Contact Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td align="center">
                    <a href="https://wa.me/254722345891?text=${encodeURIComponent('Hello Luxea Concierge, checking verification status for application ' + refId)}" style="display: inline-block; background: #B28756; color: #0B0806; font-weight: 700; font-size: 13px; text-decoration: none; padding: 14px 28px; border-radius: 8px; letter-spacing: 0.5px;">
                      Direct WhatsApp with Host Concierge ↗
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size: 13px; color: #8F847C; line-height: 1.6; margin: 0;">
                Warm regards,<br>
                <strong style="color: #EDE8E3;">The Onboarding Desk</strong><br>
                <span style="color: #D4AF37;">Luxea Living Kenya</span>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background: #0E0A07; border-top: 1px solid rgba(178, 135, 86, 0.15); text-align: center;">
              <div style="font-size: 11px; color: #6D635B; line-height: 1.6;">
                Luxea Living Residences • Nairobi, Ruaka, Westlands, Diani Beach, Karen<br>
                Official inquiries: concierge@luxealiving.co.ke • <a href="${APP_BASE_URL}" style="color: #B28756; text-decoration: none;">luxealiving.co.ke</a>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
          `;

          const waitingRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: SENDER_EMAIL,
              to: [hostEmail],
              subject: `Application Received: Under Verification & Audit [${refId}] | Luxea Living`,
              html: waitingHtml,
            }),
          });

          const waitingResult = await waitingRes.json();
          results.push({ recipient: hostEmail, type: 'host_waiting_verification', resend: waitingResult });
          console.log(`✅ Host waiting verification email sent to ${hostEmail}:`, waitingResult);
        }
      }

      // Alert Admin (Ronald)
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: SENDER_EMAIL,
            to: [ADMIN_EMAIL],
            subject: `🔔 New Host Application to Audit: ${hostName} (${refId})`,
            html: `
              <div style="font-family: sans-serif; background: #0B0806; color: #EDE8E3; padding: 24px; border-radius: 8px;">
                <h2 style="color: #D4AF37; margin: 0 0 12px;">New Host Application Pending Audit</h2>
                <p><strong>Host:</strong> ${hostName} (&lt;${hostEmail}&gt;)</p>
                <p><strong>Property:</strong> ${propName} (${propType})</p>
                <p><strong>Location:</strong> ${location}</p>
                <p><strong>Ref ID:</strong> ${refId}</p>
                <p><strong>Payout:</strong> ${payoutMethod}</p>
                <div style="margin-top: 18px;">
                  <a href="${APP_BASE_URL}/admin/" style="background: #B28756; color: #000; padding: 10px 18px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 13px;">
                    Review &amp; Approve in Super Admin ↗
                  </a>
                </div>
              </div>
            `,
          }),
        });
      } catch (adminErr) {
        console.warn('Admin alert error:', adminErr);
      }
    }

    // =========================================================================
    // 2. STAGE 2: HOST VERIFICATION APPROVED & ACCOUNT ACTIVATION / PASSWORD SETUP
    // =========================================================================
    if (emailType === 'host_approved' || emailType === 'host_verification_approved') {
      const hostEmail = record.email;
      const hostName = record.full_name || record.fullName || 'Host Partner';
      const refId = record.ref_id || record.refId || 'LXH-PARTNER';
      const propName = record.property_name || record.propertyName || 'Curated Residence';
      const propType = record.property_type || record.propertyType || 'Residence';
      const activationUrl = `${APP_BASE_URL}/host/activate/?ref=${refId}&email=${encodeURIComponent(hostEmail)}`;

      if (hostEmail) {
        if (isDuplicate('host_approved', hostEmail)) {
          console.log(`⏳ Debounced duplicate host_approved send for ${hostEmail}`);
          results.push({ recipient: hostEmail, type: 'host_approved', status: 'debounced_duplicate' });
        } else {
          const approvedHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Verification Approved! Activate Your Luxea Host Account</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0B0806; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #EDE8E3;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0B0806; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #130E0A; border: 1px solid rgba(74, 222, 128, 0.4); border-radius: 12px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6);">
          
          <!-- Header Banner -->
          <tr>
            <td style="padding: 36px 40px 24px; text-align: center; border-bottom: 1px solid rgba(74, 222, 128, 0.2); background: linear-gradient(180deg, rgba(74, 222, 128, 0.08) 0%, rgba(19, 14, 10, 0) 100%);">
              <div style="font-size: 22px; letter-spacing: 5px; font-weight: 700; color: #D4AF37; margin-bottom: 6px;">LUXEA LIVING</div>
              <div style="font-size: 11px; letter-spacing: 2px; color: #4ADE80; text-transform: uppercase; font-weight: 700;">Executive Curation Committee • Verification Ratified</div>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 36px 40px;">
              <!-- Approved Badge -->
              <div style="display: inline-block; background: rgba(74, 222, 128, 0.15); border: 1px solid rgba(74, 222, 128, 0.4); border-radius: 20px; padding: 5px 16px; font-size: 11px; color: #4ADE80; font-weight: 700; letter-spacing: 1px; margin-bottom: 16px;">
                ✓ PROPERTY VERIFICATION OFFICIALLY APPROVED
              </div>
              <h1 style="font-size: 24px; color: #FFFFFF; font-weight: 600; margin: 0 0 16px; line-height: 1.3;">
                Congratulations, ${hostName}!
              </h1>
              <p style="font-size: 14px; line-height: 1.7; color: #C5BCB3; margin: 0 0 24px;">
                We are delighted to inform you that your property <strong style="color: #EDE8E3;">${propName}</strong> has completed and passed our strict curatorial audit and compliance checks.
              </p>
              <p style="font-size: 14px; line-height: 1.7; color: #C5BCB3; margin: 0 0 28px;">
                To complete your onboarding, access your <strong>Host Partner Command Suite</strong>, manage your live calendar, and receive verified guest bookings, please activate your account below:
              </p>

              <!-- Activation CTA Box -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1B1510 0%, #0E0A07 100%); border: 1px solid #B28756; border-radius: 10px; margin-bottom: 30px; text-align: center;">
                <tr>
                  <td style="padding: 30px 24px;">
                    <div style="font-size: 11px; letter-spacing: 2px; color: #A0958C; text-transform: uppercase;">Host Partner Ref: ${refId}</div>
                    <div style="font-size: 18px; color: #FFFFFF; font-weight: 600; margin: 6px 0 20px;">
                      Activate Your Host Account
                    </div>
                    <a href="${activationUrl}" style="display: inline-block; background: #D4AF37; color: #0B0806; font-weight: 700; font-size: 14px; text-decoration: none; padding: 16px 36px; border-radius: 8px; letter-spacing: 0.5px; box-shadow: 0 4px 15px rgba(212, 175, 55, 0.3);">
                      Set Password &amp; Activate Host Suite ↗
                    </a>
                    <div style="font-size: 12px; color: #8F847C; margin-top: 14px;">
                      You will be asked to set a secure password or continue with Google.
                    </div>
                  </td>
                </tr>
              </table>

              <!-- What You Can Do in the Portal -->
              <div style="font-size: 12px; color: #D4AF37; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; margin-bottom: 14px;">
                What Unlocks in Your Host Suite
              </div>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                <tr>
                  <td width="28" valign="top" style="color: #4ADE80; font-size: 16px; line-height: 1.2;">✓</td>
                  <td style="padding-bottom: 12px; font-size: 13px; color: #C5BCB3; line-height: 1.5;">
                    <strong style="color: #FFFFFF;">Realtime Availability Control:</strong> Toggle your residence live or blackout specific dates at will with instant synchronization.
                  </td>
                </tr>
                <tr>
                  <td width="28" valign="top" style="color: #4ADE80; font-size: 16px; line-height: 1.2;">✓</td>
                  <td style="padding-bottom: 12px; font-size: 13px; color: #C5BCB3; line-height: 1.5;">
                    <strong style="color: #FFFFFF;">VIP Guest Staging:</strong> Receive confirmed bookings from verified Founding Circle members with automated concierge check-in.
                  </td>
                </tr>
                <tr>
                  <td width="28" valign="top" style="color: #4ADE80; font-size: 16px; line-height: 1.2;">✓</td>
                  <td style="font-size: 13px; color: #C5BCB3; line-height: 1.5;">
                    <strong style="color: #FFFFFF;">Automated Payouts:</strong> Direct remittances straight to your verified M-Pesa or Bank Account upon guest arrival.
                  </td>
                </tr>
              </table>

              <!-- Direct Link Fallback -->
              <p style="font-size: 12px; color: #6D635B; line-height: 1.5; margin: 0 0 24px; word-break: break-all;">
                If the button above does not work, paste this activation URL into your browser:<br>
                <a href="${activationUrl}" style="color: #B28756;">${activationUrl}</a>
              </p>

              <p style="font-size: 13px; color: #8F847C; line-height: 1.6; margin: 0;">
                Welcome to our family of elite property partners,<br>
                <strong style="color: #EDE8E3;">Ronald Otieno</strong><br>
                Founder &amp; Managing Director<br>
                <span style="color: #D4AF37;">Luxea Living Kenya</span>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background: #0E0A07; border-top: 1px solid rgba(178, 135, 86, 0.15); text-align: center;">
              <div style="font-size: 11px; color: #6D635B; line-height: 1.6;">
                Luxea Living Residences • Nairobi, Ruaka, Westlands, Diani Beach, Karen<br>
                Official inquiries: concierge@luxealiving.co.ke • <a href="${APP_BASE_URL}" style="color: #B28756; text-decoration: none;">luxealiving.co.ke</a>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
          `;

          const approvedRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: SENDER_EMAIL,
              to: [hostEmail],
              subject: `🎉 Verification Approved! Activate Your Luxea Host Account [${refId}]`,
              html: approvedHtml,
            }),
          });

          const approvedResult = await approvedRes.json();
          results.push({ recipient: hostEmail, type: 'host_approved', resend: approvedResult });
          console.log(`✅ Host approved email sent to ${hostEmail}:`, approvedResult);
        }
      }
    }

    // =========================================================================
    // 3. VIP FOUNDING CIRCLE GUEST WELCOME & DIGITAL PASS
    // =========================================================================
    if (emailType === 'guest_welcome' || emailType === 'waitlist_welcome' || emailType === 'member_welcome') {
      const guestEmail = record.email;
      const guestName = record.full_name || record.fullName || 'Valued Member';
      const passNumber = record.pass_number || record.passNumber || 'LX-2026-FOUNDING';
      const passCode = record.pass_code || record.passCode || 'LUXEA-VIP';
      const destinations = record.preferred_destinations || record.preferredDestinations || 'Ruaka, Westlands, Diani Coast, Karen';
      const tier = record.tier || 'Founding Circle';

      if (guestEmail) {
        if (isDuplicate('guest_welcome', guestEmail)) {
          console.log(`⏳ Debounced duplicate guest_welcome send for ${guestEmail}`);
          results.push({ recipient: guestEmail, type: 'guest_welcome', status: 'debounced_duplicate' });
        } else {
          const guestHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<title>Welcome to the Luxea Living Founding Circle</title>
</head>
<body style="margin: 0; padding: 0; background-color: #0B0806; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #EDE8E3;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #0B0806; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #130E0A; border: 1px solid rgba(178, 135, 86, 0.3); border-radius: 12px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.6);">
          
          <!-- Header Banner -->
          <tr>
            <td style="padding: 36px 40px 24px; text-align: center; border-bottom: 1px solid rgba(178, 135, 86, 0.15); background: linear-gradient(180deg, rgba(178, 135, 86, 0.08) 0%, rgba(19, 14, 10, 0) 100%);">
              <div style="font-size: 22px; letter-spacing: 5px; font-weight: 700; color: #D4AF37; margin-bottom: 6px;">LUXEA LIVING</div>
              <div style="font-size: 11px; letter-spacing: 2px; color: #A0958C; text-transform: uppercase;">Curated Residences • Founding Circle VIP</div>
            </td>
          </tr>

          <!-- Main Content -->
          <tr>
            <td style="padding: 36px 40px;">
              <div style="display: inline-block; background: rgba(178, 135, 86, 0.15); border: 1px solid rgba(178, 135, 86, 0.4); border-radius: 20px; padding: 4px 14px; font-size: 12px; color: #D4AF37; font-weight: 600; letter-spacing: 1px; margin-bottom: 16px;">
                ${tier.toUpperCase()} MEMBERSHIP
              </div>
              <h1 style="font-size: 22px; color: #FFFFFF; font-weight: 600; margin: 0 0 16px; line-height: 1.3;">
                Welcome to the Circle, ${guestName}
              </h1>
              <p style="font-size: 14px; line-height: 1.7; color: #C5BCB3; margin: 0 0 24px;">
                You are now officially inducted into Kenya's premier curated residences collective. Your digital membership credentials have been minted and linked to your profile:
              </p>

              <!-- VIP Digital Pass Card -->
              <table width="100%" cellpadding="0" cellspacing="0" style="background: linear-gradient(135deg, #1B1510 0%, #0E0A07 100%); border: 1px solid #B28756; border-radius: 10px; margin-bottom: 28px; box-shadow: inset 0 1px 0 rgba(212, 175, 55, 0.3);">
                <tr>
                  <td style="padding: 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0">
                      <tr>
                        <td>
                          <div style="font-size: 10px; letter-spacing: 2px; color: #A0958C; text-transform: uppercase;">VIP Membership Pass</div>
                          <div style="font-size: 22px; color: #D4AF37; font-family: monospace; font-weight: 700; letter-spacing: 1.5px; margin-top: 4px;">
                            ${passNumber}
                          </div>
                        </td>
                        <td align="right" valign="top">
                          <span style="font-size: 11px; background: rgba(212, 175, 55, 0.15); border: 1px solid #D4AF37; color: #D4AF37; padding: 3px 10px; border-radius: 4px; font-weight: 600;">
                            ACTIVE
                          </span>
                        </td>
                      </tr>
                      <tr>
                        <td colspan="2" style="padding-top: 20px; border-top: 1px dashed rgba(178, 135, 86, 0.2); margin-top: 16px;">
                          <table width="100%" cellpadding="0" cellspacing="0">
                            <tr>
                              <td>
                                <div style="font-size: 10px; color: #8F847C; text-transform: uppercase;">Pass Code</div>
                                <div style="font-size: 13px; color: #EDE8E3; font-family: monospace; font-weight: 600; margin-top: 2px;">${passCode}</div>
                              </td>
                              <td align="right">
                                <div style="font-size: 10px; color: #8F847C; text-transform: uppercase;">Tier</div>
                                <div style="font-size: 13px; color: #D4AF37; font-weight: 600; margin-top: 2px;">${tier}</div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>

              <!-- Exclusive Founding Privileges -->
              <div style="font-size: 12px; color: #D4AF37; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 700; margin-bottom: 14px;">
                Your Exclusive Privileges
              </div>
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 28px;">
                <tr>
                  <td width="28" valign="top" style="color: #D4AF37; font-size: 16px; line-height: 1.2;">✦</td>
                  <td style="padding-bottom: 12px; font-size: 13px; color: #C5BCB3; line-height: 1.5;">
                    <strong style="color: #FFFFFF;">Priority Reservation Rights:</strong> Instant first-access booking across Ruaka penthouses, Westlands sky duplexes, Diani oceanfront infinity villas, and Karen sanctuaries.
                  </td>
                </tr>
                <tr>
                  <td width="28" valign="top" style="color: #D4AF37; font-size: 16px; line-height: 1.2;">✦</td>
                  <td style="padding-bottom: 12px; font-size: 13px; color: #C5BCB3; line-height: 1.5;">
                    <strong style="color: #FFFFFF;">Bespoke Concierge Staging:</strong> Complimentary private airport transfers, high-speed fiber guarantee, and pre-stocked artisanal refreshments upon arrival.
                  </td>
                </tr>
                <tr>
                  <td width="28" valign="top" style="color: #D4AF37; font-size: 16px; line-height: 1.2;">✦</td>
                  <td style="font-size: 13px; color: #C5BCB3; line-height: 1.5;">
                    <strong style="color: #FFFFFF;">Preferred Pricing &amp; Extended Stays:</strong> Founding rates locked for your first 12 months with flexible cancellation terms.
                  </td>
                </tr>
              </table>

              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 30px;">
                <tr>
                  <td align="center">
                    <a href="${APP_BASE_URL}/stays/" style="display: inline-block; background: #B28756; color: #0B0806; font-weight: 700; font-size: 13px; text-decoration: none; padding: 14px 32px; border-radius: 8px; letter-spacing: 0.5px;">
                      Explore Curated Stays Catalog ↗
                    </a>
                  </td>
                </tr>
              </table>

              <p style="font-size: 13px; color: #8F847C; line-height: 1.6; margin: 0;">
                Warmest regards,<br>
                <strong style="color: #EDE8E3;">The Founding Concierge</strong><br>
                <span style="color: #D4AF37;">Luxea Living Kenya</span>
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 40px; background: #0E0A07; border-top: 1px solid rgba(178, 135, 86, 0.15); text-align: center;">
              <div style="font-size: 11px; color: #6D635B; line-height: 1.6;">
                Luxea Living Residences • Nairobi, Ruaka, Westlands, Diani Beach, Karen<br>
                Direct Concierge: concierge@luxealiving.co.ke • <a href="${APP_BASE_URL}" style="color: #B28756; text-decoration: none;">luxealiving.co.ke</a>
              </div>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
          `;

          const guestRes = await fetch('https://api.resend.com/emails', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${RESEND_API_KEY}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              from: SENDER_EMAIL,
              to: [guestEmail],
              subject: `Welcome to the Founding Circle — Your Luxea Living Pass [${passNumber}]`,
              html: guestHtml,
            }),
          });

          const guestResult = await guestRes.json();
          results.push({ recipient: guestEmail, type: 'guest_welcome', resend: guestResult });
          console.log(`✅ Guest welcome sent to ${guestEmail}:`, guestResult);
        }
      }

      // Alert Admin (Ronald)
      try {
        await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${RESEND_API_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            from: SENDER_EMAIL,
            to: [ADMIN_EMAIL],
            subject: `✨ New VIP Founding Member: ${guestName} (${passNumber})`,
            html: `
              <div style="font-family: sans-serif; background: #0B0806; color: #EDE8E3; padding: 24px; border-radius: 8px;">
                <h2 style="color: #D4AF37; margin: 0 0 12px;">New Founding Circle Induction</h2>
                <p><strong>Guest:</strong> ${guestName} (&lt;${guestEmail}&gt;)</p>
                <p><strong>Pass Number:</strong> ${passNumber}</p>
                <p><strong>Pass Code:</strong> ${passCode}</p>
                <p><strong>Preferred Hubs:</strong> ${destinations}</p>
                <div style="margin-top: 18px;">
                  <a href="${APP_BASE_URL}/admin/" style="background: #B28756; color: #000; padding: 10px 18px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 13px;">
                    View Waitlist in Super Admin ↗
                  </a>
                </div>
              </div>
            `,
          }),
        });
      } catch (adminErr) {
        console.warn('Admin alert error:', adminErr);
      }
    }

    return new Response(JSON.stringify({ success: true, dispatched: results.length, results }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });
  } catch (err) {
    console.error('Mailer engine exception:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
