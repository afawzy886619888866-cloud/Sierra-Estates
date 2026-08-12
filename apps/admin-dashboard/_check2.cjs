const admin = require("firebase-admin");
const sa = require("H:/SE/sierra-blu-firebase-adminsdk-fbsvc-a65328d3ae.json");
admin.initializeApp({ credential: admin.credential.cert(sa) });
(async () => {
  const db = admin.firestore();
  const snap = await db.collection("listings").where("status","==","active").get();
  console.log("active docs:", snap.size);
  snap.docs.forEach(d => { const x = d.data(); console.log(d.id, "created_at:", x.created_at ? typeof x.created_at : "MISSING", "| compound:", x.compound_name); });
})().catch(e => { console.error("ERR", e.message); });
