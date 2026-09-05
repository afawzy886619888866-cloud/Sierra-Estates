import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';




















export function generateCodexConfig(backendUrl, apiKey, useMCP = false, mcpServerPath) {
    if (useMCP) {
        const backendMcpPath = mcpServerPath || path.join(process.cwd(), 'backend', 'dist', 'ai', 'mcp.js');
        const config = {
            mcpServers: {
                openmemory: {
                    command: 'node',
                    args: [backendMcpPath]
                }
            }
        };
        if (apiKey) {
            config.mcpServers.openmemory.env = { OM_API_KEY: apiKey };
        }
        return config;
    }

    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['x-api-key'] = apiKey;

    return {
        contextProviders: {
            openmemory: {
                enabled: true,
                endpoint: `${backendUrl}/api/ide/context`,
                method: 'POST',
                headers,
                queryField: 'query'
            }
        }
    };
}

export async function writeCodexConfig(backendUrl, apiKey, useMCP = false, mcpServerPath) {
    const codexDir = path.join(os.homedir(), '.codex');
    const configFile = path.join(codexDir, 'context.json');

    if (!fs.existsSync(codexDir)) {
        fs.mkdirSync(codexDir, { recursive: true });
    }

    const config = generateCodexConfig(backendUrl, apiKey, useMCP, mcpServerPath);
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2));

    return configFile;
}
