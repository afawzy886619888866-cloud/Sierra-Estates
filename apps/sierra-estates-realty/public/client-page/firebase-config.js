/* ═══════════════════════════════════════════════════════════════════════════
 * Sierra Estates — Firebase Client Configuration
 * ═══════════════════════════════════════════════════════════════════════════
 *  Connects the static client portal to the same Firebase / Firestore
 *  project used by the Next.js backend and the admin panel.
 *
 *  Project: sierra-blu (firebase console → sierra-blu)
 *  Domain:  sierra-estates.net
 * ═══════════════════════════════════════════════════════════════════════════ */

window.SIERRA_FIREBASE_CONFIG = {
  apiKey:            "AIzaSyBZLN2jTTKV34SneGPoWRz1zoRpX5uODjs",
  authDomain:        "sierra-blu.firebaseapp.com",
  projectId:         "sierra-blu",
  storageBucket:     "sierra-blu.firebasestorage.app",
  messagingSenderId: "941030513456",
  appId:             "1:941030513456:web:56209a1495d69f217086f5",
  measurementId:     "G-ZP054BPJ8Q"
};

// Flip to true once Firestore rules allow public reads (already configured).
window.SIERRA_FIREBASE_ENABLED = true;
