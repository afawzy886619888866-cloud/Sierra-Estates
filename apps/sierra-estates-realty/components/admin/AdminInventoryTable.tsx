'use client';

import React, { useState } from 'react';

export interface InventoryUnitRow {
  lastUpdate?: string;
  availability?: string; // 'Available' | 'Under Offer' | 'Sold' | 'Rented'
  compound?: string;
  price?: number | string;
  rooms?: number | string;
  beds?: number | string;
  phone?: string;
  contactPhone?: string;
  deal?: string; // 'Sale' | 'Rent'
  advertiserType?: string; // 'Owner' | 'Broker'
  [key: string]: any;
}

export interface AdminInventoryTableProps {
  units?: InventoryUnitRow[];
}

const DEFAULT_UNITS: InventoryUnitRow[] = [
  {
    lastUpdate: 'Just now',
    availability: 'Available',
    compound: 'Mivida',
    price: 18500000,
    rooms: 3,
    phone: '+201092048333',
    deal: 'Sale',
    advertiserType: 'Owner',
  },
  {
    lastUpdate: '15m ago',
    availability: 'Under Offer',
    compound: 'Eastown',
    price: 14200000,
    rooms: 3,
    phone: '+201005541290',
    deal: 'Sale',
    advertiserType: 'Owner',
  },
  {
    lastUpdate: '1h ago',
    availability: 'Available',
    compound: 'Palm Hills New Cairo',
    price: 65000,
    rooms: 2,
    phone: '+201123498765',
    deal: 'Rent',
    advertiserType: 'Broker',
  },
  {
    lastUpdate: '2h ago',
    availability: 'Available',
    compound: 'Hyde Park',
    price: 24000000,
    rooms: 4,
    phone: '+201098765432',
    deal: 'Sale',
    advertiserType: 'Owner',
  },
  {
    lastUpdate: '3h ago',
    availability: 'Rented',
    compound: 'Villette',
    price: 75000,
    rooms: 3,
    phone: '+201209876543',
    deal: 'Rent',
    advertiserType: 'Owner',
  },
  {
    lastUpdate: '4h ago',
    availability: 'Sold',
    compound: 'Cairo Festival City',
    price: 32000000,
    rooms: 4,
    phone: '+201012345678',
    deal: 'Sale',
    advertiserType: 'Broker',
  },
  {
    lastUpdate: '5h ago',
    availability: 'Available',
    compound: 'Swan Lake Residences',
    price: 29500000,
    rooms: 4,
    phone: '+201098877665',
    deal: 'Sale',
    advertiserType: 'Owner',
  },
  {
    lastUpdate: '6h ago',
    availability: 'Available',
    compound: 'Madinaty',
    price: 35000,
    rooms: 3,
    phone: '+201155443322',
    deal: 'Rent',
    advertiserType: 'Owner',
  },
];

export default function AdminInventoryTable({ units }: AdminInventoryTableProps) {
  const [data, setData] = useState<InventoryUnitRow[]>(() => {
    if (units && units.length > 0) {
      return units.map((u) => ({
        lastUpdate: u.lastUpdate || 'Synced',
        availability: u.availability || (u as any).status || 'Available',
        compound: u.compound || (u as any).location || 'New Cairo',
        price: u.price != null ? Number(u.price) : 0,
        rooms: u.rooms ?? u.beds ?? 3,
        phone: u.phone || u.contactPhone || '+201092048333',
        deal: u.deal || ((u as any).mode === 'rent' ? 'Rent' : 'Sale'),
        advertiserType: u.advertiserType || ((u as any).isDirectOwner ? 'Owner' : 'Broker'),
      }));
    }
    return DEFAULT_UNITS;
  });

  const handleStatusChange = (index: number, newStatus: string) => {
    const updated = [...data];
    updated[index] = { ...updated[index], availability: newStatus };
    setData(updated);
  };

  const handleExportExcel = () => {
    const headers = ['Last Update', 'Status', 'Compound', 'Price (EGP)', 'Beds', 'Contact Phone', 'Deal', 'Type'];
    const csvRows = [
      headers.join(','),
      ...data.map((r) =>
        [
          `"${r.lastUpdate || ''}"`,
          `"${r.availability || ''}"`,
          `"${r.compound || ''}"`,
          r.price || 0,
          r.rooms || 0,
          `"${r.phone || ''}"`,
          `"${r.deal || ''}"`,
          `"${r.advertiserType || ''}"`,
        ].join(',')
      ),
    ];
    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `sierra_master_inventory_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50 text-[#0A1628] p-6 font-sans">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Executive Stats Bar */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-[#0A1628] text-white p-4 rounded-xl shadow-sm">
            <span className="text-xs text-[#C9A84C] font-semibold block uppercase">Total Inventory</span>
            <span className="text-2xl font-bold">{data.length} Units</span>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <span className="text-xs text-gray-500 font-semibold block uppercase">Direct Owners</span>
            <span className="text-2xl font-bold text-emerald-600">
              {data.filter((u) => u.advertiserType === 'Owner').length}
            </span>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <span className="text-xs text-gray-500 font-semibold block uppercase">Available For Sale</span>
            <span className="text-2xl font-bold text-blue-600">
              {data.filter((u) => u.deal === 'Sale' && u.availability === 'Available').length}
            </span>
          </div>
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
            <span className="text-xs text-gray-500 font-semibold block uppercase">Available For Rent</span>
            <span className="text-2xl font-bold text-amber-600">
              {data.filter((u) => u.deal === 'Rent' && u.availability === 'Available').length}
            </span>
          </div>
        </div>

        {/* Master Inventory Data Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
            <h2 className="text-lg font-bold text-[#0A1628]">Consolidated Inventory Master</h2>
            <button
              type="button"
              onClick={handleExportExcel}
              className="bg-[#0A1628] hover:bg-[#15233b] text-white text-xs px-4 py-2 rounded-lg font-semibold transition cursor-pointer"
            >
              Export Master Excel
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#0A1628] text-white text-xs uppercase font-medium">
                <tr>
                  <th className="py-3 px-4">Last Update</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Compound</th>
                  <th className="py-3 px-4">Price (EGP)</th>
                  <th className="py-3 px-4">Beds</th>
                  <th className="py-3 px-4">Contact Phone</th>
                  <th className="py-3 px-4">Deal</th>
                  <th className="py-3 px-4">Type</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50 transition">
                    <td className="py-3 px-4 text-xs text-gray-500 whitespace-nowrap">{row.lastUpdate}</td>
                    <td className="py-3 px-4">
                      <select 
                        value={row.availability || 'Available'}
                        onChange={(e) => handleStatusChange(idx, e.target.value)}
                        className={`text-xs font-semibold px-2 py-1 rounded border outline-none cursor-pointer ${
                          row.availability === 'Sold' ? 'bg-red-50 text-red-700 border-red-200' :
                          row.availability === 'Rented' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          row.availability === 'Under Offer' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                          'bg-emerald-50 text-emerald-700 border-emerald-200'
                        }`}
                      >
                        <option value="Available">Available</option>
                        <option value="Under Offer">Under Offer</option>
                        <option value="Sold">Sold</option>
                        <option value="Rented">Rented</option>
                      </select>
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#0A1628]">{row.compound}</td>
                    <td className="py-3 px-4 font-bold text-[#0A1628]">
                      {Number(row.price || 0).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">{row.rooms}</td>
                    <td className="py-3 px-4 text-xs font-mono">{row.phone}</td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-xs font-semibold ${
                        row.deal === 'Sale' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                      }`}>
                        {row.deal}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-xs text-gray-600">{row.advertiserType}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
