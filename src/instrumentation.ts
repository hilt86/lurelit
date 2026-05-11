export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  try {
    const fs = require('fs');
    const crypto = require('crypto');
    const path = require('path');

    const keyFile = path.join(process.cwd(), '.lurelit-admin-key');
    let key = process.env.SETUP_SECRET || '';

    if (!key) {
      if (fs.existsSync(keyFile)) {
        key = fs.readFileSync(keyFile, 'utf8').trim();
      }
      if (!key) {
        key = crypto.randomBytes(16).toString('hex');
        fs.writeFileSync(keyFile, key, 'utf8');
      }
    }

    console.log('');
    console.log('  ┌───────────────────────────────────────────────────┐');
    console.log(`  │  Lurelit setup key: ${key}  │`);
    console.log('  │  Use this to access /setup                        │');
    console.log('  └───────────────────────────────────────────────────┘');
    console.log('');
  } catch {
    // Not in Node.js runtime, skip
  }
}
