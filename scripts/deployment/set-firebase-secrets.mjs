import fs from 'fs';
import { execSync } from 'child_process';

const REPO = 'sierrablue8866-droid/SE-Vercel-deploy-main';
const saPath = 'f:/Downloads/sierra-blu-firebase-adminsdk-fbsvc-14c3290902.json';

const saRaw = fs.readFileSync(saPath, 'utf8');
const saJson = JSON.parse(saRaw);
const saMinified = JSON.stringify(saJson);

console.log('Target Repo:', REPO);
console.log('Project ID:', saJson.project_id);
console.log('Client Email:', saJson.client_email);

function setSecret(name, value) {
  try {
    execSync(`gh secret set ${name} -R ${REPO}`, {
      input: value,
      stdio: ['pipe', 'inherit', 'inherit']
    });
    console.log(`✅ GitHub Secret set: ${name}`);
  } catch (err) {
    console.error(`❌ Failed to set secret ${name}:`, err.message);
  }
}

function setVariable(name, value) {
  try {
    execSync(`gh variable set ${name} -R ${REPO}`, {
      input: value,
      stdio: ['pipe', 'inherit', 'inherit']
    });
    console.log(`✅ GitHub Variable set: ${name}`);
  } catch (err) {
    console.error(`❌ Failed to set variable ${name}:`, err.message);
  }
}

// Set GitHub Secrets
setSecret('FIREBASE_SERVICE_ACCOUNT_SIERRA_BLU', saMinified);
setSecret('FIREBASE_SERVICE_ACCOUNT_JSON', saMinified);
setSecret('FIREBASE_PRIVATE_KEY', saJson.private_key);
setSecret('FIREBASE_CLIENT_EMAIL', saJson.client_email);
setSecret('FIREBASE_PROJECT_ID', saJson.project_id);

// Set GitHub Variables (for workflows reading from vars)
setVariable('FIREBASE_PROJECT_ID', saJson.project_id);
setVariable('FIREBASE_CLIENT_EMAIL', saJson.client_email);
setVariable('NEXT_PUBLIC_FIREBASE_PROJECT_ID', saJson.project_id);
setVariable('NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN', `${saJson.project_id}.firebaseapp.com`);
setVariable('NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET', `${saJson.project_id}.firebasestorage.app`);

console.log('\n🎉 Finished configuring GitHub Secrets and Variables!');
