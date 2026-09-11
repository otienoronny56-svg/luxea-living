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

const PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'abzcabiqdkmfaijnqbkf';
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
const RESEND_KEY = process.env.RESEND_API_KEY;

async function testPending() {
  console.log('🧪 Inserting a Pending Host to verify Admin Email & Blinking UI indicator...');

  const testRef = 'LXH-2026-AUDIT-' + Math.floor(100 + Math.random() * 900);
  const testEmail = 'evans.kipchoge.host@gmail.com';

  const insertQuery = `
    INSERT INTO public.lux_hosts (
      ref_id, full_name, national_id, phone, email, kra_pin, dob,
      property_name, property_type, property_address, county, area_suburb,
      bedrooms, bathrooms, max_guests, payout_method, mpesa_name, mpesa_number,
      signature, signature_date, review_status, internal_notes
    ) VALUES (
      '${testRef}',
      'Evans Kipchoge',
      '27491024',
      '+254 712 890 345',
      '${testEmail}',
      'A008291048M',
      '1985-07-20',
      'The Acacia Grove Karen Sanctuary',
      'Townhouse',
      'Acacia Drive, Plot 7, Karen',
      'Nairobi',
      'Karen',
      3, 3, 6,
      'M-Pesa',
      'Evans Kipchoge',
      '0712890345',
      'Evans Kipchoge',
      CURRENT_DATE,
      'pending_review',
      'Awaiting curatorial inspection and WiFi speed audit'
    ) RETURNING *;
  `;

  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: insertQuery })
  });

  const data = await res.json();
  console.log('Host created with review_status: pending_review');

  console.log('Waiting 3 seconds for Admin email dispatch...');
  await new Promise(r => setTimeout(r, 3000));

  // Check Resend logs
  const resendRes = await fetch('https://api.resend.com/emails?limit=3', {
    headers: { 'Authorization': `Bearer ${RESEND_KEY}` }
  });
  const resendData = await resendRes.json();

  console.log('\nLatest Resend Emails:');
  resendData.data.forEach(e => {
    console.log(`- [${e.created_at}] To: ${e.to.join(', ')} | Subject: ${e.subject}`);
  });

  console.log(`\n✅ Host Dossier Page: http://localhost:3000/admin/host-dossier.html?ref=${testRef}`);
  console.log(`✅ Super Admin Dashboard: http://localhost:3000/admin/`);
}

testPending().catch(console.error);
