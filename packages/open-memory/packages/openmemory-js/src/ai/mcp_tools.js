import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    McpError,
    ErrorCode,
} from "@modelcontextprotocol/sdk/types.js";










export class ToolRegistry {constructor() { ToolRegistry.prototype.__init.call(this); }
     __init() {this.tools = new Map()}

    tool(
        name,
        description,
        inputSchema,
        callback,
    ) {
        this.tools.set(name, {
            name,
            description,
            inputSchema: z.object(inputSchema),
            callback,
        });
    }

    apply(server) {
        const srv = server.server;

        srv.setRequestHandler(ListToolsRequestSchema, async () => {
            return {
                tools: Array.from(this.tools.values()).map((t) => {
                    const jsonSchema = zodToJsonSchema(t.inputSchema , {
                        target: "jsonSchema2019-09",
                    }) ;

                    if (jsonSchema && typeof jsonSchema === "object") {
                        delete jsonSchema.$schema;
                    }

                    return {
                        name: t.name,
                        description: t.description,
                        inputSchema: jsonSchema,
                    };
                }),
            };
        });

        srv.setRequestHandler(
            CallToolRequestSchema,
            async (req, extra) => {
                const name = req.params.name;
                const tool = this.tools.get(name);
                if (!tool) {
                    throw new McpError(
                        ErrorCode.MethodNotFound,
                        `Tool not found: ${name}`,
                    );
                }

                const args = req.params.arguments || {};
                const parse = await tool.inputSchema.safeParseAsync(args);
                if (!parse.success) {
                    throw new McpError(
                        ErrorCode.InvalidParams,
                        `Invalid arguments: ${parse.error.message}`,
                    );
                }

                try {
                    return await tool.callback(parse.data, extra);
                } catch (err) {
                    return {
                        content: [
                            { type: "text", text: `Error: ${err.message}` },
                        ],
                        isError: true,
                    };
                }
            },
        );
    }
}
