import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const origin = process.env.NEXT_PUBLIC_APP_URL || `${url.protocol}//${url.host}`;

  const metadata = {
    resource: `${origin}/api/mcp`,
    authorization_servers: [origin],
    scopes_supported: ['mcp:read', 'mcp:tools', 'mcp:spend', 'mcp:write'],
    bearer_methods_supported: ['header'],
    resource_documentation: `${origin}/docs/mcp`,
  };

  return NextResponse.json(metadata, {
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, max-age=3600',
    },
  });
}
