/**
 * Sierra Estates Dynamic Lead Router & SLA Escalation Engine
 * Intelligently routes high-intent real estate inquiries to specialized brokers
 * with automated 15-minute SLA failover to Stage-9 Closer Leila.
 */

export interface BrokerSpecialist {
  id: string;
  name: string;
  specializedCompounds: string[];
  preferredPriceMinEGP: number;
  languages: ('ar' | 'en')[];
  activeLeadsCount: number;
  isAvailable: boolean;
}

export interface InboundLead {
  id: string;
  clientName: string;
  phone: string;
  targetCompound?: string;
  budgetEGP: number;
  language: 'ar' | 'en';
  createdAt: string;
}

export interface RoutingAssignment {
  leadId: string;
  assignedBroker: BrokerSpecialist;
  matchScore: number;
  slaDeadline: string;
  escalationStatus: 'pending_broker_ack' | 'escalated_to_closer' | 'accepted_by_broker';
  closerPersonaName?: string;
  notificationMessage: {
    ar: string;
    en: string;
  };
}

export const DEFAULT_BROKER_FLEET: BrokerSpecialist[] = [
  {
    id: 'brk_mivida_expert',
    name: 'Karim El-Shazly',
    specializedCompounds: ['Mivida', 'Uptown Cairo', 'Marassi'],
    preferredPriceMinEGP: 25000000,
    languages: ['ar', 'en'],
    activeLeadsCount: 2,
    isAvailable: true,
  },
  {
    id: 'brk_hyde_park_expert',
    name: 'Nadine Mansour',
    specializedCompounds: ['Hyde Park', 'Mountain View', 'Palm Hills'],
    preferredPriceMinEGP: 15000000,
    languages: ['ar', 'en'],
    activeLeadsCount: 1,
    isAvailable: true,
  },
  {
    id: 'brk_luxury_penthouse_expert',
    name: 'Tarek Zaki',
    specializedCompounds: ['Palm Hills', 'Swan Lake', 'Katameya Dunes'],
    preferredPriceMinEGP: 40000000,
    languages: ['ar', 'en'],
    activeLeadsCount: 0,
    isAvailable: true,
  },
];

export class LeadRouterEngine {
  /**
   * Match an inbound lead to the best broker in the fleet
   */
  public static routeLead(
    lead: InboundLead,
    fleet: BrokerSpecialist[] = DEFAULT_BROKER_FLEET
  ): RoutingAssignment {
    let bestBroker = fleet[0];
    let highestScore = -1;

    for (const broker of fleet) {
      if (!broker.isAvailable) continue;

      let score = 50; // Base score

      // Compound match (+30)
      if (
        lead.targetCompound &&
        broker.specializedCompounds.some((c) =>
          c.toLowerCase().includes(lead.targetCompound!.toLowerCase())
        )
      ) {
        score += 30;
      }

      // Budget match (+20)
      if (lead.budgetEGP >= broker.preferredPriceMinEGP) {
        score += 20;
      }

      // Language match (+10)
      if (broker.languages.includes(lead.language)) {
        score += 10;
      }

      // Workload penalty (-5 per active lead)
      score -= broker.activeLeadsCount * 5;

      if (score > highestScore) {
        highestScore = score;
        bestBroker = broker;
      }
    }

    const createdTime = new Date(lead.createdAt).getTime();
    const slaDeadline = new Date(createdTime + 15 * 60 * 1000).toISOString();

    return {
      leadId: lead.id,
      assignedBroker: bestBroker,
      matchScore: highestScore,
      slaDeadline,
      escalationStatus: 'pending_broker_ack',
      notificationMessage: {
        ar: `تم تحويل عميل جديد (${lead.clientName}) لمشروع ${lead.targetCompound || 'القاهرة الجديدة'}. مهلة الاستجابة 15 دقيقة.`,
        en: `New VIP lead (${lead.clientName}) dispatched for ${lead.targetCompound || 'New Cairo'}. 15-min SLA active.`,
      },
    };
  }

  /**
   * Check SLA status and escalate to Stage-9 Closer Leila if timeout breached
   */
  public static evaluateSLA(
    assignment: RoutingAssignment,
    currentTime: Date = new Date(),
    isAcknowledgedByBroker: boolean = false
  ): RoutingAssignment {
    if (isAcknowledgedByBroker) {
      return {
        ...assignment,
        escalationStatus: 'accepted_by_broker',
      };
    }

    const deadline = new Date(assignment.slaDeadline).getTime();
    const current = currentTime.getTime();

    if (current > deadline) {
      return {
        ...assignment,
        escalationStatus: 'escalated_to_closer',
        closerPersonaName: 'Leila Stage-9 Closer AI',
        notificationMessage: {
          ar: `⚠️ تم تصعيد العميل إلى وكيل الذكاء الاصطناعي ليلى لعدم استجابة الوسيط خلال 15 دقيقة.`,
          en: `⚠️ Lead automatically escalated to Leila Stage-9 Closer AI due to 15-min broker SLA breach.`,
        },
      };
    }

    return assignment;
  }
}
