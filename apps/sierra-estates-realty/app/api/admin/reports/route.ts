import { NextRequest, NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/server/auth-guard';
import { listRecords, countRecords, type RecordData } from '@sierra-estates/db';
import { logger } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const authResult = await verifyAdminRequest(req);
  if (!authResult.authenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const timeRange = searchParams.get('timeRange') || 'month';
    const reportType = searchParams.get('type') || 'summary';

    const now = new Date();
    const startDate = new Date();
    switch (timeRange) {
      case 'week':    startDate.setDate(now.getDate() - 7);       break;
      case 'month':   startDate.setMonth(now.getMonth() - 1);     break;
      case 'quarter': startDate.setMonth(now.getMonth() - 3);     break;
      case 'year':    startDate.setFullYear(now.getFullYear() - 1); break;
    }
    const startTs = startDate.toISOString();

    let data: Record<string, unknown> = {};

    if (reportType === 'summary' || reportType === 'all') {
      const [totalUnits, totalLeads, closedDeals, sales] = await Promise.all([
        countRecords('listings'),
        countRecords('leads'),
        countRecords('strategic_pipeline', [{ column: 'stage', value: 'closed' }]),
        listRecords<RecordData>('sales', {
          where: [{ column: 'createdAt', op: 'gte', value: startTs }],
        }),
      ]);

      const totalRevenue = sales.reduce(
        (sum: number, sale) => sum + (Number(sale.salePrice) || 0),
        0,
      );

      data = {
        ...data,
        metrics: {
          totalUnits,
          totalLeads,
          closedDeals,
          avgDealValue: closedDeals > 0 ? Math.round(totalRevenue / closedDeals) : 0,
        },
      };
    }

    if (reportType === 'deals' || reportType === 'all') {
      const deals = await listRecords<RecordData>('strategic_pipeline', {
        where: [{ column: 'createdAt', op: 'gte', value: startTs }],
        orderBy: { column: 'createdAt', ascending: false },
      });

      const dealsByMonth: Record<string, number> = {};
      for (const deal of deals) {
        const date = deal.createdAt ? new Date(String(deal.createdAt)) : new Date();
        const month = date.toLocaleDateString('en-US', { month: 'short' });
        dealsByMonth[month] = (dealsByMonth[month] || 0) + 1;
      }

      data = {
        ...data,
        dealTrends: Object.entries(dealsByMonth).map(([month, deals]) => ({ month, deals })),
      };
    }

    if (reportType === 'agents' || reportType === 'all') {
      const [agents, sales] = await Promise.all([
        listRecords<RecordData>('profiles', {
          where: [{ column: 'role', op: 'in', value: ['admin', 'agent', 'broker'] }],
        }),
        listRecords<RecordData>('sales', {
          where: [{ column: 'createdAt', op: 'gte', value: startTs }],
        }),
      ]);

      // Aggregate deals & revenue per agent
      const agentMap: Record<string, { name: string; deals: number; revenue: number }> = {};
      for (const sale of sales) {
        const agentId = sale.agentId ? String(sale.agentId) : '';
        if (!agentId) continue;
        if (!agentMap[agentId]) {
          agentMap[agentId] = { name: (sale.agentName as string) || 'Unknown', deals: 0, revenue: 0 };
        }
        agentMap[agentId].deals += 1;
        agentMap[agentId].revenue += Number(sale.salePrice) || 0;
      }

      // Fallback: include agents with 0 deals from the profiles table
      for (const agent of agents) {
        const id = String(agent.id);
        // profiles.full_name is the Firestore users doc's `name`.
        if (!agentMap[id]) agentMap[id] = { name: (agent.fullName as string) || 'Unknown', deals: 0, revenue: 0 };
      }

      const topAgents = Object.values(agentMap)
        .sort((a, b) => b.deals - a.deals)
        .slice(0, 10);

      data = { ...data, topAgents };
    }

    return NextResponse.json({ success: true, timeRange, data });
  } catch (err) {
    logger.error('Error generating report:', err);
    return NextResponse.json(
      { error: 'Failed to generate report', details: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
