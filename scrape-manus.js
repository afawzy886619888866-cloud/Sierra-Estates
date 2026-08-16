const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

async function scrapeManus() {
  const url = 'https://manus.im/share/WQttB5fXatzf3ZG3sjdVUt';
  console.log(`🚀 Launching headless browser to extract: ${url}`);

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
  });

  const page = await browser.newPage();
  await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');
  await page.setViewport({ width: 1280, height: 900 });

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
  } catch (e) {
    console.log('Navigation timeout/warning:', e.message);
  }

  await new Promise(r => setTimeout(r, 6000));

  const data = await page.evaluate(() => {
    const title = document.title;
    const bodyText = document.body.innerText;
    
    // Find all message bubbles / markdown elements
    const elements = Array.from(document.querySelectorAll('p, h1, h2, h3, h4, li, table, tr, th, td, pre, code, blockquote, [class*="message"], [class*="content"]'));
    const uniqueTexts = [];
    const seen = new Set();

    for (const el of elements) {
      const txt = (el.innerText || '').trim();
      if (txt.length > 5 && !seen.has(txt)) {
        seen.add(txt);
        uniqueTexts.push(txt);
      }
    }

    return {
      title,
      bodyText,
      uniqueTexts
    };
  });

  const outputPath = 'C:/Users/sierr/.gemini/antigravity-ide/brain/f2cd9555-4313-49d8-b991-a690ca6d6bd2/scratch/manus_full_content.md';
  let md = `# ${data.title}\n\n## Body Text\n\n${data.bodyText}\n\n## Extracted Text Blocks\n\n${data.uniqueTexts.join('\n\n---\n\n')}`;
  fs.writeFileSync(outputPath, md, 'utf8');

  console.log(`✅ Extracted Manus session to ${outputPath} (${data.bodyText.length} chars)`);
  await browser.close();
}

scrapeManus().catch(err => {
  console.error('❌ Error scraping Manus:', err);
  process.exit(1);
});
