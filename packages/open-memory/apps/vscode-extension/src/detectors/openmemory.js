export async function detectBackend(url) {
    try {
        const response = await fetch(`${url}/health`, { method: 'GET', signal: AbortSignal.timeout(2000) });
        return response.ok;
    } catch (e) {
        return false;
    }
}

export async function getBackendInfo(url) {
    try {
        const response = await fetch(`${url}/health`);
        if (!response.ok) return null;
        return await response.json();
    } catch (e2) {
        return null;
    }
}
