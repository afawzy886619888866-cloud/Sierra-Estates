/**
 * Sierra Estates Egyptian Real Estate Contract & Escrow Milestone Generator
 * Generates legally structured bilingual Sales & Purchase Agreements (SPA)
 * compliant with Egyptian Real Estate commercial practices.
 */

export interface ContractParty {
  name: string;
  nationalIdOrPassport: string;
  nationality: string;
  address: string;
  phone: string;
}

export interface ContractPropertySpecs {
  compoundName: string;
  unitNumber: string;
  unitType: string;
  buaSqm: number;
  landSqm?: number;
  totalPriceEGP: number;
  downPaymentEGP: number;
  quarterlyInstallmentEGP: number;
  installmentTenureYears: number;
  deliveryDateStr: string;
}

export interface SalesPurchaseAgreement {
  contractReference: string;
  createdAt: string;
  seller: ContractParty;
  buyer: ContractParty;
  property: ContractPropertySpecs;
  articlesAr: {
    articleNumber: number;
    title: string;
    content: string;
  }[];
  articlesEn: {
    articleNumber: number;
    title: string;
    content: string;
  }[];
  escrowMilestones: {
    stage: string;
    requiredVerification: string;
    releasePercent: number;
    amountEGP: number;
  }[];
}

export class ContractGeneratorEngine {
  /**
   * Generate comprehensive bilingual Sales & Purchase Agreement
   */
  public static generateSPA(
    seller: ContractParty,
    buyer: ContractParty,
    property: ContractPropertySpecs
  ): SalesPurchaseAgreement {
    const ref = `SE-SPA-${Date.now().toString().slice(-6)}`;
    const remainingPrice = property.totalPriceEGP - property.downPaymentEGP;

    const articlesAr = [
      {
        articleNumber: 1,
        title: 'موضوع العقد',
        content: `باع وأسقط وتنازل الطرف الأول (البائع) بكافة الضمانات القانونية إلى الطرف الثاني (المشتري) القابل لذلك الوحدة العقارية رقم (${property.unitNumber}) بمشروع (${property.compoundName}) بنوع (${property.unitType}) ومساحة مباني (${property.buaSqm} م²).`,
      },
      {
        articleNumber: 2,
        title: 'الثمن وطريقة السداد',
        content: `تم هذا البيع نظير ثمن إجمالي قدره (${property.totalPriceEGP.toLocaleString()} ج.م)، سدد المشتري منه دفعة مقدمة قدرها (${property.downPaymentEGP.toLocaleString()} ج.م) والباقي وقدره (${remainingPrice.toLocaleString()} ج.م) يسدد على أقساط ربع سنوية متساوية بقيمة (${property.quarterlyInstallmentEGP.toLocaleString()} ج.م) لمدة (${property.installmentTenureYears} سنوات).`,
      },
      {
        articleNumber: 3,
        title: 'التسليم وغرامات التأخير',
        content: `يلتزم الطرف الأول بتسليم الوحدة صالحة للسكن في موعد غايته (${property.deliveryDateStr})، وفي حال التأخير يلتزم البائع بسداد غرامة تأخير قدرها 1% شهرياً من إجمالي قيمة الوحدة عن كل شهر تأخير.`,
      },
      {
        articleNumber: 4,
        title: 'الاختصاص القضائي',
        content: 'تختص محاكم القاهرة الجديدة بنظر أي نزاع قد ينشأ عن تفسير أو تنفيذ بنود هذا العقد وتعتبر أحكام القانون المصري هي الحاكمة.',
      },
    ];

    const articlesEn = [
      {
        articleNumber: 1,
        title: 'Subject Matter',
        content: `The First Party (Seller) sells and transfers all legal ownership rights of Unit No. (${property.unitNumber}) located in (${property.compoundName}), categorized as (${property.unitType}) with BUA (${property.buaSqm} sqm) to the Second Party (Buyer).`,
      },
      {
        articleNumber: 2,
        title: 'Purchase Price & Payment Plan',
        content: `The agreed total price is (${property.totalPriceEGP.toLocaleString()} EGP). The Buyer has paid a down payment of (${property.downPaymentEGP.toLocaleString()} EGP). The balance of (${remainingPrice.toLocaleString()} EGP) shall be paid in quarterly installments of (${property.quarterlyInstallmentEGP.toLocaleString()} EGP) over (${property.installmentTenureYears} years).`,
      },
      {
        articleNumber: 3,
        title: 'Handover & Delay Penalties',
        content: `The Seller commits to unit handover no later than (${property.deliveryDateStr}). Any unjustified delay incurs a late penalty fee of 1% per month of the total property valuation.`,
      },
      {
        articleNumber: 4,
        title: 'Jurisdiction & Governing Law',
        content: 'The Courts of New Cairo shall have exclusive jurisdiction over any disputes arising under this agreement in accordance with the Laws of the Arab Republic of Egypt.',
      },
    ];

    const escrowMilestones = [
      {
        stage: 'Contract Execution & Title Audit',
        requiredVerification: 'Notarized ownership deed verification and broker clearance.',
        releasePercent: 10,
        amountEGP: Math.round(property.totalPriceEGP * 0.1),
      },
      {
        stage: 'Structural Handover & Snagging Inspection',
        requiredVerification: 'Certified structural engineer inspection certificate.',
        releasePercent: 40,
        amountEGP: Math.round(property.totalPriceEGP * 0.4),
      },
      {
        stage: 'Final Key Handover & Utility Connection',
        requiredVerification: 'Utility meter transfer and key delivery signature.',
        releasePercent: 50,
        amountEGP: Math.round(property.totalPriceEGP * 0.5),
      },
    ];

    return {
      contractReference: ref,
      createdAt: new Date().toISOString(),
      seller,
      buyer,
      property,
      articlesAr,
      articlesEn,
      escrowMilestones,
    };
  }
}
