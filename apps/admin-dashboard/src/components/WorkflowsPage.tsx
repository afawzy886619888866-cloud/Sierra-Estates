import React from 'react';
import WorkflowCanvas from './WorkflowBuilder/WorkflowCanvas';

interface WorkflowsPageProps {
  T: (key: string) => string;
  isAr?: boolean;
  searchQuery?: string;
}

export default function WorkflowsPage({ T, isAr, searchQuery = '' }: WorkflowsPageProps) {
  return (
    <div className="h-full flex flex-col w-full animate-fade-in-up">
      {/* Header Area */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <span className="text-cyan-400">⚡</span> 
            {isAr ? "بناء المهام الآلية" : "Workflow Builder"}
          </h2>
          <p className="text-xs text-slate-400 mt-1 font-mono uppercase tracking-wider">
            {isAr ? "قم بتصميم وتعديل مسارات العمل الخاصة بالوكلاء الذكاء الاصطناعي" : "Visual Orchestration Engine for AI Agents & Webhooks"}
          </p>
        </div>
        
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white hover:bg-slate-700 rounded-lg text-xs font-semibold transition border border-slate-700">
            {isAr ? "استيراد مسار" : "Import Workflow"}
          </button>
          <button className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold transition shadow-[0_0_15px_rgba(6,182,212,0.3)]">
            {isAr ? "إنشاء جديد +" : "New Workflow +"}
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 w-full relative rounded-xl border border-slate-800 shadow-2xl overflow-hidden min-h-[600px] bg-[#030712]">
        <WorkflowCanvas />
      </div>
    </div>
  );
}
