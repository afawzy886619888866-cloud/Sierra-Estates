/**
 * Memory Engine Standalone API Server
 */

import express, { Request, Response, Express } from 'express'
import { memoryApiRouter } from './api-router'

const app: Express = express()
const PORT = process.env.MEMORY_API_PORT || 3001

app.use(express.json())

// Mount Memory API router
app.use('/api/memory', memoryApiRouter)

// Health check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', service: '@sierra-estates/memory-engine' })
})

export function startMemoryServer(port: number | string = PORT) {
  const server = app.listen(port, () => {
    console.log(`[Memory Engine API] Running on http://localhost:${port}/api/memory`)
    
    // Auto-backup every 24 hours (24 * 60 * 60 * 1000 ms)
    const BACKUP_INTERVAL = 24 * 60 * 60 * 1000;
    setInterval(async () => {
      try {
        console.log('[Memory Engine API] Running automated 24h backup...');
        const response = await fetch(`http://localhost:${port}/api/memory/backup`, { method: 'POST' });
        const result = await response.json();
        console.log('[Memory Engine API] Backup result:', result);
      } catch (err) {
        console.error('[Memory Engine API] Auto-backup failed:', err);
      }
    }, BACKUP_INTERVAL);
  })
  return server;
}

if (require.main === module) {
  startMemoryServer()
}

export default app
