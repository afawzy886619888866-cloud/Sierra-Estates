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
import { Play, Save, Plus, CheckCircle, Sparkles } from 'lucide-react';
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
    data: { label: 'New Lead Event', description: 'WhatsApp & Website Webhook' },
  },
  {
    id: '2',
    type: 'agent',
    position: { x: 380, y: 50 },
    data: { label: 'The Scribe Agent', description: 'Cleanses & normalizes request' },
  },
  {
    id: '3',
    type: 'agent',
    position: { x: 380, y: 260 },
    data: { label: 'The Curator Agent', description: 'Matches live inventory & ROI' },
  },
  {
    id: '4',
    type: 'action',
    position: { x: 740, y: 150 },
    data: { label: 'Push to CRM & WhatsApp', description: 'Notify agent & client' },
  }
];

const initialEdges: Edge[] = [
  { id: 'e1-2', source: '1', target: '2', animated: true, style: { stroke: '#06b6d4', strokeWidth: 2 } },
  { id: 'e1-3', source: '1', target: '3', animated: true, style: { stroke: '#06b6d4', strokeWidth: 2 } },
  { id: 'e2-4', source: '2', target: '4', animated: true, style: { stroke: '#a855f7', strokeWidth: 2 } },
  { id: 'e3-4', source: '3', target: '4', animated: true, style: { stroke: '#a855f7', strokeWidth: 2 } },
];

interface WorkflowCanvasProps {
  onSaveWorkflow?: (nodes: Node[], edges: Edge[]) => void;
  onRunWorkflow?: (nodes: Node[], edges: Edge[]) => void;
  isRunning?: boolean;
  isAr?: boolean;
}

export default function WorkflowCanvas({
  onSaveWorkflow,
  onRunWorkflow,
  isRunning = false,
  isAr = false,
}: WorkflowCanvasProps) {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge({ ...params, animated: true, style: { stroke: '#06b6d4', strokeWidth: 2 } }, eds)),
    [setEdges],
  );

  const addNode = (type: 'trigger' | 'agent' | 'action') => {
    const id = `${nodes.length + 1}`;
    const xOffset = 300 + (nodes.length % 3) * 150;
    const yOffset = 100 + (nodes.length % 4) * 80;

    let data = { label: 'New Action', description: 'Custom step' };
    if (type === 'trigger') data = { label: 'Inbound Webhook', description: 'Property Finder / Meta API' };
    if (type === 'agent') data = { label: 'Nexus AI Matcher', description: 'Gemini 2.0 Flash reasoning' };
    if (type === 'action') data = { label: 'WhatsApp Dispatch', description: 'Send property showcase' };

    const newNode: Node = {
      id,
      type,
      position: { x: xOffset, y: yOffset },
      data,
    };

    setNodes((nds) => nds.concat(newNode));
  };

  const handleSave = () => {
    if (onSaveWorkflow) {
      onSaveWorkflow(nodes, edges);
    }
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 2500);
  };

  const handleRun = () => {
    if (onRunWorkflow) {
      onRunWorkflow(nodes, edges);
    }
  };

  return (
    <div className="w-full h-full bg-[#030712] rounded-xl overflow-hidden border border-slate-800 shadow-2xl relative flex flex-col">
      {/* Canvas Top Bar */}
      <div className="absolute top-4 right-4 z-20 flex items-center gap-2.5">
        <button
          onClick={handleRun}
          disabled={isRunning}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition shadow-[0_0_15px_rgba(16,185,129,0.3)] disabled:opacity-50"
        >
          <Play className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
          {isRunning ? (isAr ? 'جارٍ التنفيذ…' : 'Executing…') : (isAr ? 'تشغيل المسار' : 'Test Run Workflow')}
        </button>

        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold transition shadow-[0_0_15px_rgba(6,182,212,0.3)]"
        >
          {saveSuccess ? (
            <>
              <CheckCircle className="w-3.5 h-3.5 text-emerald-300" />
              <span>{isAr ? 'تم الحفظ!' : 'Saved!'}</span>
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              <span>{isAr ? 'حفظ المسار' : 'Save & Deploy'}</span>
            </>
          )}
        </button>
      </div>

      {/* Node Palette Overlay */}
      <div className="absolute top-4 left-4 bg-slate-900/90 backdrop-blur-md p-3.5 rounded-xl border border-slate-800 shadow-2xl z-10 flex flex-col gap-2 min-w-[170px]">
        <h3 className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          Add Node
        </h3>
        <button
          onClick={() => addNode('trigger')}
          className="text-[11px] text-cyan-400 font-mono border border-cyan-500/30 bg-cyan-950/40 hover:bg-cyan-900/50 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition text-left"
        >
          <Plus className="w-3 h-3" />
          ⚡ Trigger Node
        </button>
        <button
          onClick={() => addNode('agent')}
          className="text-[11px] text-purple-400 font-mono border border-purple-500/30 bg-purple-950/40 hover:bg-purple-900/50 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition text-left"
        >
          <Plus className="w-3 h-3" />
          🤖 AI Agent Node
        </button>
        <button
          onClick={() => addNode('action')}
          className="text-[11px] text-emerald-400 font-mono border border-emerald-500/30 bg-emerald-950/40 hover:bg-emerald-900/50 px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 transition text-left"
        >
          <Plus className="w-3 h-3" />
          🚀 Action Node
        </button>
      </div>

      {/* ReactFlow Interactive Graph */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        className="bg-[#030712] flex-1"
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
          maskColor="rgba(3, 7, 18, 0.85)"
          className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden"
        />
        <Background variant={BackgroundVariant.Dots} gap={16} size={1} color="#334155" />
      </ReactFlow>
    </div>
  );
}
