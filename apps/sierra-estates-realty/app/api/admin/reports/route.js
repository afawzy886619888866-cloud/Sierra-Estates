 function _nullishCoalesce(lhs, rhsFn) { if (lhs != null) { return lhs; } else { return rhsFn(); } } function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { NextResponse } from 'next/server';
import { verifyAdminRequest } from '@/lib/server/auth-guard';
import { adminDb } from '@/lib/server/firebase-admin';
import { COLLECTIONS } from '@/lib/models/schema';
import { Timestamp, } from 'firebase-admin/firestore';
import { logger } from '@/lib/logger';

export async function GET(req) {
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
    const startTs = Timestamp.fromDate(startDate);

    let data = {};

    if (reportType === 'summary' || reportType === 'all') {
      const [unitsCount, leadsCount, dealsSnap, salesSnap] = await Promise.all([
        adminDb.collection(COLLECTIONS.units).count().get(),
        adminDb.collection(COLLECTIONS.stakeholders).count().get(),
        adminDb.collection(COLLECTIONS.strategicPipeline).where('stage', '==', 'closed').count().get(),
        adminDb.collection(COLLECTIONS.sales)
          .where('createdAt', '>=', startTs)
          .get(),
      ]);

      const totalRevenue = salesSnap.docs.reduce(
        (sum, d) => sum + (d.data().salePrice || 0),
        0,
      );
      const closedDeals = dealsSnap.data().count;

      data = {
        ...data,
        metrics: {
          totalUnits: unitsCount.data().count,
          totalLeads: leadsCount.data().count,
          closedDeals,
          avgDealValue: closedDeals > 0 ? Math.round(totalRevenue / closedDeals) : 0,
        },
      };
    }

    if (reportType === 'deals' || reportType === 'all') {
      const dealsSnap = await adminDb
        .collection(COLLECTIONS.strategicPipeline)
        .where('createdAt', '>=', startTs)
        .orderBy('createdAt', 'desc')
        .get();

      const dealsByMonth = {};
      dealsSnap.forEach((doc) => {
        const date = _nullishCoalesce(_optionalChain([doc, 'access', _ => _.data, 'call', _2 => _2(), 'access', _3 => _3.createdAt, 'optionalAccess', _4 => _4.toDate, 'optionalCall', _5 => _5()]), () => ( new Date()));
        const month = date.toLocaleDateString('en-US', { month: 'short' });
        dealsByMonth[month] = (dealsByMonth[month] || 0) + 1;
      });

      data = {
        ...data,
        dealTrends: Object.entries(dealsByMonth).map(([month, deals]) => ({ month, deals })),
      };
    }

    if (reportType === 'agents' || reportType === 'all') {
      const [agentsSnap, salesSnap] = await Promise.all([
        adminDb.collection(COLLECTIONS.users)
          .where('role', 'in', ['admin', 'agent', 'broker'])
          .get(),
        adminDb.collection(COLLECTIONS.sales)
          .where('createdAt', '>=', startTs)
          .get(),
      ]);

      // Aggregate deals & revenue per agent
      const agentMap = {};
      salesSnap.forEach((doc) => {
        const { agentId, agentName, salePrice } = doc.data();
        if (!agentId) return;
        if (!agentMap[agentId]) agentMap[agentId] = { name: agentName || 'Unknown', deals: 0, revenue: 0 };
        agentMap[agentId].deals += 1;
        agentMap[agentId].revenue += salePrice || 0;
      });

      // Fallback: include agents with 0 deals from users collection
      agentsSnap.forEach((doc) => {
        const { name } = doc.data();
        if (!agentMap[doc.id]) agentMap[doc.id] = { name: name || 'Unknown', deals: 0, revenue: 0 };
      });

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
