/**
 * MCP Server Registry — Dependency Injection for tools
 * Centralizes all MCP server instantiation and tool registration
 * Enables easy mocking in tests
 */

import { mcp_whatsapp_messaging } from '../mcp-servers/whatsapp-messaging.mcp';
import { mcp_sierra_deals } from '../mcp-servers/sierra-deals.mcp';
import { mcp_stripe_payments } from '../mcp-servers/stripe-payments.mcp';
import { mcp_docusign_signing } from '../mcp-servers/docusign-signing.mcp';
import { logger } from '@/lib/logger';





















class MCPRegistry {constructor() { MCPRegistry.prototype.__init.call(this);MCPRegistry.prototype.__init2.call(this); }
   __init() {this.servers = new Map()}
   __init2() {this.toolHandlers = new Map()}

  register(server, toolHandlers) {
    if (this.servers.has(server.name)) {
      throw new Error(`MCP server "${server.name}" already registered`);
    }

    this.servers.set(server.name, server);
    const handlers = new Map();
    for (const [toolName, handler] of Object.entries(toolHandlers)) {
      handlers.set(toolName, handler);
    }
    this.toolHandlers.set(server.name, handlers);
  }

  async callTool(
    serverName,
    toolName,
    input
  ) {
    const handlers = this.toolHandlers.get(serverName);
    if (!handlers) {
      throw new Error(`MCP server "${serverName}" not registered`);
    }

    const handler = handlers.get(toolName);
    if (!handler) {
      throw new Error(`Tool "${toolName}" not found in server "${serverName}"`);
    }

    return await handler(input);
  }

  listServers() {
    return Array.from(this.servers.values());
  }

  listTools(serverName) {
    const server = this.servers.get(serverName);
    if (!server) {
      throw new Error(`MCP server "${serverName}" not found`);
    }
    return server.tools;
  }

  getContext() {
    return {
      callTool: (serverName, toolName, input) =>
        this.callTool(serverName, toolName, input),
      listServers: () => this.listServers(),
      listTools: (serverName) => this.listTools(serverName),
    };
  }
}

// Singleton instance
export const mcpRegistry = new MCPRegistry();

// Register all MCP servers (to be called on app initialization)
export function initializeMCPServers() {
  try {
    // Register each MCP server with its tool handlers
    const mcpServers = [
      { server: mcp_whatsapp_messaging, name: 'WhatsApp Messaging' },
      { server: mcp_sierra_deals, name: 'Sierra Deals Pipeline' },
      { server: mcp_stripe_payments, name: 'Stripe Payments' },
      { server: mcp_docusign_signing, name: 'DocuSign Signing' },
    ];

    mcpServers.forEach(({ server, name }) => {
      try {
        // Extract handlers from tools array
        const toolHandlers = {};
        server.tools.forEach((tool) => {
          if (tool.handler && typeof tool.handler === 'function') {
            toolHandlers[tool.name] = tool.handler;
          } else {
            // Tool has schema but no handler - create a placeholder
            toolHandlers[tool.name] = async (input) => ({
              status: 'not_implemented',
              tool: tool.name,
              input
            });
          }
        });

        // Register the server
        mcpRegistry.register(
          {
            name: server.name,
            description: `${name} integration`,
            tools: server.tools
          },
          toolHandlers
        );

        logger.info(`✅ Registered MCP server: ${server.name}`);
      } catch (error) {
        logger.warn(`⚠️ Failed to register ${name}:`, error);
      }
    });

    logger.info('✅ All MCP servers initialized');
  } catch (error) {
    logger.error('❌ Failed to initialize MCP servers:', error);
  }
}

;
