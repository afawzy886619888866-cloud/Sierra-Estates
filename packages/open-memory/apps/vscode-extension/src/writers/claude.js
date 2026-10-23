import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';














export function generateClaudeConfig(backendUrl, apiKey, useMCP = false, mcpServerPath) {
    if (useMCP) {
        const backendMcpPath = mcpServerPath || path.join(process.cwd(), 'backend', 'dist', 'ai', 'mcp.js');
        return {
            mcpServers: {
                openmemory: {
                    command: 'node',
                    args: [backendMcpPath],
                    env: apiKey ? { OM_API_KEY: apiKey } : undefined
                }
            }
        };
    }

    const config = {
        provider: 'http',
        base_url: `${backendUrl}/api/ide/context`
    };
    if (apiKey) config.api_key = apiKey;
    return config;
}

export async function writeClaudeConfig(backendUrl, apiKey, useMCP = false, mcpServerPath) {
    const claudeDir = path.join(os.homedir(), '.claude', 'providers');
    const configFile = path.join(claudeDir, 'openmemory.json');

    if (!fs.existsSync(claudeDir)) {
        fs.mkdirSync(claudeDir, { recursive: true });
    }

    const config = generateClaudeConfig(backendUrl, apiKey, useMCP, mcpServerPath);
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2));

    return configFile;
}
