#!/usr/bin/env node
/**
 * Sierra Estates Model Context Protocol (MCP) Server
 * Stdio JSON-RPC 2.0 compliant server for AI Agents and IDEs
 */

import * as readline from 'readline';
import * as dotenv from 'dotenv';
import { obsidian } from '../packages/obsidian/src/index';
import { OpenClawAgent } from '../packages/agents/openclaw';
import { brainRAG, mempalace, memoryEngine } from '../packages/memory-engine/src/index';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const aiKey =
  process.env.GOOGLE_GENAI_API_KEY ||
  process.env.GOOGLE_AI_API_KEY ||
  process.env.GEMINI_API_KEY ||
  process.env.ANTIGRAVITY_API_KEY ||
  '';

const openclaw = new OpenClawAgent({
  aiApiKey: aiKey,
  airtableApiKey: process.env.AIRTABLE_API_KEY || '',
  airtableBaseId: process.env.AIRTABLE_BASE_ID || '',
  airtableTableName: process.env.AIRTABLE_TABLE_NAME || 'Listings',
});

const TOOLS = [
  {
    name: 'get_inventory',
    description: 'Retrieve real estate listings and active inventory for Sierra Estates.',
    inputSchema: {
      type: 'object',
      properties: {
        compound: { type: 'string', description: 'Filter by compound name (e.g., Mivida, Hyde Park, Palm Hills)' },
        propertyType: { type: 'string', description: 'Filter by property type (e.g., Villa, Apartment, Penthouse)' },
        limit: { type: 'number', description: 'Maximum number of items to return' }
      }
    }
  },
  {
    name: 'ingest_whatsapp_listing',
    description: 'Ingest and parse a raw real estate listing from a WhatsApp broker group.',
    inputSchema: {
      type: 'object',
      properties: {
        rawMessage: { type: 'string', description: 'Raw message content from WhatsApp group in Arabic or English' },
        sender: { type: 'string', description: 'Sender name or phone number' },
        groupName: { type: 'string', description: 'WhatsApp broker group name' }
      },
      required: ['rawMessage']
    }
  },
  {
    name: 'calculate_valuation_score',
    description: 'Calculate property valuation and investment score (0-100) based on market comps in New Cairo.',
    inputSchema: {
      type: 'object',
      properties: {
        compound: { type: 'string', description: 'Compound name' },
        propertyType: { type: 'string', description: 'Property type' },
        price: { type: 'number', description: 'Total price in EGP' },
        area_sqm: { type: 'number', description: 'Built-up area in square meters' },
        finishing: { type: 'string', description: 'Finishing grade (fully_finished, semi_finished, core_and_shell)' }
      },
      required: ['compound', 'price', 'area_sqm']
    }
  },
  {
    name: 'search_project_memory',
    description: 'Search shared Obsidian project memory for past decisions, tasks, and historical listings.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search term or keyword' },
        tags: { type: 'array', items: { type: 'string' }, description: 'Filter by tags' }
      }
    }
  },
  {
    name: 'execute_openclaw_task',
    description: 'Execute an autonomous task using the OpenClaw multi-agent reasoning engine.',
    inputSchema: {
      type: 'object',
      properties: {
        prompt: { type: 'string', description: 'Task instruction or query prompt' }
      },
      required: ['prompt']
    }
  },
  {
    name: 'get_distressed_deals',
    description: 'Retrieve active hot deals and distressed price drops (dropPct >= 8.0%) from Episodic Context Cache (ECC).',
    inputSchema: {
      type: 'object',
      properties: {
        limit: { type: 'number', description: 'Maximum number of distressed deals to return (default: 10)' }
      }
    }
  },
  {
    name: 'search_memory_palace',
    description: 'Search Memory Palace multi-room vector & keyword store across listings, leads, negotiations, and system architecture.',
    inputSchema: {
      type: 'object',
      properties: {
        keyword: { type: 'string', description: 'Search keywords or query terms' },
        room: { type: 'string', enum: ['listings', 'leads', 'negotiations', 'system', 'general'], description: 'Optional memory palace room' },
        drawer: { type: 'string', description: 'Optional drawer identifier' },
        limit: { type: 'number', description: 'Max results to return' }
      }
    }
  },
  {
    name: 'query_brain_rag',
    description: 'Execute a goal-aligned RAG query across Obsidian Vault notes and ECC Episodic/Entity Memory.',
    inputSchema: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Search inquiry or question' },
        compound: { type: 'string', description: 'Optional compound filter' },
        entityId: { type: 'string', description: 'Optional entity ID (buyer phone, owner phone, or Sierra code)' }
      },
      required: ['query']
    }
  },
  {
    name: 'track_ecc_price_drop',
    description: 'Track an owner price reduction in ECC and generate an episode and hot deal alert.',
    inputSchema: {
      type: 'object',
      properties: {
        sierraCode: { type: 'string', description: 'Listing identifier or unit code' },
        oldPrice: { type: 'number', description: 'Previous asking price in EGP' },
        newPrice: { type: 'number', description: 'New asking price in EGP' },
        source: { type: 'string', description: 'Source channel (e.g. WhatsApp, direct, broker)' },
        ownerName: { type: 'string', description: 'Owner name or phone number' }
      },
      required: ['sierraCode', 'oldPrice', 'newPrice']
    }
  }
];

async function handleToolCall(name: string, args: any): Promise<any> {
  switch (name) {
    case 'get_inventory': {
      const memories = await obsidian.search(args.compound || '', ['inventory-listing', 'broker-listing']);
      const results = memories.map(m => m.value);
      return {
        count: results.length,
        items: results.slice(0, args.limit || 20)
      };
    }

    case 'ingest_whatsapp_listing': {
      const result = await openclaw.ingestWhatsAppGroupMessage(
        args.rawMessage,
        args.sender || 'WhatsApp Broker Group',
        args.groupName || 'New Cairo Luxury Brokers'
      );
      return result;
    }

    case 'calculate_valuation_score': {
      const pricePerSqm = args.price / (args.area_sqm || 1);
      // Benchmarks in New Cairo (EGP/sqm)
      const benchmark = 80000;
      let score = 50;
      if (pricePerSqm < benchmark * 0.8) score = 90; // Distress deal / bargain
      else if (pricePerSqm < benchmark) score = 75;
      else if (pricePerSqm <= benchmark * 1.2) score = 60;
      else score = 40;

      return {
        compound: args.compound,
        pricePerSqm: Math.round(pricePerSqm),
        valuationScore: score,
        rating: score >= 80 ? 'Distress Deal / High ROI' : score >= 60 ? 'Fair Market Value' : 'Premium / High Price',
        timestamp: new Date().toISOString()
      };
    }

    case 'search_project_memory': {
      const results = await obsidian.search(args.query || '', args.tags || []);
      return { results };
    }

    case 'execute_openclaw_task': {
      const result = await openclaw.queryVertexAgent(args.prompt);
      return result;
    }

    case 'get_distressed_deals': {
      const deals = brainRAG.ecc.getHotDeals(args.limit || 10);
      return { count: deals.length, deals };
    }

    case 'search_memory_palace': {
      const results = mempalace.search({
        keyword: args.keyword,
        room: args.room,
        drawer: args.drawer,
        limit: args.limit || 10
      });
      return { count: results.length, results };
    }

    case 'query_brain_rag': {
      const directive = brainRAG.queryBrainRAG(args.query, {
        compound: args.compound,
        entityId: args.entityId
      });
      return directive;
    }

    case 'track_ecc_price_drop': {
      const result = brainRAG.ecc.trackPriceReduction(
        args.sierraCode,
        args.oldPrice,
        args.newPrice,
        args.source || 'Direct Intake',
        args.ownerName
      );
      mempalace.store({
        id: `price-drop-${args.sierraCode}-${Date.now()}`,
        room: 'listings',
        drawer: 'distressed-deals',
        content: `Unit ${args.sierraCode} price drop: ${args.oldPrice} -> ${args.newPrice} EGP (${result.dropPct}%). Hot deal: ${result.isHotDeal}`,
        timestamp: new Date().toISOString()
      });
      return result;
    }

    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// JSON-RPC stdio protocol loop
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
  terminal: false
});

function sendResponse(response: any) {
  process.stdout.write(JSON.stringify(response) + '\n');
}

rl.on('line', async (line) => {
  if (!line.trim()) return;

  try {
    const message = JSON.parse(line);
    const { id, method, params } = message;

    if (method === 'initialize') {
      sendResponse({
        jsonrpc: '2.0',
        id,
        result: {
          protocolVersion: '2024-11-05',
          capabilities: {
            tools: {}
          },
          serverInfo: {
            name: 'sierra-estates-mcp',
            version: '1.0.0'
          }
        }
      });
      return;
    }

    if (method === 'tools/list') {
      sendResponse({
        jsonrpc: '2.0',
        id,
        result: {
          tools: TOOLS
        }
      });
      return;
    }

    if (method === 'tools/call') {
      const toolName = params?.name;
      const toolArgs = params?.arguments || {};

      try {
        const toolResult = await handleToolCall(toolName, toolArgs);
        sendResponse({
          jsonrpc: '2.0',
          id,
          result: {
            content: [
              {
                type: 'text',
                text: typeof toolResult === 'string' ? toolResult : JSON.stringify(toolResult, null, 2)
              }
            ]
          }
        });
      } catch (err: any) {
        sendResponse({
          jsonrpc: '2.0',
          id,
          error: {
            code: -32000,
            message: err?.message || 'Tool execution error'
          }
        });
      }
      return;
    }

    // Default unhandled method
    if (id !== undefined) {
      sendResponse({
        jsonrpc: '2.0',
        id,
        error: {
          code: -32601,
          message: `Method not found: ${method}`
        }
      });
    }
  } catch (err: any) {
    sendResponse({
      jsonrpc: '2.0',
      id: null,
      error: {
        code: -32700,
        message: 'Parse error'
      }
    });
  }
});
