// sierra-estatese/lib/integrations/portfolio-asset-registry.ts
// Portfolio Asset Registry (Property Finder Egypt) API V3 — Full Bidirectional Integration
// Covers: Portfolio Assets push, image CDN sync, Investment Stakeholder webhook ingestion, valuation updates
import { createHmac } from "node:crypto";

import {
  getFirestore,
  collection,
  addDoc,
  updateDoc,
  doc,
  serverTimestamp,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { getStorage, ref, getDownloadURL } from "firebase/storage";
import { COLLECTIONS } from "../models/schema";

// ════════════════════════════════════════════════════════════════
// STRATEGIC CONFIGURATION
// ════════════════════════════════════════════════════════════════

const REGISTRY_BASE_URL = process.env.PF_API_BASE_URL    ?? "https://api.propertyfinder.com.eg/v3";
const REGISTRY_JWT      = process.env.PF_JWT_TOKEN        ?? "";
const COMPANY_ID        = process.env.PF_COMPANY_ID       ?? "";
const WEBHOOK_SECRET    = process.env.PF_WEBHOOK_SECRET   ?? "";

function registryHeaders() {
  return {
    Authorization:   `Bearer ${REGISTRY_JWT}`,
    "Content-Type":  "application/json",
    "X-Company-ID":  COMPANY_ID,
    "X-API-Version": "3.0",
  };
}

// ════════════════════════════════════════════════════════════════
// PREMIUM DOMAIN TYPES
// ════════════════════════════════════════════════════════════════

export interface SBRAsset {
  id: string;
  sbrCode: string;                // e.g. MVD-3F-75K+G
  titleEn: string;
  titleAr: string;
  prospectusEn: string;           // Descriptive content
  prospectusAr: string;
  valuation: number;              // EGP
  residences: number;             // bedrooms
  washrooms: number;              // bathrooms
  areaSqM: number;
  compound: string;
  district: string;               // e.g. "5th Settlement"
  city: string;                   // e.g. "New Cairo"
  governorate: string;            // e.g. "Cairo"
  assetType: "villa" | "apartment" | "penthouse" | "duplex" | "townhouse";
  allocationType: "sale" | "rent";
  interiorStandard: "furnished" | "semi_furnished" | "unfurnished";
  visuals: string[];              // Firebase Storage download URLs
  amenities: string[];
  coordinates: { lat: number; lng: number };
  neuralMatchScore: number;       // 0-10
  investmentStatus?: string;      // "Hidden Gem" | "Exceptional ROI" | ...
  roiEstimate: number;            // percentage
  valuationPerSqM: number;
  registryAssetId?: string;       // returned by Registry after first push
  status: "active" | "pending" | "draft" | "archived";
  syncedToRegistry?: boolean;
  lastRegistrySync?: Date;
}

export interface InvestmentStakeholder {
  id: string;                     // Registry's stakeholder ID
  name: string;
  phone: string;
  email?: string;
  intent?: string;                // message
  assetReference: string;         // SBR Code of the asset they inquired about
  registryId?: string;            // Registry asset ID
  source: "portfolio_asset_registry";
  createdAt: string;              // ISO timestamp from Registry
}

export interface RegistrySyncResult {
  success: boolean;
  registryAssetId?: string;
  error?: string;
  timestamp: Date;
}

// ════════════════════════════════════════════════════════════════
// 1. PUSH PORTFOLIO ASSET TO REGISTRY
// ════════════════════════════════════════════════════════════════

export async function pushAssetToRegistry(asset: SBRAsset): Promise<RegistrySyncResult> {
  try {
    // Map SBR data → Registry required schema
    const payload = {
      reference:         asset.sbrCode,
      title_en:          asset.titleEn,
      title_ar:          asset.titleAr,
      description_en:    asset.prospectusEn,
      description_ar:    asset.prospectusAr,
      price:             asset.valuation,
      currency:          "EGP",
      bedrooms:          asset.residences,
      bathrooms:         asset.washrooms,
      area:              asset.areaSqM,
      property_type:     mapAssetType(asset.assetType),
      listing_type:      asset.allocationType,
      furnishing_status: mapInteriorStandard(asset.interiorStandard),
      compound:          asset.compound,
      location: {
        district:    asset.district,
        city:        asset.city,
        governorate: asset.governorate,
        country:     "Egypt",
        lat:         asset.coordinates.lat,
        lng:         asset.coordinates.lng,
      },
      images: asset.visuals.map((url, i) => ({
        url,
        order:   i,
        is_main: i === 0,
      })),
      amenities:        asset.amenities,
      // Sierra Estatese custom fields (Registry supports extra metadata)
      custom_fields: {
        sbr_code:        asset.sbrCode,
        neural_score:    asset.neuralMatchScore,
        investment_status: asset.investmentStatus,
        roi_estimate:    asset.roiEstimate,
        valuation_per_sqm: asset.valuationPerSqM,
      },
    };

    const method = asset.registryAssetId ? "PUT" : "POST";
    const url    = asset.registryAssetId
      ? `${REGISTRY_BASE_URL}/listings/${asset.registryAssetId}`
      : `${REGISTRY_BASE_URL}/listings`;

    const res = await fetch(url, {
      method,
      headers: registryHeaders(),
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const err = await res.text();
      throw new Error(`Registry API error ${res.status}: ${err}`);
    }

    const data = await res.json();

    // Update Strategic Pipeline (Firestore) with Registry ID and sync timestamp
    const db = getFirestore();
    await updateDoc(doc(db, COLLECTIONS.portfolioAssets, asset.id), {
      registryAssetId:  data.id,
      syncedToRegistry: true,
      lastRegistrySync: serverTimestamp(),
      registryStatus:   "active",
    });

    return { success: true, registryAssetId: data.id, timestamp: new Date() };

  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("[Registry] pushAssetToRegistry failed:", error);
    return { success: false, error, timestamp: new Date() };
  }
}

// ════════════════════════════════════════════════════════════════
// 2. STRATEGIC BATCH SYNC — push all unsynced Portfolio Assets
// ════════════════════════════════════════════════════════════════

export async function syncAllAssetsToRegistry(): Promise<{ synced: number; failed: number; errors: string[] }> {
  const db = getFirestore();
  const q  = query(
    collection(db, COLLECTIONS.portfolioAssets),
    where("status", "==", "active"),
    where("syncedToRegistry", "==", false),
  );

  const snapshot = await getDocs(q);
  const results  = { synced: 0, failed: 0, errors: [] as string[] };

  // Process in batches of 10 (respect Registry rate limit)
  const BATCH_SIZE = 10;
  const docs       = snapshot.docs;

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = docs.slice(i, i + BATCH_SIZE);

    await Promise.all(batch.map(async (docSnap) => {
      const asset = { id: docSnap.id, ...docSnap.data() } as SBRAsset;
      const result = await pushAssetToRegistry(asset);

      if (result.success) {
        results.synced++;
      } else {
        results.failed++;
        results.errors.push(`${asset.sbrCode}: ${result.error}`);
      }
    }));

    // Rate limit buffer between batches
    if (i + BATCH_SIZE < docs.length) {
      await new Promise(r => setTimeout(r, 1000));
    }
  }

  return results;
}

// ════════════════════════════════════════════════════════════════
// 3. INVESTMENT STAKEHOLDER WEBHOOK INGESTION
// ════════════════════════════════════════════════════════════════

export async function handleStakeholderWebhook(
  body: unknown,
  headers: Headers | Record<string, string>,
): Promise<{ success: boolean; stakeholderId?: string; error?: string }> {
  try {
    // Verify Registry webhook signature
    const signature = (headers instanceof Headers
      ? headers.get("X-PF-Signature")
      : (headers as Record<string, string>)["x-pf-signature"]
    ) ?? "";

    if (!verifyRegistrySignature(JSON.stringify(body), signature)) {
      return { success: false, error: "Invalid webhook signature" };
    }

    const stakeholder = body as InvestmentStakeholder;
    const db   = getFirestore();

    // Check for duplicate (Registry may retry)
    const dupQ  = query(collection(db, COLLECTIONS.stakeholders), where("registryStakeholderId", "==", stakeholder.id));
    const dupSnap = await getDocs(dupQ);
    if (!dupSnap.empty) {
      return { success: true, stakeholderId: dupSnap.docs[0].id }; // idempotent
    }

    // Resolve the internal Portfolio Asset from SBR code
    const assetQ    = query(collection(db, COLLECTIONS.portfolioAssets), where("sbrCode", "==", stakeholder.assetReference));
    const assetSnap = await getDocs(assetQ);
    const assetRef  = assetSnap.empty ? null : assetSnap.docs[0].id;

    // Save Investment Stakeholder to Strategic Pipeline (Firestore)
    const newStakeholder = await addDoc(collection(db, COLLECTIONS.stakeholders), {
      name:               stakeholder.name,
      phone:              stakeholder.phone,
      email:              stakeholder.email ?? null,
      intent:             stakeholder.intent ?? null,
      source:             "portfolio_asset_registry",
      assetReference:     stakeholder.assetReference,
      assetId:            assetRef,
      registryStakeholderId: stakeholder.id,
      status:             "pending_review",
      stage:              "initial_inquiry",
      neuralMatchScore:   null,   // Matchmaker agent fills this
      leilaScore:         null,
      advisorAssigned:    null,
      createdAt:          serverTimestamp(),
      registryCreatedAt:  stakeholder.createdAt,
    });

    // Trigger Matchmaker agent to score the Investment Stakeholder (async, non-blocking)
    triggerMatchmakerScoring(newStakeholder.id, stakeholder.assetReference).catch(console.error);

    return { success: true, stakeholderId: newStakeholder.id };

  } catch (err) {
    const error = err instanceof Error ? err.message : String(err);
    console.error("[Registry Webhook] Error:", error);
    return { success: false, error };
  }
}

// ════════════════════════════════════════════════════════════════
// 4. STRATEGIC VALUATION UPDATES
// ════════════════════════════════════════════════════════════════

export async function updateRegistryAssetValuation(
  registryAssetId: string,
  newValuation: number,
  reason: "ai_valuation" | "owner_update" | "market_correction",
): Promise<RegistrySyncResult> {
  try {
    const res = await fetch(`${REGISTRY_BASE_URL}/listings/${registryAssetId}/price`, {
      method: "PATCH",
      headers: registryHeaders(),
      body: JSON.stringify({
        price:      newValuation,
        currency:   "EGP",
        reason,
        updated_by: "sierra_estates_ai",
      }),
    });

    if (!res.ok) throw new Error(`Registry valuation update failed: ${res.status}`);

    return { success: true, registryAssetId, timestamp: new Date() };
  } catch (err) {
    return {
      success:   false,
      error:     err instanceof Error ? err.message : String(err),
      timestamp: new Date(),
    };
  }
}

// ════════════════════════════════════════════════════════════════
// 5. FETCH PORTFOLIO ASSET ANALYTICS
// ════════════════════════════════════════════════════════════════

export async function getAssetRegistryAnalytics(registryAssetId: string) {
  const res = await fetch(`${REGISTRY_BASE_URL}/listings/${registryAssetId}/analytics`, {
    headers: registryHeaders(),
  });
  if (!res.ok) throw new Error(`Registry analytics fetch failed: ${res.status}`);

  const data = await res.json();

  // Normalize Registry analytics into Sierra Estatese format
  return {
    registryAssetId,
    views:            data.total_views          ?? 0,
    uniqueViews:      data.unique_views          ?? 0,
    stakeholderInquiries: data.total_leads           ?? 0,
    phoneReveals:     data.phone_reveals         ?? 0,
    whatsappClicks:   data.whatsapp_clicks       ?? 0,
    portfolioSaves:   data.saves                 ?? 0,
    avgViewDuration:  data.avg_view_duration_s  ?? 0,
    impressions:      data.impressions           ?? 0,
    ctr:              data.click_through_rate    ?? 0,
    period:           data.period               ?? "30d",
    fetchedAt:        new Date(),
  };
}

// ════════════════════════════════════════════════════════════════
// 6. VISUAL SYNC — Firebase Storage → Registry CDN
// ════════════════════════════════════════════════════════════════

export async function syncVisualsToFirebase(
  sbrCode: string,
  visualFiles: File[],
): Promise<string[]> {
  const storage = getStorage();
  const urls: string[] = [];

  for (const file of visualFiles) {
    const storageRef = ref(storage, `assets/${sbrCode}/${file.name}`);
    const url = await getDownloadURL(storageRef);
    urls.push(url);
  }

  return urls;
}

// ════════════════════════════════════════════════════════════════
// PRIVATE HELPERS
// ════════════════════════════════════════════════════════════════

function mapAssetType(type: SBRAsset["assetType"]): string {
  const map: Record<string, string> = {
    villa:      "Villa",
    apartment:  "Apartment",
    penthouse:  "Penthouse",
    duplex:     "Duplex",
    townhouse:  "Town House",
  };
  return map[type] ?? "Apartment";
}

function mapInteriorStandard(s: SBRAsset["interiorStandard"]): string {
  return { furnished: "Furnished", semi_furnished: "Semi Furnished", unfurnished: "Unfurnished" }[s] ?? "Unfurnished";
}

function verifyRegistrySignature(payload: string, signature: string): boolean {
  if (!WEBHOOK_SECRET || !signature) return false;
  try {
    const hmac = createHmac("sha256", WEBHOOK_SECRET);
    const digest = hmac.update(payload).digest("hex");
    return digest === signature;
  } catch (err) {
    console.error("[Registry] Signature verification error:", err);
    return false;
  }
}

async function triggerMatchmakerScoring(stakeholderId: string, sbrCode: string): Promise<void> {
  // Calls the Matchmaker Cloud Function asynchronously
  await fetch("/api/agents/matchmaker/score-stakeholder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stakeholderId, sbrCode }),
  });
}

