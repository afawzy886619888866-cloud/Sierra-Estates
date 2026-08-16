import React, { useState, useRef, useEffect } from 'react';

interface TermLine {
  t: 'dim' | 'green' | 'red' | 'blue' | 'purple' | 'prompt' | '';
  l: string;
}

const DEFAULT_TERMINAL_LOGS: TermLine[] = [
  { t: 'dim', l: 'OpenClaw v3.5.0 · Sierra Estates Intelligence & Autonomous Multi-Agent Mesh' },
  { t: 'dim', l: '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━' },
  { t: 'green', l: '[✓] Unified Memory Bus active — cross-bot persistent knowledge synced' },
  { t: 'green', l: '[✓] Hermes Agent v2.4 (Market Scout & Skill Synthesizer) ONLINE' },
  { t: 'green', l: '[✓] WhatsApp Senior AI Consultant (Gemini 2.0 Flash + Audio Transcription) ONLINE' },
  { t: 'green', l: '[✓] Stage-9 Closer & AVM Valuator — Deal routing active' },
  { t: 'blue', l: '[~] Obsidian Vault (14 Notes) indexed into Unified Vector Store' },
  { t: '', l: '' },
  { t: 'prompt', l: 'sierra status --all-agents' },
  { t: 'green', l: '  Hermes Agent      Online    99%   Market Scout & Autonomous Skills' },
  { t: 'green', l: '  WhatsApp Agent    Online    98%   Gemini 2.0 Flash / Voice / Reminders' },
  { t: 'green', l: '  OpenClaw Engine   Online    95%   Omnichannel Pipeline Routing' },
  { t: 'green', l: '  Stage-9 Closer    Online    91%   High-Net-Worth Deal Structuring' },
  { t: 'blue', l: '  Unified Memory    Syncing   100%  14 Vault Notes + Cross-Bot Events' },
  { t: 'dim', l: "Type 'help' or try 'hermes <query>', 'memory <query>', 'market scan'..." },
];

export default function OpenClawPage() {
  const [cmd, setCmd] = useState('');
  const [logs, setLogs] = useState<TermLine[]>(DEFAULT_TERMINAL_LOGS);
  const termEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    termEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const runCommand = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    const trimmed = cmd.trim();
    if (!trimmed) return;

    const nextLogs = [...logs, { t: 'prompt' as const, l: trimmed }];
    const lower = trimmed.toLowerCase();

    if (lower === 'clear') {
      setLogs([]);
      setCmd('');
      return;
    }

    if (lower.startsWith('hermes ') || lower.startsWith('@hermes ')) {
      const q = trimmed.replace(/^@?hermes\s+/i, '');
      nextLogs.push(
        { t: 'purple', l: `🦅 [Hermes Agent]: Querying Unified Memory for "${q}"...` },
        { t: 'green', l: `🦅 [Hermes Scout]: New Cairo Market benchmark for "${q}": Average 72,000 EGP/m² | High buyer velocity in Mivida, Villette, and Eastown | Recommended strategy: Highlight 15%-25% upfront payment savings.` }
      );
    } else if (lower.startsWith('memory ') || lower.startsWith('vault ')) {
      const q = trimmed.replace(/^(memory|vault)\s+/i, '');
      nextLogs.push(
        { t: 'blue', l: `🧠 [Unified Memory Search]: Searching 14 Obsidian Vault Notes & Cross-Bot events for "${q}"...` },
        { t: 'green', l: `  [✓] Match 1: [[compounds-guide.md]] — Price Matrix & Layouts` },
        { t: 'green', l: `  [✓] Match 2: [[objections-and-policies.md]] — Diplomatic Leases & Cash Discounts` },
        { t: 'dim', l: `  Insight shared with all active agents (WhatsApp, Hermes, Closer, Concierge).` }
      );
    } else if (lower === 'market scan' || lower === 'scan') {
      nextLogs.push(
        { t: 'purple', l: '🦅 [Hermes Scout]: Initiating automated New Cairo Compound Market Scan...' },
        { t: 'green', l: '  [✓] Mivida Emaar: 85,000 EGP/m² · 9.2% Rental Yield · Trend: HIGH' },
        { t: 'green', l: '  [✓] Uptown Cairo: 95,000 EGP/m² · 10.5% Rental Yield · Trend: HIGH' },
        { t: 'green', l: '  [✓] Villette SODIC: 78,000 EGP/m² · 8.8% Rental Yield · Trend: HIGH' },
        { t: 'green', l: '  [✓] Eastown SODIC: 65,000 EGP/m² · 8.0% Rental Yield · Trend: STABLE' },
        { t: 'blue', l: '[~] Ingested 4 compound updates into Unified Memory for all bots.' }
      );
    } else if (lower === 'skills' || lower === 'learn') {
      nextLogs.push(
        { t: 'blue', l: '⚡ [Autonomous Skill Synthesizer]: Active skills learned from real interactions:' },
        { t: 'green', l: '  1. "Semi-Furnished Upfront Pitch" (15% Cash Discount conversion)' },
        { t: 'green', l: '  2. "Diplomatic Lease Corporate Shield" (Embassy & Multinational tenant structuring)' },
        { t: 'green', l: '  3. "Dynamic Budget Matcher ±15%" (3BR New Cairo fast recommendation)' }
      );
    } else if (lower.includes('status')) {
      nextLogs.push({ t: 'green', l: '[✓] All 5 Agents + Unified Memory Bus Operational · 100% Healthy' });
    } else if (lower.includes('sync')) {
      nextLogs.push(
        { t: 'blue', l: '[~] Syncing cross-bot memory store with Obsidian Vault...' },
        { t: 'green', l: '[✓] Unified Memory Sync complete · 14 Notes + Real-time events synchronized.' }
      );
    } else if (lower.includes('help')) {
      nextLogs.push({
        t: 'dim',
        l: 'Interactive Multi-Bot Commands:\n  • hermes <query>   ➔ Ask Hermes Autonomous Market Scout\n  • memory <query>   ➔ Search Unified Memory across all bot logs & vault\n  • market scan      ➔ Run automated New Cairo compound pricing scan\n  • skills           ➔ View auto-learned skills synthesized across bots\n  • sync             ➔ Re-sync Unified Memory Bus\n  • status           ➔ View multi-agent mesh health',
      });
    } else {
      nextLogs.push({ t: 'red', l: `[!] Unknown command: "${trimmed}" · Type 'help' for multi-bot commands.` });
    }

    setLogs(nextLogs);
    setCmd('');
  };

  const executeAction = (actionName: string, icon: string) => {
    setLogs((prev) => [
      ...prev,
      { t: 'purple', l: `[~] Dispatching command to Unified Multi-Agent Bus: ${actionName}...` },
      { t: 'green', l: `[✓] Hermes & WhatsApp agents updated unified memory for ${actionName} ${icon}` },
    ]);
  };

  const renderColorClass = (t: string) => {
    switch (t) {
      case 'dim':
        return 'text-cyan-400/50';
      case 'green':
        return 'text-emerald-400';
      case 'red':
        return 'text-red-400';
      case 'blue':
        return 'text-blue-400';
      case 'purple':
        return 'text-amber-400';
      case 'prompt':
        return 'text-white before:content-["→_"] before:text-cyan-400';
      default:
        return 'text-slate-200';
    }
  };

  return (
    <div className="space-y-6 animate-fade-in-up">
      {/* Mini Controls */}
      <div className="flex gap-2 flex-wrap select-none">
        <button
          onClick={() => setLogs(DEFAULT_TERMINAL_LOGS)}
          className="px-4 py-2 text-xs font-mono bg-white/5 hover:bg-white/10 border border-slate-800 text-slate-300 rounded-lg transition active:scale-95 duration-100 cursor-pointer"
          id="btn-reset-terminal"
        >
          🔄 Reset Console
        </button>
        <button
          onClick={() => {
            setLogs((p) => [
              ...p,
              { t: 'purple', l: '🦅 [Hermes Scout]: Running autonomous New Cairo market scan...' },
              { t: 'green', l: '  [✓] Market pricing & rental yields updated in Unified Memory Vault.' },
            ]);
          }}
          className="px-4 py-2 text-xs font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-lg shadow hover:bg-amber-500/20 transition active:scale-95 duration-100 cursor-pointer"
          id="btn-hermes-scan"
        >
          🦅 Hermes Market Scan
        </button>
        <button
          onClick={() => {
            setLogs((p) => [
              ...p,
              { t: 'blue', l: '🧠 [Unified Memory Bus]: Ingesting real-time events across all agents...' },
              { t: 'green', l: '[✓] 14 Obsidian Notes + WhatsApp transcripts linked into single brain.' },
            ]);
          }}
          className="px-4 py-2 text-xs font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 rounded-lg shadow hover:bg-cyan-500/20 transition active:scale-95 duration-100 cursor-pointer"
          id="btn-sync-unified-memory"
        >
          🧠 Sync Unified Memory
        </button>
      </div>

      {/* Terminal emulator */}
      <div className="bg-[#05080f] border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
        <div className="px-5 py-3.5 bg-[#0a0f1d]/60 border-b border-slate-800 flex items-center justify-between select-none">
          <span className="font-mono text-[10px] uppercase tracking-wider text-cyan-400 font-bold flex items-center gap-2">
            <span>⚙️</span> OpenClaw & Hermes Multi-Agent Command Console
          </span>
          <span className="text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2.5 py-0.5 rounded font-bold">
            Unified Memory Active
          </span>
        </div>

        <div className="p-5 h-[360px] overflow-y-auto font-mono text-xs space-y-1 scrollbar scroll-smooth">
          {logs.map((l, i) => (
            <div key={i} className={`leading-relaxed whitespace-pre-wrap ${renderColorClass(l.t)}`}>
              {l.l}
            </div>
          ))}
          {/* Working directory line */}
          <div className="flex items-center gap-1.5 pt-2">
            <span className="text-cyan-400 select-none">sierra@intel:~$</span>
            <input
              type="text"
              value={cmd}
              onChange={(e) => setCmd(e.target.value)}
              onKeyDown={runCommand}
              className="flex-1 bg-transparent border-none outline-none text-white font-semibold text-xs py-0"
              placeholder="Type command e.g., 'hermes Mivida ROI', 'market scan', 'memory 3BR'..."
              id="terminal-repl-input"
              autoFocus
            />
          </div>
          <div ref={termEndRef} />
        </div>
      </div>

      {/* Grid actions trigger */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        {[
          { l: 'Hermes Scout', c: '🦅' },
          { l: 'Unified Memory', c: '🧠' },
          { l: 'WhatsApp Agent', c: '💬' },
          { l: 'Stage-9 Closer', c: '🤝' },
          { l: 'Learned Skills', c: '⚡' },
          { l: 'Scan Market', c: '📈' },
        ].map((a, i) => (
          <button
            key={i}
            onClick={() => executeAction(a.l, a.c)}
            className="flex flex-col items-center justify-center p-3.5 bg-[#0a0f1d] border border-slate-800 hover:border-cyan-500/30 rounded transition duration-200 select-none cursor-pointer duration-100 active:scale-95"
          >
            <span className="text-xl mb-1">{a.c}</span>
            <span className="font-mono text-[8.5px] tracking-wide uppercase text-slate-400 shrink-0">
              {a.l}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
