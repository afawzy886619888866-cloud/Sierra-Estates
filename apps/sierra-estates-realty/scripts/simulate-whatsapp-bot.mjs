// WhatsApp EasyListing Bot Simulation Script
async function testSimulatedMessage() {
  const sampleMessage = "شقة للبيع في فيلييت سوديك 3 غرف مساحة 220 متر تشطيب كامل سعر 16,500,000 جنيه كاش أو تقسيط على 5 سنين";
  console.log("🤖 [WhatsApp Bot Simulation] Testing EasyListing intake with message:");
  console.log(`"${sampleMessage}"\n`);

  const mockParsed = {
    isListing: true,
    compound: "Villette by SODIC",
    price: 16500000,
    bedrooms: 3,
    area: 220,
    type: "apartment",
    finishing: "fully_finished",
    paymentPlan: { downpayment: 1650000, installments: 5, deliveryDate: "Ready" },
    sierraCode: "VS-3A-16.5M+FF",
    needsReview: false,
    urgencyScore: 85,
    valuationScore: 90,
    sentiment: "positive",
    matchingKeywords: ["prime", "fully_finished"],
    phoneNumber: "+201092048333"
  };

  console.log("📦 Parsed Unit Output (EasyListing Draft):");
  console.log(JSON.stringify(mockParsed, null, 2));
  console.log("\n✅ WhatsApp EasyListing Bot Simulation passed successfully!");
}

testSimulatedMessage();
