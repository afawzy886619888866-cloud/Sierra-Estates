import { InstallmentCalculator } from '../../../packages/agents-core/src/installment-calculator';

describe('InstallmentCalculator Financial Engine', () => {
  it('parses Arabic broker payment terms with 10% down and 8 years tenure', () => {
    const rawText = 'فيلا للبيع في ميفيدا مقدم 10% واقساط على 8 سنين واستلام 2026';
    const parsed = InstallmentCalculator.parseBrokerPaymentTerms(rawText, 38000000);

    expect(parsed.downPaymentPercent).toBe(10);
    expect(parsed.tenureYears).toBe(8);
    expect(parsed.deliveryYear).toBe(2026);
  });

  it('calculates accurate quarterly amortization schedule', () => {
    const parsed = {
      totalPrice: 20000000,
      downPaymentPercent: 10,
      tenureYears: 5,
      installmentsFrequency: 'quarterly' ,
    };

    const result = InstallmentCalculator.calculateSchedule(parsed);
    expect(result.downPayment).toBe(2000000);
    expect(result.totalInstallments).toBe(20);
    expect(result.schedule.length).toBe(21); // Down payment + 20 installments
    expect(result.schedule[0].amount).toBe(2000000);
    expect(result.schedule[20].remainingBalance).toBe(0);
  });
});
