 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } }// sierra-estatese/lib/integrations/portfolio-asset-registry.ts
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

const REGISTRY_BASE_URL = _nullishCoalesce(process.env.PF_API_BASE_URL, () => ( "https://api.propertyfinder.com.eg/v3"));
const REGISTRY_JWT      = _nullishCoalesce(process.env.PF_JWT_TOKEN, () => ( ""));
const COMPANY_ID        = _nullishCoalesce(process.env.PF_COMPANY_ID, () => ( ""));
const WEBHOOK_SECRET    = _nullishCoalesce(process.env.PF_WEBHOOK_SECRET, () => ( ""));

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



















































// ════════════════════════════════════════════════════════════════
// 1. PUSH PORTFOLIO ASSET TO REGISTRY
// ════════════════════════════════════════════════════════════════

export async function pushAssetToRegistry(asset) {
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

export async function syncAllAssetsToRegistry() {
  const db = getFirestore();
  const q  = query(
    collection(db, COLLECTIONS.portfolioAssets),
    where("status", "==", "active"),
    where("syncedToRegistry", "==", false),
  );

  const snapshot = await getDocs(q);
  const results  = { synced: 0, failed: 0, errors: []  };

  // Process in batches of 10 (respect Registry rate limit)
  const BATCH_SIZE = 10;
  const docs       = snapshot.docs;

  for (let i = 0; i < docs.length; i += BATCH_SIZE) {
    const batch = docs.slice(i, i + BATCH_SIZE);

    await Promise.all(batch.map(async (docSnap) => {
      const asset = { id: docSnap.id, ...docSnap.data() } ;
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
  body,
  headers,
) {
  try {
    // Verify Registry webhook signature
    const signature = _nullishCoalesce((headers instanceof Headers
      ? headers.get("X-PF-Signature")
      : (headers )["x-pf-signature"]
    ), () => ( ""));

    if (!verifyRegistrySignature(JSON.stringify(body), signature)) {
      return { success: false, error: "Invalid webhook signature" };
    }

    const stakeholder = body ;
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
      email:              _nullishCoalesce(stakeholder.email, () => ( null)),
      intent:             _nullishCoalesce(stakeholder.intent, () => ( null)),
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
  registryAssetId,
  newValuation,
  reason,
) {
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

export async function getAssetRegistryAnalytics(registryAssetId) {
  const res = await fetch(`${REGISTRY_BASE_URL}/listings/${registryAssetId}/analytics`, {
    headers: registryHeaders(),
  });
  if (!res.ok) throw new Error(`Registry analytics fetch failed: ${res.status}`);

  const data = await res.json();

  // Normalize Registry analytics into Sierra Estatese format
  return {
    registryAssetId,
    views:            _nullishCoalesce(data.total_views, () => ( 0)),
    uniqueViews:      _nullishCoalesce(data.unique_views, () => ( 0)),
    stakeholderInquiries: _nullishCoalesce(data.total_leads, () => ( 0)),
    phoneReveals:     _nullishCoalesce(data.phone_reveals, () => ( 0)),
    whatsappClicks:   _nullishCoalesce(data.whatsapp_clicks, () => ( 0)),
    portfolioSaves:   _nullishCoalesce(data.saves, () => ( 0)),
    avgViewDuration:  _nullishCoalesce(data.avg_view_duration_s, () => ( 0)),
    impressions:      _nullishCoalesce(data.impressions, () => ( 0)),
    ctr:              _nullishCoalesce(data.click_through_rate, () => ( 0)),
    period:           _nullishCoalesce(data.period, () => ( "30d")),
    fetchedAt:        new Date(),
  };
}

// ════════════════════════════════════════════════════════════════
// 6. VISUAL SYNC — Firebase Storage → Registry CDN
// ════════════════════════════════════════════════════════════════

export async function syncVisualsToFirebase(
  sbrCode,
  visualFiles,
) {
  const storage = getStorage();
  const urls = [];

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

function mapAssetType(type) {
  const map = {
    villa:      "Villa",
    apartment:  "Apartment",
    penthouse:  "Penthouse",
    duplex:     "Duplex",
    townhouse:  "Town House",
  };
  return _nullishCoalesce(map[type], () => ( "Apartment"));
}

function mapInteriorStandard(s) {
  return _nullishCoalesce({ furnished: "Furnished", semi_furnished: "Semi Furnished", unfurnished: "Unfurnished" }[s], () => ( "Unfurnished"));
}

function verifyRegistrySignature(payload, signature) {
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

async function triggerMatchmakerScoring(stakeholderId, sbrCode) {
  // Calls the Matchmaker Cloud Function asynchronously
  await fetch("/api/agents/matchmaker/score-stakeholder", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ stakeholderId, sbrCode }),
  });
}

