import { NextRequest, NextResponse } from "next/server";
import {
  computeFullMetrics,
  formatCompactEGP,
  type UnitFinancials,
  type UnitIntelligenceFactors,
} from "@sierra-estates/agents";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    const purchasePrice = Number(body.purchasePrice || body.price || 0);
    const areaSqm = Number(body.areaSqm || body.area || 0);
    const monthlyRent = Number(
      body.monthlyRent ||
        (body.mode === "rent" ? body.price : (purchasePrice * 0.08) / 12) ||
        0,
    );
    const annualServiceCharge = Number(
      body.annualServiceCharge ||
        (purchasePrice > 0 ? purchasePrice * 0.01 : 0),
    );
    const currentMarketValue = Number(body.currentMarketValue || purchasePrice);

    const inputs: UnitFinancials = {
      purchasePrice,
      currentMarketValue,
      monthlyRent,
      annualServiceCharge,
    };

    const coefficients: UnitIntelligenceFactors = {
      standard: body.standard || "luxury",
      condition: body.condition || "good",
      localityScore: Number(body.localityScore || 4),
    };

    const metrics = computeFullMetrics(inputs, areaSqm, coefficients);

    return NextResponse.json({
      success: true,
      data: {
        ...metrics,
        formattedPurchasePrice: formatCompactEGP(purchasePrice),
        formattedAppraisedValue: formatCompactEGP(metrics.appraisedValue),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: (error as Error).message,
      },
      { status: 400 },
    );
  }
}
