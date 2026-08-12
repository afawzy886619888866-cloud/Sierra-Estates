import React from 'react';

interface AgentTabsProps {
  agents: { id: string; name: string; emoji: string }[];
  activeAgentId: string;
  onSelectAgent: (id: string) => void;
}

export default function AgentTabs({ agents, activeAgentId, onSelectAgent }: AgentTabsProps) {
  return (
    <div className="flex overflow-x-auto border-b border-slate-800 bg-[#0a0f1d] rounded-t-xl hide-scrollbar">
      {agents.map((agent) => {
        const isActive = activeAgentId === agent.id;
        return (
          <button
            key={agent.id}
            onClick={() => onSelectAgent(agent.id)}
            className={`flex items-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wider transition border-b-2 whitespace-nowrap ${
              isActive
                ? 'border-cyan-500 text-cyan-400 bg-slate-900/40'
                : 'border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-900/20'
            }`}
          >
            <span className="text-sm">{agent.emoji}</span>
            {agent.name}
          </button>
        );
      })}
    </div>
  );
}
