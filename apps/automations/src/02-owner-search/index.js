 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import puppeteer from 'puppeteer';

/**
 * 02-owner-search
 * 
 * Scrapes direct-owner properties from Property Finder/OLX.
 */

export async function runOwnerSearch(platform, query) {
  console.log(`[Owner Search] Starting search on ${platform} for query: "${query}"`);
  
  try {
    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    // Set a realistic user agent
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    
    const leads = [];
    
    if (platform === 'propertyfinder') {
      const searchUrl = `https://www.propertyfinder.eg/en/search?c=1&q=${encodeURIComponent(query)}&ob=nd`;
      await page.goto(searchUrl, { waitUntil: 'networkidle2' });
      
      // Wait for listings to load (adjust selector based on actual DOM)
      // This is a basic mock scaffolding for the DOM traversal
      try {
        await page.waitForSelector('.card-list', { timeout: 5000 });
        
        const listings = await page.$$eval('.card-list .card', (cards) => {
          return cards.map(card => {
            const title = _optionalChain([card, 'access', _ => _.querySelector, 'call', _2 => _2('.card-title'), 'optionalAccess', _3 => _3.textContent, 'optionalAccess', _4 => _4.trim, 'call', _5 => _5()]) || '';
            const price = _optionalChain([card, 'access', _6 => _6.querySelector, 'call', _7 => _7('.card-price'), 'optionalAccess', _8 => _8.textContent, 'optionalAccess', _9 => _9.replace, 'call', _10 => _10(/\D/g, '')]) || '0';
            const location = _optionalChain([card, 'access', _11 => _11.querySelector, 'call', _12 => _12('.card-location'), 'optionalAccess', _13 => _13.textContent, 'optionalAccess', _14 => _14.trim, 'call', _15 => _15()]) || '';
            const broker = _optionalChain([card, 'access', _16 => _16.querySelector, 'call', _17 => _17('.broker-name'), 'optionalAccess', _18 => _18.textContent, 'optionalAccess', _19 => _19.trim, 'call', _20 => _20()]) || '';
            const url = _optionalChain([card, 'access', _21 => _21.querySelector, 'call', _22 => _22('a'), 'optionalAccess', _23 => _23.href]) || '';
            return { title, price: parseInt(price, 10), location, broker, url };
          });
        });
        
        // Filter out obvious brokerage companies to find direct owners
        // e.g. if 'broker' is empty or contains "owner"
        const potentialDirectOwners = listings.filter(l => 
          !l.broker || l.broker.toLowerCase().includes('owner') || l.broker.toLowerCase().includes('مالك')
        );
        
        leads.push(...potentialDirectOwners);
      } catch (err) {
        console.warn(`[Owner Search] Timeout waiting for listings on ${platform}`);
      }
    } else {
      console.log(`[Owner Search] Platform ${platform} integration pending.`);
    }

    await browser.close();
    
    return {
      success: true,
      leadsFound: leads.length,
      leads,
      timestamp: new Date().toISOString()
    };
  } catch (error) {
    console.error(`[Owner Search] Failed to scrape ${platform}:`, error.message);
    return {
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    };
  }
}

// Allow direct execution
if (require.main === module) {
  runOwnerSearch('propertyfinder', 'mivida').then(res => {
    console.log(JSON.stringify(res, null, 2));
  }).catch(console.error);
}


