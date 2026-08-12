// Stub for firebase-admin to prevent Metadata errors during build
module.exports = {
  credential: { cert: () => ({}) },
  initializeApp: () => ({}),
  app: () => ({}),
  auth: () => ({}),
  firestore: () => ({}),
  appCheck: () => ({}),
  storage: () => ({}),
  apps: []
};
