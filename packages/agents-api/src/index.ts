// packages/agents-api/src/index.ts
import express, { Request, Response } from "express";
import http from "http";
import { Server as SocketIOServer } from "socket.io";
import cors from "cors";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

// Rate limiting: max 100 requests per 15 minutes per IP
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
});
app.use(limiter);

// Simple in‑memory chat history per agent (for demo purposes)
const chatHistory: Record<string, { role: string; content: string }[]> = {};

// POST endpoint to receive a user message and forward to Antigravity (stubbed)
app.post("/api/agents/:agentId/message", (req: Request<{ agentId: string }>, res: Response) => {
  const { agentId } = req.params;
  const { message } = req.body;
  if (!message) {
    return res.status(400).json({ error: "Missing 'message' in request body" });
  }
  // Store user message
  if (!chatHistory[agentId]) chatHistory[agentId] = [];
  chatHistory[agentId].push({ role: "user", content: message });
  // No real Antigravity SDK call is wired up (needs ANTIGRAVITY_API_KEY handling +
  // the actual SDK client); this echoes the input so callers can see stubMode=true
  // rather than mistaking the echo for a real agent reply.
  const reply = `Echo from ${agentId}: ${message}`;
  chatHistory[agentId].push({ role: "assistant", content: reply });
  res.json({ reply, history: chatHistory[agentId], stubMode: true });
});

// GET chat history
app.get("/api/agents/:agentId/history", (req: Request<{ agentId: string }>, res: Response) => {
  const { agentId } = req.params;
  const history = chatHistory[agentId] || [];
  res.json({ history });
});

const server = http.createServer(app);
const io = new SocketIOServer(server, {
  cors: { origin: "*" },
});

io.on("connection", (socket) => {
  console.log("Socket client connected", socket.id);
  socket.on("join", (agentId: string) => {
    socket.join(agentId);
  });
  socket.on("message", ({ agentId, message }) => {
    // Broadcast to all listeners of this agent
    const reply = `Echo from ${agentId}: ${message}`;
    io.to(agentId).emit("reply", { reply });
  });
});

const PORT = parseInt(process.env.PORT || "4000", 10);
server.on("error", (err: any) => {
  if (err.code === "EADDRINUSE") {
    console.warn(`[agents-api] Port ${PORT} in use, attempting port ${PORT + 1}...`);
    server.listen(PORT + 1, () => {
      console.log(`Agents API server listening on http://0.0.0.0:${PORT + 1}`);
    });
  } else {
    console.error("[agents-api] Server error:", err);
  }
});
server.listen(PORT, () => {
  console.log(`Agents API server listening on http://0.0.0.0:${PORT}`);
});
