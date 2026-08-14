import React, { useState, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';

interface Message {
  id: string;
  sender: 'user' | 'agent';
  text: string;
  timestamp: string;
}

interface AgentChatPaneProps {
  agentId: string;
}

export default function AgentChatPane({ agentId }: AgentChatPaneProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom when messages update
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    // Clear messages when agent changes
    setMessages([]);

    const token = import.meta.env.VITE_ANTIGRAVITY_API_KEY || 'change_me_to_a_long_random_string'; // Fallback for local testing
    
    // Connect to Socket.IO server on the same domain
    const socket = io('/', {
      auth: { token }
    });
    
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('Connected to Antigravity socket:', socket.id);
      socket.emit('join_agent', agentId);
    });

    socket.on('agent_reply', (data: { agentId: string; message: string; timestamp: string }) => {
      if (data.agentId === agentId) {
        setMessages((prev) => [
          ...prev,
          {
            id: Date.now().toString() + Math.random(),
            sender: 'agent',
            text: data.message,
            timestamp: data.timestamp
          }
        ]);
      }
    });

    socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err.message);
    });

    return () => {
      socket.disconnect();
    };
  }, [agentId]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || isSending) return;
    
    setIsSending(true);
    setInput('');
    
    // Optimistic UI update
    setMessages((prev) => [
      ...prev,
      {
        id: Date.now().toString(),
        sender: 'user',
        text,
        timestamp: new Date().toISOString()
      }
    ]);

    try {
      const token = import.meta.env.VITE_ANTIGRAVITY_API_KEY || 'change_me_to_a_long_random_string';
      const response = await fetch(`/api/agents/${agentId}/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ message: text })
      });

      if (!response.ok) {
        throw new Error('Failed to send message');
      }
    } catch (error) {
      console.error('Error sending message to Antigravity API:', error);
      // Optional: Add an error message to the UI
      setMessages((prev) => [
        ...prev,
        {
          id: Date.now().toString(),
          sender: 'agent',
          text: 'Error: Could not reach agent backend.',
          timestamp: new Date().toISOString()
        }
      ]);
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[400px] bg-[#0a0f1d] border-x border-b border-slate-800 rounded-b-xl shadow-xl">
      <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-2 select-none">
            <span className="text-3xl font-sans opacity-50">🤖</span>
            <p className="text-xs font-mono">Agent {agentId.toUpperCase()} is online.</p>
            <p className="text-[10px] text-slate-600 font-mono">Send a message to begin interaction.</p>
          </div>
        ) : (
          messages.map((m) => {
            const isUser = m.sender === 'user';
            return (
              <div key={m.id} className={`flex max-w-[85%] ${isUser ? 'ml-auto text-right' : 'self-start mr-auto'}`}>
                <div
                  className={`p-3 rounded-xl shadow-sm text-[13px] leading-relaxed ${
                    isUser
                      ? 'bg-cyan-500 text-black rounded-tr-sm font-medium'
                      : 'bg-slate-800/80 border border-slate-700 text-slate-200 rounded-tl-sm'
                  }`}
                >
                  {m.text}
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-3 bg-slate-900/50 border-t border-slate-800 flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
          placeholder={`Message ${agentId}...`}
          className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-4 py-2 text-sm text-white outline-none focus:border-cyan-500/50 transition-colors"
        />
        <button
          onClick={sendMessage}
          disabled={isSending || !input.trim()}
          className="px-6 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-sm rounded-lg shadow-[0_0_15px_rgba(6,182,212,0.2)] transition active:scale-95 disabled:opacity-50 disabled:scale-100 cursor-pointer"
        >
          {isSending ? '...' : 'Send'}
        </button>
      </div>
    </div>
  );
}
