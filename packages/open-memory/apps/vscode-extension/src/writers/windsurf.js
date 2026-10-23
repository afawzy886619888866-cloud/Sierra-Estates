import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';










export function generateWindsurfConfig(backendUrl, apiKey, useMCP = false, mcpServerPath) {
    if (useMCP) {
        const backendMcpPath = mcpServerPath || path.join(process.cwd(), 'backend', 'dist', 'ai', 'mcp.js');
        return {
            contextProvider: 'openmemory-mcp',
            mcp: {
                configPath: backendMcpPath
            }
        };
    }

    const config = {
        contextProvider: 'openmemory',
        api: `${backendUrl}/api/ide/context`
    };
    if (apiKey) config.apiKey = apiKey;
    return config;
}

export async function writeWindsurfConfig(backendUrl, apiKey, useMCP = false, mcpServerPath) {
    const windsurfDir = path.join(os.homedir(), '.windsurf', 'context');
    const configFile = path.join(windsurfDir, 'openmemory.json');

    if (!fs.existsSync(windsurfDir)) {
        fs.mkdirSync(windsurfDir, { recursive: true });
    }

    const config = generateWindsurfConfig(backendUrl, apiKey, useMCP, mcpServerPath);
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2));

    return configFile;
}
