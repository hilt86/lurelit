export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs') return;

  try {
    const crypto = require('crypto');

    let key = process.env.SETUP_SECRET || '';

    if (!key) {
      const { describeStorage, getStorage } = await import('./lib/storage');
      if (describeStorage().kind === 'redis') {
        const storage = getStorage();
        const stored = await storage.get('admin-key');
        if (stored) {
          key = stored;
        } else {
          key = crypto.randomBytes(16).toString('hex');
          await storage.set('admin-key', key);
        }
      } else {
        const fs = require('fs');
        const path = require('path');
        const cwd = String(process.env.PWD || process.env.CWD || '/app');

        const primaryKeyFile = path.join(cwd, '.lurelit-admin-key');
        const fallbackKeyFile = '/tmp/.lurelit-admin-key';

        for (const keyFile of [primaryKeyFile, fallbackKeyFile]) {
          try {
            if (fs.existsSync(keyFile)) {
              key = fs.readFileSync(keyFile, 'utf8').trim();
              break;
            }
          } catch {
            // Can't read this path, try next
          }
        }
        if (!key) {
          key = crypto.randomBytes(16).toString('hex');
          let written = false;
          for (const keyFile of [primaryKeyFile, fallbackKeyFile]) {
            try {
              fs.writeFileSync(keyFile, key, 'utf8');
              written = true;
              break;
            } catch {
              // Can't write to this path, try next
            }
          }
          if (!written) {
            console.warn('  [Lurelit] Could not persist admin key to disk. It will be regenerated on restart.');
          }
        }
      }
    }

    console.log('');
    console.log('  ┌───────────────────────────────────────────────────┐');
    console.log(`  │  Lurelit setup key: ${key}  │`);
    console.log('  │  Use this to access /setup                        │');
    console.log('  └───────────────────────────────────────────────────┘');
    console.log('');
  } catch (e) {
    console.warn('[Lurelit] Instrumentation error:', e);
  }
}
