const { Client, LocalAuth } = require('whatsapp-web.js');
const fs = require('fs');
const path = require('path');

let chromePath = process.env.PUPPETEER_EXECUTABLE_PATH;
if (!chromePath) {
  const candidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
  ];
  for (const c of candidates) {
    if (fs.existsSync(c)) {
      chromePath = c;
      break;
    }
  }
}

console.log('🚀 Initializing Sierra Estates Group Inventory Extractor...');
console.log(`📂 Using session: packages/whatsapp-agent/wa_sessions/session-sierra-vault-session`);

const client = new Client({
  authStrategy: new LocalAuth({
    clientId: 'sierra-vault-session',
    dataPath: path.join(__dirname, 'wa_sessions'),
  }),
  puppeteer: {
    ...(chromePath ? { executablePath: chromePath } : {}),
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--no-first-run',
      '--no-default-browser-check',
      '--disable-extensions'
    ],
  },
});

client.on('authenticated', () => {
  console.log('✅ Session Authenticated successfully!');
});

client.on('auth_failure', (msg) => {
  console.error('❌ Auth failure:', msg);
  process.exit(1);
});

client.on('ready', async () => {
  console.log('\n🟢 ════════════════════════════════════════════════');
  console.log('   WhatsApp Client is READY & Connected!');
  console.log('════════════════════════════════════════════════\n');

  try {
    console.log('⏳ Allowing 10s for WhatsApp DOM chat models to hydrate...');
    await new Promise(r => setTimeout(r, 10000));

    let chats = [];
    for (let attempt = 1; attempt <= 8; attempt++) {
      try {
        chats = await client.getChats();
        if (chats && chats.length > 0) {
          console.log(`✅ Loaded ${chats.length} total chats from WhatsApp!`);
          break;
        }
      } catch (err) {
        console.warn(`⏳ Store sync attempt ${attempt}/8 failed: ${err.message}. Retrying in 4s...`);
        await new Promise(r => setTimeout(r, 4000));
      }
    }

    if (!chats || chats.length === 0) {
      console.error('❌ Could not retrieve chats list.');
      process.exit(1);
    }

    // Filter target groups
    const targetGroups = chats.filter(c => 
      c.isGroup && (
        c.name.toLowerCase().includes('owner') ||
        c.name.toLowerCase().includes('unit') ||
        c.name.toLowerCase().includes('inventory') ||
        c.name.includes('أغسطس') ||
        c.name.includes('ملاك') ||
        c.name.includes('شقق') ||
        c.name.includes('عقارات') ||
        c.name.includes('مشروع')
      )
    );

    console.log(`\n🎯 Found ${targetGroups.length} Matching Owner / Inventory Groups:`);
    targetGroups.forEach((g, i) => {
      console.log(`   ${i + 1}. "${g.name}" (Unread: ${g.unreadCount || 0})`);
    });

    const photosDir = path.join(__dirname, 'extracted_photos');
    if (!fs.existsSync(photosDir)) fs.mkdirSync(photosDir, { recursive: true });

    const extractedUnits = [];

    for (const group of targetGroups) {
      console.log(`\n======================================================`);
      console.log(`📥 Processing Group: "${group.name}"`);
      console.log(`======================================================`);

      let messages = [];
      try {
        messages = await group.fetchMessages({ limit: 300 });
        console.log(`   Fetched ${messages.length} recent messages.`);
      } catch (err) {
        console.warn(`   ⚠️ Fetch error for "${group.name}":`, err.message);
        continue;
      }

      let countInGroup = 0;

      for (const msg of messages) {
        if (!msg.body && !msg.hasMedia) continue;

        let photoPath = null;
        if (msg.hasMedia && (msg.type === 'image' || msg.type === 'document')) {
          try {
            const media = await msg.downloadMedia();
            if (media && media.data) {
              const ext = media.mimetype ? media.mimetype.split('/')[1]?.split(';')[0] || 'jpg' : 'jpg';
              const safeId = msg.id.id.replace(/[^a-zA-Z0-9_-]/g, '');
              const filename = `unit_${safeId}_${Date.now()}.${ext}`;
              const fullPath = path.join(photosDir, filename);
              fs.writeFileSync(fullPath, Buffer.from(media.data, 'base64'));
              photoPath = `packages/whatsapp-agent/extracted_photos/${filename}`;
            }
          } catch (e) {
            // Silently continue on media fetch skip
          }
        }

        const dateAdded = new Date(msg.timestamp * 1000).toISOString();
        const dateFormatted = new Date(msg.timestamp * 1000).toLocaleDateString('en-US', {
          year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
        });

        const body = (msg.body || '').trim();

        // Listing detection heuristics
        const isListing = (
          body.includes('متاح') ||
          body.includes('ايجار') ||
          body.includes('إيجار') ||
          body.includes('للبيع') ||
          body.includes('شقه') ||
          body.includes('شقة') ||
          body.includes('فيلا') ||
          body.includes('دوبلكس') ||
          body.includes('استوديو') ||
          body.includes('مدينتي') ||
          body.includes('التجمع') ||
          body.includes('الرحاب') ||
          body.includes('مفروش') ||
          body.includes('بحديقة') ||
          body.includes('فيو') ||
          body.includes('دور') ||
          body.includes('مطلوب') ||
          body.includes('السعر') ||
          body.includes('بمقدم') ||
          body.includes('اقساط') ||
          body.includes('أقساط') ||
          body.includes('Rent') ||
          body.includes('Sale') ||
          body.includes('Apartment') ||
          body.includes('Villa') ||
          body.includes('EGP') ||
          photoPath !== null
        );

        if (isListing && (body.length > 5 || photoPath)) {
          countInGroup++;
          extractedUnits.push({
            id: msg.id.id,
            groupName: group.name,
            groupId: group.id._serialized,
            dateAdded: dateAdded,
            dateFormatted: dateFormatted,
            timestamp: msg.timestamp,
            sender: msg.author || msg.from,
            text: body,
            photoPath: photoPath,
            hasPhoto: Boolean(photoPath)
          });
        }
      }

      console.log(`   ✅ Extracted ${countInGroup} property listings from "${group.name}".`);
    }

    // Save JSON database
    const outputFile = path.join(__dirname, 'inventory_extracted_units.json');
    fs.writeFileSync(outputFile, JSON.stringify(extractedUnits, null, 2), 'utf8');

    // Save Markdown report
    const mdReportFile = path.join(__dirname, '../../INVENTORY_WHATSAPP_REPORT.md');
    let md = `# Sierra Estates — WhatsApp Groups Inventory Extraction Report\n\n`;
    md += `**Extraction Date:** ${new Date().toISOString()}\n`;
    md += `**Total Extracted Units:** ${extractedUnits.length}\n`;
    md += `**Groups Scanned:** ${targetGroups.map(g => g.name).join(', ')}\n\n`;
    md += `---\n\n`;
    md += `## 📋 Extracted Inventory Units\n\n`;

    extractedUnits.forEach((unit, idx) => {
      md += `### Unit #${idx + 1} · ${unit.groupName}\n`;
      md += `- **Date Added:** \`${unit.dateFormatted}\` (\`${unit.dateAdded}\`)\n`;
      md += `- **Source Group:** \`${unit.groupName}\`\n`;
      md += `- **Sender:** \`${unit.sender}\`\n`;
      md += `- **Photo Attached:** ${unit.hasPhoto ? '📸 Yes' : '❌ No'}\n`;
      if (unit.photoPath) {
        md += `- **Photo Path:** [\`${path.basename(unit.photoPath)}\`](file:///${path.resolve(unit.photoPath).replace(/\\\\/g, '/')})\n`;
      }
      md += `\n**Listing Details:**\n\`\`\`text\n${unit.text || '(Photo attachment only)'}\n\`\`\`\n\n---\n\n`;
    });

    fs.writeFileSync(mdReportFile, md, 'utf8');

    console.log(`\n🎉 ════════════════════════════════════════════════`);
    console.log(`   EXTRACTION COMPLETED SUCCESSFULLY!`);
    console.log(`   Total Units Extracted: ${extractedUnits.length}`);
    console.log(`   JSON Database:         ${outputFile}`);
    console.log(`   Markdown Report:       ${mdReportFile}`);
    console.log(`════════════════════════════════════════════════\n`);

    setTimeout(() => {
      process.exit(0);
    }, 2000);

  } catch (err) {
    console.error('❌ Fatal error during extraction:', err);
    process.exit(1);
  }
});

client.initialize();
