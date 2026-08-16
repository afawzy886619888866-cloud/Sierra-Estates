import puppeteer from 'puppeteer';

const browser = await puppeteer.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });
try {
  const page = await browser.newPage();
  const runtimeErrors = [];
  page.on('pageerror', (error) => runtimeErrors.push(String(error)));
  page.on('console', (message) => { if (message.type() === 'error') runtimeErrors.push(message.text()); });
  await page.setViewport({ width: 390, height: 844, isMobile: true, hasTouch: true, deviceScaleFactor: 1 });
  await page.goto('http://127.0.0.1:3100/ar/cairo-plaza/overview', { waitUntil: 'networkidle0' });
  const result = await page.evaluate(() => ({
    viewport: { width: window.innerWidth, height: window.innerHeight },
    calculatorDir: document.querySelector('.cp-calculator')?.getAttribute('dir'),
    inputCount: document.querySelectorAll('.cp-calculator input').length,
    mobileColumns: getComputedStyle(document.querySelector('.cp-calc-layout')).gridTemplateColumns,
    inputWidth: document.querySelector('.cp-calculator input')?.getBoundingClientRect().width,
    overflow: document.documentElement.scrollWidth > document.documentElement.clientWidth,
  }));
  const inputs = await page.$$('.cp-calculator input');
  await inputs[2].evaluate((node) => { window.__calculatorEvents = 0; node.addEventListener('input', () => { window.__calculatorEvents += 1; }); });
  await inputs[2].click();
  await page.keyboard.down('Control');
  await page.keyboard.press('A');
  await page.keyboard.up('Control');
  await inputs[2].type('100000');
  await new Promise((resolve) => setTimeout(resolve, 500));
  result.afterInputValue = await inputs[2].evaluate((node) => node.value);
  result.nativeInputEvents = await page.evaluate(() => window.__calculatorEvents);
  result.afterFill = await page.$eval('.cp-calc-results', (node) => node.textContent);
  result.recalculated = result.afterFill.includes('950') || result.afterFill.includes('٩٥٠');
  result.runtimeErrors = runtimeErrors;
  console.log(JSON.stringify(result, null, 2));
} finally {
  await browser.close();
}
