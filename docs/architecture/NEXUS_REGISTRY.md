# 🔗 The Nexus Registry (Sierra Estates AI OS)

This registry defines the technical contracts between the **Frontend Orchestrator (Antigravity)** and the **Backend Agent (Google AI Studio)**. All changes to APIs, Firestore schemas, or AI response formats must be documented here to prevent integration failures.

---

## 🏛️ Firestore Schema Contracts

### 1. `broker_listings` (Stage 1 Intake)
*   **Collection Path**: `broker_listings`
*   **Document Structure**:
    ```typescript
    {
      rawMessage: string;
      status: 'raw' | 'parsed' | 'validated' | 'duplicate' | 'archived';
      sourceGroup: string;
      senderInfo: string;
      extractedData: {
        compound?: string;
        price?: number;
        bedrooms?: number;
        area?: number;
        phoneNumber?: string;
        type?: string;
        finishing?: string;
      };
      createdAt: ServerTimestamp;
    }
    ```

### 2. `leads` (CRM Intelligence)
*   **Collection Path**: `leads`
*   **Expected AI Mapping**:
    *   The Backend Agent should populate the `aiProfiling` field when a lead is updated.
    ```typescript
    aiProfiling: {
      interests: string[];
      budget: number;
      preferredLocations: string[];
      intentScore: number; // 0-100
    }
    ```

---

## 🛰️ API Endpoint Contracts

### 1. `/api/openclaw` (Intelligence Gateway)
*   **Method**: `POST`
*   **Payload**: `{ stats: object, activities: string[] }`
*   **Response**: 
    ```typescript
    {
      insights: Array<{
        type: 'opportunity' | 'warning' | 'tip';
        text: string;
        priority: 'high' | 'low';
        action?: string;
      }>
    }
    ```

### 2. `/api/proposals` (Sales Engine)
*   **Method**: `POST`
*   **Payload**: `{ leadId: string, unitIds: string[] }`
*   **Response**: `{ proposalId: string, url: string }`

---

## 🤖 Alignment Protocols

1.  **Backend Agent Rule**: Before implementing a new API route, check if it's defined here. If not, add it.
2.  **Frontend Agent Rule**: Consume ONLY the fields and endpoints defined in this registry.
3.  **Security**: All endpoints must be wrapped in `AuthCheck` logic (handled by Backend Agent).
