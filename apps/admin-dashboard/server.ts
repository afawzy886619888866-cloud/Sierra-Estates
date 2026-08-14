import path from 'path';
import express, { Request, Response } from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { createServer as createViteServer } from 'vite';
import { createServer } from 'http';
import { Server } from 'socket.io';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';

// Load environment variables if not already loaded by Vite
dotenv.config({ path: path.resolve(process.cwd(), '../../.env') });

const ANTIGRAVITY_API_KEY = process.env.ANTIGRAVITY_API_KEY;

if (!ANTIGRAVITY_API_KEY) {
  console.warn("WARNING: ANTIGRAVITY_API_KEY is not set in .env. Admin dashboard chat API will not work.");
}

async function startServer() {
  const PORT = parseInt(process.env.PORT || '3001', 10);
  const app = express();
  const httpServer = createServer(app);
  const io = new Server(httpServer, {
    cors: { origin: "*" }
  });

  app.use(express.json());

  // Rate Limiting for the Agents API
  const apiLimiter = rateLimit({
    windowMs: 1 * 60 * 1000, // 1 minute
    max: 60,
    message: { error: 'Too many requests, please try again later.' }
  });

  // Antigravity Chat API Endpoint
  app.post('/api/agents/:agentId/message', apiLimiter as unknown as express.RequestHandler, async (req: Request, res: Response): Promise<void> => {
    const authHeader = req.headers.authorization;
    if (!authHeader || authHeader !== `Bearer ${ANTIGRAVITY_API_KEY}`) {
      res.status(401).json({ error: 'Unauthorized. Invalid or missing ANTIGRAVITY_API_KEY.' });
      return;
    }

    const { agentId } = req.params;
    const { message } = req.body;

    if (!message) {
      res.status(400).json({ error: 'Message is required.' });
      return;
    }

    console.log(`[Antigravity API] Received message for agent ${agentId}: ${message}`);

    // Simulate agent processing delay (To be replaced with real SDK call)
    setTimeout(() => {
      const safeAgentId = String(agentId);
      const reply = `[${safeAgentId.toUpperCase()}] I received your message: "${message}".`;
      io.to(safeAgentId).emit('agent_reply', {
        agentId: safeAgentId,
        message: reply,
        timestamp: new Date().toISOString()
      });
    }, 1000);

    res.json({ success: true, status: 'Message queued for processing.' });
  });

  // Socket.io connection handling
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (token === ANTIGRAVITY_API_KEY) {
      next();
    } else {
      next(new Error('Authentication error: Invalid ANTIGRAVITY_API_KEY'));
    }
  });

  io.on('connection', (socket) => {
    console.log('Client connected to Antigravity Socket:', socket.id);
    socket.on('join_agent', (agentId: string) => {
      socket.join(agentId);
    });
  });

  // Proxy /api/agents to agents-api service (running on port 4000)
  app.use('/api/agents', createProxyMiddleware({
    target: 'http://localhost:4000',
    changeOrigin: true,
    pathRewrite: { '^/api/agents': '' },
  }));

  // Vite development middleware OR static serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
