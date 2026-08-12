import React from 'react';
import OverviewPage from './OverviewPage';
import LeadsPage from './LeadsPage';
import ListingsHubPage from './ListingsHubPage';
import BotsControlPage from './BotsControlPage';
import WorkflowsPage from './WorkflowsPage';
import SearchInsightsPage from './SearchInsightsPage';
import FollowupsPage from './FollowupsPage';

export default function MegaDashboard({ T, isAr, searchQuery }: any) {
  return (
    <div className="flex flex-col gap-16 max-w-[1600px] mx-auto pb-32">
      {/* Overview / KPIs */}
      <section id="overview" className="scroll-mt-24">
        <OverviewPage T={T} />
      </section>

      {/* CRM & Leads */}
      <section id="leads" className="scroll-mt-24 border-t border-[#C9A24D]/20 pt-12">
        <div className="mb-8">
          <h2 className="text-3xl font-playfair text-[#F4F0E8] tracking-tight mb-2">CRM & Leads</h2>
          <p className="text-sm text-[#F4F0E8]/60 font-light">Manage your active pipeline, client interactions, and bot-curated requests.</p>
        </div>
        <LeadsPage T={T} isAr={isAr} searchQuery={searchQuery} />
      </section>

      {/* Property Inventory */}
      <section id="listings" className="scroll-mt-24 border-t border-[#C9A24D]/20 pt-12">
        <div className="mb-8">
          <h2 className="text-3xl font-playfair text-[#F4F0E8] tracking-tight mb-2">Property Inventory</h2>
          <p className="text-sm text-[#F4F0E8]/60 font-light">Curate and manage your luxury listings for the client portal. Enable 'Publish to Client' to feature them.</p>
        </div>
        <ListingsHubPage T={T} searchQuery={searchQuery} />
      </section>

      {/* Follow-ups */}
      <section id="followups" className="scroll-mt-24 border-t border-[#C9A24D]/20 pt-12">
        <div className="mb-8">
          <h2 className="text-3xl font-playfair text-[#F4F0E8] tracking-tight mb-2">Follow-ups</h2>
          <p className="text-sm text-[#F4F0E8]/60 font-light">Schedule and track agent and bot follow-ups.</p>
        </div>
        <FollowupsPage T={T} isAr={isAr} />
      </section>

      {/* Bot Control */}
      <section id="bots" className="scroll-mt-24 border-t border-[#C9A24D]/20 pt-12">
        <div className="mb-8">
          <h2 className="text-3xl font-playfair text-[#F4F0E8] tracking-tight mb-2">AI Bots & Agents</h2>
          <p className="text-sm text-[#F4F0E8]/60 font-light">Monitor and configure Sierra, Leila, and other autonomous conversational agents.</p>
        </div>
        <BotsControlPage T={T} isAr={isAr} />
      </section>

      {/* Workflows */}
      <section id="workflows" className="scroll-mt-24 border-t border-[#C9A24D]/20 pt-12">
        <div className="mb-8">
          <h2 className="text-3xl font-playfair text-[#F4F0E8] tracking-tight mb-2">Automation Workflows</h2>
          <p className="text-sm text-[#F4F0E8]/60 font-light">Manage automated email pipelines, WhatsApp sequences, and property scrapers.</p>
        </div>
        <WorkflowsPage T={T} isAr={isAr} searchQuery={searchQuery} />
      </section>

      {/* Insights */}
      <section id="searchInsights" className="scroll-mt-24 border-t border-[#C9A24D]/20 pt-12">
        <div className="mb-8">
          <h2 className="text-3xl font-playfair text-[#F4F0E8] tracking-tight mb-2">Search Insights</h2>
          <p className="text-sm text-[#F4F0E8]/60 font-light">Analyze client search behavior, localized demand, and macro trends.</p>
        </div>
        <SearchInsightsPage T={T} isAr={isAr} />
      </section>
    </div>
  );
}
