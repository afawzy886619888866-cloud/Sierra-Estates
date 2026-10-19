"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  FolderTree,
  MapPin,
  RefreshCw,
  Search,
  QrCode,
  Database,
  Sparkles,
  Share2,
  CheckCircle2,
  Clock,
  ExternalLink,
  ChevronRight,
  ChevronDown,
  Building2,
  Home,
  Check,
  Layers,
  Layers3,
  Bot,
  Brain,
  Activity,
  SlidersHorizontal,
} from "lucide-react";
import type { LocationTreeNode, CategoryTreeNode } from "@/lib/inventory/InvenTreeInventoryHub";

interface MapPinItem {
  id: string;
  code: string;
  title: string;
  compound: string;
  district: string;
  lat: number;
  lng: number;
  priceFormatted: string;
  priceEgp: number;
  mode: string;
  status: string;
  qrUrl: string;
}

interface RAGResultItem {
  item: {
    code: string;
    title: string;
    compound: string;
    district: string;
    category: string;
    parameters: {
      buaM2: number;
      bedrooms: number;
      bathrooms: number;
      finishing: string;
      totalPriceEgp: number;
      rentalYieldPct?: number;
      downPaymentEgp?: number;
    };
    qrDeepLink: string;
    qrWhatsappLink: string;
  };
  score: number;
  explanation: string;
}

export default function InvenTreeHubView({ lang = "en" }: { lang?: string }) {
  const isAr = lang === "ar";
  const [activeTab, setActiveTab] = useState<"tree" | "rag" | "map" | "sync">("tree");
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Tree data
  const [locationTree, setLocationTree] = useState<LocationTreeNode | null>(null);
  const [categoryTree, setCategoryTree] = useState<CategoryTreeNode | null>(null);
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({ "loc-root": true });

  // Map & pins
  const [pins, setPins] = useState<MapPinItem[]>([]);
  const [selectedPin, setSelectedPin] = useState<MapPinItem | null>(null);

  // RAG Search
  const [ragQuery, setRagQuery] = useState("");
  const [ragSearching, setRagSearching] = useState(false);
  const [ragResults, setRagResults] = useState<RAGResultItem[]>([]);

  // QR Modal
  const [activeQrUnit, setActiveQrUnit] = useState<MapPinItem | null>(null);
  const [copiedLink, setCopiedLink] = useState(false);

  const toggleNode = (nodeId: string) => {
    setExpandedNodes((prev) => ({ ...prev, [nodeId]: !prev[nodeId] }));
  };

  const loadTreeAndPins = useCallback(async () => {
    setLoading(true);
    try {
      const [treeRes, mapRes] = await Promise.all([
        fetch("/api/inventory/hub?view=tree"),
        fetch("/api/inventory/hub?view=map"),
      ]);
      const treeJson = await treeRes.json();
      const mapJson = await mapRes.json();

      if (treeJson.success) {
        setLocationTree(treeJson.locationTree);
        setCategoryTree(treeJson.categoryTree);
      }
      if (mapJson.success) {
        setPins(mapJson.pins || []);
      }
    } catch (err) {
      console.error("Failed to load InvenTree Hub data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTreeAndPins();
  }, [loadTreeAndPins]);

  const handleSyncAll = async () => {
    setSyncing(true);
    setSyncStatus(isAr ? "جاري مزامنة المصادر مع محرك الذاكرة و Supabase..." : "Synchronizing Sheets ⇄ Local ⇄ Supabase ⇄ Memory Engine RAG...");
    try {
      const res = await fetch("/api/inventory/hub", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "sync" }),
      });
      const json = await res.json();
      if (json.success) {
        setSyncStatus(
          isAr
            ? `تمت المزامنة بنجاح! ${json.syncResult.syncedUnits} وحدة مفهرسة في RAG و Supabase.`
            : `Synchronized successfully! ${json.syncResult.syncedUnits} units re-indexed in RAG & Supabase.`
        );
        loadTreeAndPins();
      } else {
        setSyncStatus(`Sync error: ${json.error}`);
      }
    } catch (err) {
      setSyncStatus(`Sync error: ${(err as Error).message}`);
    } finally {
      setSyncing(false);
    }
  };

  const handleRagSearch = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!ragQuery.trim()) return;

    setRagSearching(true);
    try {
      const res = await fetch(`/api/inventory/hub?view=rag&q=${encodeURIComponent(ragQuery)}&limit=6`);
      const json = await res.json();
      if (json.success) {
        setRagResults(json.results || []);
      }
    } catch (err) {
      console.error("RAG search failed:", err);
    } finally {
      setRagSearching(false);
    }
  };

  return (
    <div className="space-y-6 text-slate-100">
      {/* ── Header ── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-6 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-md">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-400">
              <FolderTree className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                {isAr ? "مركز المخزون الهرمي ومحرك RAG (InvenTree)" : "InvenTree Hierarchical Inventory & RAG Hub"}
                <span className="px-2 py-0.5 text-xs font-semibold bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30">
                  {isAr ? "محدث" : "Unified Engine"}
                </span>
              </h1>
              <p className="text-xs text-slate-400 mt-0.5">
                {isAr
                  ? "إدارة هرمية للمواقع والمواصفات وربط الخرائط ومزامنة الشيتات مع محرك الذاكرة RAG"
                  : "Hierarchical stock locations, parametric specs, GIS map synchronization & Memory Engine RAG bridge"}
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={handleSyncAll}
            disabled={syncing}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium text-xs rounded-xl shadow-lg shadow-emerald-950/40 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? "animate-spin" : ""}`} />
            {syncing ? (isAr ? "مزامنة..." : "Syncing...") : (isAr ? "مزامنة الكل (Sheets & RAG)" : "Sync All (Sheets & RAG)")}
          </button>
        </div>
      </div>

      {/* Sync Status Banner */}
      {syncStatus && (
        <div className="flex items-center gap-3 p-4 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-xs text-emerald-300">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{syncStatus}</span>
        </div>
      )}

      {/* ── Navigation Tabs ── */}
      <div className="flex items-center gap-1 p-1 bg-slate-900/80 border border-slate-800/80 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab("tree")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
            activeTab === "tree" ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <FolderTree className="w-3.5 h-3.5 text-emerald-400" />
          {isAr ? "الشجرة الهرمية للمواقع" : "Location & Category Tree"}
        </button>

        <button
          onClick={() => setActiveTab("rag")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
            activeTab === "rag" ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <Brain className="w-3.5 h-3.5 text-cyan-400" />
          {isAr ? "استعلام محرك RAG" : "Memory Engine RAG"}
        </button>

        <button
          onClick={() => setActiveTab("map")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
            activeTab === "map" ? "bg-slate-800 text-white shadow-sm" : "text-slate-400 hover:text-slate-200"
          }`}
        >
          <MapPin className="w-3.5 h-3.5 text-amber-400" />
          {isAr ? "الخريطة المربوطة" : "Connected Map Pins"}
        </button>
      </div>

      {/* ── Tab: Location & Category Tree ── */}
      {activeTab === "tree" && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Location Tree */}
          <div className="p-5 bg-slate-900/50 border border-slate-800/80 rounded-2xl backdrop-blur-sm">
            <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400" />
              {isAr ? "شجرة المواقع الجغرافية (InvenTree Locations)" : "Geographic Location Tree (InvenTree)"}
            </h2>

            {locationTree ? (
              <div className="space-y-2 text-xs">
                <div
                  className="flex items-center justify-between p-2.5 bg-slate-800/40 border border-slate-700/50 rounded-xl cursor-pointer hover:bg-slate-800/60"
                  onClick={() => toggleNode(locationTree.id)}
                >
                  <div className="flex items-center gap-2">
                    {expandedNodes[locationTree.id] ? (
                      <ChevronDown className="w-4 h-4 text-slate-400" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    )}
                    <Building2 className="w-4 h-4 text-emerald-400" />
                    <span className="font-semibold text-slate-200">{locationTree.name}</span>
                  </div>
                  <span className="px-2 py-0.5 bg-emerald-500/10 text-emerald-400 font-mono text-[11px] rounded-full">
                    {locationTree.unitCount} {isAr ? "وحدة" : "units"}
                  </span>
                </div>

                {expandedNodes[locationTree.id] && (
                  <div className="pl-4 space-y-2 border-l border-slate-800 ml-4">
                    {Object.values(locationTree.children).map((city) => (
                      <div key={city.id} className="space-y-1.5">
                        <div
                          className="flex items-center justify-between p-2 bg-slate-800/20 rounded-lg cursor-pointer hover:bg-slate-800/40"
                          onClick={() => toggleNode(city.id)}
                        >
                          <div className="flex items-center gap-1.5">
                            {expandedNodes[city.id] ? (
                              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                            ) : (
                              <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                            )}
                            <span className="font-medium text-slate-300">{city.name}</span>
                          </div>
                          <span className="text-slate-400 font-mono text-[10px]">{city.unitCount}</span>
                        </div>

                        {expandedNodes[city.id] && (
                          <div className="pl-4 space-y-1 border-l border-slate-800 ml-3">
                            {Object.values(city.children).map((district) => (
                              <div key={district.id} className="space-y-1">
                                <div
                                  className="flex items-center justify-between p-1.5 rounded-lg cursor-pointer hover:bg-slate-800/30"
                                  onClick={() => toggleNode(district.id)}
                                >
                                  <div className="flex items-center gap-1.5">
                                    {expandedNodes[district.id] ? (
                                      <ChevronDown className="w-3 h-3 text-slate-500" />
                                    ) : (
                                      <ChevronRight className="w-3 h-3 text-slate-500" />
                                    )}
                                    <span className="text-slate-300 font-medium text-[11px]">{district.name}</span>
                                  </div>
                                  <span className="text-slate-400 font-mono text-[10px]">{district.unitCount}</span>
                                </div>

                                {expandedNodes[district.id] && (
                                  <div className="pl-4 space-y-1 border-l border-slate-800 ml-2">
                                    {Object.values(district.children).map((compound) => (
                                      <div
                                        key={compound.id}
                                        className="flex items-center justify-between p-1.5 rounded bg-slate-900/40 border border-slate-800/60 text-[11px]"
                                      >
                                        <span className="text-slate-300">{compound.name}</span>
                                        <span className="text-emerald-400 font-mono text-[10px]">
                                          {compound.unitCount} {isAr ? "وحدة" : "units"}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500 text-xs">{isAr ? "جاري التحميل..." : "Loading..."}</div>
            )}
          </div>

          {/* Category Tree */}
          <div className="p-5 bg-slate-900/50 border border-slate-800/80 rounded-2xl backdrop-blur-sm">
            <h2 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Layers3 className="w-4 h-4 text-cyan-400" />
              {isAr ? "شجرة التصنيفات والأنواع (InvenTree Categories)" : "Property Category Taxonomy (InvenTree)"}
            </h2>

            {categoryTree ? (
              <div className="space-y-3 text-xs">
                {Object.values(categoryTree.children).map((branch) => (
                  <div key={branch.id} className="p-3 bg-slate-800/30 border border-slate-700/50 rounded-xl space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-200">{branch.name}</span>
                      <span className="px-2 py-0.5 bg-cyan-500/10 text-cyan-400 font-mono text-[11px] rounded-full">
                        {branch.unitCount} {isAr ? "وحدة" : "units"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mt-2">
                      {Object.values(branch.children).map((cat) => (
                        <div
                          key={cat.id}
                          className="flex items-center justify-between p-2 bg-slate-900/60 border border-slate-800/60 rounded-lg"
                        >
                          <span className="text-slate-300 text-[11px]">{cat.name}</span>
                          <span className="text-cyan-400 font-mono text-[10px]">{cat.unitCount}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500 text-xs">{isAr ? "جاري التحميل..." : "Loading..."}</div>
            )}
          </div>
        </div>
      )}

      {/* ── Tab: Memory Engine RAG ── */}
      {activeTab === "rag" && (
        <div className="space-y-6">
          <div className="p-6 bg-slate-900/60 border border-slate-800/80 rounded-2xl backdrop-blur-sm">
            <h2 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              {isAr ? "استعلام الذكاء الاصطناعي للمخزون (RAG Assistant)" : "Grounded Inventory RAG Assistant"}
            </h2>
            <p className="text-xs text-slate-400 mb-4">
              {isAr
                ? "ابحث بلغة طبيعية مباشرة في محرك الذاكرة و RAG لاسترجاع الوحدات المطابقة مع العوائد الاستثمارية ورموز QR"
                : "Ask natural language queries across the RAG memory graph (budget, compound, bedrooms, rental yield, payment plans)"}
            </p>

            <form onSubmit={handleRagSearch} className="flex gap-2.5">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                <input
                  type="text"
                  value={ragQuery}
                  onChange={(e) => setRagQuery(e.target.value)}
                  placeholder={
                    isAr
                      ? "مثال: شقة 3 غرف في جولدن سكوير أو ميفيدا بعائد إيجاري فوق 8% بسعر أقل من 15 مليون"
                      : "e.g. 3 bedroom apartment in Mivida or Golden Square under 15M with high rental yield"
                  }
                  className="w-full bg-slate-950/80 border border-slate-700/80 rounded-xl pl-10 pr-4 py-2.5 text-xs text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-500/80"
                />
              </div>
              <button
                type="submit"
                disabled={ragSearching}
                className="px-5 py-2.5 bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-medium text-xs rounded-xl shadow-lg shadow-cyan-950/40 transition-all cursor-pointer flex items-center gap-2"
              >
                {ragSearching ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Bot className="w-3.5 h-3.5" />}
                {isAr ? "استعلام" : "Query RAG"}
              </button>
            </form>
          </div>

          {/* Results */}
          {ragResults.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {ragResults.map(({ item, score, explanation }) => (
                <div
                  key={item.code}
                  className="p-4 bg-slate-900/70 border border-slate-800 rounded-xl flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="font-mono text-xs font-bold text-cyan-400 bg-cyan-950/60 px-2 py-0.5 rounded border border-cyan-800/40">
                        {item.code}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">Score: {score}</span>
                    </div>
                    <h3 className="font-semibold text-slate-100 text-xs leading-snug">{item.title}</h3>
                    <p className="text-[11px] text-slate-400 mt-1">{item.compound} • {item.district}</p>
                    <p className="text-[11px] text-emerald-400 font-semibold mt-2">
                      {item.parameters.totalPriceEgp.toLocaleString()} EGP
                    </p>
                    <p className="text-[10px] text-slate-400 mt-1 italic">{explanation}</p>
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                    <span className="text-[10px] text-slate-500">
                      {item.parameters.buaM2}m² • {item.parameters.bedrooms} Beds
                    </span>
                    <button
                      onClick={() =>
                        setActiveQrUnit({
                          id: item.code,
                          code: item.code,
                          title: item.title,
                          compound: item.compound,
                          district: item.district,
                          lat: 0,
                          lng: 0,
                          priceFormatted: `${item.parameters.totalPriceEgp.toLocaleString()} EGP`,
                          priceEgp: item.parameters.totalPriceEgp,
                          mode: "sale",
                          status: "available",
                          qrUrl: item.qrDeepLink,
                        })
                      }
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer"
                      title="Generate InvenTree QR"
                    >
                      <QrCode className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Connected Map Pins ── */}
      {activeTab === "map" && (
        <div className="space-y-4">
          <div className="p-4 bg-slate-900/60 border border-slate-800/80 rounded-2xl flex items-center justify-between text-xs">
            <span className="text-slate-300">
              {isAr ? "عدد الدبابيس الجغرافية المتزامنة:" : "Total Geo-Synchronized Unit Pins:"}{" "}
              <strong className="text-amber-400 font-mono">{pins.length}</strong>
            </span>
            <span className="text-slate-500">
              {isAr ? "ربط فوري بين الجداول والخريطة" : "Direct Bi-Directional GIS Map Sync"}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {pins.slice(0, 18).map((pin) => (
              <div
                key={pin.code}
                onClick={() => setSelectedPin(pin)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                  selectedPin?.code === pin.code
                    ? "bg-amber-950/20 border-amber-500/80 shadow-md shadow-amber-950/30"
                    : "bg-slate-900/40 border-slate-800 hover:bg-slate-900/80"
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-mono text-xs font-bold text-amber-400">{pin.code}</span>
                  <span className="px-1.5 py-0.5 text-[9px] font-semibold bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20">
                    {pin.status}
                  </span>
                </div>
                <p className="text-xs font-medium text-slate-200">{pin.title}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  {pin.compound} ({pin.district})
                </p>
                <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-800 text-xs">
                  <span className="text-emerald-400 font-semibold">{pin.priceFormatted}</span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setActiveQrUnit(pin);
                    }}
                    className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded"
                  >
                    <QrCode className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── InvenTree QR Modal ── */}
      {activeQrUnit && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-sm w-full p-6 text-center space-y-4">
            <h3 className="font-bold text-white text-base">InvenTree QR Passport</h3>
            <p className="text-xs text-slate-400">
              {activeQrUnit.code} • {activeQrUnit.compound}
            </p>

            <div className="p-4 bg-white rounded-xl mx-auto w-44 h-44 flex items-center justify-center shadow-lg">
              {/* Fallback SVG QR visualization */}
              <div className="text-slate-900 font-mono text-[10px] text-center leading-tight">
                <QrCode className="w-28 h-28 mx-auto text-slate-950 mb-1" />
                <span className="font-bold">{activeQrUnit.code}</span>
              </div>
            </div>

            <p className="text-[11px] text-slate-400 break-all bg-slate-950/80 p-2.5 rounded-lg border border-slate-800">
              {activeQrUnit.qrUrl}
            </p>

            <div className="flex gap-2">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(activeQrUnit.qrUrl);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                }}
                className="flex-1 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-medium flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                {copiedLink ? "Copied!" : "Copy Link"}
              </button>
              <button
                onClick={() => setActiveQrUnit(null)}
                className="py-2 px-4 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-medium cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
