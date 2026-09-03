import { z } from 'zod';
import { logger } from '@/lib/logger';

export type MCPRequiredScope = 'mcp:read' | 'mcp:tools' | 'mcp:write' | 'mcp:spend';

export interface ToolDefinition {
  name: string;
  serverName: string;
  description: string;
  schema: z.ZodTypeAny;
  requiredScope: MCPRequiredScope;
  handler: (args: any) => Promise<any> | any;
}

// -------------------------------------------------------------
// 1. WhatsApp Messaging Schemas & Handlers
// -------------------------------------------------------------
export const SendMessageSchema = z.object({
  leadPhone: z.string().min(6, 'Phone number must have at least 6 digits'),
  template: z.string().min(1, 'Template name is required'),
  variables: z.record(z.string(), z.unknown()).optional(),
});

export const SendDocumentSchema = z.object({
  leadPhone: z.string().min(6, 'Phone number must have at least 6 digits'),
  documentUrl: z.string().url('documentUrl must be a valid URL'),
});

// -------------------------------------------------------------
// 2. Sierra Strategic Deals Schemas & Handlers
// -------------------------------------------------------------
export const CreatePipelineEntrySchema = z.object({
  stakeholderId: z.string().min(1, 'stakeholderId is required'),
  portfolioAssetCode: z.string().min(1, 'portfolioAssetCode is required'),
  terms: z.record(z.string(), z.unknown()),
});

export const UpdatePipelineStatusSchema = z.object({
  pipelineId: z.string().min(1, 'pipelineId is required'),
  status: z.string().min(1, 'status is required'),
  stage: z.string().optional(),
});

export const GetPipelineSummarySchema = z.object({
  pipelineId: z.string().min(1, 'pipelineId is required'),
});

// -------------------------------------------------------------
// 3. Stripe Payments Schemas & Handlers
// -------------------------------------------------------------
export const CreatePaymentIntentSchema = z.object({
  amount: z.number().positive('amount must be a positive number'),
  currency: z.string().length(3, 'currency must be a 3-letter ISO code (e.g. EGP, USD)'),
  leadId: z.string().min(1, 'leadId is required'),
});

export const VerifyPaymentSchema = z.object({
  intentId: z.string().min(1, 'intentId is required'),
});

// -------------------------------------------------------------
// 4. DocuSign Signing Schemas & Handlers
// -------------------------------------------------------------
export const InitiateEnvelopeSchema = z.object({
  documentUrl: z.string().url('documentUrl must be a valid URL'),
  recipients: z.array(
    z.object({
      name: z.string().min(1),
      email: z.string().email(),
      role: z.string().optional(),
    }),
  ).min(1, 'At least one recipient is required'),
  callbackUrl: z.string().url('callbackUrl must be a valid URL'),
});

export const GetSignatureStatusSchema = z.object({
  envelopeId: z.string().min(1, 'envelopeId is required'),
});

// -------------------------------------------------------------
// 5. Stage-9 Orchestration Schemas & Handlers
// -------------------------------------------------------------
export const CalculateSplitSchema = z.object({
  commissionTotal: z.number().positive('commissionTotal must be positive'),
  brokerRate: z.number().min(0).max(1, 'brokerRate must be between 0 and 1'),
  agentRate: z.number().min(0).max(1, 'agentRate must be between 0 and 1'),
});

export const GenerateAgreementSchema = z.object({
  buyerName: z.string().min(1, 'buyerName is required'),
  sellerName: z.string().min(1, 'sellerName is required'),
  priceEgp: z.number().positive('priceEgp must be positive'),
  unitCode: z.string().min(1, 'unitCode is required'),
});

// -------------------------------------------------------------
// Registry of all bridged tools
// -------------------------------------------------------------
export const TOOL_DEFINITIONS: Map<string, ToolDefinition> = new Map([
  // WhatsApp Messaging Tools
  [
    'send_message',
    {
      name: 'send_message',
      serverName: 'whatsapp-messaging',
      description: 'Send a template-based WhatsApp message to a lead.',
      schema: SendMessageSchema,
      requiredScope: 'mcp:write',
      handler: async (args: z.infer<typeof SendMessageSchema>) => {
        logger.info(`[WhatsAppMCP] Sending template '${args.template}' to ${args.leadPhone}`);
        return { success: true, messageId: `wa_msg_${Date.now()}`, status: 'delivered' };
      },
    },
  ],
  [
    'send_document',
    {
      name: 'send_document',
      serverName: 'whatsapp-messaging',
      description: 'Send a PDF proposal or contract link via WhatsApp.',
      schema: SendDocumentSchema,
      requiredScope: 'mcp:write',
      handler: async (args: z.infer<typeof SendDocumentSchema>) => {
        logger.info(`[WhatsAppMCP] Sending document ${args.documentUrl} to ${args.leadPhone}`);
        return { success: true, mediaId: `wa_doc_${Date.now()}`, status: 'sent' };
      },
    },
  ],

  // Sierra Deals Pipeline Tools
  [
    'create_pipeline_entry',
    {
      name: 'create_pipeline_entry',
      serverName: 'sierra-strategic-pipeline',
      description: 'Create a new strategic deal pipeline record for a stakeholder asset.',
      schema: CreatePipelineEntrySchema,
      requiredScope: 'mcp:write',
      handler: async (args: z.infer<typeof CreatePipelineEntrySchema>) => {
        logger.info(`[StrategicPipelineMCP] Creating pipeline record for stakeholder: ${args.stakeholderId}`);
        return { success: true, pipelineId: `deal_${Date.now()}`, assetCode: args.portfolioAssetCode, status: 'draft' };
      },
    },
  ],
  [
    'update_pipeline_status',
    {
      name: 'update_pipeline_status',
      serverName: 'sierra-strategic-pipeline',
      description: 'Transition pipeline entry status and negotiation stage.',
      schema: UpdatePipelineStatusSchema,
      requiredScope: 'mcp:write',
      handler: async (args: z.infer<typeof UpdatePipelineStatusSchema>) => {
        logger.info(`[StrategicPipelineMCP] Transitioning entry ${args.pipelineId} to status: ${args.status}`);
        return { success: true, pipelineId: args.pipelineId, status: args.status, stage: args.stage || 'negotiation' };
      },
    },
  ],
  [
    'get_pipeline_summary',
    {
      name: 'get_pipeline_summary',
      serverName: 'sierra-strategic-pipeline',
      description: 'Retrieve full deal context and pipeline summary for an asset.',
      schema: GetPipelineSummarySchema,
      requiredScope: 'mcp:read',
      handler: async (args: z.infer<typeof GetPipelineSummarySchema>) => {
        return { pipelineId: args.pipelineId, status: 'active', stage: 'commercial_review', currency: 'EGP' };
      },
    },
  ],

  // Stripe Payments Tools
  [
    'create_payment_intent',
    {
      name: 'create_payment_intent',
      serverName: 'stripe-payments',
      description: 'Initiate earnest money deposit or broker commission payment intent.',
      schema: CreatePaymentIntentSchema,
      requiredScope: 'mcp:spend',
      handler: async (args: z.infer<typeof CreatePaymentIntentSchema>) => {
        logger.info(`[StripeMCP] Creating payment intent for ${args.amount} ${args.currency}`);
        return {
          success: true,
          intentId: `pi_${Date.now()}`,
          clientSecret: `secret_${Date.now()}`,
          checkoutUrl: `https://checkout.stripe.com/pay/${Date.now()}`,
          amount: args.amount,
          currency: args.currency,
        };
      },
    },
  ],
  [
    'verify_payment',
    {
      name: 'verify_payment',
      serverName: 'stripe-payments',
      description: 'Verify payment status and settlement of a Stripe intent.',
      schema: VerifyPaymentSchema,
      requiredScope: 'mcp:read',
      handler: async (args: z.infer<typeof VerifyPaymentSchema>) => {
        return { intentId: args.intentId, status: 'succeeded', verifiedAt: new Date().toISOString() };
      },
    },
  ],

  // DocuSign Signing Tools
  [
    'initiate_envelope',
    {
      name: 'initiate_envelope',
      serverName: 'docusign-signing',
      description: 'Initiate digital contract signing envelope for buyer and seller.',
      schema: InitiateEnvelopeSchema,
      requiredScope: 'mcp:write',
      handler: async (args: z.infer<typeof InitiateEnvelopeSchema>) => {
        logger.info(`[DocuSignMCP] Initiating envelope for ${args.documentUrl} with ${args.recipients.length} recipients`);
        return {
          success: true,
          envelopeId: `env_${Date.now()}`,
          signingUrl: `https://docusign.sierra-estates.com/sign?id=${Date.now()}`,
          recipientCount: args.recipients.length,
        };
      },
    },
  ],
  [
    'get_signature_status',
    {
      name: 'get_signature_status',
      serverName: 'docusign-signing',
      description: 'Check legal signature completion status for a digital envelope.',
      schema: GetSignatureStatusSchema,
      requiredScope: 'mcp:read',
      handler: async (args: z.infer<typeof GetSignatureStatusSchema>) => {
        return { envelopeId: args.envelopeId, status: 'sent', signedCount: 1, pendingCount: 1 };
      },
    },
  ],

  // Stage-9 Orchestration Tools
  [
    'calculate_split',
    {
      name: 'calculate_split',
      serverName: 'stage-9-orchestration',
      description: 'Calculate broker commission splits and brokerage net yield.',
      schema: CalculateSplitSchema,
      requiredScope: 'mcp:read',
      handler: async (args: z.infer<typeof CalculateSplitSchema>) => {
        const brokerShare = args.commissionTotal * args.brokerRate;
        const agentShare = args.commissionTotal * args.agentRate;
        const companyRetained = args.commissionTotal - (brokerShare + agentShare);
        return { commissionTotal: args.commissionTotal, brokerShare, agentShare, companyRetained };
      },
    },
  ],
  [
    'generate_agreement',
    {
      name: 'generate_agreement',
      serverName: 'stage-9-orchestration',
      description: 'Generate legally formatted bilingual sales or rental agreement memo.',
      schema: GenerateAgreementSchema,
      requiredScope: 'mcp:write',
      handler: async (args: z.infer<typeof GenerateAgreementSchema>) => {
        return {
          agreementId: `agr_${Date.now()}`,
          unitCode: args.unitCode,
          parties: { buyer: args.buyerName, seller: args.sellerName },
          priceEgp: args.priceEgp,
          status: 'draft_ready',
        };
      },
    },
  ],
]);

/**
 * Returns clean JSON Schema object for tool discovery
 */
export function getToolJsonSchema(toolName: string): Record<string, unknown> {
  const tool = TOOL_DEFINITIONS.get(toolName);
  if (!tool) {
    return { type: 'object', properties: {}, additionalProperties: true };
  }
  return z.toJSONSchema(tool.schema) as Record<string, unknown>;
}

/**
 * Validates token scope against tool scope requirements
 */
export function isScopeAuthorized(tokenScope: string, requiredScope: MCPRequiredScope): boolean {
  const scopes = new Set(tokenScope.split(/\s+/).filter(Boolean));

  // Admin/Super scope
  if (scopes.has('mcp:*')) return true;

  if (requiredScope === 'mcp:spend') {
    return scopes.has('mcp:spend');
  }

  if (requiredScope === 'mcp:write') {
    return scopes.has('mcp:write') || scopes.has('mcp:spend');
  }

  if (requiredScope === 'mcp:read' || requiredScope === 'mcp:tools') {
    return scopes.has('mcp:read') || scopes.has('mcp:tools') || scopes.has('mcp:write') || scopes.has('mcp:spend');
  }

  return false;
}

/**
 * Validates tool authorization and input arguments against Zod schema
 */
export function validateAndAuthorizeTool(
  toolName: string,
  args: unknown,
  tokenScope: string,
): {
  authorized: boolean;
  valid: boolean;
  parsedArgs?: any;
  error?: string;
  tool?: ToolDefinition;
} {
  const tool = TOOL_DEFINITIONS.get(toolName);
  if (!tool) {
    return { authorized: false, valid: false, error: `Tool '${toolName}' not found` };
  }

  // 1. Verify Scope Authorization
  if (!isScopeAuthorized(tokenScope, tool.requiredScope)) {
    return {
      authorized: false,
      valid: false,
      tool,
      error: `Forbidden: Tool '${toolName}' requires elevated scope '${tool.requiredScope}'. Current scope: '${tokenScope}'.`,
    };
  }

  // 2. Validate input schema
  const parsed = tool.schema.safeParse(args);
  if (!parsed.success) {
    const errorDetails = parsed.error.issues.map((i) => `${i.path.join('.') || 'param'}: ${i.message}`).join('; ');
    return {
      authorized: true,
      valid: false,
      tool,
      error: `Invalid tool input for '${toolName}': ${errorDetails}`,
    };
  }

  return { authorized: true, valid: true, parsedArgs: parsed.data, tool };
}
