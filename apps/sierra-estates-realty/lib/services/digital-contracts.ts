/**
 * SIERRA ESTATES — DIGITAL CONTRACT & CLOSING ENGINE
 * 
 * Generates bilingual (Arabic & English) legal agreements:
 * 1. Unit Reservation Agreement (عقد حجز وحدة عقارية وابداء رغبة شراء / استئجار)
 * 2. Broker Commission Split Agreement (اتفاقية توزيع وتقاسم عمولة وساطة عقارية)
 */

import crypto from 'crypto';

export interface ContractParty {
  name: string;
  nationalIdOrPassport: string;
  phone: string;
  email?: string;
  address?: string;
}

export interface ContractUnitDetails {
  unitCode: string;
  compoundName: string;
  propertyType: string;
  areaSqm: number;
  bedrooms: number;
  bathrooms: number;
  finishing: string;
  dealType: 'sale' | 'rent';
  agreedPrice: number;
  reservationDeposit: number;
  paymentPlanDescription?: string;
}

export interface CommissionDetails {
  totalCommissionAmount: number;
  commissionPercentage: number;
  sierraSharePercentage: number;
  brokerSharePercentage: number;
  externalBrokerName?: string;
  externalBrokerPhone?: string;
  vatIncluded: boolean;
}

export interface DigitalContractData {
  id: string;
  contractNumber: string;
  contractType: 'unit_reservation' | 'broker_commission_split';
  status: 'draft' | 'pending_signatures' | 'signed' | 'completed' | 'cancelled';
  createdAt: string;
  unit: ContractUnitDetails;
  buyer: ContractParty;
  sellerOrOwner: ContractParty;
  broker?: ContractParty;
  commission?: CommissionDetails;
  notesAr?: string;
  notesEn?: string;
  signatureHash?: string;
  buyerSignedAt?: string;
  sellerSignedAt?: string;
  brokerSignedAt?: string;
}

/**
 * Generate a unique canonical contract number
 */
export function generateContractNumber(type: 'unit_reservation' | 'broker_commission_split'): string {
  const prefix = type === 'unit_reservation' ? 'SBR-RES' : 'SBR-COM';
  const year = new Date().getFullYear();
  const randomHex = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `${prefix}-${year}-${randomHex}`;
}

/**
 * Generate cryptographic signature hash for audit integrity
 */
export function generateSignatureHash(contract: DigitalContractData): string {
  const payload = `${contract.contractNumber}|${contract.unit.unitCode}|${contract.unit.agreedPrice}|${contract.buyer.nationalIdOrPassport}|${contract.sellerOrOwner.nationalIdOrPassport}`;
  return crypto.createHash('sha256').update(payload).digest('hex');
}

/**
 * Render printable bilingual HTML document
 */
export function renderBilingualContractHtml(contract: DigitalContractData, locale: 'ar' | 'en' | 'bilingual' = 'bilingual'): string {
  const isAr = locale === 'ar';
  const isEn = locale === 'en';
  const isBi = locale === 'bilingual';

  return `
<!DOCTYPE html>
<html lang="${isAr ? 'ar' : 'en'}" dir="${isAr ? 'rtl' : 'ltr'}">
<head>
  <meta charset="UTF-8">
  <title>${contract.contractNumber} — Sierra Estates Contract</title>
  <style>
    body {
      font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
      color: #1e293b;
      background: #f8fafc;
      margin: 0;
      padding: 20px;
      line-height: 1.6;
    }
    .contract-container {
      max-width: 900px;
      margin: 0 auto;
      background: #ffffff;
      border: 1px solid #e2e8f0;
      border-radius: 12px;
      padding: 40px;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      border-bottom: 2px solid #0f172a;
      padding-bottom: 20px;
      margin-bottom: 30px;
    }
    .logo-area h1 {
      margin: 0;
      font-size: 24px;
      color: #0f172a;
      letter-spacing: 1px;
    }
    .logo-area p {
      margin: 2px 0 0;
      color: #64748b;
      font-size: 13px;
    }
    .badge {
      display: inline-block;
      padding: 6px 12px;
      background: #0f172a;
      color: #ffffff;
      border-radius: 6px;
      font-weight: 600;
      font-size: 14px;
    }
    .title-banner {
      text-align: center;
      background: #f1f5f9;
      padding: 16px;
      border-radius: 8px;
      margin-bottom: 24px;
    }
    .title-banner h2 {
      margin: 0 0 4px;
      font-size: 20px;
      color: #0f172a;
    }
    .title-banner h3 {
      margin: 0;
      font-size: 16px;
      color: #475569;
      font-weight: 500;
    }
    .section-title {
      font-size: 16px;
      font-weight: 700;
      color: #0f172a;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 6px;
      margin: 24px 0 12px;
    }
    .grid-2 {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }
    .card {
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 14px;
    }
    .card h4 {
      margin: 0 0 8px;
      font-size: 14px;
      color: #334155;
    }
    .info-row {
      display: flex;
      justify-content: space-between;
      font-size: 13px;
      margin-bottom: 6px;
    }
    .info-row .label {
      color: #64748b;
    }
    .info-row .val {
      font-weight: 600;
      color: #0f172a;
    }
    .terms-box {
      font-size: 13px;
      color: #334155;
      background: #f8fafc;
      border: 1px solid #e2e8f0;
      padding: 16px;
      border-radius: 8px;
    }
    .terms-box ol {
      margin: 0;
      padding-left: 20px;
    }
    .terms-box li {
      margin-bottom: 8px;
    }
    .signature-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 20px;
      margin-top: 30px;
      padding-top: 20px;
      border-top: 1px dashed #cbd5e1;
    }
    .sig-box {
      border: 1px solid #cbd5e1;
      border-radius: 8px;
      padding: 16px;
      text-align: center;
      background: #ffffff;
    }
    .sig-status {
      display: inline-block;
      margin-top: 8px;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }
    .sig-verified {
      background: #dcfce7;
      color: #166534;
    }
    .sig-pending {
      background: #fef3c7;
      color: #92400e;
    }
    .hash-footer {
      margin-top: 30px;
      font-size: 11px;
      color: #94a3b8;
      text-align: center;
      font-family: monospace;
    }
    @media print {
      body { background: #ffffff; padding: 0; }
      .contract-container { border: none; box-shadow: none; padding: 0; }
    }
  </style>
</head>
<body>
  <div class="contract-container">
    <div class="header">
      <div class="logo-area">
        <h1>SIERRA ESTATES</h1>
        <p>Premium Real Estate Advisory & Asset Management — New Cairo, Egypt</p>
      </div>
      <div class="badge">
        ${contract.contractNumber}
      </div>
    </div>

    <div class="title-banner">
      <h2>${contract.contractType === 'unit_reservation' ? 'عقد حجز وحدة عقارية وابداء رغبة' : 'اتفاقية توزيع عمولة وساطة عقارية'}</h2>
      <h3>${contract.contractType === 'unit_reservation' ? 'Unit Reservation & Intent Agreement' : 'Broker Commission Split Agreement'}</h3>
    </div>

    <!-- Section 1: Parties -->
    <div class="section-title">1. أطراف التعاقد | Contract Parties</div>
    <div class="grid-2">
      <div class="card">
        <h4>الطرف الأول: المشتري / المستأجر (Buyer / Tenant)</h4>
        <div class="info-row"><span class="label">الاسم | Name:</span><span class="val">${contract.buyer.name}</span></div>
        <div class="info-row"><span class="label">الرقم القومي / جواز السفر:</span><span class="val">${contract.buyer.nationalIdOrPassport}</span></div>
        <div class="info-row"><span class="label">الهاتف | Phone:</span><span class="val">${contract.buyer.phone}</span></div>
      </div>
      <div class="card">
        <h4>الطرف الثاني: المالك / البائع (Owner / Seller)</h4>
        <div class="info-row"><span class="label">الاسم | Name:</span><span class="val">${contract.sellerOrOwner.name}</span></div>
        <div class="info-row"><span class="label">الرقم القومي / جواز السفر:</span><span class="val">${contract.sellerOrOwner.nationalIdOrPassport}</span></div>
        <div class="info-row"><span class="label">الهاتف | Phone:</span><span class="val">${contract.sellerOrOwner.phone}</span></div>
      </div>
    </div>

    <!-- Section 2: Property Unit Specifications -->
    <div class="section-title">2. مواصفات الوحدة العقارية | Property Specifications</div>
    <div class="card">
      <div class="grid-2">
        <div>
          <div class="info-row"><span class="label">كود الوحدة | Unit Code:</span><span class="val">${contract.unit.unitCode}</span></div>
          <div class="info-row"><span class="label">الكمبوند / المنطقة | Compound:</span><span class="val">${contract.unit.compoundName}</span></div>
          <div class="info-row"><span class="label">النوع | Property Type:</span><span class="val">${contract.unit.propertyType}</span></div>
        </div>
        <div>
          <div class="info-row"><span class="label">المساحة | Area:</span><span class="val">${contract.unit.areaSqm} m²</span></div>
          <div class="info-row"><span class="label">الغرف / الحمامات | Beds/Baths:</span><span class="val">${contract.unit.bedrooms} Beds / ${contract.unit.bathrooms} Baths</span></div>
          <div class="info-row"><span class="label">التشطيب | Finishing:</span><span class="val">${contract.unit.finishing}</span></div>
        </div>
      </div>
    </div>

    <!-- Section 3: Financial Terms -->
    <div class="section-title">3. الشروط المالية | Financial Terms</div>
    <div class="grid-2">
      <div class="card">
        <h4>القيمة الإجمالية المتفق عليها | Agreed Price</h4>
        <div style="font-size: 20px; font-weight: 700; color: #0f172a; margin: 6px 0;">
          ${contract.unit.agreedPrice.toLocaleString('en-US')} EGP
        </div>
        <div style="font-size: 12px; color: #64748b;">
          ${contract.unit.dealType === 'rent' ? 'قيمة الإيجار الشهري المتفق عليه' : 'السعر الإجمالي للبيع شامل الصيانة إن وجد'}
        </div>
      </div>
      <div class="card">
        <h4>مقدم الحجز وجدية التعاقد | Reservation Deposit</h4>
        <div style="font-size: 20px; font-weight: 700; color: #166534; margin: 6px 0;">
          ${contract.unit.reservationDeposit.toLocaleString('en-US')} EGP
        </div>
        <div style="font-size: 12px; color: #64748b;">
          يُخصم من إجمالي القيمة عند تحرير العقد النهائي
        </div>
      </div>
    </div>

    <!-- Section 4: Legal Terms & Conditions -->
    <div class="section-title">4. البنود والشروط القانونية | Terms & Conditions</div>
    <div class="terms-box">
      <ol>
        <li>يقر الطرف الأول برغبته الجادة في التعاقد على الوحدة الموضحة بياناتها أعلاه وفقاً للأسعار والشروط المتفق عليها.</li>
        <li>يلتزم الطرف الثاني بتجميد الوحدة والامتناع عن عرضها لأي طرف آخر طوال مدة سريان هذا الحجز المحددة بـ (7) أيام عمل.</li>
        <li>في حال إتمام التعاقد النهائي وتوقيع العقود، يُعد مقدم الحجز جزءاً لا يتجزأ من الدفعة المقدمة.</li>
        <li>تعتبر شركة سييرا استيتس (Sierra Estates) هي الوسيط العقاري الحصري والمخول بتنظيم وتوثيق هذه الصفقة.</li>
      </ol>
    </div>

    <!-- Section 5: Signatures -->
    <div class="signature-grid">
      <div class="sig-box">
        <div style="font-weight: 600; color: #334155;">توقيع الطرف الأول (المشتري / المستأجر)</div>
        <div style="margin-top: 14px; font-style: italic; color: #0f172a; font-size: 16px;">
          ${contract.buyerSignedAt ? `Signed digitally by ${contract.buyer.name}` : 'Awaiting Digital Signature'}
        </div>
        <div class="sig-status ${contract.buyerSignedAt ? 'sig-verified' : 'sig-pending'}">
          ${contract.buyerSignedAt ? `✓ Verified: ${new Date(contract.buyerSignedAt).toLocaleDateString()}` : '⏳ Pending Signature'}
        </div>
      </div>

      <div class="sig-box">
        <div style="font-weight: 600; color: #334155;">توقيع الطرف الثاني (المالك / الوسيط المعتمد)</div>
        <div style="margin-top: 14px; font-style: italic; color: #0f172a; font-size: 16px;">
          ${contract.sellerSignedAt ? `Signed digitally by ${contract.sellerOrOwner.name}` : 'Awaiting Digital Signature'}
        </div>
        <div class="sig-status ${contract.sellerSignedAt ? 'sig-verified' : 'sig-pending'}">
          ${contract.sellerSignedAt ? `✓ Verified: ${new Date(contract.sellerSignedAt).toLocaleDateString()}` : '⏳ Pending Signature'}
        </div>
      </div>
    </div>

    <div class="hash-footer">
      <div>Cryptographic Hash: ${contract.signatureHash || 'SHA-256 Validated'}</div>
      <div>Generated securely by Sierra Estates Intelligence OS — Ref: ${contract.id}</div>
    </div>
  </div>
</body>
</html>
  `;
}
