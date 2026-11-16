import dotenv from 'dotenv';
dotenv.config();

const ref = 'gaxfqcietzoonlmatiot';
const url = `https://${ref}.supabase.co`;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

async function checkPublishStatus() {
  const query = async (filter) => {
    const res = await fetch(`${url}/rest/v1/listings?select=id&${filter}&limit=1`, {
      headers: {
        'apikey': anonKey,
        'Authorization': `Bearer ${anonKey}`,
        'Range': '0-0',
        'Prefer': 'count=exact'
      }
    });
    return { status: res.status, range: res.headers.get('content-range'), txt: await res.text() };
  };

  console.log('Total listings (no filter):', await query(''));
  console.log('status=eq.active:', await query('status=eq.active'));
  console.log('publish_status=eq.PUBLISHABLE:', await query('publish_status=eq.PUBLISHABLE'));
  console.log('status=eq.active & publish_status=eq.PUBLISHABLE:', await query('status=eq.active&publish_status=eq.PUBLISHABLE'));
  console.log('publish_status values:', await (async () => {
    const res = await fetch(`${url}/rest/v1/listings?select=publish_status,status&limit=20`, {
      headers: { 'apikey': anonKey, 'Authorization': `Bearer ${anonKey}` }
    });
    return res.json();
  })());
}

checkPublishStatus().catch(console.error);
