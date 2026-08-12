export const leilaTemplates = {
  viewingFollowUp: {
    en: (name: string, property: string) =>
      `Dear ${name}, thank you for viewing ${property}. We'd love to share our exclusive investment analysis. Shall we schedule a follow-up call?`,
    ar: (name: string, property: string) =>
      `عزيزنا ${name}، شكراً لزيارتك لـ${property}. نودّ مشاركتك تحليلنا الاستثماري الحصري. هل نحدد موعد للمتابعة؟`,
  },

  proposalReady: {
    en: (name: string, proposalUrl: string) =>
      `Dear ${name}, your exclusive investment proposal is ready. View it here: ${proposalUrl}`,
    ar: (name: string, proposalUrl: string) =>
      `عزيزنا ${name}، عرضك الاستثماري الحصري جاهز. شاهده هنا: ${proposalUrl}`,
  },

  paymentReminder: {
    en: (name: string, amount: number, dueDate: string) =>
      `Dear ${name}, a friendly reminder that your payment of ${amount.toLocaleString()} EGP is due on ${dueDate}.`,
    ar: (name: string, amount: number, dueDate: string) =>
      `عزيزنا ${name}، تذكير ودي بأن دفعتك البالغة ${amount.toLocaleString()} جنيه مستحقة في ${dueDate}.`,
  },

  signingComplete: {
    en: (name: string, property: string) =>
      `Congratulations ${name}! The contract for ${property} has been signed. Welcome to the Sierra Estates family!`,
    ar: (name: string, property: string) =>
      `مبروك ${name}! تم توقيع عقد ${property}. أهلاً وسهلاً في عائلة Sierra Estates!`,
  },
};
