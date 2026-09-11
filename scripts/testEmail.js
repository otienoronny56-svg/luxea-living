const fs = require('fs');
const path = require('path');

// Load .env
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const [k, ...v] = line.trim().split('=');
    if (k && v.length) process.env[k.trim()] = v.join('=').trim();
  }
}

const key = process.env.RESEND_API_KEY;

async function sendTest() {
  console.log('Sending test email via Resend for luxealiving.co.ke...');
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + key,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      from: 'LUXEA LIVING Concierge <concierge@luxealiving.co.ke>',
      to: ['otienoronny56@gmail.com'],
      subject: '✨ Luxea Living Email Engine — Operational Verification',
      html: `
        <div style="font-family: Georgia, serif; background-color: #0B0806; color: #EDE8E3; padding: 40px 20px; text-align: center;">
          <div style="max-width: 540px; margin: 0 auto; background-color: #140F0B; border: 1px solid #B28756; border-radius: 12px; padding: 36px; text-align: left;">
            <div style="text-align: center; margin-bottom: 24px;">
              <span style="letter-spacing: 4px; font-size: 20px; font-weight: 700; color: #D4AF37;">LUXEA LIVING</span>
              <div style="font-size: 11px; letter-spacing: 2px; color: #8F847C; margin-top: 4px; text-transform: uppercase;">Curated Residences • Kenya</div>
            </div>
            <h2 style="color: #FFFFFF; font-size: 20px; margin-bottom: 12px;">Executive Communication Engine Verified</h2>
            <p style="color: #C5BCB3; line-height: 1.6; font-size: 14px;">
              Hello Ronald,
            </p>
            <p style="color: #C5BCB3; line-height: 1.6; font-size: 14px;">
              The custom domain <strong style="color: #D4AF37;">luxealiving.co.ke</strong> is officially connected to our automated communications pipeline.
            </p>
            <div style="background: rgba(178, 135, 86, 0.1); border-left: 3px solid #D4AF37; padding: 14px; margin: 20px 0; border-radius: 4px;">
              <div style="font-size: 12px; color: #D4AF37; font-weight: bold; text-transform: uppercase;">Active Capabilities</div>
              <ul style="margin: 8px 0 0 18px; padding: 0; font-size: 13px; color: #E0D7D0; line-height: 1.6;">
                <li>Host Partner onboarding &amp; inspection scheduling</li>
                <li>VIP Founding Circle guest welcome &amp; digital pass delivery</li>
                <li>Realtime executive alerts for Super Admin</li>
              </ul>
            </div>
            <p style="color: #8F847C; font-size: 12px; border-top: 1px solid rgba(178,135,86,0.2); padding-top: 18px; margin-top: 24px;">
              Luxea Living Executive Suite • Nairobi, Kenya<br>
              Direct Concierge: concierge@luxealiving.co.ke
            </p>
          </div>
        </div>
      `
    })
  });

  const data = await res.json();
  console.log('Status:', res.status);
  console.log('Resend Response:', data);
}

sendTest().catch(console.error);
