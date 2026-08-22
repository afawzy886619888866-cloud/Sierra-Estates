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

console.log('🚀 Starting Sierra Estates WhatsApp Group Extractor...');

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
      '--disable-extensions',
      '--disable-blink-features=AutomationControlled',
      '--window-size=1280,800',
      '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36'
    ],
  },
});

client.on('loading_screen', (percent, message) => {
  console.log(`⏳ Loading WhatsApp: ${percent}% — ${message}`);
});

client.on('authenticated', () => {
  console.log('✅ WhatsApp authenticated! Session verified.');
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
    console.log('⏳ Waiting for DOM to populate...');
    await new Promise(r => setTimeout(r, 6000));

    const photosDir = path.join(__dirname, 'extracted_photos');
    if (!fs.existsSync(photosDir)) fs.mkdirSync(photosDir, { recursive: true });

    const page = client.pupPage;

    // Scroll chat sidebar to trigger lazy loading of group titles
    await page.evaluate(async () => {
      const pane = document.querySelector('#pane-side') || document.querySelector('div[role="grid"]');
      if (pane) {
        for (let i = 0; i < 6; i++) {
          pane.scrollTop = i * 350;
          await new Promise(r => setTimeout(r, 500));
        }
        pane.scrollTop = 0;
      }
    });

    const chats = await page.evaluate(() => {
      const spans = Array.from(document.querySelectorAll('#pane-side span[title], div[role="grid"] span[title]'));
      const names = [];
      spans.forEach(s => {
        const title = s.getAttribute('title') || s.innerText;
        if (title && title.trim().length > 0) names.push(title.trim());
      });
      return [...new Set(names)];
    });

    console.log(`📋 Found ${chats.length} chats in active WhatsApp sidebar:`);
    chats.forEach((c, idx) => console.log(`   ${idx + 1}. "${c}"`));

    const TARGET_KEYWORDS = ['owner', 'unit', 'inventory', 'أغسطس', 'ملاك', 'شقق', 'عقارات', 'مشروع', 'متاح'];
    const matchedGroups = chats.filter(c => {
      const low = c.toLowerCase();
      return TARGET_KEYWORDS.some(k => low.includes(k) || c.includes(k));
    });

    const finalGroups = matchedGroups.length > 0 ? matchedGroups : chats.slice(0, 8);
    console.log(`\n🎯 Ingesting ${finalGroups.length} Target Groups for Inventory...`);

    const extractedUnits = [];

    for (const groupName of finalGroups) {
      console.log(`\n======================================================`);
      console.log(`📥 Opening Group: "${groupName}"`);
      console.log(`======================================================`);

      const opened = await page.evaluate(async (gname) => {
        const allSpans = Array.from(document.querySelectorAll('span[title]'));
        const target = allSpans.find(s => (s.getAttribute('title') || '').trim() === gname);
        if (target) {
          const row = target.closest('div[role="listitem"], div[role="row"], div[tabindex="-1"], div._ak8q');
          if (row) {
            row.click();
            return true;
          }
        }
        return false;
      }, groupName);

      if (!opened) {
        console.log(`   ⚠️ Could not click group row for "${groupName}". Skipping.`);
        continue;
      }

      await new Promise(r => setTimeout(r, 3000));

      // Scroll up to load previous messages
      await page.evaluate(async () => {
        const app = document.querySelector('div[role="application"]') || document.querySelector('div[data-tab="8"]');
        if (app) {
          for (let k = 0; k < 5; k++) {
            app.scrollTop = 0;
            await new Promise(r => setTimeout(r, 600));
          }
        }
      });

      // Extract all message elements from DOM
      const messages = await page.evaluate(() => {
        const bubbles = document.querySelectorAll('div[data-id], div.message-in, div.message-out');
        const list = [];

        bubbles.forEach(b => {
          const dataId = b.getAttribute('data-id') || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
          const textEl = b.querySelector('.selectable-text, span.selectable-text, div._akbu');
          const text = textEl ? textEl.innerText.trim() : '';

          const preText = b.querySelector('div[data-pre-plain-text]')?.getAttribute('data-pre-plain-text') || '';
          let sender = 'Owner / Broker';
          let time = '';
          if (preText) {
            const m = preText.match(/\[(.*?)\]\s*(.*?):/);
            if (m) {
              time = m[1];
              sender = m[2].trim();
            }
          }

          const img = b.querySelector('img[src^="blob:"], img[src^="data:"], img[src*="whatsapp"]');
          const imgSrc = img ? img.src : null;

          if (text || imgSrc) {
            list.push({ dataId, text, sender, time, imgSrc, hasImg: Boolean(imgSrc) });
          }
        });

        return list;
      });

      console.log(`   Extracted ${messages.length} messages from "${groupName}".`);

      let groupCount = 0;
      for (let i = 0; i < messages.length; i++) {
        const m = messages[i];
        const text = m.text || '';

        const dateAdded = new Date().toISOString();
        const dateFormatted = m.time ? `${m.time}` : new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

        let localPhoto = null;
        if (m.hasImg && m.imgSrc && m.imgSrc.startsWith('data:image')) {
          try {
            const base64 = m.imgSrc.replace(/^data:image\/\w+;base64,/, '');
            const fname = `unit_${groupName.replace(/[^a-zA-Z0-9]/g, '_')}_${Date.now()}_${i}.jpg`;
            const fpath = path.join(photosDir, fname);
            fs.writeFileSync(fpath, Buffer.from(base64, 'base64'));
            localPhoto = `packages/whatsapp-agent/extracted_photos/${fname}`;
          } catch (e) {}
        }

        const isUnit = (
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
          m.hasImg
        );

        if (isUnit && (text.length > 5 || m.hasImg)) {
          groupCount++;
          extractedUnits.push({
            id: m.dataId,
            groupName: groupName,
            dateAdded: dateAdded,
            dateFormatted: dateFormatted,
            sender: m.sender,
            text: text,
            photoPath: localPhoto,
            hasPhoto: m.hasImg
          });
        }
      }

      console.log(`   ✅ Filtered ${groupCount} property units from "${groupName}".`);
    }

    // Write database files
    const outputFile = path.join(__dirname, 'inventory_extracted_units.json');
    fs.writeFileSync(outputFile, JSON.stringify(extractedUnits, null, 2), 'utf8');

    const listingManagerFile = path.join(__dirname, 'data/listings.json');
    fs.mkdirSync(path.dirname(listingManagerFile), { recursive: true });
    fs.writeFileSync(listingManagerFile, JSON.stringify(extractedUnits, null, 2), 'utf8');

    // Generate markdown report
    const mdReportFile = path.join(__dirname, '../../INVENTORY_WHATSAPP_REPORT.md');
    let md = `# Sierra Estates — WhatsApp Groups Inventory Extraction Report\n\n`;
    md += `**Extraction Completed At:** ${new Date().toISOString()}\n`;
    md += `**Total Extracted Units:** ${extractedUnits.length}\n`;
    md += `**Scanned Groups:** ${finalGroups.join(', ')}\n\n`;
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
    console.log(`   JSON Output:           ${outputFile}`);
    console.log(`   Markdown Report:       ${mdReportFile}`);
    console.log(`════════════════════════════════════════════════\n`);

    setTimeout(() => {
      process.exit(0);
    }, 2000);

  } catch (err) {
    console.error('❌ Extraction error:', err);
    process.exit(1);
  }
});

client.initialize();
