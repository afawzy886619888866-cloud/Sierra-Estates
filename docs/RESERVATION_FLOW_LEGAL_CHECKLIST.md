# Sierra Estates — Unit Reservation Deposit Legal & Regulatory Checklist

**Document Version:** 1.0.0  
**Effective Date:** 2026-10-08  
**Applicability:** Down-Payment Reservation Flow (`ENABLE_UNIT_RESERVATIONS` Feature Flag)  
**Jurisdiction:** Arab Republic of Egypt (New Cairo & GCR Real Estate Regulatory Framework)

---

## 1. Executive Summary & Gating Status

The unit reservation flow introduces the capability for qualified buyers to initiate a 14-day temporary reservation lock on a property by depositing earnest money (e.g., EGP 50,000 – EGP 250,000) via Stripe / credit card.

> **CRITICAL GATE STATUS:**  
> The feature is **DEFAULT-OFF** (`ENABLE_UNIT_RESERVATIONS=false` in `lib/config.ts`).  
> **MUST NOT** be set to `true` in production until every item in the checklist below has received signed written approval from licensed Egyptian legal counsel.

---

## 2. Applicable Egyptian Statutory Framework

1. **Law No. 181 of 2018 (Consumer Protection Law):**
   - **Articles 13 & 15:** Regulates real estate sales, prohibiting platforms from marketing projects or accepting deposits without verified developer building permits and title deeds.
   - **Article 28 (Right of Withdrawal):** Guarantees consumers a minimum 14-day unconditional right of withdrawal (cooling-off period) for digital/distance contracts, provided no physical damage or non-refundable costs were incurred.
2. **Law No. 119 of 2008 (Building & Urban Planning Law):**
   - Governs legitimate building licenses and land parcel allocations in New Cairo and urban development zones.
3. **Decree No. 2184 of 2022 (Prime Ministerial Real Estate Off-Plan Regulations):**
   - Mandates separate, dedicated project escrow bank accounts for installments and prohibits developer diversion of funds.
4. **Law No. 80 of 2002 & Amendments (Anti-Money Laundering - AML):**
   - Requires rigorous Know Your Customer (KYC) identity verification for individual transactions exceeding EGP 100,000.

---

## 3. Legal Review Checklist

### A. Escrow & Banking Partner Architecture
- [ ] **Escrow Account Mandate:** Verify that earnest deposits are routed to a licensed Egyptian escrow intermediary (e.g., CIB Escrow Account, Banque Misr, NBE, or CBE-licensed payment aggregator Paymob) rather than co-mingled in operational operating accounts.
- [ ] **Platform Role Definition:** Ensure terms of service explicitly clarify that Sierra Estates operates as an authorized digital brokerage platform (وسيط عقاري مرخص) and technology facilitator, not a non-bank financial institution holding fiduciary deposits.

### B. Buyer Terms & Cooling-Off Disclosures
- [ ] **Bilingual Digital Terms (AR/EN):** Display a mandatory pre-payment consent modal stating in unambiguous Arabic and English:
  - *عربون حجز مؤقت (Earnest Reservation Hold)*: This payment constitutes a temporary lock of 14 calendar days, not a final contract of sale.
- [ ] **Refundability Schedule:**
  - 100% full refund if property fails document verification or owner rejects reservation.
  - 100% full refund within the 14-day cooling-off window upon written cancellation request.
  - SLA for funds return: 5 to 7 business days to the original card.
- [ ] **Expiry Policy:** If the buyer does not execute the primary sales contract within 14 days, the unit automatically returns to public market availability via `ReservationExpiryMonitor`.

### C. Regulatory & Tax Compliance
- [ ] **VAT Exemption Check:** Confirm whether the temporary reservation processing fee incurs 14% Egyptian VAT or is classified as an exempt financial deposit.
- [ ] **National ID / Passport KYC:** For any reservation deposit exceeding EGP 100,000, enforce automated capture of Egyptian National ID (بطاقة الرقم القومي) or valid foreign passport prior to checkout.
- [ ] **Document-Backed Verified Requirement:** Confirm that reservations can only be initiated on units where `ownershipDocRef` has been verified by the Sierra Estates compliance team (`status: 'verified'` or `'published'`).

### D. Dispute Resolution & Jurisdiction
- [ ] **Governing Law:** All reservation disputes shall be governed by the laws of the Arab Republic of Egypt, with exclusive jurisdiction in Cairo Economic Courts (المحاكم الاقتصادية بالقاهرة).

---

## 4. Un-Gating Sign-Off Procedure

To activate the reservation flow in production:
1. Complete all checkmarks above with outside counsel (Egyptian Bar Association admitted).
2. File signed legal memo in `docs/legal/signed-reservation-counsel-memo.pdf`.
3. Set environment variable: `ENABLE_UNIT_RESERVATIONS=true`.
4. Deploy with audit log entry in `FUTURE_PLAN/sprint-2-log.md`.
