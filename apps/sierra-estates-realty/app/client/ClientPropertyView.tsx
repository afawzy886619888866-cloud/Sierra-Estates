'use client';

import React from 'react';

export interface ClientProperty {
  unitId?: string;
  id?: string;
  code?: string;
  compound?: string;
  title?: string;
  price?: number | string;
  area?: number | string;
  rooms?: number | string;
  beds?: number | string;
  finishing?: string;
  furnishing?: string;
  notes?: string;
  description?: string;
  isDirectOwner?: boolean;
  advisorPhone?: string;
  [key: string]: any;
}

export interface ClientPropertyViewProps {
  property?: ClientProperty | null;
}

export default function ClientPropertyView({ property }: ClientPropertyViewProps) {
  const unitId = property?.unitId || property?.code || property?.id || 'SBR-NC-001';
  const rawPhone = property?.advisorPhone || '201092048333';
  const phone = rawPhone.replace(/[^0-9]/g, '');
  const waUrl = `https://wa.me/${phone}?text=${encodeURIComponent(`Inquiring about Unit ${unitId}`)}`;

  const priceNum = property?.price != null ? Number(property.price) : 8500000;
  const formattedPrice = isNaN(priceNum) ? property?.price : priceNum.toLocaleString('en-US');

  return (
    <div className="min-h-screen bg-[#F8F9FA] text-[#0A1628] font-sans antialiased">
      {/* Top Navbar */}
      <header className="sticky top-0 z-50 bg-[#0A1628] text-white px-6 py-4 flex justify-between items-center shadow-md">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded bg-[#C9A84C] flex items-center justify-center font-bold text-[#0A1628]">S</div>
          <span className="text-xl font-semibold tracking-wider">SIERRA BLU <span className="text-[#C9A84C]">REALTY</span></span>
        </div>
        <a 
          href={waUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="bg-[#C9A84C] hover:bg-[#b5953f] text-[#0A1628] font-bold px-4 py-2 rounded-lg transition cursor-pointer"
        >
          Contact Advisor
        </a>
      </header>

      {/* Main Container */}
      <main className="max-w-6xl mx-auto p-6 space-y-6">
        {/* Title & Badge */}
        <div className="flex flex-col md:flex-row md:justify-between md:items-end gap-4 border-b border-gray-200 pb-4">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="text-xs font-semibold uppercase bg-blue-100 text-[#0A1628] px-3 py-1 rounded-full">
                {property?.compound || "New Cairo Compound"}
              </span>
              {property?.isDirectOwner && (
                <span className="text-xs font-semibold uppercase bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full">
                  Direct Owner (0% Commission)
                </span>
              )}
            </div>
            <h1 className="text-3xl font-bold text-[#0A1628]">{property?.title || "Luxury Residence"}</h1>
            <p className="text-sm text-gray-500">ID: {unitId}</p>
          </div>
          <div className="text-right">
            <span className="text-xs text-gray-400 block uppercase">Price</span>
            <span className="text-3xl font-extrabold text-[#0A1628]">
              {formattedPrice} <span className="text-lg text-[#C9A84C]">EGP</span>
            </span>
          </div>
        </div>

        {/* Specifications Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
            <span className="text-xs text-gray-400 block">Area</span>
            <span className="text-xl font-bold text-[#0A1628]">{property?.area || 185} m²</span>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
            <span className="text-xs text-gray-400 block">Bedrooms</span>
            <span className="text-xl font-bold text-[#0A1628]">{property?.rooms || property?.beds || 3} Beds</span>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
            <span className="text-xs text-gray-400 block">Finishing</span>
            <span className="text-xl font-bold text-[#0A1628]">{property?.finishing || "Super Lux"}</span>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 text-center">
            <span className="text-xs text-gray-400 block">Furnishing</span>
            <span className="text-xl font-bold text-[#0A1628]">{property?.furnishing || "Unfurnished"}</span>
          </div>
        </div>

        {/* Notes & Description */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 space-y-3">
          <h3 className="text-lg font-bold text-[#0A1628]">Property Overview</h3>
          <p className="text-gray-600 leading-relaxed text-sm">
            {property?.notes || property?.description || "Prime location property with unobstructed landscape view, ready for delivery with all operational clearances."}
          </p>
        </div>
      </main>
    </div>
  );
}
