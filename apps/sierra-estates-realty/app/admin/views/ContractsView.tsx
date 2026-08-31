'use client';

import React, { useState, useEffect } from 'react';
import { 
  FileText, 
  Send, 
  CheckCircle2, 
  Clock, 
  Printer, 
  ShieldCheck, 
  Download, 
  Sparkles, 
  DollarSign, 
  Building2, 
  User, 
  Phone,
  Layers,
  Copy,
  ExternalLink
} from 'lucide-react';

interface ContractItem {
  id: string;
  contractNumber: string;
  contractType: 'unit_reservation' | 'broker_commission_split';
  status: 'draft' | 'pending_signatures' | 'signed' | 'completed';
  createdAt: string;
  unit: {
    unitCode: string;
    compoundName: string;
    propertyType: string;
    agreedPrice: number;
    reservationDeposit: number;
    dealType: 'sale' | 'rent';
  };
  buyer: {
    name: string;
    phone: string;
  };
  sellerOrOwner: {
    name: string;
    phone: string;
  };
  signatureHash?: string;
}

export function ContractsView() {
  const [contracts, setContracts] = useState<ContractItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'create' | 'vault'>('create');
  const [submitting, setSubmitting] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<any>(null);

  // Form state
  const [contractType, setContractType] = useState<'unit_reservation' | 'broker_commission_split'>('unit_reservation');
  const [compoundName, setCompoundName] = useState('Eastown (SODIC)');
  const [unitCode, setUnitCode] = useState('ET-B04-3U');
  const [propertyType, setPropertyType] = useState('Apartment');
  const [dealType, setDealType] = useState<'sale' | 'rent'>('rent');
  const [agreedPrice, setAgreedPrice] = useState(45000);
  const [reservationDeposit, setReservationDeposit] = useState(45000);
  const [areaSqm, setAreaSqm] = useState(165);
  const [bedrooms, setBedrooms] = useState(3);
  const [bathrooms, setBathrooms] = useState(2);
  const [finishing, setFinishing] = useState('Ultra Super Lux');

  const [buyerName, setBuyerName] = useState('Omar Farouk');
  const [buyerPhone, setBuyerPhone] = useState('+201011223344');
  const [buyerNationalId, setBuyerNationalId] = useState('29001010101234');
  
  const [sellerName, setSellerName] = useState('Ahmed Mansour (Direct Owner)');
  const [sellerPhone, setSellerPhone] = useState('+201022844661');
  const [sellerNationalId, setSellerNationalId] = useState('28509090104829');

  const [commissionPercentage, setCommissionPercentage] = useState(2.5);
  const [externalBrokerName, setExternalBrokerName] = useState('');
  const [externalBrokerPhone, setExternalBrokerPhone] = useState('');

  useEffect(() => {
    fetchContracts();
  }, []);

  const fetchContracts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/contracts');
      const data = await res.json();
      if (data.contracts) {
        setContracts(data.contracts);
      }
    } catch (err) {
      console.error('Failed to load contracts:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateContract = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await fetch('/api/admin/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contractType,
          compoundName,
          unitCode,
          propertyType,
          dealType,
          agreedPrice,
          reservationDeposit,
          areaSqm,
          bedrooms,
          bathrooms,
          finishing,
          buyerName,
          buyerPhone,
          buyerNationalId,
          sellerName,
          sellerPhone,
          sellerNationalId,
          commissionPercentage,
          externalBrokerName,
          externalBrokerPhone,
        }),
      });

      const data = await res.json();
      if (data.success) {
        setGeneratedResult(data);
        fetchContracts();
      }
    } catch (err) {
      console.error('Failed to create contract:', err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in text-slate-100">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                Digital Deal Closing & Contract Generator
                <span className="text-xs bg-amber-500/20 text-amber-300 font-mono px-2 py-0.5 rounded-full border border-amber-500/30">
                  Bilingual E-Sign
                </span>
              </h1>
              <p className="text-slate-400 text-sm">
                Generate bilingual reservation agreements, broker commission split forms, and 1-click WhatsApp E-signature dispatches.
              </p>
            </div>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="flex bg-slate-800/80 p-1 rounded-xl border border-slate-700">
          <button
            onClick={() => setActiveTab('create')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'create'
                ? 'bg-amber-500 text-slate-950 font-semibold shadow-lg shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            + New Agreement
          </button>
          <button
            onClick={() => setActiveTab('vault')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
              activeTab === 'vault'
                ? 'bg-amber-500 text-slate-950 font-semibold shadow-lg shadow-amber-500/20'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Contract Vault ({contracts.length})
          </button>
        </div>
      </div>

      {activeTab === 'create' ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Form */}
          <div className="lg:col-span-7 bg-slate-900/60 p-6 rounded-2xl border border-slate-800 backdrop-blur-xl">
            <form onSubmit={handleCreateContract} className="space-y-6">
              {/* Type selector */}
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
                  Agreement Type | نوع الاتفاقية
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setContractType('unit_reservation')}
                    className={`p-3 rounded-xl border text-sm font-medium text-left transition-all ${
                      contractType === 'unit_reservation'
                        ? 'border-amber-500/50 bg-amber-500/10 text-amber-300'
                        : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-semibold">Unit Reservation</div>
                    <div className="text-xs opacity-75 font-arabic">عقد حجز وحدة وابداء رغبة</div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setContractType('broker_commission_split')}
                    className={`p-3 rounded-xl border text-sm font-medium text-left transition-all ${
                      contractType === 'broker_commission_split'
                        ? 'border-amber-500/50 bg-amber-500/10 text-amber-300'
                        : 'border-slate-800 bg-slate-950/40 text-slate-400 hover:border-slate-700'
                    }`}
                  >
                    <div className="font-semibold">Commission Split</div>
                    <div className="text-xs opacity-75 font-arabic">اتفاقية توزيع وتقاسم عمولة</div>
                  </button>
                </div>
              </div>

              {/* Property Details */}
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <Building2 className="w-4 h-4 text-amber-400" />
                  Property Specifications | بيانات الوحدة
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Compound / Location</label>
                    <input
                      type="text"
                      value={compoundName}
                      onChange={(e) => setCompoundName(e.target.value)}
                      className="w-full bg-slate-950/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Unit Code</label>
                    <input
                      type="text"
                      value={unitCode}
                      onChange={(e) => setUnitCode(e.target.value)}
                      className="w-full bg-slate-950/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Deal Mode</label>
                    <select
                      value={dealType}
                      onChange={(e) => setDealType(e.target.value as any)}
                      className="w-full bg-slate-950/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                    >
                      <option value="rent">Rental (إيجار)</option>
                      <option value="sale">Resale / Primary (بيع)</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Agreed Price (EGP)</label>
                    <input
                      type="number"
                      value={agreedPrice}
                      onChange={(e) => setAgreedPrice(Number(e.target.value))}
                      className="w-full bg-slate-950/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Reservation Deposit</label>
                    <input
                      type="number"
                      value={reservationDeposit}
                      onChange={(e) => setReservationDeposit(Number(e.target.value))}
                      className="w-full bg-slate-950/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-emerald-400 focus:border-amber-500 focus:outline-none font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Area (m²)</label>
                    <input
                      type="number"
                      value={areaSqm}
                      onChange={(e) => setAreaSqm(Number(e.target.value))}
                      className="w-full bg-slate-950/60 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Bedrooms / Baths</label>
                    <input
                      type="text"
                      value={`${bedrooms} Beds / ${bathrooms} Baths`}
                      disabled
                      className="w-full bg-slate-950/30 border border-slate-800 rounded-lg px-3 py-2 text-sm text-slate-400"
                    />
                  </div>
                </div>
              </div>

              {/* Stakeholders */}
              <div className="space-y-4 pt-4 border-t border-slate-800">
                <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                  <User className="w-4 h-4 text-amber-400" />
                  Contract Stakeholders | أطراف التعاقد
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Buyer */}
                  <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800 space-y-3">
                    <div className="text-xs font-semibold text-amber-400">Buyer / Tenant (الطرف الأول)</div>
                    <div>
                      <input
                        type="text"
                        placeholder="Full Legal Name"
                        value={buyerName}
                        onChange={(e) => setBuyerName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="WhatsApp Phone (+20...)"
                        value={buyerPhone}
                        onChange={(e) => setBuyerPhone(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="National ID / Passport"
                        value={buyerNationalId}
                        onChange={(e) => setBuyerNationalId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                  </div>

                  {/* Owner */}
                  <div className="p-4 bg-slate-950/40 rounded-xl border border-slate-800 space-y-3">
                    <div className="text-xs font-semibold text-emerald-400">Owner / Seller (الطرف الثاني)</div>
                    <div>
                      <input
                        type="text"
                        placeholder="Full Legal Name"
                        value={sellerName}
                        onChange={(e) => setSellerName(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Phone (+20...)"
                        value={sellerPhone}
                        onChange={(e) => setSellerPhone(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="National ID / Passport"
                        value={sellerNationalId}
                        onChange={(e) => setSellerNationalId(e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Submit */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-bold py-3.5 px-6 rounded-xl shadow-lg shadow-amber-500/20 transition-all flex items-center justify-center gap-2"
              >
                {submitting ? (
                  <Clock className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-5 h-5" />
                    Generate Bilingual Contract & Dispatch E-Sign
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Live Preview / Output Result */}
          <div className="lg:col-span-5 space-y-6">
            {generatedResult ? (
              <div className="bg-slate-900/60 p-6 rounded-2xl border border-emerald-500/30 backdrop-blur-xl space-y-6">
                <div className="flex items-center gap-3 text-emerald-400">
                  <CheckCircle2 className="w-6 h-6" />
                  <div>
                    <h3 className="font-bold text-white">Contract Synthesized Successfully!</h3>
                    <p className="text-xs text-slate-400">Serial: {generatedResult.contract.contractNumber}</p>
                  </div>
                </div>

                <div className="space-y-3 bg-slate-950/60 p-4 rounded-xl border border-slate-800 text-xs">
                  <div className="flex justify-between">
                    <span className="text-slate-400">Property:</span>
                    <span className="font-semibold text-white">{generatedResult.contract.unit.compoundName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Agreed Price:</span>
                    <span className="font-semibold text-amber-400">{generatedResult.contract.unit.agreedPrice.toLocaleString()} EGP</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Deposit:</span>
                    <span className="font-semibold text-emerald-400">{generatedResult.contract.unit.reservationDeposit.toLocaleString()} EGP</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-400">Hash:</span>
                    <span className="font-mono text-[10px] text-slate-400 truncate max-w-[200px]">
                      {generatedResult.contract.signatureHash}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="space-y-3">
                  {generatedResult.whatsappLink && (
                    <a
                      href={generatedResult.whatsappLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 text-sm transition-all"
                    >
                      <Send className="w-4 h-4" />
                      Dispatch E-Sign via WhatsApp
                    </a>
                  )}

                  <div className="grid grid-cols-2 gap-3">
                    <a
                      href={`/api/contracts/${generatedResult.contract.id}/preview`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="bg-slate-800 hover:bg-slate-700 text-white font-medium py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 text-xs border border-slate-700 transition-all"
                    >
                      <ExternalLink className="w-4 h-4 text-amber-400" />
                      View Printable HTML
                    </a>
                    <button
                      onClick={() => window.open(`/api/contracts/${generatedResult.contract.id}/preview`, '_blank')}
                      className="bg-slate-800 hover:bg-slate-700 text-white font-medium py-2.5 px-3 rounded-xl flex items-center justify-center gap-2 text-xs border border-slate-700 transition-all"
                    >
                      <Printer className="w-4 h-4 text-amber-400" />
                      Print / Save PDF
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="bg-slate-900/40 p-8 rounded-2xl border border-slate-800/80 text-center space-y-4">
                <div className="w-12 h-12 rounded-2xl bg-slate-800 flex items-center justify-center mx-auto text-slate-400">
                  <FileText className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-white text-base">Bilingual Legal Synthesis</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Fill out the terms on the left to synthesize an official, SHA-256 hashed bilingual real estate contract ready for immediate electronic signature.
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Vault View */
        <div className="bg-slate-900/60 rounded-2xl border border-slate-800 overflow-hidden backdrop-blur-xl">
          <div className="p-6 border-b border-slate-800 flex justify-between items-center">
            <h3 className="font-bold text-white text-lg">Digital Contract Vault</h3>
            <span className="text-xs text-slate-400">Total: {contracts.length} Agreements</span>
          </div>

          <div className="divide-y divide-slate-800">
            {contracts.map((c) => (
              <div key={c.id} className="p-5 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 hover:bg-slate-850/50 transition-all">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-sm font-bold text-amber-400">{c.contractNumber}</span>
                    <span className="text-xs px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 font-medium">
                      {c.unit.compoundName} — {c.unit.unitCode}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                      {c.status}
                    </span>
                  </div>
                  <div className="text-xs text-slate-400 flex items-center gap-4">
                    <span>Buyer: <strong className="text-slate-200">{c.buyer.name}</strong></span>
                    <span>•</span>
                    <span>Owner: <strong className="text-slate-200">{c.sellerOrOwner.name}</strong></span>
                    <span>•</span>
                    <span>Agreed: <strong className="text-amber-300">{c.unit.agreedPrice.toLocaleString()} EGP</strong></span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <a
                    href={`/api/contracts/${c.id}/preview`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-all text-xs flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    Preview
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
