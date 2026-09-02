import { LeadRouterEngine, } from '../../../packages/agents-core/src/lead-router';

describe('LeadRouterEngine SLA & Specialist Routing', () => {
  it('routes Mivida luxury inquiries to Karim El-Shazly', () => {
    const lead = {
      id: 'lead_001',
      clientName: 'Omar Farouk',
      phone: '+201012345678',
      targetCompound: 'Mivida',
      budgetEGP: 35000000,
      language: 'ar',
      createdAt: new Date().toISOString(),
    };

    const routing = LeadRouterEngine.routeLead(lead);
    expect(routing.assignedBroker.name).toBe('Karim El-Shazly');
    expect(routing.escalationStatus).toBe('pending_broker_ack');
    expect(routing.slaDeadline).toBeDefined();
  });

  it('automatically escalates to Leila Stage-9 Closer if SLA is breached (> 15 mins)', () => {
    const pastTime = new Date(Date.now() - 20 * 60 * 1000); // 20 mins ago
    const lead = {
      id: 'lead_002',
      clientName: 'Sherif Helmy',
      phone: '+201098765432',
      targetCompound: 'Hyde Park',
      budgetEGP: 20000000,
      language: 'en',
      createdAt: pastTime.toISOString(),
    };

    const initialRouting = LeadRouterEngine.routeLead(lead);
    const evaluated = LeadRouterEngine.evaluateSLA(initialRouting, new Date(), false);

    expect(evaluated.escalationStatus).toBe('escalated_to_closer');
    expect(evaluated.closerPersonaName).toContain('Leila Stage-9 Closer AI');
  });

  it('marks assignment accepted when broker acknowledges in time', () => {
    const lead = {
      id: 'lead_003',
      clientName: 'Mona Youssef',
      phone: '+201011223344',
      targetCompound: 'Palm Hills',
      budgetEGP: 45000000,
      language: 'ar',
      createdAt: new Date().toISOString(),
    };

    const initialRouting = LeadRouterEngine.routeLead(lead);
    const evaluated = LeadRouterEngine.evaluateSLA(initialRouting, new Date(), true);

    expect(evaluated.escalationStatus).toBe('accepted_by_broker');
  });
});
