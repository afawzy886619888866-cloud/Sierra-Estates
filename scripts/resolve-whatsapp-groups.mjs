import makeWASocket, { useMultiFileAuthState } from '@whiskeysockets/baileys';
import pino from 'pino';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AUTH_DIR = path.resolve(__dirname, '../infra/whatsapp-scraper/auth');

async function main() {
  console.log('--- CONNECTING WITH AUTHENTICATED SESSION ---');
  const { state, saveCreds } = await useMultiFileAuthState(AUTH_DIR);

  const sock = makeWASocket({
    auth: state,
    logger: pino({ level: 'silent' }),
    printQRInTerminal: false,
  });

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection } = update;
    if (connection === 'open') {
      console.log('✅ Connection open! Resolving groups...\n');

      const links = [
        { code: 'IFPUZu1JApd81EfIvF8vhG', url: 'https://chat.whatsapp.com/IFPUZu1JApd81EfIvF8vhG' },
        { code: 'LLqvqmrJvd64arhloTyh0I', url: 'https://chat.whatsapp.com/LLqvqmrJvd64arhloTyh0I' }
      ];

      for (const item of links) {
        console.log(`Checking link: ${item.url} (code: ${item.code})`);
        try {
          const info = await sock.groupGetInviteInfo(item.code);
          console.log(`  Group Name: "${info.subject}"`);
          console.log(`  Group JID:  ${info.id}`);
          console.log(`  Owner:      ${info.owner}`);
          console.log(`  Members:    ${info.size} participants`);
          console.log(`  Created:    ${new Date(info.creation * 1000).toISOString()}`);
          console.log(`  Description:${info.desc ? info.desc.slice(0, 100) : 'None'}`);

          // Try to join if not member
          try {
            const joinRes = await sock.groupAcceptInvite(item.code);
            console.log(`  Join Status: Success (JID: ${joinRes})`);
          } catch (joinErr) {
            console.log(`  Join Status: ${joinErr.message || joinErr}`);
          }
        } catch (err) {
          console.error(`  Error querying invite ${item.code}:`, err.message);
        }
        console.log('');
      }

      // Also list all groups currently participating in
      try {
        const groups = await sock.groupFetchAllParticipating();
        console.log(`Total Participating Groups on this WhatsApp account: ${Object.keys(groups).length}`);
        for (const [jid, g] of Object.entries(groups)) {
          if (g.subject.toLowerCase().includes('owner') || g.subject.toLowerCase().includes('august') || g.subject.includes('ملاك') || g.subject.includes('مالك')) {
            console.log(`  • [${g.subject}] (${jid}) - ${g.participants.length} participants`);
          }
        }
      } catch (err) {
        console.warn('Could not fetch participating groups:', err.message);
      }

      setTimeout(() => process.exit(0), 3000);
    }
  });
}

main().catch(console.error);
