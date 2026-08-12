import React, { useState, useCallback } from 'react';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  BackgroundVariant
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

import { TriggerNode, AgentNode, ActionNode } from './CustomNodes';

const nodeTypes = {
  trigger: TriggerNode,
  agent: AgentNode,
  action: ActionNode,
};

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'trigger',
    position: { x: 50, y: 150 },
    data: { label: 'New Lead Event', description: 'WhatsApp & Website' },
  },
  {
    id: '2',
    type: 'agent',
    position: { x: 400, y: 50 },
    data: { label: 'The Scribe', description: 'Extracts preferences' },
  },
  {
    id: '3',
    type: 'agent',
    position: { x: 400, y: 250 },
    data: { label: 'The Curator', description: 'Finds matching properties' },
  },
  {
    id: '4',
    type: 'action',
    position: { x: 750, y: 150 },
    data: { label: 'Push to CRM', description: 'Save structured lead' },
  }
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#06b6d4', strokeWidth: 2 } },
  { id: 'e1-3', source: '1', target: '3', animated: true, style: { stroke: '#06b6d4', strokeWidth: 2 } },
  { id: 'e2-4', source: '2', target: '4', animated: true, style: { stroke: '#a855f7', strokeWidth: 2 } },
  { id: 'e3-4', source: '3', target: '4', animated: true, style: { stroke: '#a855f7', strokeWidth: 2 } },
];

export default function WorkflowCanvas() {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#94a3b8', strokeWidth: 2 } }, eds)),
    [setEdges],
  );

  return (
    <div className="w-full h-full bg-[#030712] rounded-xl overflow-hidden border border-slate-800 shadow-2xl relative">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        className="bg-[#030712]"
      >
        <Controls className="bg-slate-900 border-slate-800 fill-slate-300" />
        <MiniMap 
          nodeColor={(node) => {
            switch (node.type) {
              case 'trigger': return '#06b6d4';
              case 'agent': return '#a855f7';
              case 'action': return '#10b981';
              default: return '#475569';
            }
          }}
          maskColor="rgba(3, 7, 18, 0.8)"
          className="bg-slate-900 border border-slate-800 rounded overflow-hidden"
        />
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#334155" />
      </ReactFlow>
      
      {/* Node Palette Overlay */}
      <div className="absolute top-4 left-4 bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-slate-800 shadow-xl z-10 flex flex-col gap-2">
        <h3 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-widest mb-2">Available Nodes</h3>
        <div className="text-[10px] text-cyan-400 font-mono border border-cyan-500/30 bg-cyan-900/20 px-3 py-1.5 rounded cursor-pointer hover:bg-cyan-900/40">
          ⚡ Trigger Node
        </div>
        <div className="text-[10px] text-purple-400 font-mono border border-purple-500/30 bg-purple-900/20 px-3 py-1.5 rounded cursor-pointer hover:bg-purple-900/40">
          🤖 Agent Node
        </div>
        <div className="text-[10px] text-emerald-400 font-mono border border-emerald-500/30 bg-emerald-900/20 px-3 py-1.5 rounded cursor-pointer hover:bg-emerald-900/40">
          🚀 Action Node
        </div>
      </div>
    </div>
  );
}
