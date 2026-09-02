 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }
import { sharedMemory } from '../../memory-engine/src/index.js';

export class AgentWorkflows {
  

  constructor(orchestrator) {
    this.orchestrator = orchestrator;
  }

  /**
   * 🤖 5-Agent WhatsApp Lead & Deal Pipeline
   * Pipeline Flow: Liela (Triage) ➔ Sierra (Valuation & Matching) ➔ OpenClaw (Inventory & Ops) ➔ Hermes (Main Closer Communication) ➔ Closer (Stage 9 Contract & Closing)
   * All 5 agents read/write to SharedMemoryBus.
   */
  async runWhatsApp5AgentPipeline(
    inboundMessage,
    senderPhone,
    metadata = {}
  )



 {
    const cleanPhone = senderPhone.replace(/[^0-9+]/g, '');

    // Log Inbound Event to Shared Memory Bus
    await sharedMemory.write(
      `lead:${cleanPhone}:inbound`,
      {
        message: inboundMessage,
        sender: cleanPhone,
        metadata,
        receivedAt: new Date().toISOString(),
      },
      { author: 'system', tags: ['inbound', 'whatsapp', cleanPhone] }
    );

    const pipelineResults = await this.orchestrator.orchestratePipeline(
      `WhatsApp 5-Agent Pipeline for ${cleanPhone}`,
      [
        // 1. LIELA: Intent Detection, Triage & Qualification
        {
          agentName: 'liela',
          taskDescription: `Analyze inbound WhatsApp message from ${cleanPhone}: "${inboundMessage}". Extract buyer intent, budget, preferred compounds (e.g. Mivida, Hyde Park, Cairo Plaza), unit category, and urgency level.`,
        },
        // 2. SIERRA: Property Search, Valuation & Price Benchmarking
        {
          agentName: 'sierra',
          taskDescription: `Using the intent parsed by Liela, query Sierra Estates Master Inventory (9,000+ units) and AVM pricing models. Identify the top 2-3 matching resale and primary investment options with price-per-meter and expected yields.`,
        },
        // 3. OPENCLAW: Operational Data Retrieval & Inventory Verification
        {
          agentName: 'openclaw',
          taskDescription: `Verify live availability, developer payment plans, and owner direct/broker channel validity for the units matched by Sierra. Flag any immediate viewing opportunities or price reductions.`,
        },
        // 4. HERMES (MAIN): Natural Egyptian Arabic Closer Communication
        {
          agentName: 'hermes',
          taskDescription: `Synthesize findings from Liela, Sierra, and OpenClaw. Craft the final, high-converting customer-facing WhatsApp reply in polished Egyptian Arabic (اللهجة المصرية الراقية) or English (matching client language). Qualify the next step toward a private viewing or advisor call.`,
        },
        // 5. CLOSER AGENT (STAGE 9): Deal Follow-up & Contract Staging
        {
          agentName: 'closer',
          taskDescription: `Structure the deal file for ${cleanPhone}. Formulate payment schedule scenarios (downpayment, installments, cash discount) and stage viewing appointment milestones for the assigned broker desk.`,
        },
      ],
      `Client Phone: ${cleanPhone} | Channel: WhatsApp Meta/Direct | Initial Query: "${inboundMessage}"`
    );

    // Extract Hermes output as the customer-facing message
    const hermesResult = pipelineResults.find((r) => r.agentName === 'hermes' && r.status === 'success');
    const finalClientMessage = _optionalChain([hermesResult, 'optionalAccess', _ => _.output]) || 'أهلاً بك في سييرا العقارية، جاري تجهيز أفضل الخيارات المتاحة لك من فريقنا الاستشاري.';

    // Extract Closer output
    const closerResult = pipelineResults.find((r) => r.agentName === 'closer' && r.status === 'success');
    const dealSummary = _optionalChain([closerResult, 'optionalAccess', _2 => _2.output]) || 'Deal file initiated.';

    // Record Pipeline Completion to Shared Memory Bus
    await sharedMemory.write(
      `lead:${cleanPhone}:pipeline_state`,
      {
        phone: cleanPhone,
        finalMessage: finalClientMessage,
        dealState: dealSummary,
        completedAt: new Date().toISOString(),
        stagesCompleted: pipelineResults.map((r) => ({ agent: r.agentName, status: r.status })),
      },
      { author: 'hermes', tags: ['pipeline_complete', 'whatsapp', cleanPhone] }
    );

    return {
      pipelineResults,
      finalClientMessage,
      dealSummary,
    };
  }

  /**
   * API Design & Implementation Workflow
   */
  async runApiWorkflow(taskDescription) {
    return this.orchestrator.orchestratePipeline(
      'API Workflow',
      [
        {
          agentName: 'database-architect',
          taskDescription: `Analyze requirements and design schema/models for: ${taskDescription}`,
        },
        {
          agentName: 'backend-specialist',
          taskDescription: `Implement endpoints and business logic based on the schema design for: ${taskDescription}`,
        },
        {
          agentName: 'security-auditor',
          taskDescription: `Audit the implemented endpoints for SQL injection, auth issues, and vulnerability checks.`,
        },
        {
          agentName: 'documentation-writer',
          taskDescription: `Generate API reference docs and update status.`,
        },
      ],
      taskDescription
    );
  }

  /**
   * Debugging and Bugfixing Workflow
   */
  async runDebugWorkflow(taskDescription) {
    return this.orchestrator.orchestratePipeline(
      'Debug Workflow',
      [
        {
          agentName: 'code-archaeologist',
          taskDescription: `Trace logs, search codebase, and isolate root cause for: ${taskDescription}`,
        },
        {
          agentName: 'debugger',
          taskDescription: `Develop fix, address syntax/logic issues, and refactor code.`,
        },
        {
          agentName: 'test-engineer',
          taskDescription: `Verify changes by running/generating test cases.`,
        },
      ],
      taskDescription
    );
  }

  /**
   * Plan & Architecture Workflow
   */
  async runPlanWorkflow(taskDescription) {
    return this.orchestrator.orchestratePipeline(
      'Plan Workflow',
      [
        {
          agentName: 'project-planner',
          taskDescription: `Decompose task into atomic list of subtasks, estimate constraints: ${taskDescription}`,
        },
        {
          agentName: 'orchestrator',
          agentName_fallback: 'orchestrator',
          taskDescription: `Review project architecture, dependencies, and verify alignment.`,
        } ,
      ],
      taskDescription
    );
  }

  /**
   * Security Audit Workflow
   */
  async runSecurityWorkflow(taskDescription) {
    return this.orchestrator.orchestratePipeline(
      'Security Workflow',
      [
        {
          agentName: 'penetration-tester',
          taskDescription: `Identify attack vectors and check dependencies for CVEs: ${taskDescription}`,
        },
        {
          agentName: 'security-auditor',
          taskDescription: `Review code changes against OWASP standards.`,
        },
      ],
      taskDescription
    );
  }

  /**
   * Quality Audit & Compliance Check
   */
  async runAuditWorkflow(taskDescription) {
    return this.orchestrator.orchestratePipeline(
      'Audit Workflow',
      [
        {
          agentName: 'quality-inspector',
          taskDescription: `Verify compliance of code changes, lint issues, and guidelines: ${taskDescription}`,
        },
        {
          agentName: 'qa-automation-engineer',
          taskDescription: `Run full test suite (lint, unit, build checks).`,
        },
      ],
      taskDescription
    );
  }

  /**
   * UI/UX Enhancement Workflow
   */
  async runUiUxWorkflow(taskDescription) {
    return this.orchestrator.orchestratePipeline(
      'UI/UX Enhancement Workflow',
      [
        {
          agentName: 'product-manager',
          taskDescription: `Analyze user flow and define interactions/visual specs for: ${taskDescription}`,
        },
        {
          agentName: 'frontend-specialist',
          taskDescription: `Implement responsive design, animations, and typography enhancements.`,
        },
        {
          agentName: 'performance-optimizer',
          taskDescription: `Optimize bundles, images, and rendering performance.`,
        },
      ],
      taskDescription
    );
  }

  /**
   * Intelligence OS AI Admin & Predictive Analytics Workflow
   */
  async runIntelligenceWorkflow(taskDescription) {
    return this.orchestrator.orchestratePipeline(
      'Intelligence OS Workflow',
      [
        {
          agentName: 'orchestrator',
          taskDescription: `Interpret NLP admin command, parse intent, and identify data entities for: ${taskDescription}`,
        },
        {
          agentName: 'backend-specialist',
          taskDescription: `Execute predictive modeling, ML confidence scoring, and smart segmentation for: ${taskDescription}`,
        },
        {
          agentName: 'quality-inspector',
          taskDescription: `Verify rule thresholds, safety guardrails, and auto-approval compliance.`,
        },
        {
          agentName: 'documentation-writer',
          taskDescription: `Generate bilingual personalized notifications, explanation rationale, and audit logs.`,
        },
      ],
      taskDescription
    );
  }
}
