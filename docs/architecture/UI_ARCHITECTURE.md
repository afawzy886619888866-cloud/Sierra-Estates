# 🏛️ Sierra Estates: UI Architecture Roadmap (V12.0)

This roadmap defines the visual interface of the Sierra Estates platform, bridging the gap between AI-driven backend services and the **"Quiet Luxury"** aesthetic defined in the [V12_MANIFEST.md](file:///c:/OpenClaw/V12_MANIFEST.md).

## 🔳 Design Principles (V12.0)

- **Palette**: Deep Navy (#0A1628), Gold (#C9A84C), Soft Ivory (#F4F0E8).
- **Aesthetic**: Apple-style minimalism, editorial typography, borderless grid components.
- **Motion**: Cinematic parallax (Framer Motion) and "Golden Glow" interactive elements.

---

## 🗺️ Core Page Map (The Sales Machine)

### 1. الصفحة الرئيسية (Cinematic Landing Page)

- **Path**: `/landing`
- **Purpose**: Brand immersion and raw lead capture.
- **Key Feature**: Mouse-driven parallax hero with a dark navy background and gold accents.

### 2. معرض الوحدات (Inventory / Property Finder)

- **Path**: `/portal/listings` (Agent) or `/inventory` (Public)
- **Purpose**: Stage 4/5 Global Distribution. Showcasing 1,000+ units.
- **Key Feature**: Clean Grid with text overlays (Compound, BUA, Price) and smart filtering by SBR Code.

### 3. صفحة تفاصيل العقار (Strategic Unit View)

- **Path**: `/proposals/[id]` (Shared) or `/inventory/[id]`
- **Purpose**: Sales persuasion.
- **Key Feature**: Full-width hero visuals followed by a "Strategic Insights" sidebar (ROI, Yield, Market Trend).

### 4. معرض ليلى المخصص (Concierge Selection - S8)

- **Path**: `/portal/selection` (Internal) or dynamic sharing link.
- **Purpose**: Stage 8 Portfolio Proposal. Personalized selection for VIP leads.
- **Key Feature**: Mobile-first, Swipe-style UI, "Match Score" overlays (e.g., 95% Match).

### 5. مركز ذكاء السوق (Market Intelligence Page)

- **Path**: `/portal/intelligence`
- **Purpose**: Investor relations and market authority.
- **Key Feature**: Price-per-meter heatmaps and AI-generated supply/demand reports.

---

## 🛠️ Performance & Tech Standard

- **Core**: Next.js 16 (App Router), React 19.
- **Styling**: Tailwind CSS (Glassmorphism utilities).
- **Animations**: Framer Motion (Institutional precision).
- **Images**: High-fidelity photography only (Luxury Egyptian Villa context).

---

## 🔄 Pipeline Alignment

| Stage | Page / Module | Goal |
| :--- | :--- | :--- |
| S1/S2 | Scribe Hub (`EasyListing.tsx`) | Raw Intake → Truth |
| S3/S4 | Inventory Grid | Desire Branding |
| S7/S8 | Selection Gallery | Wealth Synthesis |
| S9/S10 | Strategic Detail View | Success Finalization |
