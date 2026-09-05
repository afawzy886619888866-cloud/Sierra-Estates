 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }





























































class PropertyFinderService {constructor() { PropertyFinderService.prototype.__init.call(this);PropertyFinderService.prototype.__init2.call(this);PropertyFinderService.prototype.__init3.call(this);PropertyFinderService.prototype.__init4.call(this);PropertyFinderService.prototype.__init5.call(this);PropertyFinderService.prototype.__init6.call(this);PropertyFinderService.prototype.__init7.call(this); }
   static  __initStatic() {this.TOKEN_BUFFER_SECONDS = 60}
   static  __initStatic2() {this.MILLISECONDS_PER_SECOND = 1000}
    __init() {this.configuredBaseUrl =
    process.env.PROPERTY_FINDER_API_GATEWAY || 'https://gateway.propertyfinder.com/v2'}
    __init2() {this.clientId = process.env.PROPERTY_FINDER_CLIENT_ID || ''}
    __init3() {this.clientSecret = process.env.PROPERTY_FINDER_CLIENT_SECRET || ''}
    __init4() {this.apiKey = process.env.PROPERTY_FINDER_API_KEY || ''}
    __init5() {this.apiSecret = process.env.PROPERTY_FINDER_API_SECRET || ''}
   __init6() {this.accessToken = null}
   __init7() {this.tokenExpiry = null}

   get usesLegacyCredentials() {
    return !this.clientId && !this.clientSecret && !!this.apiKey && !!this.apiSecret;
  }

   get requestBaseUrl() {
    if (this.usesLegacyCredentials) {
      return this.configuredBaseUrl.replace(/\/v2\/?$/, '/v1');
    }

    return this.configuredBaseUrl.replace(/\/$/, '');
  }

   async getAccessToken() {
    const now = Date.now();

    if (this.accessToken && this.tokenExpiry && now < this.tokenExpiry) {
      return this.accessToken;
    }

    if (!this.usesLegacyCredentials && (!this.clientId || !this.clientSecret)) {
      throw new Error('Property Finder credentials are missing');
    }

    if (this.usesLegacyCredentials && (!this.apiKey || !this.apiSecret)) {
      throw new Error('Property Finder API key credentials are missing');
    }

    const tokenUrl = `${this.requestBaseUrl}/auth/token`;

    const body = this.usesLegacyCredentials
      ? { apiKey: this.apiKey, apiSecret: this.apiSecret }
      : {
          grant_type: 'client_credentials',
          client_id: this.clientId,
          client_secret: this.clientSecret,
        };

    const response = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Property Finder auth failed (${response.status}): ${details}`);
    }

    const payload = (await response.json()) 




;

    this.accessToken = payload.access_token || payload.accessToken || null;
    if (!this.accessToken) {
      throw new Error('Property Finder auth response did not include an access token');
    }

    const expiresIn = _nullishCoalesce(_nullishCoalesce(payload.expires_in, () => ( payload.expiresIn)), () => ( 1800));
    this.tokenExpiry =
      now +
      Math.max(
        expiresIn - PropertyFinderService.TOKEN_BUFFER_SECONDS,
        PropertyFinderService.TOKEN_BUFFER_SECONDS
      ) *
        PropertyFinderService.MILLISECONDS_PER_SECOND;

    return this.accessToken;
  }

   async request(path, options = {}) {
    const token = await this.getAccessToken();
    const response = await fetch(`${this.requestBaseUrl}${path}`, {
      ...options,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...options.headers,
      },
    });

    if (response.status === 204) {
      return null ;
    }

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Property Finder request failed (${response.status}): ${details}`);
    }

    return (await response.json()) ;
  }

  async createLead(input) {
    return this.request('/leads', {
      method: 'POST',
      body: JSON.stringify({
        listing_id: input.propertyId,
        customer: {
          name: input.visitorName,
          email: input.visitorEmail,
          phone: input.visitorPhone,
        },
        message: input.message || '',
        source: 'website',
      }),
    });
  }

  async syncPropertiesForCity(cityId) {
    const query = new URLSearchParams({
      location_id: String(cityId),
      limit: '100',
    });

    const response = await this.request(`/listings?${query.toString()}`);
    return response.data || response.results || [];
  }
} PropertyFinderService.__initStatic(); PropertyFinderService.__initStatic2();

export const propertyFinderService = new PropertyFinderService();
