import express from 'express';
import { verifyIdToken } from './firebaseAdmin.js';

const app = express();
app.use(express.json());

let pfToken: string | null = null;
let pfTokenExpiresAt: number = 0;

async function getPFToken(): Promise<string> {
  if (pfToken && Date.now() < pfTokenExpiresAt) {
    return pfToken;
  }

  const apiKey = process.env.PF_API_KEY;
  const apiSecret = process.env.PF_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error('PF_API_KEY and PF_API_SECRET are not set.');
  }

  const reqBody = { apiKey, apiSecret };

  const res = await fetch('https://atlas.propertyfinder.com/v1/auth/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(reqBody)
  });

  if (!res.ok) {
    const txt = await res.text();
    console.error('PF Token failure:', txt);
    throw new Error(`Failed to get Property Finder token. Status: ${res.status}`);
  }

  const data = await res.json();
  pfToken = data.accessToken;
  // Expire 1 minute early to be safe
  pfTokenExpiresAt = Date.now() + ((data.expiresIn - 60) * 1000);
  
  return pfToken as string;
}

// API Health Check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok" });
});

// Admin auth verification endpoint
// Validates Bearer token from Firebase Auth and checks admin status
const ADMIN_EMAILS = [
  'a.fawzy8866@gmail.com',
  'A.fawzy8866@gmail.com',
  'emeraldestatesegypt@gmail.com',
  'Emeraldestatesegypt@gmail.com',
];

app.get("/api/admin/auth/verify", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ isAdmin: false, error: 'Missing or invalid authorization header' });
    }

    const token = authHeader.split('Bearer ')[1];
    if (!token) {
      return res.status(401).json({ isAdmin: false, error: 'No token provided' });
    }

    // Verify the Firebase Auth ID token's signature + expiry server-side
    // (via firebase-admin) instead of trusting an unverified JWT payload.
    const decoded = await verifyIdToken(token);
    if (!decoded) {
      return res.status(401).json({ isAdmin: false, error: 'Token verification failed' });
    }
    const email = decoded.email || '';
    const isAdmin = !!decoded.email_verified && ADMIN_EMAILS.some(
      (adminEmail) => adminEmail.toLowerCase() === email.toLowerCase()
    );
    return res.json({ isAdmin, email });
  } catch (e: any) {
    console.error('Auth verify error:', e);
    return res.status(500).json({ isAdmin: false, error: e.message });
  }
});

// Example proxy for getting leads from Property Finder
app.get("/api/pf/leads", async (req, res) => {
  try {
    const token = await getPFToken();
    const qParams = new URLSearchParams(req.query as Record<string, string>);
    
    const upstreamRes = await fetch(`https://atlas.propertyfinder.com/v1/leads?${qParams.toString()}`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await upstreamRes.json();
    res.status(upstreamRes.status).json(data);
  } catch (e: any) {
    console.error('PF Leads Error:', e);
    res.status(500).json({ error: e.message });
  }
});

// Proxy for listings
app.get("/api/pf/listings", async (req, res) => {
  try {
    const token = await getPFToken();
    const qParams = new URLSearchParams(req.query as Record<string, string>);
    
    const upstreamRes = await fetch(`https://atlas.propertyfinder.com/v1/listings?${qParams.toString()}`, {
      headers: {
        'Accept': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = await upstreamRes.json();
    res.status(upstreamRes.status).json(data);
  } catch (e: any) {
    console.error('PF Listings Error:', e);
    res.status(500).json({ error: e.message });
  }
});

export default app;
