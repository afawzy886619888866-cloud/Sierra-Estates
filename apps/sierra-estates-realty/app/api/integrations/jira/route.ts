import { NextResponse } from 'next/server';
import { z } from 'zod';

const jiraLeadSchema = z.object({
  phone: z.string().min(6, 'Phone number must be at least 6 digits'),
  name: z.string().optional(),
  email: z.string().email().optional(),
  intent: z.string().default('property_inquiry'),
  propertyCode: z.string().optional(),
  budget: z.string().optional(),
  urgency: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  message: z.string().optional(),
  source: z.string().default('web_integration'),
});

export async function POST(req: Request) {
  try {
    const rawBody = await req.json();
    const parseResult = jiraLeadSchema.safeParse(rawBody);

    if (!parseResult.success) {
      return NextResponse.json(
        { ok: false, error: 'Validation failed', details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const payload = parseResult.data;
    const host = (process.env.JIRA_HOST || process.env.JIRA_BASE_URL || '').replace(/\/+$/, '');
    const email = process.env.JIRA_EMAIL || process.env.JIRA_USER_EMAIL || '';
    const apiToken = process.env.JIRA_API_TOKEN || '';
    const projectKey = process.env.JIRA_PROJECT_KEY || 'SE';
    const issueType = process.env.JIRA_ISSUE_TYPE || 'Task';
    const n8nWebhookUrl = process.env.N8N_JIRA_WEBHOOK_URL;

    // Optional dispatch to n8n webhook if configured
    if (n8nWebhookUrl) {
      fetch(n8nWebhookUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch((n8nErr) => console.warn('[Jira Route] Failed forwarding to n8n:', n8nErr));
    }

    // Direct Jira REST API integration
    if (!host || !email || !apiToken) {
      const mockKey = `${projectKey}-MOCK-${Date.now().toString().slice(-4)}`;
      return NextResponse.json({
        ok: true,
        dryRun: true,
        ticketKey: mockKey,
        ticketUrl: `https://example.atlassian.net/browse/${mockKey}`,
        message: 'Jira credentials not set in environment; dry-run response returned.',
      });
    }

    const priorityMap: Record<string, string> = {
      critical: 'Highest',
      high: 'High',
      medium: 'Medium',
      low: 'Low',
    };

    const summary = `[Web Lead] ${payload.name || payload.phone} · ${payload.intent.toUpperCase()}${
      payload.propertyCode ? ` · ${payload.propertyCode}` : ''
    }`;

    const adfDescription = {
      type: 'doc',
      version: 1,
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Sierra Estates Web Lead Intake', marks: [{ type: 'strong' }] }],
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Phone: ', marks: [{ type: 'strong' }] }, { type: 'text', text: payload.phone }],
                },
              ],
            },
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Name: ', marks: [{ type: 'strong' }] }, { type: 'text', text: payload.name || 'Anonymous' }],
                },
              ],
            },
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Source: ', marks: [{ type: 'strong' }] }, { type: 'text', text: payload.source }],
                },
              ],
            },
            {
              type: 'listItem',
              content: [
                {
                  type: 'paragraph',
                  content: [{ type: 'text', text: 'Intent: ', marks: [{ type: 'strong' }] }, { type: 'text', text: payload.intent }],
                },
              ],
            },
            ...(payload.propertyCode
              ? [
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        content: [{ type: 'text', text: 'Property Code: ', marks: [{ type: 'strong' }] }, { type: 'text', text: payload.propertyCode }],
                      },
                    ],
                  },
                ]
              : []),
            ...(payload.budget
              ? [
                  {
                    type: 'listItem',
                    content: [
                      {
                        type: 'paragraph',
                        content: [{ type: 'text', text: 'Budget: ', marks: [{ type: 'strong' }] }, { type: 'text', text: payload.budget }],
                      },
                    ],
                  },
                ]
              : []),
          ],
        },
        ...(payload.message
          ? [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Message / Criteria:', marks: [{ type: 'strong' }] }],
              },
              {
                type: 'blockquote',
                content: [{ type: 'paragraph', content: [{ type: 'text', text: payload.message }] }],
              },
            ]
          : []),
      ],
    };

    const authHeader = `Basic ${Buffer.from(`${email}:${apiToken}`).toString('base64')}`;

    const jiraRes = await fetch(`${host}/rest/api/3/issue`, {
      method: 'POST',
      headers: {
        Authorization: authHeader,
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        fields: {
          project: { key: projectKey },
          summary,
          issuetype: { name: issueType },
          priority: { name: priorityMap[payload.urgency] || 'Medium' },
          labels: ['sierra-estates', 'web-lead', payload.source.replace(/[^a-zA-Z0-9_-]/g, '-')],
          description: adfDescription,
        },
      }),
    });

    if (!jiraRes.ok) {
      const errText = await jiraRes.text();
      console.error(`[Jira Route] API error ${jiraRes.status}:`, errText);
      return NextResponse.json({ ok: false, error: 'Jira API rejected request', status: jiraRes.status }, { status: 502 });
    }

    const jiraData = (await jiraRes.json()) as { id: string; key: string };
    return NextResponse.json({
      ok: true,
      ticketKey: jiraData.key,
      ticketId: jiraData.id,
      ticketUrl: `${host}/browse/${jiraData.key}`,
    });
  } catch (err: unknown) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[Jira Route] Unhandled exception:', errorMsg);
    return NextResponse.json({ ok: false, error: errorMsg }, { status: 500 });
  }
}
