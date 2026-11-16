import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
















export function generateCopilotConfig(backendUrl, apiKey, useMCP = false, mcpServerPath) {
    if (useMCP) {
        const backendMcpPath = mcpServerPath || path.join(process.cwd(), 'backend', 'dist', 'ai', 'mcp.js');
        const config = {
            name: 'OpenMemory',
            type: 'mcp',
            mcpServer: {
                command: 'node',
                args: [backendMcpPath]
            }
        };
        if (apiKey) {
            config.mcpServer.env = { OM_API_KEY: apiKey };
        }
        return config;
    }

    const config = {
        name: 'OpenMemory',
        type: 'context_provider',
        endpoint: `${backendUrl}/api/ide/context`
    };

    if (apiKey) {
        config.authentication = {
            type: 'header',
            header: `x-api-key: ${apiKey}`
        };
    }

    return config;
}

export async function writeCopilotConfig(backendUrl, apiKey, useMCP = false, mcpServerPath) {
    const copilotDir = path.join(os.homedir(), '.github', 'copilot');
    const configFile = path.join(copilotDir, 'openmemory.json');

    if (!fs.existsSync(copilotDir)) {
        fs.mkdirSync(copilotDir, { recursive: true });
    }

    const config = generateCopilotConfig(backendUrl, apiKey, useMCP, mcpServerPath);
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2));

    return configFile;
}
