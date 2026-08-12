import React, { memo } from 'react';
import { Handle, Position } from '@xyflow/react';

// Common node styling
const nodeStyle = "rounded-lg border shadow-lg w-64 text-white overflow-hidden backdrop-blur-md";
const headerStyle = "px-4 py-2 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-2";
const bodyStyle = "p-4 text-sm font-semibold flex flex-col gap-1 bg-[#0a0f1d]/80";

export const TriggerNode = memo(({ data }: any) => {
  return (
    <div className={`${nodeStyle} border-cyan-500/50 shadow-[0_0_15px_rgba(6,182,212,0.15)]`}>
      <div className={`${headerStyle} bg-cyan-900/40 text-cyan-400 border-b border-cyan-500/20`}>
        <span>⚡</span> {data.label || 'Trigger'}
      </div>
      <div className={bodyStyle}>
        <span>{data.description || 'Webhook Event'}</span>
        <span className="text-[10px] text-slate-400 font-mono uppercase">Listening</span>
      </div>
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-cyan-400 border-2 border-[#0a0f1d]" />
    </div>
  );
});

export const AgentNode = memo(({ data }: any) => {
  return (
    <div className={`${nodeStyle} border-purple-500/50 shadow-[0_0_15px_rgba(168,85,247,0.15)]`}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-purple-400 border-2 border-[#0a0f1d]" />
      <div className={`${headerStyle} bg-purple-900/40 text-purple-400 border-b border-purple-500/20`}>
        <span>🤖</span> {data.label || 'Agent'}
      </div>
      <div className={bodyStyle}>
        <span>{data.description || 'Data Transformation'}</span>
        <span className="text-[10px] text-slate-400 font-mono uppercase">Execution Engine</span>
      </div>
      <Handle type="source" position={Position.Right} className="w-3 h-3 bg-purple-400 border-2 border-[#0a0f1d]" />
    </div>
  );
});

export const ActionNode = memo(({ data }: any) => {
  return (
    <div className={`${nodeStyle} border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.15)]`}>
      <Handle type="target" position={Position.Left} className="w-3 h-3 bg-emerald-400 border-2 border-[#0a0f1d]" />
      <div className={`${headerStyle} bg-emerald-900/40 text-emerald-400 border-b border-emerald-500/20`}>
        <span>🚀</span> {data.label || 'Action'}
      </div>
      <div className={bodyStyle}>
        <span>{data.description || 'Output Push'}</span>
        <span className="text-[10px] text-slate-400 font-mono uppercase">Sync</span>
      </div>
    </div>
  );
});
