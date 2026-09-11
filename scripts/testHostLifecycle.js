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

async function testLifecycle() {
  console.log('🧪 Testing Host 2-Stage Verification Lifecycle...');

  const testRef = 'LXH-2026-TEST-' + Math.floor(100 + Math.random() * 900);
  const testEmail = 'otienoronny56@gmail.com';

  // 1. Stage 1: Host Registers (Waiting for Verification)
  console.log('\n--- 1. Submitting Host Application (Stage 1: Waiting Verification) ---');
  const insertQuery = `
    INSERT INTO public.lux_hosts (
      ref_id, full_name, national_id, phone, email, kra_pin, dob,
      property_name, property_type, property_address, county, area_suburb,
      bedrooms, bathrooms, max_guests, payout_method, mpesa_name, mpesa_number,
      signature, signature_date, review_status, internal_notes
    ) VALUES (
      '${testRef}',
      'Dr. Ronald Otieno',
      '29841029',
      '+254 722 000 222',
      '${testEmail}',
      'A009182736K',
      '1988-04-12',
      'The Azure Skyline Glass Penthouse',
      'Penthouse',
      '15th Floor, Azure Towers, Westlands',
      'Nairobi',
      'Westlands',
      3, 3, 6,
      'M-Pesa',
      'Ronald Otieno',
      '0722000222',
      'Ronald Otieno',
      CURRENT_DATE,
      'pending_review',
      'Test host application for verification workflow'
    ) RETURNING *;
  `;

  const insertRes = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: insertQuery })
  });

  const insertData = await insertRes.json();
  console.log('Host created with status: pending_review');

  console.log('Waiting 3 seconds for Stage 1 email dispatch...');
  await new Promise(r => setTimeout(r, 3000));

  // 2. Stage 2: Admin Approves Host
  console.log('\n--- 2. Super Admin Approves Host Application (Stage 2: Approved & Activation) ---');
  const updateQuery = `
    UPDATE public.lux_hosts
    SET review_status = 'approved', updated_at = NOW()
    WHERE ref_id = '${testRef}'
    RETURNING *;
  `;

  const updateRes = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${ACCESS_TOKEN}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: updateQuery })
  });

  const updateData = await updateRes.json();
  console.log('Host status updated to: approved');

  console.log('Waiting 3 seconds for Stage 2 approval email dispatch...');
  await new Promise(r => setTimeout(r, 3000));

  // 3. Verify in Resend API
  console.log('\n--- 3. Verifying Dispatched Emails in Resend ---');
  const resendRes = await fetch('https://api.resend.com/emails?limit=6', {
    headers: { 'Authorization': `Bearer ${RESEND_KEY}` }
  });
  const resendData = await resendRes.json();

  console.log('Latest Emails Dispatched:');
  resendData.data.slice(0, 4).forEach(e => {
    console.log(`- [${e.created_at}] To: ${e.to.join(', ')} | Subject: ${e.subject}`);
  });

  console.log(`\n✅ Host Activation URL for this host:\nhttps://luxealiving.co.ke/host/activate/?ref=${testRef}&email=${testEmail}`);
}

testLifecycle().catch(console.error);
