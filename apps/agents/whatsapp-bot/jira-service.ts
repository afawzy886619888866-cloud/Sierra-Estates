/**
 * Jira Integration Service - Sierra Estates
 *
 * Automatically converts qualified WhatsApp and concierge leads into Jira issues.
 * Supports Jira Cloud REST API v3 with Atlassian Document Format (ADF) description,
 * priority mapping, labels, deduplication, and offline dry-run fallback.
 */

export interface JiraLeadPayload {
  phone: string
  name?: string
  intent: string
  propertyCode?: string
  budget?: string
  urgency?: 'low' | 'medium' | 'high' | 'critical'
  message?: string
  conversationSummary?: string
  tags?: string[]
}

export interface JiraTicketResult {
  success: boolean
  key?: string
  id?: string
  url?: string
  dryRun?: boolean
  error?: string
}

export class JiraService {
  private host: string
  private email: string
  private apiToken: string
  private projectKey: string
  private issueType: string
  private dedupWindowMs: number
  private recentTickets: Map<string, { key: string; timestamp: number }> = new Map()

  constructor(options?: {
    host?: string
    email?: string
    apiToken?: string
    projectKey?: string
    issueType?: string
    dedupWindowMs?: number
  }) {
    this.host = (options?.host || process.env.JIRA_HOST || process.env.JIRA_BASE_URL || '').replace(/\/+$/, '')
    this.email = options?.email || process.env.JIRA_EMAIL || process.env.JIRA_USER_EMAIL || ''
    this.apiToken = options?.apiToken || process.env.JIRA_API_TOKEN || ''
    this.projectKey = options?.projectKey || process.env.JIRA_PROJECT_KEY || 'SE'
    this.issueType = options?.issueType || process.env.JIRA_ISSUE_TYPE || 'Task'
    this.dedupWindowMs = options?.dedupWindowMs ?? 15 * 60 * 1000 // 15 minutes default
  }

  /**
   * Check if live Jira credentials are configured.
   */
  public isConfigured(): boolean {
    return Boolean(this.host && this.email && this.apiToken)
  }

  /**
   * Map internal lead urgency to Jira priority names.
   */
  private mapPriority(urgency?: string): string {
    switch (urgency) {
      case 'critical':
        return 'Highest'
      case 'high':
        return 'High'
      case 'medium':
        return 'Medium'
      case 'low':
      default:
        return 'Low'
    }
  }

  /**
   * Build Atlassian Document Format (ADF) for Jira v3 REST API.
   */
  public buildAdfDescription(payload: JiraLeadPayload): Record<string, unknown> {
    const paragraphs: Array<Record<string, unknown>> = []

    // Header paragraph
    paragraphs.push({
      type: 'paragraph',
      content: [
        { type: 'text', text: 'Sierra Estates WhatsApp Lead Intake', marks: [{ type: 'strong' }] },
      ],
    })

    // Lead Details
    const bulletItems: Array<{ type: string; content: unknown[] }> = [
      {
        type: 'listItem',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Client Phone: ', marks: [{ type: 'strong' }] },
              { type: 'text', text: payload.phone },
            ],
          },
        ],
      },
      {
        type: 'listItem',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Lead Name: ', marks: [{ type: 'strong' }] },
              { type: 'text', text: payload.name || 'Anonymous Client' },
            ],
          },
        ],
      },
      {
        type: 'listItem',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Intent: ', marks: [{ type: 'strong' }] },
              { type: 'text', text: payload.intent },
            ],
          },
        ],
      },
    ]

    if (payload.propertyCode) {
      bulletItems.push({
        type: 'listItem',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Property Code: ', marks: [{ type: 'strong' }] },
              { type: 'text', text: payload.propertyCode },
            ],
          },
        ],
      })
    }

    if (payload.budget) {
      bulletItems.push({
        type: 'listItem',
        content: [
          {
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Target Budget: ', marks: [{ type: 'strong' }] },
              { type: 'text', text: payload.budget },
            ],
          },
        ],
      })
    }

    paragraphs.push({
      type: 'bulletList',
      content: bulletItems,
    })

    // User message
    if (payload.message) {
      paragraphs.push({
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Latest Client Message:', marks: [{ type: 'strong' }] },
        ],
      })
      paragraphs.push({
        type: 'blockquote',
        content: [
          {
            type: 'paragraph',
            content: [{ type: 'text', text: payload.message }],
          },
        ],
      })
    }

    // Context / summary
    if (payload.conversationSummary) {
      paragraphs.push({
        type: 'paragraph',
        content: [
          { type: 'text', text: 'Conversation Context:', marks: [{ type: 'strong' }] },
        ],
      })
      paragraphs.push({
        type: 'codeBlock',
        attrs: { language: 'text' },
        content: [{ type: 'text', text: payload.conversationSummary }],
      })
    }

    return {
      type: 'doc',
      version: 1,
      content: paragraphs,
    }
  }

  /**
   * Create a new lead issue in Jira.
   */
  public async createLeadTicket(payload: JiraLeadPayload): Promise<JiraTicketResult> {
    const dedupKey = `${payload.phone}:${payload.intent}`
    const existing = this.recentTickets.get(dedupKey)

    // Deduplication check
    if (existing && Date.now() - existing.timestamp < this.dedupWindowMs) {
      console.log(`[JiraService] Duplicate lead ticket skipped for ${dedupKey}; existing key: ${existing.key}`)
      return {
        success: true,
        key: existing.key,
        url: this.host ? `${this.host}/browse/${existing.key}` : undefined,
        dryRun: false,
      }
    }

    const summary = `[Lead] ${payload.name || payload.phone} · ${payload.intent.replace(/_/g, ' ').toUpperCase()}${
      payload.propertyCode ? ` · ${payload.propertyCode}` : ''
    }`

    // Labels must match Jira regex [a-zA-Z0-9_\-]+
    const labels = [
      'sierra-estates',
      'whatsapp-lead',
      payload.intent.replace(/[^a-zA-Z0-9_-]/g, '-'),
      `urgency-${payload.urgency || 'medium'}`,
      ...(payload.tags || []),
    ].map((l) => l.slice(0, 50))

    // Fallback: Dry Run when unconfigured
    if (!this.isConfigured()) {
      const mockKey = `${this.projectKey}-MOCK-${Date.now().toString().slice(-4)}`
      console.log(`[JiraService] (Dry Run) Jira credentials not set. Simulating ticket creation:`, {
        project: this.projectKey,
        summary,
        priority: this.mapPriority(payload.urgency),
        labels,
      })

      this.recentTickets.set(dedupKey, { key: mockKey, timestamp: Date.now() })

      return {
        success: true,
        key: mockKey,
        id: 'mock-10001',
        url: `https://example.atlassian.net/browse/${mockKey}`,
        dryRun: true,
      }
    }

    try {
      const authHeader = `Basic ${Buffer.from(`${this.email}:${this.apiToken}`).toString('base64')}`
      const body = {
        fields: {
          project: { key: this.projectKey },
          summary,
          issuetype: { name: this.issueType },
          priority: { name: this.mapPriority(payload.urgency) },
          labels,
          description: this.buildAdfDescription(payload),
        },
      }

      const response = await fetch(`${this.host}/rest/api/3/issue`, {
        method: 'POST',
        headers: {
          Authorization: authHeader,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify(body),
      })

      if (!response.ok) {
        const errText = await response.text()
        console.error(`[JiraService] Jira API returned HTTP ${response.status}:`, errText)
        return {
          success: false,
          error: `Jira API error (${response.status}): ${errText}`,
        }
      }

      const data = (await response.json()) as { id: string; key: string; self: string }
      const ticketUrl = `${this.host}/browse/${data.key}`

      console.log(`[JiraService] Successfully created Jira ticket ${data.key}: ${ticketUrl}`)
      this.recentTickets.set(dedupKey, { key: data.key, timestamp: Date.now() })

      return {
        success: true,
        key: data.key,
        id: data.id,
        url: ticketUrl,
        dryRun: false,
      }
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err)
      console.error('[JiraService] Failed to create Jira ticket:', errorMsg)
      return {
        success: false,
        error: errorMsg,
      }
    }
  }
}

export const defaultJiraService = new JiraService()
