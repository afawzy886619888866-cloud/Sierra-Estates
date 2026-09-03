 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }




















export class PropertyFinderService {
  
   __init() {this.apiBase = '/api/property-finder'}

   constructor() {;PropertyFinderService.prototype.__init.call(this);}

   static getInstance() {
    if (!PropertyFinderService.instance) {
      PropertyFinderService.instance = new PropertyFinderService();
    }
    return PropertyFinderService.instance;
  }

  /**
   * Fetch the latest listings from the internal gateway.
   */
   async fetchListings(filters = { status: 'published' }) {
    const params = new URLSearchParams({ action: 'search-listings' });
    Object.entries(filters).forEach(([key, value]) => params.set(key, String(value)));

    const response = await fetch(`${this.apiBase}?${params.toString()}`, {
      method: 'GET',
      cache: 'no-store',
    });

    const result = await response.json() ;
    if (!response.ok || result.error) {
      throw new Error(result.error || 'Property Finder listing sync failed.');
    }

    return result.data || [];
  }

  /**
   * Trigger a lead sync from Property Finder into the CRM.
   */
   async syncIncomingLeads() {
    const response = await fetch(`${this.apiBase}?action=sync-leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    const result = await response.json() ;
    if (!response.ok || !result.success || !result.summary) {
      throw new Error(result.error || 'Property Finder lead sync failed.');
    }

    return result.summary;
  }

  /**
   * Publish a local Sierra Estates unit to Property Finder through the server API.
   */
   async publishToPF(listingId) {
    const response = await fetch(`${this.apiBase}?action=publish-unit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ unitId: listingId }),
    });

    const result = await response.json() ;
    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Property Finder publish failed.');
    }

    return {
      success: true,
      externalId: _optionalChain([result, 'access', _ => _.result, 'optionalAccess', _2 => _2.reference]) || _optionalChain([result, 'access', _3 => _3.result, 'optionalAccess', _4 => _4.id]),
    };
  }
}

export const pfService = PropertyFinderService.getInstance();
