export async function triggerNewListingNotification(data: {
  id: string;
  title: string;
  price: number;
  compound: string;
}) {
  const url = process.env.N8N_WEBHOOK_URL;
  if (!url) {
    console.warn('[n8n] N8N_WEBHOOK_URL is not configured, skipping listing notification');
    return;
  }
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      console.error(`[n8n] Failed to trigger notification webhook: ${res.statusText}`);
    }
  } catch (err) {
    console.error('[n8n] Error triggering notification webhook:', err);
  }
}
