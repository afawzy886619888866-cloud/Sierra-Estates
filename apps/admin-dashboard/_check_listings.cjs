const admin = require("firebase-admin");
const sa = require("H:/SE/sierra-blu-firebase-adminsdk-fbsvc-a65328d3ae.json");
admin.initializeApp({ credential: admin.credential.cert(sa) });
(async () => {
  const db = admin.firestore();
  const snap = await db.collection("listings").limit(300).get();
  console.log("total sampled:", snap.size);
  const counts = {};
  snap.docs.forEach(d => { const s = d.data().status; counts[s] = (counts[s]||0)+1; });
  console.log("status counts:", JSON.stringify(counts));
  if (snap.size) console.log("sample doc keys:", Object.keys(snap.docs[0].data()).sort().join(", "));
  const cols = await db.listCollections();
  console.log("root collections:", cols.map(c => c.id).join(", "));
})().catch(e => { console.error("ERR", e.message); process.exit(1); });
