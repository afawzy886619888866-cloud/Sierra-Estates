/* ═══════════════════════════════════════════════════════════════════════════
 * Sierra Estates — Firebase configuration
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  HOW TO FILL THIS IN
 *  1. https://console.firebase.google.com → your project (sierra-blu-2026)
 *  2. Project settings → General → "Your apps" → Web app → SDK setup & config
 *  3. Copy the config values below
 *  4. Firestore Database → Create database (production mode, region europe-west)
 *  5. Rules → paste the block at the bottom of this file → Publish
 *  6. Set SIERRA_FIREBASE_ENABLED = true
 *
 *  The web API key is NOT a secret — it identifies the project, it does not
 *  grant access. Access is governed by the Firestore rules. Never put a service
 *  account key in front-end code.
 *
 *  While ENABLED is false the site writes leads and listing submissions to
 *  localStorage only, and the admin on the same origin reads them from there.
 *  Nothing breaks; nothing is fetched.
 * ═══════════════════════════════════════════════════════════════════════════ */

window.SIERRA_FIREBASE_CONFIG = {
  apiKey:            "PASTE-WEB-API-KEY",
  authDomain:        "sierra-blu-2026.firebaseapp.com",
  projectId:         "sierra-blu-2026",
  storageBucket:     "sierra-blu-2026.appspot.com",
  messagingSenderId: "PASTE-SENDER-ID",
  appId:             "PASTE-APP-ID"
};

window.SIERRA_FIREBASE_ENABLED = false;

/*  Firestore rules — the public site may CREATE leads and listing submissions
    but never read them back; only signed-in staff can read or change anything.

    rules_version = '2';
    service cloud.firestore {
      match /databases/{database}/documents {
        match /leads/{doc} {
          allow create: if request.resource.data.keys().hasAll(['name','phone','ts'])
                        && request.resource.data.name is string
                        && request.resource.data.name.size() > 1
                        && request.resource.data.phone is string
                        && request.resource.data.phone.size() > 7;
          allow read, update, delete: if request.auth != null;
        }
        match /listing_submissions/{doc} {
          allow create: if request.resource.data.keys().hasAll(['compound','ts']);
          allow read, update, delete: if request.auth != null;
        }
        match /{document=**} { allow read, write: if request.auth != null; }
      }
    }
*/
