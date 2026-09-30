'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ── Types ─────────────────────────────────────────────────────────────────
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  listings?: Listing[];
  marketStats?: MarketStats | null;
  ts: number;
}

interface Listing {
  id: string;
  compound: string;
  property_type: string;
  deal_type: string;
  price: number;
  area_sqm: number;
  bedrooms: number;
  furnishing: string;
  reference_code: string;
  source_channel: string;
}

interface MarketStats {
  count: number;
  min: number;
  max: number;
  avg: number;
  median: number;
  avgPpsm: number;
  compound: string;
}

// ── Quick prompts ─────────────────────────────────────────────────────────
const QUICK_PROMPTS = [
  { emoji: '🏘️', label: 'Owner rentals', prompt: 'Show me direct owner rentals under 25,000 EGP/month in Al Rehab or Madinaty' },
  { emoji: '💰', label: 'Investment', prompt: 'Best compound for investment with highest cap rate in New Cairo 2026' },
  { emoji: '🏠', label: '3BR villa', prompt: '3 bedroom villa for sale in Hyde Park or Mountain View iCity' },
  { emoji: '📊', label: 'Market prices', prompt: 'What are current price per sqm across top compounds in New Cairo?' },
  { emoji: '🌍', label: 'Expat deal', prompt: 'I am looking for a furnished apartment, dollar price, near Cairo airport' },
  { emoji: '📱', label: 'WhatsApp owner', prompt: 'I need a direct owner unit, not a broker — what do you have?' },
];

// ── Markdown-lite renderer ────────────────────────────────────────────────
function renderMarkdown(text: string) {
  return text
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^(\d+)\.\s/gm, '<span class="br-num">$1.</span> ')
    .replace(/^[-•]\s/gm, '<span class="br-bullet">›</span> ')
    .replace(/\n{2,}/g, '<br/><br/>')
    .replace(/\n/g, '<br/>');
}

// ── Listing card component ────────────────────────────────────────────────
function ListingCard({ listing }: { listing: Listing }) {
  const isOwner = listing.source_channel?.toLowerCase().includes('owner');
  const price = listing.price > 0
    ? `EGP ${listing.price.toLocaleString()}${listing.deal_type === 'Rent' ? '/mo' : ''}`
    : 'POA';
  const usd = listing.price > 0
    ? `≈ $${Math.round(listing.price / 49).toLocaleString()}`
    : '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="br-listing-card"
    >
      {isOwner && <span className="br-owner-badge">⭐ Direct Owner</span>}
      <div className="br-listing-title">
        {listing.property_type} · {listing.compound}
      </div>
      <div className="br-listing-meta">
        <span className="br-price">{price}</span>
        {usd && <span className="br-usd">{usd}</span>}
        {listing.area_sqm > 0 && <span>{listing.area_sqm} sqm</span>}
        {listing.bedrooms > 0 && <span>{listing.bedrooms} BR</span>}
      </div>
      {listing.reference_code && (
        <div className="br-listing-ref">Ref: {listing.reference_code}</div>
      )}
    </motion.div>
  );
}

// ── Stats bar ─────────────────────────────────────────────────────────────
function StatsBar({ stats }: { stats: MarketStats }) {
  return (
    <div className="br-stats-bar">
<<<<<<< HEAD
      <div className="br-stats-label">Market Intelligence · {stats.compound || 'New Cairo'}</div>
=======
      <div className="br-stats-label">Market Intelligence{stats.compound ? ` · ${stats.compound}` : ''}</div>
>>>>>>> 41d87c02bd108a456b6da133e2eb59618ef51ab1
      <div className="br-stats-grid">
        <div className="br-stat"><span className="br-stat-val">{stats.count}</span><span className="br-stat-key">units</span></div>
        <div className="br-stat"><span className="br-stat-val">EGP {stats.min?.toLocaleString()}</span><span className="br-stat-key">from</span></div>
        <div className="br-stat"><span className="br-stat-val">EGP {stats.median?.toLocaleString()}</span><span className="br-stat-key">median</span></div>
        <div className="br-stat"><span className="br-stat-val">EGP {stats.avgPpsm?.toLocaleString()}/m²</span><span className="br-stat-key">avg/sqm</span></div>
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────
export default function BrokerBrainPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content: `👋 **Ahlan! I'm Samir** — your personal AI broker at Sierra Estates.\n\nI have live access to **11,488 units** across New Cairo: direct owners, broker network, rentals and resale. I know every compound, every price range, every cap rate.\n\nAsk me anything — in Arabic or English. What are you looking for?`,
      ts: Date.now(),
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId] = useState(() => `session-${Date.now()}-${Math.random().toString(36).slice(2)}`);
  const [profile, setProfile] = useState<Record<string, any>>({});
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = useCallback(async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { id: `u-${Date.now()}`, role: 'user', content: text, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const res = await fetch('/api/broker-brain', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, sessionId }),
      });
      const data = await res.json();
      const botMsg: Message = {
        id: `a-${Date.now()}`,
        role: 'assistant',
        content: data.reply || data.error || 'Sorry, something went wrong.',
        listings: data.listings,
        marketStats: data.marketStats,
        ts: Date.now(),
      };
      setMessages(prev => [...prev, botMsg]);
      if (data.profile) setProfile(data.profile);
    } catch {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: '❌ Network error — please try again.',
        ts: Date.now(),
      }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [loading, sessionId]);

  const handleKey = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  return (
    <>
      <style>{`
        .br-root {
          display: flex; flex-direction: column; height: 100dvh;
          background: #070d1a; color: #e8eaf0;
          font-family: 'Plus Jakarta Sans', 'Inter', sans-serif;
          max-width: 680px; margin: 0 auto; position: relative;
        }
        .br-header {
          padding: 14px 16px 12px; background: rgba(10,20,40,0.96);
          border-bottom: 1px solid rgba(255,255,255,0.07);
          backdrop-filter: blur(16px); position: sticky; top: 0; z-index: 10;
          display: flex; align-items: center; gap: 12px;
        }
        .br-avatar {
          width: 40px; height: 40px; border-radius: 50%;
          background: linear-gradient(135deg, #d4af37, #c8a027);
          display: flex; align-items: center; justify-content: center;
          font-size: 18px; flex-shrink: 0;
        }
        .br-header-text h1 { font-size: 15px; font-weight: 700; color: #fff; margin: 0; }
        .br-header-text p { font-size: 12px; color: #64b5f6; margin: 0; }
        .br-badge-live {
          margin-left: auto; background: rgba(76,175,80,0.2); border: 1px solid #4caf50;
          color: #81c784; font-size: 11px; padding: 3px 10px; border-radius: 20px;
          display: flex; align-items: center; gap: 5px;
        }
        .br-badge-live::before { content: ''; width: 6px; height: 6px; border-radius: 50%; background: #4caf50; animation: pulse 1.5s infinite; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }
        .br-profile-bar {
          padding: 6px 16px; background: rgba(212,175,55,0.06);
          border-bottom: 1px solid rgba(212,175,55,0.1);
          font-size: 11px; color: #d4af37; display: flex; gap: 12px; flex-wrap: wrap;
        }
        .br-messages {
          flex: 1; overflow-y: auto; padding: 16px; display: flex; flex-direction: column; gap: 14px;
          scroll-behavior: smooth;
        }
        .br-messages::-webkit-scrollbar { width: 4px; }
        .br-messages::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
        .br-bubble {
          max-width: 88%; padding: 12px 14px; border-radius: 16px;
          line-height: 1.6; font-size: 14px;
        }
        .br-bubble.user {
          align-self: flex-end;
          background: linear-gradient(135deg, #1565c0, #0d47a1);
          color: #fff; border-bottom-right-radius: 4px;
        }
        .br-bubble.assistant {
          align-self: flex-start;
          background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.08);
          color: #e0e4ef; border-bottom-left-radius: 4px;
        }
        .br-bubble strong { color: #d4af37; }
        .br-num { color: #64b5f6; font-weight: 700; }
        .br-bullet { color: #d4af37; margin-right: 2px; }
        .br-listing-card {
          background: rgba(255,255,255,0.04); border: 1px solid rgba(212,175,55,0.2);
          border-radius: 10px; padding: 10px 12px; margin-top: 8px;
          position: relative; overflow: hidden;
        }
        .br-listing-card::before {
          content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px;
          background: linear-gradient(#d4af37, #c8a027);
        }
        .br-owner-badge {
          font-size: 10px; font-weight: 700; color: #d4af37;
          background: rgba(212,175,55,0.12); border: 1px solid rgba(212,175,55,0.3);
          padding: 2px 7px; border-radius: 20px; display: inline-block; margin-bottom: 5px;
        }
        .br-listing-title { font-size: 13px; font-weight: 600; color: #e8eaf0; margin-bottom: 4px; }
        .br-listing-meta { display: flex; gap: 10px; flex-wrap: wrap; font-size: 12px; color: #90a4ae; }
        .br-price { color: #81c784; font-weight: 700; font-size: 13px; }
        .br-usd { color: #64b5f6; font-size: 11px; }
        .br-listing-ref { font-size: 10px; color: #546e7a; margin-top: 3px; }
        .br-stats-bar {
          background: rgba(100,181,246,0.06); border: 1px solid rgba(100,181,246,0.15);
          border-radius: 10px; padding: 10px 12px; margin-top: 8px;
        }
        .br-stats-label { font-size: 11px; color: #64b5f6; font-weight: 600; margin-bottom: 8px; }
        .br-stats-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 6px; }
        .br-stat { display: flex; flex-direction: column; align-items: center; }
        .br-stat-val { font-size: 12px; font-weight: 700; color: #e0e4ef; }
        .br-stat-key { font-size: 10px; color: #546e7a; }
        .br-typing {
          align-self: flex-start; display: flex; gap: 5px; align-items: center;
          padding: 12px 14px; background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.08); border-radius: 16px;
          border-bottom-left-radius: 4px;
        }
        .br-dot {
          width: 7px; height: 7px; border-radius: 50%; background: #d4af37;
          animation: bounce 1.2s infinite;
        }
        .br-dot:nth-child(2) { animation-delay: 0.2s; }
        .br-dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes bounce { 0%,80%,100%{transform:translateY(0)} 40%{transform:translateY(-6px)} }
        .br-quick-prompts {
          padding: 10px 16px; display: flex; gap: 8px; overflow-x: auto; flex-shrink: 0;
          border-top: 1px solid rgba(255,255,255,0.06);
        }
        .br-quick-prompts::-webkit-scrollbar { display: none; }
        .br-quick-btn {
          flex-shrink: 0; background: rgba(255,255,255,0.05);
          border: 1px solid rgba(255,255,255,0.1); border-radius: 20px;
          padding: 6px 12px; font-size: 12px; color: #b0bec5; cursor: pointer;
          white-space: nowrap; transition: all 0.15s;
          display: flex; align-items: center; gap: 5px;
        }
        .br-quick-btn:hover { background: rgba(212,175,55,0.1); border-color: rgba(212,175,55,0.4); color: #d4af37; }
        .br-input-area {
          padding: 12px 16px 16px; border-top: 1px solid rgba(255,255,255,0.06);
          background: rgba(10,20,40,0.95); backdrop-filter: blur(12px);
          display: flex; gap: 10px; align-items: flex-end;
        }
        .br-textarea {
          flex: 1; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12);
          border-radius: 20px; padding: 10px 16px; color: #e8eaf0; font-size: 14px;
          resize: none; outline: none; min-height: 42px; max-height: 120px;
          font-family: inherit; line-height: 1.4; transition: border-color 0.2s;
        }
        .br-textarea::placeholder { color: #546e7a; }
        .br-textarea:focus { border-color: rgba(212,175,55,0.5); }
        .br-send-btn {
          width: 42px; height: 42px; border-radius: 50%; flex-shrink: 0;
          background: linear-gradient(135deg, #d4af37, #c8a027);
          border: none; cursor: pointer; display: flex; align-items: center; justify-content: center;
          font-size: 18px; transition: all 0.2s; color: #000;
        }
        .br-send-btn:disabled { opacity: 0.4; cursor: not-allowed; }
        .br-send-btn:not(:disabled):hover { transform: scale(1.08); }
        .br-time { font-size: 10px; color: #37474f; margin-top: 4px; text-align: right; }
        @media (min-width: 681px) {
          .br-root { border-left: 1px solid rgba(255,255,255,0.05); border-right: 1px solid rgba(255,255,255,0.05); }
        }
      `}</style>

      <div className="br-root">
        {/* Header */}
        <div className="br-header">
          <div className="br-avatar">🤝</div>
          <div className="br-header-text">
            <h1>Samir — AI Broker</h1>
            <p>Sierra Estates · New Cairo Intelligence</p>
          </div>
          <div className="br-badge-live">Live</div>
        </div>

        {/* Profile memory bar */}
        {Object.keys(profile).length > 0 && (
          <div className="br-profile-bar">
            {profile.intent && <span>Intent: {profile.intent}</span>}
            {profile.preferred_compound && <span>Compound: {profile.preferred_compound}</span>}
            {profile.budget_max && <span>Budget: EGP {Number(profile.budget_max).toLocaleString()}</span>}
            {profile.preferred_beds && <span>{profile.preferred_beds} BR</span>}
          </div>
        )}

        {/* Messages */}
        <div className="br-messages">
          <AnimatePresence initial={false}>
            {messages.map(msg => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ duration: 0.2 }}
                style={{ display: 'flex', flexDirection: 'column' }}
              >
                <div className={`br-bubble ${msg.role}`}>
                  {msg.role === 'assistant' ? (
                    <div dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                  ) : (
                    msg.content
                  )}

                  {/* Listings */}
                  {msg.listings?.length ? (
                    <div style={{ marginTop: 10 }}>
                      {msg.listings.slice(0, 4).map(l => (
                        <ListingCard key={l.id || l.reference_code} listing={l} />
                      ))}
                    </div>
                  ) : null}

                  {/* Market stats */}
                  {msg.marketStats && <StatsBar stats={msg.marketStats} />}
                </div>
                <div className={`br-time`} style={{ alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start', paddingLeft: msg.role === 'assistant' ? 4 : 0 }}>
                  {new Date(msg.ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="br-typing"
            >
              <div className="br-dot" />
              <div className="br-dot" />
              <div className="br-dot" />
            </motion.div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Quick prompts */}
        <div className="br-quick-prompts">
          {QUICK_PROMPTS.map(q => (
            <button
              key={q.label}
              className="br-quick-btn"
              onClick={() => sendMessage(q.prompt)}
              disabled={loading}
            >
              {q.emoji} {q.label}
            </button>
          ))}
        </div>

        {/* Input */}
        <div className="br-input-area">
          <textarea
            ref={inputRef}
            className="br-textarea"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKey}
            placeholder="Ask about any compound, price, deal… (English or Arabic)"
            rows={1}
            disabled={loading}
          />
          <button
            className="br-send-btn"
            onClick={() => sendMessage(input)}
            disabled={loading || !input.trim()}
            aria-label="Send message"
          >
            ↑
          </button>
        </div>
      </div>
    </>
  );
}
