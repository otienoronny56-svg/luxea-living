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

async function deployFunction() {
  const functionFile = path.resolve(process.cwd(), 'supabase/functions/luxea-mailer/index.ts');
  const code = fs.readFileSync(functionFile, 'utf8');

  console.log(`🚀 Deploying Edge Function [luxea-mailer] to Supabase project [${PROJECT_REF}]...`);

  // First try PATCH to update existing function
  let res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/functions/luxea-mailer`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${ACCESS_TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      body: code,
      verify_jwt: false
    })
  });

  if (res.status === 404) {
    // If not found, create it with POST
    res = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/functions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        slug: 'luxea-mailer',
        name: 'luxea-mailer',
        body: code,
        verify_jwt: false
      })
    });
  }

  const data = await res.json();
  if (res.ok) {
    console.log('✅ Edge function [luxea-mailer] deployed successfully!');
    console.log(`Version: ${data.version}, Status: ${data.status}`);
  } else {
    console.error(`❌ Deployment failed (${res.status}):`, data);
  }
}

deployFunction().catch(console.error);
