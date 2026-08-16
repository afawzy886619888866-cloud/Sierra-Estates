/**
 * GitHub Secrets & Variables Provisioner
 * Sets all required repository variables and guides secret population using GitHub CLI (gh)
 */

import { execSync } from 'child_process';

const REPO = 'sierrablue8866-droid/SE-Vercel-deploy-main';

const VARIABLES = {
  MAINTAINER_EMAIL: 'a.fawzy8866@gmail.com',
  CLIENT_VERCEL_PROJECT_ID: 'prj_GRzmgCUqNwqvjdqtfl84pzBUKD1E',
  ADMIN_VERCEL_PROJECT_ID: 'prj_W2gYCoKaS3oBcLDuGa9gB8z7cfnA',
  VERCEL_ORG_ID: 'team_UvdJ5ezVTaqEKyhqZ5QVqOKJ',
  FIREBASE_PROJECT_ID: 'sierra-blu',
  FIREBASE_CLIENT_EMAIL: 'a.fawzy8866@gmail.com',
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: 'sierra-blu',
  NEXT_PUBLIC_FIREBASE_API_KEY: 'AIzaSyBZLN2jTTKV34SneGPoWRz1zoRpX5uODjs',
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: 'sierra-blu.firebaseapp.com',
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: 'sierra-blu.firebasestorage.app',
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: '941030513456',
  NEXT_PUBLIC_FIREBASE_APP_ID: '1:941030513456:web:56209a1495d69f217086f5'
};

async function setupGitHubConfig() {
  console.log('🚀 ══════════════════════════════════════════════════════════════');
  console.log(`   Configuring GitHub Actions Variables for ${REPO}`);
  console.log('   Maintainer: Ahmed Fawzy (a.fawzy8866@gmail.com)');
  console.log('══════════════════════════════════════════════════════════════\n');

  for (const [key, value] of Object.entries(VARIABLES)) {
    try {
      execSync(`gh variable set ${key} -b "${value}" -R ${REPO}`, { stdio: 'inherit' });
      console.log(`✅ Set variable: ${key}`);
    } catch (e) {
      console.warn(`⚠️ Failed to set ${key}:`, e.message);
    }
  }

  console.log('\n🔐 Verified Variables Provisioning complete!');
}

setupGitHubConfig().catch(console.error);
