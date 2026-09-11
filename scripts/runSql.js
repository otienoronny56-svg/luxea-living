/**
 * LUXEA LIVING — SUPABASE SQL MIGRATION RUNNER
 * Executes SQL scripts directly via Supabase Management API using Personal Access Token.
 * Token is read from process.env.SUPABASE_ACCESS_TOKEN or local .env
 */

const fs = require('fs');
const path = require('path');

// Load .env if present
const envPath = path.resolve(process.cwd(), '.env');
if (fs.existsSync(envPath)) {
  const lines = fs.readFileSync(envPath, 'utf8').split('\n');
  for (const line of lines) {
    const [k, ...v] = line.trim().split('=');
    if (k && v.length) process.env[k.trim()] = v.join('=').trim();
  }
}

const PROJECT_REF = 'abzcabiqdkmfaijnqbkf';
const ACCESS_TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

if (!ACCESS_TOKEN) {
  console.error('❌ Missing SUPABASE_ACCESS_TOKEN in environment or .env file');
  process.exit(1);
}

async function runSql(filePath) {
  const targetPath = path.resolve(process.cwd(), filePath || 'sql/01_luxea_supabase_schema.sql');
  if (!fs.existsSync(targetPath)) {
    console.error(`❌ File not found: ${targetPath}`);
    process.exit(1);
  }

  const sqlContent = fs.readFileSync(targetPath, 'utf8');
  console.log(`🚀 Executing ${path.basename(targetPath)} on Supabase project [${PROJECT_REF}]...`);

  try {
    const response = await fetch(`https://api.supabase.com/v1/projects/${PROJECT_REF}/database/query`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${ACCESS_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ query: sqlContent })
    });

    const result = await response.json();

    if (!response.ok) {
      console.error(`❌ Supabase API error (${response.status}):`, result);
      process.exit(1);
    }

    console.log('✅ SQL executed successfully!');
    if (result && Array.isArray(result)) {
      console.log(`📊 Output: ${result.length} statement(s) executed.`);
    } else {
      console.log('📊 Result:', result);
    }
  } catch (err) {
    console.error('❌ Network / Execution exception:', err);
    process.exit(1);
  }
}

const fileArg = process.argv[2] || 'sql/01_luxea_supabase_schema.sql';
runSql(fileArg);
