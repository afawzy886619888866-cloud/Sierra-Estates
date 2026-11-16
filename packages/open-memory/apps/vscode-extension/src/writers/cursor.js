import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';














export function generateCursorConfig(backendUrl, apiKey, useMCP = false, mcpServerPath) {
    if (useMCP) {
        const backendMcpPath = mcpServerPath || path.join(process.cwd(), 'backend', 'dist', 'ai', 'mcp.js');
        return {
            name: 'OpenMemory',
            type: 'mcp',
            mcp: {
                server: backendMcpPath,
                tools: ['openmemory_query', 'openmemory_store', 'openmemory_list', 'openmemory_get', 'openmemory_reinforce']
            }
        };
    }

    const headers = { 'Content-Type': 'application/json' };
    if (apiKey) headers['x-api-key'] = apiKey;

    return {
        name: 'OpenMemory',
        type: 'http',
        endpoint: `${backendUrl}/api/ide/context`,
        method: 'POST',
        headers,
        body_template: {
            query: '{{prompt}}',
            limit: 10,
            session_id: '{{session_id}}'
        }
    };
}

export async function writeCursorConfig(backendUrl, apiKey, useMCP = false, mcpServerPath) {
    const cursorDir = path.join(os.homedir(), '.cursor', 'context_providers');
    const configFile = path.join(cursorDir, 'openmemory.json');

    if (!fs.existsSync(cursorDir)) {
        fs.mkdirSync(cursorDir, { recursive: true });
    }

    const config = generateCursorConfig(backendUrl, apiKey, useMCP, mcpServerPath);
    fs.writeFileSync(configFile, JSON.stringify(config, null, 2));

    return configFile;
}
