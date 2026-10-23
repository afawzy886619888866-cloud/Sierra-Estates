# ✦ PROJECT ANTIGRAVITY: Sierra Estates BACKEND HANDOVER ✦

**Project Persona**: AI COO (Operational Intelligence)  
**Environment**: Google Antigravity / OpenClaw  
**Objective**: Automate the transition from raw field data to a structured, branded, and synchronized real estate inventory.

---

## 1. THE PROPERTY CODING ALGORITHM (Proprietary Logic)

The core of the system is the **Sierra Internal Code**. Every property must be transformed into this unique string to ensure zero duplication and instant searchability.

**Logic Structure**: `[Location Code]-[Rooms][Status]-[Price][Suffix]+[Feature]`

### Part A: Compound/Location (3 Letters)

- Examples: `MVD` (Mivida), `CFC` (Cairo Festival), `SHV` (Shorouk Villa), `HPK` (Hyde Park).

### Part B: Unit Specs (Digit + Letter)

- `F` = Fully Furnished
- `U` = Unfurnished
- `K` = Kitchen & Appliances
- `S` = Semi-Furnished (ACs only)
- *Example*: `3F` = 3 Bedrooms, Fully Furnished.

### Part C: Abbreviated Price

- **EGP**: Use `K` for thousands (e.g., `85K`).
- **USD**: Use `$` prefix (e.g., `$1500`).

### Part D: Features (Optional suffix with +)

- `+G` (Garden), `+P` (Pool), `+R` (Roof), `+V` (Villa).

**✦ FINAL CODE EXAMPLE**: `MVD-3F-75K+G` (Mivida, 3BR Fully Furnished, 75,000 EGP, with Garden).

---

## 2. BACKEND ARCHITECTURE (Antigravity Workflow)

### Layer 1: NLU Data Extraction

The system must ingest raw text (via Telegram Bot or Web Input) and parse it into a structured JSON Schema using Natural Language Understanding.

- **Required Fields**: Compound Name, Price, Currency, Bedrooms, Furnishing Type, Key Features.

### Layer 2: Data Quality Estimation (DQE)

Before any record is committed to the database, the system must run a DQE Check:

- **Action**: Query the database for existing records with the same Compound, Unit Type, and a Price within a +/- 5% margin.
- **Decision**: If a match is found, flag as a "Potential Duplicate" and pause the entry. If unique, proceed to generate the Sierra Code.

### Layer 3: Branded Asset Generation

- **Canvas Engine**: Automatically overlay the "Sierra Estates Standard" on uploaded images (Navy Blue gradient footer + Golden ✦ Sierra Estates ✦ logo).
- **Copywriting AI**: Generate two versions of content:
  - **WhatsApp/Telegram**: High-engagement, bulleted, with emojis.
  - **Property Finder**: Professional, SEO-optimized, bilingual (AR/EN), No Emojis.

---

## 3. INTEGRATION PROTOCOLS (APIs)

### I. Telegram Bot Interface (The Broker Input)

- **Webhook Setup**: Connect the Telegram Bot Token to the OpenClaw workspace.
- **Function**: Brokers send raw text -> AI parses data -> AI replies with the Internal Code and a confirmation of save.

### II. Property Finder API (The Distribution)

- **Protocol**: REST API (POST Request).
- **Mapping**: Map the Sierra JSON fields to Property Finder’s XML/JSON payload.
- **Command**: Enable a `/sync [Code]` command in Telegram to push verified listings directly to Property Finder.

---

## 4. MASTER PROMPT FOR ANTIGRAVITY EXECUTION
>
> "Act as a Lead Systems Architect. Based on the Sierra Estates Handover, configure a Node.js/OpenClaw environment that:
>
> 1. Parses raw property text into a structured JSON.
> 2. Applies the Location-RoomsStatus-Price+Feature coding logic.
> 3. Executes a DQE check to prevent duplicates in the Firebase inventory.
> 4. Integrates a Telegram Webhook to serve as the broker's data-entry bot.
> 5. Prepares a POST utility for Property Finder API synchronization.
> Use branding colors #0A1A3A and #C9A24A for all generated visual previews."

---
**MASTER AUTHORITY CONFIRMED**: This handover document is now the technical blueprint for Antigravity v6.1.
