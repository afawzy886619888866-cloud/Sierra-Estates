# 🏢 SIERRA ESTATES REALTY - Project Handover

## Project Overview

Sierra Estates is a premium, AI-powered Real Estate Engine designed to streamline broker workflows, manage client relationships (CRM), handle property inventory, and automate marketing content generation using Google's Gemini AI.

## 🎨 UI & Brand Identity

The application has been fully transitioned to the Light Website primary direction as per your brand guidelines:

- **Colors:** Sierra Estatese (#1E88D9), Luxury Navy (#0B2341), Signature Gold (#C9A24D), and Soft Ivory (#F4F0E8).
- **Typography:** Playfair Display (Headings), Inter (Body), and Cairo (Arabic text).
- **Vibe:** Premium, intelligent, and clean with glass-morphism elements and subtle shadows.

## ⚙️ Tech Stack

- **Frontend:** React 18, TypeScript, Vite
- **Styling:** Tailwind CSS
- **AI Integration:** `@google/genai` (Gemini API) for natural language processing and content generation.
- **Icons:** Google Material Symbols.

## 🧩 Core Modules Implemented

- **Dashboard (Home):** Quick access hub with live stats, project selection, and quick navigation to all modules.
- **CRM (Client Management):**
  - Client cards with status tracking (Hot, Signed, Searching).
  - Quick action buttons for WhatsApp, Calling, and Scheduling.
  - AI Feature: Context-aware follow-up suggestions based on client status and budget.
  - Export: 1-click export to CSV.
- **Premium Inventory:**
  - Visual property cards with status tags.
  - AI Feature: "AI Concierge Pitch" generation for persuasive sales pitches.
  - AI Feature: "Property Finder Leads" generation (Arabic Title & Description) with 1-click copy functionality.
- **Easy Listing Generator:**
  - Paste raw property text and instantly generate structured marketing content.
  - Outputs: SBR Code, WhatsApp Message, Facebook Post, and Property Finder listing.
  - Flags missing critical information (e.g., missing price or area).
- **Admin Board (Ingestion Protocol):**
  - Paste raw WhatsApp chat logs from brokers or clients.
  - AI Feature: Automatically extracts multiple units, standardizes compound names, and generates the SBR Code.
  - Detects duplicates and flags units that need review (e.g., missing prices).
  - Export: 1-click export to CSV/Sheets.

## ⏳ Pending / Future Work (Deferred)

- **Database (Firebase):** As requested, Firebase setup was canceled and deferred. Currently, the app uses mock data and local state. When you are ready to connect a live database, you will need to map the "Save to Database" buttons to your external backend or initialize Firebase.
- **Image Uploads:** The Easy Listing module currently previews images locally. A cloud storage solution (like AWS S3 or Firebase Storage) will be needed to host these images permanently.

## 📦 How to Export and Take Ownership

Since you are ready to take over the project:

1. **Download the Code:** Click the Settings (gear icon) in the top right corner of AI Studio and select "Export to ZIP" or "Export to GitHub".
2. **Run Locally:**
   - Extract the ZIP file.
   - Open the folder in your terminal.
   - Run `npm install` to install dependencies.
   - Create a `.env` file and add your Gemini API key: `VITE_GEMINI_API_KEY=your_key_here`
   - Run `npm run dev` to start the local server.

The application is fully functional in its current frontend state.

---

## 🔳 THE BASE 44 MANIFEST

### Sierra Estates REAL ESTATE: MASTER SYSTEM HANDOFF (V11.5)

> **Role**: Lead Systems Architect, AI Strategist, Technical Product Manager.  
> **Mission**: Bridge AI discovery with high-end human-led brokerage.  
> **Motto**: "AI Discovers. We Advise. You Decide."

### 1️⃣ BRAND IDENTITY & UI (CINEMATIC LUXURY)

- **Name**: SIERRA ESTATES REALTY | **Tagline**: Beyond Brokerage.
- **Visual Language**: Apple Minimalism (Quiet Luxury).
- **Palette**: Deep Navy (#0A1628), Burnished Gold (#C9A84C), Mist White/Ivory (#F5F5F5).
- **Typography**:
  - Headlines: Playfair Display (Serif).
  - Numbers/English Body: Inter (Sans-serif).
  - Arabic Text: Cairo.
- **UX Features**:
  - Mouse-driven Parallax in the Hero section.
  - Golden Mouse Glow effect.
  - High-end Property Cards with large images and technical overlays (BUA, Land, Price).

### 2️⃣ TECHNICAL STACK

- **Frontend**: Next.js (React), Tailwind CSS, Framer Motion (for UI animations).
- **Backend**: Firebase (Firestore as Source of Truth, Auth, Storage).
- **AI Engine**: Gemini 1.5 Flash (for extraction, scoring, and Leila's brain).
- **Voice**: ElevenLabs (for Leila’s Levantine voice cloning).
- **Integration**: Official Property Finder API (JWT auth).

### 3️⃣ DATA INTEGRITY & CODING LOGIC

- **SBR Internal Code**: Deterministic format: `[Compound Code]-[Bedrooms][Furnishing Status]-[Price]`.
  - Example: `VS-3F-45K` (Villette Sodic - 3 Bed - Furnished - 45,000 EGP).
- **Deduplication (Sync Hash)**: A mandatory hash check: `MD5(Compound + Area + Floor + UnitNo)`. If the hash exists, reject input to prevent duplicate "broker spam."
- **Override Protection**: AI must NEVER overwrite fields edited by a human "Curator."

### 4️⃣ THE VALUATION ENGINE

All pricing is audited by AI based on 4 axes:

1. **Core Metrics**: Location, Finishing Grade, Property Age.
2. **Yield Logic**: Target 8-10% rental yield.
3. **Premium Add-ons**: View (Sea/Landscape), Orientation (Bahary), Floor level.
4. **Market CMA**: Comparison against the last 5 actual deals and the "18-month growth plan."

### 5️⃣ "LEILA" PERSONA (INTAKE CONCIERGE)

- **Role**: Senior Concierge Advisor.
- **Tone**: "Quiet Luxury." Calm, professional, and helpful. Minimalist emoji use.
- **Dialect**: Elegant Levant (Syrian/Lebanese professional).
- **Magnified Intake Workflow**:
  1. **Welcome**: "أهلاً بك بـ سييرا بلو.. معك ليلى، رح كون معك بهالمرحلة لنساعدك تلاقي السكن اللي بيناسب احتياجاتك."
  2. **Observation**: Wait 10 seconds for user engagement.
  3. **The 3-Question Filter**: (Nationality "Relocation status", Monthly Budget, Move-in Date).
  4. **Handoff**: Generate a VIP Alert if the lead is Score 8+.

### 6️⃣ SCORING MATRIX & MEMORY

- **Matrix**: Nationality/Expat (3 pts), Target 21 Compound (2 pts), Budget > 60k (5 pts).
- **Neural Memory**: Rejection reasons (e.g., "Mivida too crowded") are stored in `Lead.intelligence.objections` to improve future matching.
- **Dual Ingestion**: Every message caught by the WhatsApp Scraper hits `/api/orchestrate` and populates BOTH Firestore and a Google Sheets master log.

### 7️⃣ OPERATIONAL COMMANDS (ADMIN ONLY)

The AI should respond to these commands from the Admin:

- **"وحدات جديدة"**: Returns properties added in the last 7 days.
- **"بحث [كلمة]"**: Search inventory.
- **"تقييم الوحدة [CODE]"**: AI runs the Valuation Engine and suggests a price.
- **"تصدير إكسل"**: Triggers a Google Sheets sync.
