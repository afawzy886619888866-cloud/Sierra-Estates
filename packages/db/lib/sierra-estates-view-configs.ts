// sierra-estatese/config/views.ts
// 10 Official Sierra Estatese View Configurations
// Each view maps to a specific agent, audience, and Firestore collection.

export interface ViewConfig {
  id: string;
  label: string;
  labelAr: string;
  agent: "Scribe" | "Curator" | "Matchmaker" | "Closer";
  collection: "listings" | "leads" | "broker_listings" | "proposals" | "sales";
  visibility: "public" | "broker" | "investor" | "internal";
  icon: string;
  description: string;
  dsl: string;
}

export const VIEW_CONFIGS: Record<string, ViewConfig> = {

  // ── PUBLIC VIEWS ─────────────────────────────────────────────────

  public_inventory: {
    id: "public_inventory",
    label: "Public Inventory Grid",
    labelAr: "معرض الوحدات العام",
    agent: "Curator",
    collection: "listings",
    visibility: "public",
    icon: "🆴️",
    description: "Main property grid shown to clients on the landing page",
    dsl: `VISIBILITY public
SHOW "Property_Name", "Compound", "Bedrooms", "Price", "Area_SqM", "Deal_Status", "ROI_Estimate", "Primary_Image"
HIDE "Internal_Cost", "Commission", "Broker_Notes", "Sync_Hash", "Raw_Input", "SBR_Code"
FILTER "Status" = "active"
FILTER "Visibility" = "public"
FILTER "Compound" IS NOT EMPTY
FILTER "Primary_Image" IS NOT EMPTY
SORT BY "Deal_Score" DESC, "Created_Time" DESC
AI TAGS "ROI_Badge", "Deal_Status", "Verified_Listing"
COVER "Primary_Image" SIZE large ASPECT cover`,
  },

  hidden_gems: {
    id: "hidden_gems",
    label: "Hidden Gems Feed",
    labelAr: "الفرص المخفية",
    agent: "Curator",
    collection: "listings",
    visibility: "public",
    icon: "💎",
    description: "AI-flagged below-market premium properties for the hero section",
    dsl: `VISIBILITY public
SHOW "Property_Name", "Compound", "Price", "Price_Per_SqM", "Deal_Score", "ROI_Estimate", "Deal_Status", "Area_SqM"
HIDE "Internal_Cost", "Commission", "Sync_Hash", "Broker_Notes"
FILTER "Status" = "active"
FILTER "Visibility" = "public"
FILTER "Deal_Status" IN ("Hidden Gem", "15% Below Market", "Exceptional ROI")
FILTER "Deal_Score" >= 4.5
COMPOUND IN ("Mivida", "District 5", "Villette", "IL Bosco", "Palm Hills")
SORT BY "Deal_Score" DESC, "Price_Per_SqM" ASC
COMPARE "Price_Per_SqM" AGAINST "Compound_Average"
COMPARE "ROI_Score" AGAINST "Market_ROI"
AI TAGS "ROI_Badge", "Deal_Status", "Capital_Growth_Tag"
COVER "Primary_Image" SIZE large ASPECT cover`,
  },

  scribe_dashboard: {
    id: "scribe_dashboard",
    label: "Scribe — Intake Dashboard",
    labelAr: "لوحة الإدخال — الكاتب",
    agent: "Scribe",
    collection: "broker_listings",
    visibility: "internal",
    icon: "✍️",
    description: "Real-time feed of WhatsApp/Telegram raw unit intake and AI extraction status",
    dsl: `VISIBILITY internal
SHOW "SBR_Code", "Extraction_Status", "Compound", "Bedrooms", "Bathrooms", "Price", "Area_SqM", "Furnishing", "Source_Channel", "Agent_Name", "Sync_Hash", "Created_Time"
HIDE "Raw_Input", "Commission", "Deal_Score"
GROUP BY "Extraction_Status"
FILTER "Extraction_Status" IN ("pending_extraction", "extracted", "failed", "duplicate_detected", "needs_review")
SORT BY "Created_Time" DESC
SHOW "SBR_Code" AS PRIMARY_ID
WRAP CELLS false
FREEZE COLUMNS 1`,
  },

  dedup_review: {
    id: "dedup_review",
    label: "Scribe — Dedupe Review Queue",
    labelAr: "قائمة مراجعة التكرار",
    agent: "Scribe",
    collection: "broker_listings",
    visibility: "internal",
    icon: "🔍",
    description: "AI-detected potential duplicate listings pending manual review and merge decision",
    dsl: `VISIBILITY internal
SHOW "SBR_Code", "Compound", "Bedrooms", "Price", "Area_SqM", "Sync_Hash", "Duplicate_Of", "Confidence_Score", "Source_Channel", "Created_Time"
FILTER "Extraction_Status" = "duplicate_detected"
FILTER "Confidence_Score" >= 80
SORT BY "Confidence_Score" DESC, "Created_Time" DESC
SHOW "SBR_Code" AS PRIMARY_ID
WRAP CELLS false
FREEZE COLUMNS 2`,
  },

  matchmaker_leads: {
    id: "matchmaker_leads",
    label: "Matchmaker — Lead Scoring",
    labelAr: "تقييم العملاء — المحرك",
    agent: "Matchmaker",
    collection: "leads",
    visibility: "broker",
    icon: "🧠",
    description: "AI-scored leads with neural property match percentages and Leila scores",
    dsl: `VISIBILITY broker
SHOW "Lead_Name", "Phone", "Budget_Min", "Budget_Max", "Preferred_Compounds", "Preferred_Bedrooms", "Neural_Match_Score", "Leila_Score", "Matched_Properties", "Status", "Last_Interaction", "Agent_Assigned"
FILTER "Neural_Match_Score" >= 75 PERCENT
FILTER "Status" IN ("active", "warm", "hot")
GROUP BY "Status"
SORT BY "Neural_Match_Score" DESC, "Leila_Score" DESC
AI TAGS "Neural_Match_Score"`,
  },

  closer_pipeline: {
    id: "closer_pipeline",
    label: "Closer — Active Pipeline",
    labelAr: "خط صفقات الإغلاق",
    agent: "Closer",
    collection: "proposals",
    visibility: "broker",
    icon: "🤝",
    description: "Active deals in final closing stages with commission projections",
    dsl: `VISIBILITY broker
SHOW "Property_Name", "SBR_Code", "Lead_Name", "Stage", "Asking_Price", "Negotiated_Price", "Commission_Rate", "Commission_EGP", "Expected_Close_Date", "Agent_Assigned", "Last_Update"
FILTER "Stage" IN ("proposal_sent", "viewing_scheduled", "viewing_done", "offer_submitted", "contract_review", "final_negotiation")
GROUP BY "Stage"
SORT BY "Expected_Close_Date" ASC, "Commission_EGP" DESC
WRAP CELLS false
FREEZE COLUMNS 2`,
  },

  commission_ledger: {
    id: "commission_ledger",
    label: "Commission Ledger",
    labelAr: "سجل العمولات",
    agent: "Closer",
    collection: "sales",
    visibility: "internal",
    icon: "💰",
    description: "All finalized sales with commission breakdown, agent attribution, and payment status",
    dsl: `VISIBILITY internal
SHOW "SBR_Code", "Property_Name", "Lead_Name", "Sale_Price_EGP", "Commission_Rate", "Commission_EGP", "Agent_Name", "Close_Date", "Payment_Status", "Invoice_Ref"
FILTER "Stage" = "closed_won"
SORT BY "Close_Date" DESC
GROUP BY "Agent_Name"
CHART column AGGREGATE sum ON "Commission_EGP" COLOR auto HEIGHT medium
WRAP CELLS false
FREEZE COLUMNS 2`,
  },
};

export const PUBLIC_VIEWS   = Object.values(VIEW_CONFIGS).filter(v => v.visibility === "public");
export const BROKER_VIEWS   = Object.values(VIEW_CONFIGS).filter(v => v.visibility === "broker");
export const INTERNAL_VIEWS = Object.values(VIEW_CONFIGS).filter(v => v.visibility === "internal");

export function getViewsByRole(role: "public" | "broker" | "investor" | "internal"): ViewConfig[] {
  const hierarchy: Record<string, string[]> = {
    internal: ["public", "broker", "investor", "internal"],
    broker:   ["public", "broker"],
    investor: ["public", "investor"],
    public:   ["public"],
  };
  const allowed = hierarchy[role] ?? ["public"];
  return Object.values(VIEW_CONFIGS).filter(v => allowed.includes(v.visibility));
}
