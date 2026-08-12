/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Sierra Estates — Requests Ticket Page
 *  File: SE/apps/admin/src/components/RequestsTicketPage.tsx
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Workflow ticket view for client requests. Uses the new typed firebaseUtils:
 *    - fetchRequests()         → ticket list (filtered by status)
 *    - fetchRequestById()      → full ticket with chat history
 *    - escalateToAgent()       → bot → human handoff
 *    - closeRequest()          → mark resolved
 *    - appendChatMessage()     → agent replies in chat
 *
 *  Layout:
 *    ┌─────────────┬──────────────────────────┐
 *    │ Ticket List │  Chat History             │
 *    │ (left rail) │  + Status controls        │
 *    │             │  + Agent notes            │
 *    │             │  + Matched listings       │
 *    └─────────────┴──────────────────────────┘
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  MessageCircle, Send, User, Bot, Headphones, CheckCircle2,
  Loader2, AlertCircle, X, Phone, MapPin, BedDouble, Tag,
} from 'lucide-react';
import {
  fetchRequests, fetchRequestById, escalateToAgent, closeRequest, appendChatMessage,
} from '../services/firebaseUtils';
import { Request, RequestStatus, ChatMessage } from '../types/index';

/* ──────────────────────────────────────────────────────────────────────────
 *  CONSTANTS
 * ────────────────────────────────────────────────────────────────────────── */

const STATUS_CONFIG: Record<RequestStatus, { label: string; color: string; icon: any }> = {
  bot_handling: {
    label: 'Bot Handling',
    color: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    icon: Bot,
  },
  ready_for_agent: {
    label: 'Ready for Agent',
    color: 'bg-blue-100 text-blue-700 border-blue-300',
    icon: Headphones,
  },
  closed: {
    label: 'Closed',
    color: 'bg-gray-100 text-gray-600 border-gray-300',
    icon: CheckCircle2,
  },
};

/* ──────────────────────────────────────────────────────────────────────────
 *  MAIN COMPONENT
 * ────────────────────────────────────────────────────────────────────────── */

export default function RequestsTicketPage() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<Request | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<RequestStatus | 'open'>('open');

  // ── Load request list ──
  const loadRequests = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchRequests({
        // 'open' = bot_handling + ready_for_agent (handled by backend)
        status: filterStatus === 'open' ? undefined : filterStatus,
        limitCount: 50,
      });
      // Client-side filter for 'open' (both bot + agent statuses)
      const filtered = filterStatus === 'open'
        ? data.filter(r => r.status === 'bot_handling' || r.status === 'ready_for_agent')
        : data;
      setRequests(filtered);
      if (filtered.length > 0 && !selectedId) {
        setSelectedId(filtered[0].id);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, [filterStatus, selectedId]);

  useEffect(() => { loadRequests(); }, [loadRequests]);

  // ── Load full request when selected ──
  useEffect(() => {
    if (!selectedId) {
      setSelectedRequest(null);
      return;
    }
    fetchRequestById(selectedId).then(req => {
      setSelectedRequest(req);
    }).catch(err => setError(err.message));
  }, [selectedId]);

  /* ── RENDER ── */
  return (
    <div className="flex h-screen bg-gray-50">
      {/* ── Left: Ticket List ── */}
      <div className="w-96 border-r border-gray-200 bg-white flex flex-col">
        {/* Header */}
        <div className="p-4 border-b">
          <h1 className="text-lg font-bold text-gray-900 mb-3">Requests</h1>
          <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
            {(['open', 'bot_handling', 'ready_for_agent', 'closed'] as const).map(s => (
              <button
                key={s}
                onClick={() => setFilterStatus(s)}
                className={`flex-1 px-2 py-1 rounded text-xs font-medium transition ${
                  filterStatus === s ? 'bg-white shadow text-gray-900' : 'text-gray-500'
                }`}
              >
                {s === 'open' ? 'Open' : STATUS_CONFIG[s].label.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-gray-400">
              <Loader2 className="animate-spin mr-2" size={18} /> Loading...
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">
              <MessageCircle size={32} className="mx-auto mb-2 opacity-50" />
              No requests
            </div>
          ) : (
            requests.map(req => {
              const cfg = STATUS_CONFIG[req.status];
              const Icon = cfg.icon;
              const lastMsg = req.bot_chat_history[req.bot_chat_history.length - 1];
              return (
                <button
                  key={req.id}
                  onClick={() => setSelectedId(req.id)}
                  className={`w-full text-left p-3 border-b hover:bg-gray-50 transition ${
                    selectedId === req.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Icon size={14} className={cfg.color.split(' ')[1]} />
                    <span className="text-xs font-medium text-gray-500">
                      {cfg.label}
                    </span>
                    <span className="text-xs text-gray-400 ml-auto">
                      {req.matched_listings.length} matches
                    </span>
                  </div>
                  <div className="text-sm font-medium text-gray-900 truncate">
                    {req.client_id.substring(0, 8)}...
                  </div>
                  {lastMsg && (
                    <div className="text-xs text-gray-500 truncate mt-0.5">
                      {lastMsg.sender === 'client' ? '' : ''}
                      {lastMsg.text}
                    </div>
                  )}
                </button>
              );
            })
          )}
        </div>
      </div>

      {/* ── Right: Ticket Detail ── */}
      <div className="flex-1 flex flex-col">
        {error && (
          <div className="p-3 bg-red-50 border-b border-red-200 flex items-center gap-2 text-sm text-red-700">
            <AlertCircle size={16} /> {error}
            <button onClick={() => setError(null)} className="ml-auto"><X size={14} /></button>
          </div>
        )}
        {!selectedRequest ? (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            <div className="text-center">
              <MessageCircle size={48} className="mx-auto mb-3 opacity-40" />
              <p>Select a request to view conversation</p>
            </div>
          </div>
        ) : (
          <TicketDetail
            request={selectedRequest}
            onUpdate={() => {
              // Reload full request
              fetchRequestById(selectedRequest.id).then(setSelectedRequest);
              loadRequests();
            }}
          />
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  TICKET DETAIL — chat history + status controls + agent notes
 * ═══════════════════════════════════════════════════════════════════════════ */

function TicketDetail({ request, onUpdate }: {
  request: Request;
  onUpdate: () => void;
}) {
  const [agentReply, setAgentReply] = useState('');
  const [sending, setSending] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [request.bot_chat_history.length]);

  const cfg = STATUS_CONFIG[request.status];
  const StatusIcon = cfg.icon;

  // ── Send agent reply ──
  const handleSendReply = async () => {
    if (!agentReply.trim()) return;
    setSending(true);
    try {
      const message: ChatMessage = {
        sender: 'agent',
        text: agentReply.trim(),
        timestamp: new Date().toISOString(),
      };
      await appendChatMessage(request.id, message);
      setAgentReply('');
      onUpdate();
    } catch (err: any) {
      console.error('Failed to send reply:', err);
    } finally {
      setSending(false);
    }
  };

  // ── Escalate to agent ──
  const handleEscalate = async () => {
    setActionLoading(true);
    try {
      // TODO: Replace with actual agent ID from auth context
      await escalateToAgent(request.id, 'current-agent-uid');
      onUpdate();
    } catch (err: any) {
      console.error('Escalate failed:', err);
    } finally {
      setActionLoading(false);
    }
  };

  // ── Close request ──
  const handleClose = async () => {
    if (!confirm('Close this request?')) return;
    setActionLoading(true);
    try {
      await closeRequest(request.id);
      onUpdate();
    } catch (err: any) {
      console.error('Close failed:', err);
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col">
      {/* Header */}
      <div className="px-6 py-4 bg-white border-b flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <StatusIcon size={16} className={cfg.color.split(' ')[1]} />
            <span className={`px-2 py-0.5 rounded text-xs font-medium border ${cfg.color}`}>
              {cfg.label}
            </span>
            <span className="text-xs text-gray-400">
              Created {request.created_at ? new Date(request.created_at.seconds * 1000).toLocaleString() : '—'}
            </span>
          </div>
          <h2 className="text-lg font-bold text-gray-900">
            Request {request.id.substring(0, 8)}
          </h2>
        </div>
        <div className="flex gap-2">
          {request.status === 'bot_handling' && (
            <button
              onClick={handleEscalate}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              <Headphones size={14} /> Take Over
            </button>
          )}
          {request.status !== 'closed' && (
            <button
              onClick={handleClose}
              disabled={actionLoading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 disabled:opacity-50"
            >
              <CheckCircle2 size={14} /> Close
            </button>
          )}
        </div>
      </div>

      {/* Body: 2 columns */}
      <div className="flex-1 flex overflow-hidden">
        {/* Chat History */}
        <div className="flex-1 flex flex-col">
          <div className="flex-1 overflow-y-auto p-6 space-y-3 bg-gray-50">
            {request.bot_chat_history.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                No messages yet
              </div>
            ) : (
              request.bot_chat_history.map((msg, i) => (
                <ChatBubble key={i} message={msg} />
              ))
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Reply box (only if not closed) */}
          {request.status !== 'closed' && (
            <div className="p-4 bg-white border-t">
              <div className="flex gap-2">
                <input
                  type="text"
                  value={agentReply}
                  onChange={e => setAgentReply(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSendReply()}
                  placeholder="Type your reply..."
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500"
                />
                <button
                  onClick={handleSendReply}
                  disabled={sending || !agentReply.trim()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                >
                  {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
                  Send
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar: Client Needs + Matched Listings */}
        <div className="w-80 border-l bg-white overflow-y-auto p-4 space-y-4">
          {/* Client Needs */}
          <div>
            <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Client Needs</h3>
            <div className="space-y-1.5 text-sm">
              <NeedRow icon={Tag} label="Intent" value={request.client_needs.intent} />
              <NeedRow icon={MapPin} label="Zones" value={request.client_needs.preferred_zones?.join(', ')} />
              <NeedRow icon={MapPin} label="Compounds" value={request.client_needs.preferred_compounds?.join(', ')} />
              <NeedRow icon={BedDouble} label="Min Beds" value={request.client_needs.min_bedrooms?.toString()} />
              <NeedRow icon={Tag} label="Max Budget" value={request.client_needs.max_budget_egp ? `${request.client_needs.max_budget_egp.toLocaleString()} EGP` : null} />
              <NeedRow icon={BedDouble} label="Min Area" value={request.client_needs.min_area_sqm ? `${request.client_needs.min_area_sqm} m²` : null} />
              <NeedRow icon={Tag} label="Finishing" value={request.client_needs.finishing} />
              <NeedRow icon={Tag} label="Delivery" value={request.client_needs.delivery_status} />
            </div>
            {request.client_needs.notes && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                {request.client_needs.notes}
              </div>
            )}
          </div>

          {/* Matched Listings */}
          <div className="border-t pt-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">
              Matched Listings ({request.matched_listings.length})
            </h3>
            {request.matched_listings.length === 0 ? (
              <p className="text-xs text-gray-400">No matches yet</p>
            ) : (
              <div className="space-y-1">
                {request.matched_listings.map(id => (
                  <div key={id} className="text-xs p-2 bg-gray-50 rounded font-mono text-gray-600">
                    {id.substring(0, 12)}...
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Agent assignment */}
          <div className="border-t pt-3">
            <h3 className="text-xs font-bold text-gray-500 uppercase mb-2">Assignment</h3>
            <div className="text-sm">
              {request.assigned_agent_id ? (
                <div className="flex items-center gap-2">
                  <User size={14} className="text-blue-600" />
                  <span className="font-medium">{request.assigned_agent_id.substring(0, 12)}...</span>
                </div>
              ) : (
                <span className="text-gray-400 text-xs">Unassigned (bot handling)</span>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 *  CHAT BUBBLE
 * ────────────────────────────────────────────────────────────────────────── */

function ChatBubble({ message }: { message: ChatMessage }) {
  const isClient = message.sender === 'client';
  const isBot = message.sender === 'bot';
  const Icon = isClient ? User : isBot ? Bot : Headphones;

  return (
    <div className={`flex gap-2 ${isClient ? 'justify-start' : 'justify-end'}`}>
      {isClient && (
        <div className="flex-none w-8 h-8 rounded-full bg-gray-300 flex items-center justify-center">
          <Icon size={16} className="text-white" />
        </div>
      )}
      <div className={`max-w-[70%] ${isClient ? '' : 'items-end'}`}>
        <div className={`px-3 py-2 rounded-2xl text-sm ${
          isClient
            ? 'bg-white border border-gray-200 text-gray-900'
            : isBot
            ? 'bg-yellow-50 border border-yellow-200 text-yellow-900'
            : 'bg-blue-600 text-white'
        }`}>
          {message.text}
        </div>
        <div className={`text-xs text-gray-400 mt-1 ${isClient ? 'text-left' : 'text-right'}`}>
          {message.sender} · {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>
      {!isClient && (
        <div className={`flex-none w-8 h-8 rounded-full flex items-center justify-center ${
          isBot ? 'bg-yellow-400' : 'bg-blue-600'
        }`}>
          <Icon size={16} className="text-white" />
        </div>
      )}
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 *  HELPER: Need row
 * ────────────────────────────────────────────────────────────────────────── */

function NeedRow({ icon: Icon, label, value }: {
  icon: any;
  label: string;
  value?: string | null;
}) {
  if (!value) return null;
  return (
    <div className="flex items-center gap-2 text-gray-700">
      <Icon size={12} className="text-gray-400 flex-none" />
      <span className="text-gray-500 text-xs">{label}:</span>
      <span className="font-medium capitalize">{value}</span>
    </div>
  );
}
