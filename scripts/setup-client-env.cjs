const fs = require('fs');
const sa = fs.readFileSync('scripts/firebase-sa-key.json', 'utf8');
const envContent = `NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBZLN2jTTKV34SneGPoWRz1zoRpX5uODjs
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=sierra-blu.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=sierra-blu
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=sierra-blu.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=941030513456
NEXT_PUBLIC_FIREBASE_APP_ID=1:941030513456:web:56209a1495d69f217086f5
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-ZP054BPJ8Q

FIREBASE_PROJECT_ID=sierra-blu
FIREBASE_SERVICE_ACCOUNT_JSON='${JSON.stringify(JSON.parse(sa))}'
`;
fs.writeFileSync('apps/sierra-estates-realty/.env.local', envContent);
console.log('.env.local created successfully.');
