import { NextResponse } from 'next/server';
import { OAuthStore, type OAuthToken } from '@/lib/mcp/oauth-store';
import { mcpRegistry, initializeMCPServers } from '@/lib/mcp-registry';
import {
  TOOL_DEFINITIONS,
  getToolJsonSchema,
  validateAndAuthorizeTool,
} from '@/lib/mcp/tool-bridge';
import { logger } from '@/lib/logger';

export const dynamic = 'force-dynamic';

// Ensure servers are initialized
let serversInitialized = false;
function ensureMCPServers() {
  if (!serversInitialized) {
    initializeMCPServers();
    serversInitialized = true;
  }
}

/**
 * Authenticate incoming request via OAuth 2.1 Bearer token
 */
function authenticateRequest(request: Request, origin: string): {
  authorized: boolean;
  token?: OAuthToken;
  response?: NextResponse;
} {
  const authHeader = request.headers.get('authorization') || '';
  const match = authHeader.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    return {
      authorized: false,
      response: new NextResponse(
        JSON.stringify({
          jsonrpc: '2.0',
          id: null,
          error: {
            code: -32001,
            message: 'Unauthorized: Missing or malformed Bearer token',
          },
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'WWW-Authenticate': `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource"`,
          },
        },
      ),
    };
  }

  const tokenStr = match[1];
  const verification = OAuthStore.verifyAccessToken(tokenStr);

  if (!verification.valid || !verification.token) {
    return {
      authorized: false,
      response: new NextResponse(
        JSON.stringify({
          jsonrpc: '2.0',
          id: null,
          error: {
            code: -32001,
            message: `Unauthorized: ${verification.error || 'Invalid token'}`,
          },
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
            'WWW-Authenticate': `Bearer resource_metadata="${origin}/.well-known/oauth-protected-resource"`,
          },
        },
      ),
    };
  }

  return { authorized: true, token: verification.token };
}

/**
 * GET: Streamable-HTTP / SSE transport or server health probe
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = process.env.NEXT_PUBLIC_APP_URL || `${url.protocol}//${url.host}`;

  const auth = authenticateRequest(request, origin);
  if (!auth.authorized) {
    return auth.response!;
  }

  ensureMCPServers();

  const acceptHeader = request.headers.get('accept') || '';
  const isSSE = acceptHeader.includes('text/event-stream') || url.searchParams.get('transport') === 'sse';

  if (isSSE) {
    const stream = new ReadableStream({
      start(controller) {
        const encoder = new TextEncoder();
        controller.enqueue(encoder.encode(`event: endpoint\ndata: ${origin}/api/mcp\n\n`));
        controller.enqueue(encoder.encode(`: keep-alive\n\n`));
      },
    });

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*',
      },
    });
  }

  // Standard JSON response with server info
  return NextResponse.json({
    jsonrpc: '2.0',
    result: {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: { listChanged: false },
        resources: {},
        prompts: {},
      },
      serverInfo: {
        name: 'sierra-estates-mcp',
        version: '1.0.0',
        description: 'Sierra Estates Remote MCP Gateway',
      },
    },
  });
}

/**
 * POST: JSON-RPC 2.0 Command Dispatch
 */
export async function POST(request: Request) {
  const url = new URL(request.url);
  const origin = process.env.NEXT_PUBLIC_APP_URL || `${url.protocol}//${url.host}`;

  const auth = authenticateRequest(request, origin);
  if (!auth.authorized) {
    return auth.response!;
  }

  ensureMCPServers();

  let body: any;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id: null,
        error: { code: -32700, message: 'Parse error: invalid JSON' },
      },
      { status: 400 },
    );
  }

  const { id, method, params } = body || {};

  // Validate JSON-RPC structure
  if (!method || typeof method !== 'string') {
    return NextResponse.json(
      {
        jsonrpc: '2.0',
        id: id ?? null,
        error: { code: -32600, message: 'Invalid Request: missing method' },
      },
      { status: 400 },
    );
  }

  // 1. initialize
  if (method === 'initialize') {
    return NextResponse.json({
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: params?.protocolVersion || '2024-11-05',
        capabilities: {
          tools: { listChanged: false },
          resources: {},
          prompts: {},
        },
        serverInfo: {
          name: 'sierra-estates-mcp',
          version: '1.0.0',
          description: 'Sierra Estates Luxury PropTech MCP Gateway',
        },
      },
    });
  }

  // 2. notifications/initialized
  if (method === 'notifications/initialized') {
    return new NextResponse(null, { status: 204 });
  }

  // 3. ping
  if (method === 'ping') {
    return NextResponse.json({ jsonrpc: '2.0', id, result: {} });
  }

  // 4. tools/list
  if (method === 'tools/list') {
    const tools: Array<{
      name: string;
      description: string;
      inputSchema: Record<string, unknown>;
    }> = [];

    TOOL_DEFINITIONS.forEach((tool) => {
      tools.push({
        name: tool.name,
        description: tool.description,
        inputSchema: getToolJsonSchema(tool.name),
      });
    });

    return NextResponse.json({
      jsonrpc: '2.0',
      id,
      result: { tools },
    });
  }

  // 5. tools/call
  if (method === 'tools/call') {
    const toolName = params?.name;
    const toolArgs = params?.arguments || {};

    if (!toolName) {
      return NextResponse.json({
        jsonrpc: '2.0',
        id: id ?? null,
        error: { code: -32602, message: 'Invalid params: tool name is required' },
      });
    }

    const check = validateAndAuthorizeTool(toolName, toolArgs, auth.token?.scope || 'mcp:read');

    // 1. Tool not found
    if (!check.tool) {
      return NextResponse.json({
        jsonrpc: '2.0',
        id: id ?? null,
        error: { code: -32601, message: `Tool '${toolName}' not found` },
      });
    }

    // 2. Scope verification check (refuse write/spend tools for read-only tokens)
    if (!check.authorized) {
      return NextResponse.json(
        {
          jsonrpc: '2.0',
          id: id ?? null,
          error: {
            code: -32003,
            message: check.error || 'Forbidden: Insufficient token scope',
          },
        },
        { status: 403 },
      );
    }

    // 3. Schema validation check (reject invalid input before handler)
    if (!check.valid) {
      return NextResponse.json({
        jsonrpc: '2.0',
        id: id ?? null,
        error: {
          code: -32602,
          message: check.error || 'Invalid tool input',
        },
      });
    }

    try {
      logger.info(`[MCPGateway] Invoking tool '${toolName}' with client '${auth.token?.client_id}'`);
      const toolResult = await check.tool.handler(check.parsedArgs);

      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult, null, 2),
            },
          ],
          isError: false,
        },
      });
    } catch (toolError: any) {
      logger.error(`[MCPGateway] Tool execution error for '${toolName}':`, toolError);
      return NextResponse.json({
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: `Execution failed: ${toolError.message || String(toolError)}`,
            },
          ],
          isError: true,
        },
      });
    }
  }

  // Unknown method
  return NextResponse.json({
    jsonrpc: '2.0',
    id: id ?? null,
    error: {
      code: -32601,
      message: `Method '${method}' not found`,
    },
  });
}

/**
 * DELETE: Clean disconnect / session termination
 */
export async function DELETE(request: Request) {
  const url = new URL(request.url);
  const origin = process.env.NEXT_PUBLIC_APP_URL || `${url.protocol}//${url.host}`;

  const auth = authenticateRequest(request, origin);
  if (!auth.authorized) {
    return auth.response!;
  }

  return new NextResponse(null, { status: 204 });
}
