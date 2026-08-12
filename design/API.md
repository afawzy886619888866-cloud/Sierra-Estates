# Sierra 2027 — API Documentation

**Base URL:** `https://sierra-estates.vercel.app` (Production)  
**Authentication:** `Authorization: Bearer {firebase_token}` + `X-SBR-SECRET-KEY` header  
**Response Format:** JSON

---

## Admin Endpoints

### Ingest Properties from Google Sheets
```
POST /api/admin/ingest
Content-Type: application/json
X-SBR-SECRET-KEY: {secret}

{
  "properties": [
    {
      "compound": "Mountain View Desert",
      "bua": 250,
      "floorLevel": "3",
      "unitNumber": "301",
      "bedrooms": 3,
      "furnished": "F",
      "price": 850000
    }
  ]
}

Response (200):
{
  "success": true,
  "ingested": 45,
  "deduplicated": 3,
  "totalProcessed": 48
}
```

### Run Data Migrations
```
POST /api/admin/migrate
Authorization: Bearer {admin_token}

{
  "action": "run",
  "dryRun": false
}

Response (200):
{
  "success": true,
  "migrationsRun": 5,
  "recordsAffected": 1245
}
```

### Generate Business Reports
```
GET /api/admin/reports?period=month&type=revenue
Authorization: Bearer {admin_token}

Response (200):
{
  "period": "May 2026",
  "totalDeals": 12,
  "grossVolume": 8500000,
  "closureRate": 0.75,
  "avgDealSize": 708333
}
```

### Upload Media Assets
```
POST /api/admin/media/upload
Authorization: Bearer {admin_token}
Content-Type: multipart/form-data

FormData:
  file: <binary>
  fileName: "property-photo.jpg"
  propertyId: "mvd-3f-85k"

Response (200):
{
  "success": true,
  "url": "https://firebase-bucket.firebasestorage.app/property-photo.jpg",
  "fileName": "property-photo.jpg"
}
```

---

## Property Endpoints

### Get All Listings
```
GET /api/listings?type=resale&status=available&limit=20&offset=0
X-SBR-SECRET-KEY: {secret}

Response (200):
{
  "data": [
    {
      "id": "doc-123",
      "sbrCode": "MVD-3F-85K",
      "compound": "Mountain View Desert",
      "price": 850000,
      "specs": {
        "bedrooms": 3,
        "bathrooms": 2,
        "squareMeters": 250,
        "furnished": "furnished"
      },
      "location": {
        "lat": 30.0131,
        "lng": 31.4453
      },
      "status": "Available"
    }
  ],
  "total": 245,
  "hasMore": true
}
```

### Search Properties by Criteria
```
POST /api/listings/search
X-SBR-SECRET-KEY: {secret}

{
  "compound": "Mountain View Desert",
  "minPrice": 500000,
  "maxPrice": 1500000,
  "minBedrooms": 2,
  "maxBedrooms": 4,
  "furnished": "furnished",
  "radius": 5
}

Response (200):
{
  "results": [ /* matching properties */ ],
  "count": 18,
  "query": { /* echo of search params */ }
}
```

### Get Property Details
```
GET /api/properties/mvd-3f-85k
X-SBR-SECRET-KEY: {secret}

Response (200):
{
  "id": "doc-123",
  "sbrCode": "MVD-3F-85K",
  "compound": "Mountain View Desert",
  "name": "MVD-3F-85K - Mountain View Desert",
  "specs": {
    "bedrooms": 3,
    "bathrooms": 2,
    "squareMeters": 250,
    "furnished": "furnished"
  },
  "price": 850000,
  "pricePerSqm": 3400,
  "type": "Resale",
  "location": {
    "lat": 30.0131,
    "lng": 31.4453,
    "address": "Mountain View Desert, New Cairo"
  },
  "tags": ["luxury", "investment", "furnished"],
  "status": "Available",
  "imageUrls": [
    "https://firebase-bucket.firebasestorage.app/mvd-3f-85k-1.jpg",
    "https://firebase-bucket.firebasestorage.app/mvd-3f-85k-2.jpg"
  ],
  "createdAt": "2026-05-20T14:30:00Z",
  "updatedAt": "2026-05-26T09:15:00Z"
}
```

---

## Lead & Matching Endpoints

### Create New Lead
```
POST /api/leads/create
X-SBR-SECRET-KEY: {secret}

{
  "name": "Ahmed Fawzy",
  "email": "ahmed@example.com",
  "phone": "+201001234567",
  "source": "website",
  "intent": "rental-income",
  "budget": {
    "min": 500000,
    "max": 2000000
  },
  "timeline": "3-months"
}

Response (200):
{
  "success": true,
  "leadId": "lead-123",
  "name": "Ahmed Fawzy",
  "createdAt": "2026-05-26T10:30:00Z"
}
```

### Score Lead-Property Match
```
POST /api/matching/score
X-SBR-SECRET-KEY: {secret}

{
  "leadId": "lead-123",
  "propertyCode": "MVD-3F-85K"
}

Response (200):
{
  "leadId": "lead-123",
  "propertyCode": "MVD-3F-85K",
  "score": 0.92,
  "reasoning": "3BR matches budget range, furnished, near schools (investor has family)",
  "match_factors": {
    "priceAlignment": 0.95,
    "locationScore": 0.88,
    "amenitiesMatch": 0.92
  },
  "recommendation": "STRONG MATCH - Schedule viewing"
}
```

### Get AI Recommendations
```
POST /api/matching/recommend
Authorization: Bearer {user_token}

{
  "leadId": "lead-123",
  "limit": 5
}

Response (200):
{
  "leadId": "lead-123",
  "recommendations": [
    {
      "propertyCode": "MVD-3F-85K",
      "score": 0.92,
      "reason": "Matches intent, budget, timeline"
    },
    {
      "propertyCode": "NDD-2S-45K",
      "score": 0.87,
      "reason": "Similar specs, lower price"
    }
  ],
  "generatedAt": "2026-05-26T10:35:00Z"
}
```

---

## Deal & Closing Endpoints (Stage 9)

### Initiate Deal Closing
```
POST /api/closer/initiate
Authorization: Bearer {user_token}

{
  "viewingId": "viewing-456",
  "leadId": "lead-123",
  "propertyCode": "MVD-3F-85K",
  "offerPrice": 800000
}

Response (200):
{
  "success": true,
  "dealId": "deal-789",
  "status": "draft",
  "leadName": "Ahmed Fawzy",
  "propertyTitle": "MVD-3F-85K - Mountain View Desert",
  "offerPrice": 800000,
  "nextAction": "Review proposal",
  "createdAt": "2026-05-26T10:40:00Z"
}
```

### Generate Proposal PDF
```
POST /api/proposals/generate
Authorization: Bearer {user_token}

{
  "dealId": "deal-789"
}

Response (200):
{
  "success": true,
  "dealId": "deal-789",
  "proposalUrl": "https://firebase-bucket.firebasestorage.app/deal-789-proposal.pdf",
  "fileName": "deal-789-proposal.pdf",
  "generatedAt": "2026-05-26T10:42:00Z"
}
```

### Initiate E-Signature (DocuSign)
```
POST /api/deals/{dealId}/sign
Authorization: Bearer {user_token}

{
  "documentUrl": "https://firebase-bucket.firebasestorage.app/deal-789-proposal.pdf",
  "recipientEmail": "ahmed@example.com",
  "recipientName": "Ahmed Fawzy"
}

Response (200):
{
  "success": true,
  "dealId": "deal-789",
  "envelopeId": "docusign-envelope-123",
  "status": "sent",
  "signingUrl": "https://docusign.example.com/signing?envelope=docusign-envelope-123",
  "sentAt": "2026-05-26T10:45:00Z"
}
```

### Complete Deal Closing
```
POST /api/closer/complete
Authorization: Bearer {user_token}

{
  "dealId": "deal-789",
  "paymentMethodId": "pm_card_123",
  "amountPaid": 800000
}

Response (200):
{
  "success": true,
  "dealId": "deal-789",
  "status": "closed",
  "closedAt": "2026-05-26T10:50:00Z",
  "totalRevenue": 800000,
  "nextSteps": "Funds transferred, documents archived"
}
```

---

## Integration Endpoints

### WhatsApp Message Handler (Webhook)
```
POST /api/whatsapp/webhook
X-SBR-SECRET-KEY: {secret}

{
  "messages": [
    {
      "from": "201001234567",
      "body": "I'm interested in 3BR properties in New Cairo",
      "timestamp": "2026-05-26T10:30:00Z"
    }
  ]
}

Response (200):
{
  "success": true,
  "leadCreated": {
    "leadId": "lead-124",
    "phone": "201001234567",
    "intent": "extracted from message"
  }
}
```

### Telegram Notification
```
POST /api/telegram/notify
Authorization: Bearer {admin_token}

{
  "chatId": "12345678",
  "message": "🏆 NEW DEAL: Ahmed Fawzy selected MVD-3F-85K",
  "parseMode": "HTML"
}

Response (200):
{
  "success": true,
  "messageId": "telegram-msg-456"
}
```

### Sync Listings (Cron Job)
```
GET /api/cron/sync-listings
X-SBR-SECRET-KEY: {secret}

Response (200):
{
  "success": true,
  "action": "propertySync",
  "newListingsIngested": 23,
  "propertiesUpdated": 15,
  "nextRun": "2026-05-27T06:00:00Z"
}
```

### DocuSign Webhook Callback
```
POST /api/webhooks/docusign
Content-Type: application/json

{
  "envelopeId": "docusign-envelope-123",
  "status": "completed",
  "completedDateTime": "2026-05-26T11:00:00Z",
  "recipientEmail": "ahmed@example.com"
}

Response (200):
{
  "success": true,
  "dealUpdated": "deal-789",
  "newStatus": "signed"
}
```

---

## Error Responses

### 401 Unauthorized
```json
{
  "error": "Unauthorized: Admin access required",
  "code": 401,
  "message": "Valid Firebase token with admin claims required"
}
```

### 400 Bad Request
```json
{
  "error": "Invalid request",
  "code": 400,
  "message": "Missing required field: leadId",
  "fields": ["leadId"]
}
```

### 404 Not Found
```json
{
  "error": "Resource not found",
  "code": 404,
  "resource": "Property",
  "id": "mvd-3f-85k"
}
```

### 500 Internal Server Error
```json
{
  "error": "Internal server error",
  "code": 500,
  "message": "Firebase connection failed",
  "requestId": "req-abc123"
}
```

---

## Rate Limiting

- **Default:** 100 requests/minute per IP
- **Admin:** 1000 requests/minute per token
- **Webhooks:** No limit (whitelist only)

---

## Authentication Methods

### Firebase ID Token
```
Authorization: Bearer {firebase_id_token}
```

### Secret Key (Service-to-Service)
```
X-SBR-SECRET-KEY: {secret_key}
```

### Custom Claims (Admin)
```
User.customClaims.admin === true
User.customClaims.role === 'admin'
```

---

## Pagination

All list endpoints support pagination:
```
GET /api/listings?limit=20&offset=40

{
  "data": [ /* 20 items */ ],
  "total": 245,
  "limit": 20,
  "offset": 40,
  "hasMore": true
}
```

---

## Webhooks

### Registering Webhooks
```
POST /api/webhooks/register
Authorization: Bearer {admin_token}

{
  "event": "deal.completed",
  "url": "https://your-domain.com/webhook",
  "secret": "webhook-secret-123"
}
```

### Events
- `property.created` — New property listed
- `lead.created` — New lead ingested
- `deal.updated` — Deal status changed
- `deal.completed` — Deal closed & archived
- `signature.completed` — E-signature finished

---

**Last Updated:** 2026-05-26  
**Version:** 1.0  
**Status:** Production Ready ✓
