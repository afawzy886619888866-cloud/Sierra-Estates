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
    console.log('⏳ Waiting for DOM to settle...');
    await new Promise(r => setTimeout(r, 6000));

    const photosDir = path.join(__dirname, 'extracted_photos');
    if (!fs.existsSync(photosDir)) fs.mkdirSync(photosDir, { recursive: true });

    const KNOWN_GROUPS = [
      'Owners August 2026',
      'Owners Units',
      'New units from owner',
      'Group Data Owner',
      'Owners Project inventory',
      'Owners Inventory project'
    ];

    console.log(`🎯 Searching for ${KNOWN_GROUPS.length} Owner / Inventory groups in WhatsApp Web...`);

    const extractedUnits = [];

    // DOM-based high reliability search & extract
    const page = client.pupPage;

    // Scroll chat list to populate all groups
    await page.evaluate(async () => {
      const pane = document.querySelector('#pane-side') || document.querySelector('div[role="grid"]');
      if (pane) {
        for (let i = 0; i < 5; i++) {
          pane.scrollTop = i * 400;
          await new Promise(r => setTimeout(r, 600));
        }
        pane.scrollTop = 0;
      }
    });

    // Extract list of all visible chats in sidebar
    const sidebarChats = await page.evaluate(() => {
      const spans = document.querySelectorAll('#pane-side span[title], div[role="grid"] span[title]');
      const names = [];
      spans.forEach(s => {
        const t = s.getAttribute('title') || s.innerText;
        if (t && t.trim().length > 0) names.push(t.trim());
      });
      return [...new Set(names)];
    });

    console.log(`📋 Found ${sidebarChats.length} chats in active sidebar.`);

    // Find all groups matching keywords or exact names
    const targetGroupNames = sidebarChats.filter(name => {
      const low = name.toLowerCase();
      return (
        KNOWN_GROUPS.some(kg => kg.toLowerCase() === low || low.includes(kg.toLowerCase())) ||
        low.includes('owner') ||
        low.includes('unit') ||
        low.includes('inventory') ||
        name.includes('أغسطس') ||
        name.includes('ملاك') ||
        name.includes('شقق')
      );
    });

    // If none found in initial scroll, search for each known group directly
    const finalGroupList = targetGroupNames.length > 0 ? targetGroupNames : KNOWN_GROUPS;

    console.log(`\n🔍 Scanning ${finalGroupList.length} groups:`);
    finalGroupList.forEach((name, i) => console.log(`   ${i + 1}. "${name}"`));

    for (const groupName of finalGroupList) {
      console.log(`\n======================================================`);
      console.log(`📥 Ingesting Group: "${groupName}"`);
      console.log(`======================================================`);

      try {
        // Search and click chat in WhatsApp Web UI
        const clicked = await page.evaluate(async (searchTitle) => {
          // Find direct title span
          const allSpans = Array.from(document.querySelectorAll('span[title]'));
          let target = allSpans.find(s => (s.getAttribute('title') || '').toLowerCase().includes(searchTitle.toLowerCase()));
          
          if (!target) {
            // Try searching via search box
            const searchInput = document.querySelector('div[contenteditable="true"][data-tab="3"]') || document.querySelector('input[type="text"]');
            if (searchInput) {
              searchInput.focus();
              document.execCommand('insertText', false, searchTitle);
              await new Promise(r => setTimeout(r, 1200));
              const results = Array.from(document.querySelectorAll('span[title]'));
              target = results.find(s => (s.getAttribute('title') || '').toLowerCase().includes(searchTitle.toLowerCase()));
            }
          }

          if (target) {
            target.closest('div[role="listitem"], div[role="row"], div[tabindex="-1"]')?.click();
            return true;
          }
          return false;
        }, groupName);

        if (!clicked) {
          console.log(`   ⚠️ Group "${groupName}" not currently visible in sidebar. Checking next...`);
          continue;
        }

        // Wait for chat panel to open and load messages
        await new Promise(r => setTimeout(r, 2500));

        // Scroll up in conversation to load previous history
        await page.evaluate(async () => {
          const msgContainer = document.querySelector('div[data-tab="8"]') || document.querySelector('div[role="application"]');
          if (msgContainer) {
            for (let s = 0; s < 4; s++) {
              msgContainer.scrollTop = 0;
              await new Promise(r => setTimeout(r, 800));
            }
          }
        });

        // Extract message bubbles from active chat window
        const groupMessages = await page.evaluate(() => {
          const rows = document.querySelectorAll('div[data-id]');
          const messages = [];
          
          rows.forEach(r => {
            const dataId = r.getAttribute('data-id') || '';
            const textEl = r.querySelector('.selectable-text, span.selectable-text, div[data-pre-plain-text]');
            const text = textEl ? textEl.innerText.trim() : '';
            
            // Extract timestamp & sender if available
            const prePlainText = r.querySelector('div[data-pre-plain-text]')?.getAttribute('data-pre-plain-text') || '';
            // Example prePlainText: "[1:47 PM, 8/22/2026] +20 100 123 4567: "
            let sender = 'Owner';
            let timeStr = new Date().toLocaleTimeString();
            if (prePlainText) {
              const match = prePlainText.match(/\[(.*?)\]\s*(.*?):/);
              if (match) {
                timeStr = match[1];
                sender = match[2];
              }
            }

            // Check for image
            const imgEl = r.querySelector('img[src^="blob:"], img[src^="data:"], img[src*="whatsapp"]');
            const hasImage = Boolean(imgEl);
            let imgSrc = imgEl ? imgEl.src : null;

            if (text || hasImage) {
              messages.push({
                dataId,
                text,
                sender,
                timeStr,
                hasImage,
                imgSrc
              });
            }
          });

          return messages;
        });

        console.log(`   Extracted ${groupMessages.length} total messages from "${groupName}".`);

        let countAdded = 0;

        for (let i = 0; i < groupMessages.length; i++) {
          const gm = groupMessages[i];
          const text = gm.text || '';

          // Determine date
          const dateAdded = new Date().toISOString();
          const dateFormatted = `${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })} (${gm.timeStr})`;

          let localPhotoPath = null;
          if (gm.hasImage && gm.imgSrc && gm.imgSrc.startsWith('data:image')) {
            try {
              const base64Data = gm.imgSrc.replace(/^data:image\/\w+;base64,/, '');
              const filename = `unit_${groupName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}_${i}.jpg`;
              const fullPath = path.join(photosDir, filename);
              fs.writeFileSync(fullPath, Buffer.from(base64Data, 'base64'));
              localPhotoPath = `packages/whatsapp-agent/extracted_photos/${filename}`;
            } catch (e) {}
          }

          const isListing = (
            text.includes('متاح') ||
            text.includes('ايجار') ||
            text.includes('إيجار') ||
            text.includes('للبيع') ||
            text.includes('شقه') ||
            text.includes('شقة') ||
            text.includes('فيلا') ||
            text.includes('مدينتي') ||
            text.includes('التجمع') ||
            text.includes('الرحاب') ||
            text.includes('مفروش') ||
            text.includes('بحديقة') ||
            text.includes('فيو') ||
            text.includes('دور') ||
            text.includes('مطلوب') ||
            text.includes('Rent') ||
            text.includes('Sale') ||
            text.includes('EGP') ||
            text.includes('الف') ||
            text.includes('ألف') ||
            gm.hasImage
          );

          if (isListing && (text.length > 5 || gm.hasImage)) {
            countAdded++;
            extractedUnits.push({
              id: gm.dataId || `unit_${Date.now()}_${i}`,
              groupName: groupName,
              dateAdded: dateAdded,
              dateFormatted: dateFormatted,
              sender: gm.sender,
              text: text,
              photoPath: localPhotoPath,
              hasPhoto: gm.hasImage
            });
          }
        }

        console.log(`   ✅ Extracted ${countAdded} verified property units from "${groupName}".`);

      } catch (groupErr) {
        console.warn(`   ⚠️ Processing warning for "${groupName}":`, groupErr.message);
      }
    }

    // Save JSON output
    const outputFile = path.join(__dirname, 'inventory_extracted_units.json');
    fs.writeFileSync(outputFile, JSON.stringify(extractedUnits, null, 2), 'utf8');

    // Save Markdown report for root documentation
    const mdReportFile = path.join(__dirname, '../../INVENTORY_WHATSAPP_REPORT.md');
    let md = `# Sierra Estates — WhatsApp Groups Inventory Extraction Report\n\n`;
    md += `**Extraction Date:** ${new Date().toISOString()}\n`;
    md += `**Total Extracted Units:** ${extractedUnits.length}\n`;
    md += `**Target Groups:** ${finalGroupList.join(', ')}\n\n`;
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
