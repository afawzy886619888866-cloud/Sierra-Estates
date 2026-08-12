import { execSync } from 'child_process';
import readline from 'readline';
import fs from 'fs';
import path from 'path';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const question = (query) => new Promise((resolve) => rl.question(query, resolve));

function logBanner() {
  console.log('\x1b[36m%s\x1b[0m', '==========================================================');
  console.log('\x1b[36m%s\x1b[0m', '    🪐 SIERRA ESTATES 2027 PRODUCTION SETUP & DEPLOY ENGINE');
  console.log('\x1b[36m%s\x1b[0m', '==========================================================');
  console.log('');
}

async function run() {
  logBanner();

  try {
    // 1. Check Firebase CLI
    console.log('\x1b[33m%s\x1b[0m', '[1/4] Verifying Firebase CLI & Credentials...');
    try {
      execSync('firebase --version', { stdio: 'ignore' });
      console.log('✅ Firebase CLI detected.');
    } catch {
      console.error('❌ Firebase CLI is not installed or not in PATH. Please run: npm install -g firebase-tools');
      rl.close();
      return;
    }

    // Check Firebase project
    let currentProject = '';
    try {
      const activeProjectInfo = execSync('firebase project:active', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
      currentProject = activeProjectInfo;
      console.log(`📡 Current active Firebase project: \x1b[32m${currentProject}\x1b[0m`);
    } catch {
      console.log('⚠️ Could not fetch active project. Attempting to list projects...');
    }

    const deployRules = await question('❓ Deploy Firestore and Storage security rules to this project? (y/n): ');
    if (deployRules.toLowerCase() === 'y') {
      console.log('🚀 Running firebase deploy for security rules...');
      try {
        execSync('firebase deploy --only firestore:rules,storage', { stdio: 'inherit' });
        console.log('✅ Security rules deployed successfully.');
      } catch (err) {
        console.error('❌ Failed to deploy security rules. Make sure you are logged in using `firebase login`.');
      }
    }

    // 2. Check Vercel CLI & Environment Secrets Setup
    console.log('\x1b[33m%s\x1b[0m', '\n[2/4] Syncing Environment Secrets with Vercel...');
    const hasVercel = (() => {
      try {
        execSync('vercel --version', { stdio: 'ignore' });
        return true;
      } catch {
        return false;
      }
    })();

    if (hasVercel) {
      console.log('✅ Vercel CLI detected.');
      const syncVercel = await question('❓ Would you like to upload your local .env keys to Vercel? (y/n): ');
      if (syncVercel.toLowerCase() === 'y') {
        const envFilePath = path.join(process.cwd(), '.env');
        if (fs.existsSync(envFilePath)) {
          console.log('Parsing .env file...');
          const envContent = fs.readFileSync(envFilePath, 'utf8');
          const lines = envContent.split('\n');
          
          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
              const [key, ...valueParts] = trimmed.split('=');
              const val = valueParts.join('=').replace(/(^["']|["']$)/g, ''); // strip quotes
              
              if (val && !val.includes('your_') && !val.includes('appXXXX')) {
                console.log(`📤 Pushing ${key} to Vercel Production...`);
                try {
                  // vercel env add [name] [environment]
                  execSync(`echo "${val}" | vercel env add ${key} production --force`, { stdio: 'ignore' });
                } catch (err) {
                  console.error(`❌ Failed to push ${key}: ${err.message}`);
                }
              }
            }
          }
          console.log('✅ Vercel environment variables populated.');
        } else {
          console.log('⚠️ No root .env file found to sync.');
        }
      }
    } else {
      console.log('ℹ️ Vercel CLI not detected. Please upload environment secrets manually in the Vercel dashboard.');
    }

    // 3. Bootstrapping Admin User account
    console.log('\x1b[33m%s\x1b[0m', '\n[3/4] Bootstrapping Initial Admin User...');
    const bootstrapUser = await question('❓ Would you like to bootstrap the first Admin user account? (y/n): ');
    
    if (bootstrapUser.toLowerCase() === 'y') {
      const email = await question('Email address for the Admin user: ');
      const password = await question('Password (min 6 characters): ');
      const displayName = await question('Display Name: ');
      const cronSecret = await question('CRON_SECRET (defined in your env): ');
      const appUrl = await question('Target App URL (default: http://localhost:3000): ') || 'http://localhost:3000';

      console.log('📡 Dispatching admin bootstrap payload...');
      try {
        const response = await fetch(`${appUrl.replace(/\/$/, '')}/api/seed/admin-setup`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${cronSecret}`
          },
          body: JSON.stringify({ email, password, displayName })
        });

        const data = await response.json();
        if (response.ok && data.success) {
          console.log('\x1b[32m%s\x1b[0m', `✅ Admin User bootstrapped successfully! UID: ${data.uid}`);
        } else {
          console.error(`❌ Bootstrapping failed: ${data.error || response.statusText}`);
        }
      } catch (err) {
        console.error('❌ Failed to connect to the Admin setup API route. Ensure your dev/production server is running first.', err.message);
      }
    }

    // 4. Verification Gate
    console.log('\x1b[33m%s\x1b[0m', '\n[4/4] Verifying Build Quality & Test Integrity...');
    const verifyBuild = await question('❓ Run full build and test checks now? (y/n): ');
    if (verifyBuild.toLowerCase() === 'y') {
      console.log('Running test suite and type-checks...');
      try {
        execSync('pnpm validate', { stdio: 'inherit' });
        console.log('\x1b[32m%s\x1b[0m', '✅ All tests passed! Production build is green.');
      } catch {
        console.error('❌ Build validation checks failed. Please fix syntax or type errors before deploying.');
      }
    }

  } catch (err) {
    console.error('Unexpected error during setup:', err);
  } finally {
    rl.close();
    console.log('\n\x1b[36m%s\x1b[0m', '==========================================================');
    console.log('\x1b[36m%s\x1b[0m', ' 🎉 SETUP ENGINE OPERATIONS COMPLETED.');
    console.log('\x1b[36m%s\x1b[0m', '==========================================================');
  }
}

run();
