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

async function testAutomation() {
  console.log('🧪 Testing End-to-End Guest Registration & Email Automation...');

  const passNum = 'LX-2026-AUTO-' + Math.floor(100 + Math.random() * 900);
  const passCode = 'AUTO-' + Math.floor(1000 + Math.random() * 9000);

  const query = `
    INSERT INTO public.lux_waitlist (
      pass_number, pass_code, full_name, email, phone, preferred_destinations, tier, status
    ) VALUES (
      '${passNum}',
      '${passCode}',
      'Ronald Otieno (Automation Test)',
      'otienoronny56@gmail.com',
      '+254 722 000 111',
      'Ruaka, Westlands, Diani Beach',
      'Founding Circle',
      'active'
    ) RETURNING *;
  `;

  const res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query })
  });

  const data = await res.json();
  console.log('Database Insert Result:', data);

  console.log('Waiting 3 seconds for async trigger / webhook execution...');
  await new Promise(r => setTimeout(r, 3000));
  console.log('✅ Automated test cycle complete!');
}

testAutomation().catch(console.error);
