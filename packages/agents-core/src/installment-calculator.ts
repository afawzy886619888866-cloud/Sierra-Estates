/**
 * Sierra Estates Installment & Financial Amortization Engine
 * Parses unstructured Egyptian broker terms into deterministic payment plans.
 */

export interface PaymentPlanInput {
  totalPrice: number;
  downPaymentPercent?: number;
  downPaymentAmount?: number;
  tenureYears?: number;
  installmentsFrequency?: 'quarterly' | 'monthly' | 'semi-annual' | 'annual';
  deliveryYear?: number;
  maintenancePercent?: number;
  rawText?: string;
}

export interface AmortizationScheduleItem {
  period: number;
  dueDate: string;
  type: 'down_payment' | 'installment' | 'maintenance' | 'delivery';
  amount: number;
  remainingBalance: number;
}

export interface StructuredPaymentPlan {
  totalPrice: number;
  downPayment: number;
  downPaymentPercent: number;
  tenureYears: number;
  frequency: 'quarterly' | 'monthly' | 'semi-annual' | 'annual';
  installmentAmount: number;
  totalInstallments: number;
  maintenanceFee: number;
  deliveryYear?: number;
  schedule: AmortizationScheduleItem[];
}

export class InstallmentCalculator {
  /**
   * Parse Egyptian Arabic broker text into financial parameters
   */
  public static parseBrokerPaymentTerms(text: string, defaultPrice: number = 10000000): PaymentPlanInput {
    let downPaymentPercent = 10;
    let tenureYears = 7;
    let deliveryYear: number | undefined;
    let maintenancePercent = 8;

    // 1. Down payment detection (مقدم / down payment)
    const downMatch = text.match(/(?:مقدم|down(?: payment)?)\s*[:=]?\s*(\d+(?:\.\d+)?)\s*%/i) ||
                      text.match(/(\d+(?:\.\d+)?)\s*%\s*(?:مقدم|down)/i);
    if (downMatch && downMatch[1]) {
      downPaymentPercent = parseFloat(downMatch[1]);
    }

    // 2. Installment tenure detection (سنين / سنوات / years)
    const tenureMatch = text.match(/(?:على|over|up to)\s*(\d+)\s*(?:سنين|سنوات|سنة|years?)/i) ||
                        text.match(/(\d+)\s*(?:سنين|سنوات|سنة|years?)\s*(?:اقساط|تقسيط|installments)/i);
    if (tenureMatch && tenureMatch[1]) {
      tenureYears = parseInt(tenureMatch[1], 10);
    }

    // 3. Delivery year detection (استلام / delivery)
    const deliveryMatch = text.match(/(?:استلام|delivery)\s*[:=]?\s*(202[4-9]|203[0-5]|فورى|immediate)/i);
    if (deliveryMatch && deliveryMatch[1]) {
      if (/فورى|immediate/i.test(deliveryMatch[1])) {
        deliveryYear = new Date().getFullYear();
      } else {
        deliveryYear = parseInt(deliveryMatch[1], 10);
      }
    }

    // 4. Maintenance detection (صيانة / maintenance)
    const maintMatch = text.match(/(?:صيانة|وديعة|maintenance)\s*[:=]?\s*(\d+(?:\.\d+)?)\s*%/i);
    if (maintMatch && maintMatch[1]) {
      maintenancePercent = parseFloat(maintMatch[1]);
    }

    return {
      totalPrice: defaultPrice,
      downPaymentPercent,
      tenureYears,
      installmentsFrequency: 'quarterly',
      deliveryYear,
      maintenancePercent,
      rawText: text,
    };
  }

  /**
   * Build complete amortization schedule
   */
  public static calculateSchedule(input: PaymentPlanInput): StructuredPaymentPlan {
    const totalPrice = input.totalPrice || 10000000;
    const downPaymentPercent = input.downPaymentPercent ?? 10;
    const downPayment = (totalPrice * downPaymentPercent) / 100;
    const tenureYears = input.tenureYears || 7;
    const frequency = input.installmentsFrequency || 'quarterly';
    const maintenancePercent = input.maintenancePercent ?? 8;
    const maintenanceFee = (totalPrice * maintenancePercent) / 100;

    const periodsPerYear = frequency === 'monthly' ? 12 : frequency === 'semi-annual' ? 2 : frequency === 'annual' ? 1 : 4;
    const totalInstallments = tenureYears * periodsPerYear;
    const remainingPrincipal = totalPrice - downPayment;
    const installmentAmount = Math.round(remainingPrincipal / (totalInstallments || 1));

    const schedule: AmortizationScheduleItem[] = [];
    let currentBalance = totalPrice;

    // Period 0: Down Payment
    currentBalance -= downPayment;
    schedule.push({
      period: 0,
      dueDate: 'Immediate (Signing)',
      type: 'down_payment',
      amount: downPayment,
      remainingBalance: currentBalance,
    });

    // Installments
    for (let i = 1; i <= totalInstallments; i++) {
      const isFinal = i === totalInstallments;
      const payment = isFinal ? currentBalance : installmentAmount;
      currentBalance = Math.max(0, currentBalance - payment);

      schedule.push({
        period: i,
        dueDate: `Quarter ${i} (Month ${i * (12 / periodsPerYear)})`,
        type: 'installment',
        amount: payment,
        remainingBalance: currentBalance,
      });
    }

    return {
      totalPrice,
      downPayment,
      downPaymentPercent,
      tenureYears,
      frequency,
      installmentAmount,
      totalInstallments,
      maintenanceFee,
      deliveryYear: input.deliveryYear,
      schedule,
    };
  }
}
