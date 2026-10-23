import puppeteer from 'puppeteer';

/**
 * 02-owner-search
 * 
 * Scrapes direct-owner properties from Property Finder/OLX.
 */

export async function runOwnerSearch(platform: 'propertyfinder' | 'olx', query: string) {
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
            const title = card.querySelector('.card-title')?.textContent?.trim() || '';
            const price = card.querySelector('.card-price')?.textContent?.replace(/\D/g, '') || '0';
            const location = card.querySelector('.card-location')?.textContent?.trim() || '';
            const broker = card.querySelector('.broker-name')?.textContent?.trim() || '';
            const url = card.querySelector('a')?.href || '';
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
  } catch (error: any) {
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


