/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Sierra Estates — Listings Manager Page
 *  File: SE/apps/admin/src/components/ListingsManagerPage.tsx
 * ═══════════════════════════════════════════════════════════════════════════
 *
 *  Full CRUD interface for listings. Uses the new typed firebaseUtils:
 *    - fetchListings()          → table population
 *    - createListingWithOwner() → atomic create (listing + owner PII)
 *    - updateListing()          → inline status changes
 *    - deleteListingAndOwner()  → atomic delete
 *    - fetchOwnerByListingId()  → view owner contact (admin-only)
 *
 *  Features:
 *    - Filterable table (status, compound, mode)
 *    - Create modal with listing + owner fields in one form
 *    - Status badges (draft/active/sold) with color coding
 *    - Owner PII reveal (click to show phone — admin-only)
 *    - Batch-atomic delete (listing + owner together)
 * ═══════════════════════════════════════════════════════════════════════════
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Plus, Search, Edit3, Trash2, Phone, Eye, EyeOff, X, Check,
  Building2, MapPin, BedDouble, Maximize, Tag, Loader2, AlertCircle, RotateCw, Sparkles
} from 'lucide-react';
import VirtualTourStudio from './VirtualTourStudio';
import {
  fetchListings, createListingWithOwner, updateListing, deleteListingAndOwner,
  fetchOwnerByListingId,
} from '../services/firebaseUtils';
import {
  Listing,
  ListingInput,
  Owner,
  ListingStatus,
  PropertyType,
  FinishingLevel,
  DeliveryStatus,
  ListingMode,
} from '../types/index';

/* ──────────────────────────────────────────────────────────────────────────
 *  CONSTANTS
 * ────────────────────────────────────────────────────────────────────────── */

const STATUS_COLORS: Record<ListingStatus, string> = {
  draft: 'bg-gray-100 text-gray-700 border-gray-300',
  active: 'bg-green-100 text-green-700 border-green-300',
  sold: 'bg-blue-100 text-blue-700 border-blue-300',
};

const PROPERTY_TYPES: PropertyType[] = [
  'apartment', 'villa', 'townhouse', 'twin_house', 'penthouse', 'duplex', 'studio',
];

const FINISHING_LEVELS: FinishingLevel[] = [
  'core_shell', 'semi', 'fully_finished', 'ultra_lux',
];

const DELIVERY_STATUSES: DeliveryStatus[] = [
  'ready', 'under_construction', 'off_plan',
];

/* ──────────────────────────────────────────────────────────────────────────
 *  MAIN COMPONENT
 * ────────────────────────────────────────────────────────────────────────── */

export default function ListingsManagerPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState<ListingStatus | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [ownerCache, setOwnerCache] = useState<Record<string, Owner | null>>({});
  const [revealedOwners, setRevealedOwners] = useState<Set<string>>(new Set());
  const [tourListing, setTourListing] = useState<Listing | null>(null);

  // ── Load listings ──
  const loadListings = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchListings({
        status: filterStatus === 'all' ? undefined : filterStatus,
        limitCount: 200,
      });
      setListings(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load listings');
    } finally {
      setLoading(false);
    }
  }, [filterStatus]);

  useEffect(() => { loadListings(); }, [loadListings]);

  // ── Reveal owner PII (admin-only) ──
  const handleRevealOwner = async (listingId: string) => {
    if (revealedOwners.has(listingId)) {
      // Toggle off
      setRevealedOwners(prev => {
        const next = new Set(prev);
        next.delete(listingId);
        return next;
      });
      return;
    }
    // Fetch owner if not cached
    if (!ownerCache[listingId]) {
      try {
        const owner = await fetchOwnerByListingId(listingId);
        setOwnerCache(prev => ({ ...prev, [listingId]: owner }));
      } catch (err) {
        console.error('Failed to fetch owner:', err);
      }
    }
    setRevealedOwners(prev => new Set(prev).add(listingId));
  };

  // ── Status change ──
  const handleStatusChange = async (id: string, status: ListingStatus) => {
    try {
      await updateListing(id, { status });
      setListings(prev => prev.map(l => l.id === id ? { ...l, status } : l));
    } catch (err: any) {
      setError(`Failed to update status: ${err.message}`);
    }
  };

  // ── Delete (atomic listing + owner) ──
  const handleDelete = async (id: string) => {
    if (!confirm('Delete this listing AND its owner record? This cannot be undone.')) return;
    try {
      await deleteListingAndOwner(id);
      setListings(prev => prev.filter(l => l.id !== id));
    } catch (err: any) {
      setError(`Failed to delete: ${err.message}`);
    }
  };

  // ── Filtered list ──
  const filtered = listings.filter(l => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return l.compound_name.toLowerCase().includes(q) ||
           l.location_sector.toLowerCase().includes(q) ||
           l.property_type.toLowerCase().includes(q);
  });

  /* ── RENDER ── */
  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Listings Manager</h1>
          <p className="text-sm text-gray-500 mt-1">
            {filtered.length} listing{filtered.length !== 1 ? 's' : ''} ·
            Atomic create/delete with owner PII
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('sierra_navigate_tab', { detail: 'easyListing' }))}
            className="inline-flex items-center gap-2 px-4 py-2 bg-amber-600/20 text-amber-400 border border-amber-500/30 rounded-lg hover:bg-amber-600/30 transition font-medium text-sm"
          >
            <Sparkles size={18} /> Easy Listing (AI)
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm"
          >
            <Plus size={18} /> New Listing
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
          <AlertCircle size={16} /> {error}
          <button onClick={() => setError(null)} className="ml-auto"><X size={14} /></button>
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-3 mb-4">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search by compound, sector, or type..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        <select
          value={filterStatus}
          onChange={e => setFilterStatus(e.target.value as any)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-white"
        >
          <option value="all">All Status</option>
          <option value="draft">Draft</option>
          <option value="active">Active</option>
          <option value="sold">Sold</option>
        </select>
      </div>

      {/* Table */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <Loader2 className="animate-spin mr-2" size={20} /> Loading listings...
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Building2 size={40} className="mx-auto mb-3 opacity-50" />
          <p>No listings found. Create one to get started.</p>
        </div>
      ) : (
        <div className="overflow-x-auto bg-white rounded-xl border border-gray-200">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-600 text-xs uppercase">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Compound</th>
                <th className="text-left px-4 py-3 font-semibold">Type</th>
                <th className="text-left px-4 py-3 font-semibold">Beds</th>
                <th className="text-left px-4 py-3 font-semibold">Area</th>
                <th className="text-left px-4 py-3 font-semibold">Price (EGP)</th>
                <th className="text-left px-4 py-3 font-semibold">Mode</th>
                <th className="text-left px-4 py-3 font-semibold">Status</th>
                <th className="text-left px-4 py-3 font-semibold">Owner</th>
                <th className="text-right px-4 py-3 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.map(listing => (
                <tr key={listing.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-900">{listing.compound_name}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-1">
                      <MapPin size={10} /> {listing.location_sector}
                    </div>
                  </td>
                  <td className="px-4 py-3 capitalize">{listing.property_type.replace('_', ' ')}</td>
                  <td className="px-4 py-3">{listing.bedrooms}</td>
                  <td className="px-4 py-3">{listing.area_sqm} m²</td>
                  <td className="px-4 py-3 font-mono font-medium">
                    {listing.price_egp.toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                      listing.mode === 'sale' ? 'bg-blue-50 text-blue-700' : 'bg-purple-50 text-purple-700'
                    }`}>
                      {listing.mode}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={listing.status}
                      onChange={e => handleStatusChange(listing.id, e.target.value as ListingStatus)}
                      className={`px-2 py-1 rounded border text-xs font-medium cursor-pointer ${STATUS_COLORS[listing.status]}`}
                    >
                      <option value="draft">Draft</option>
                      <option value="active">Active</option>
                      <option value="sold">Sold</option>
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    {revealedOwners.has(listing.id) ? (
                      ownerCache[listing.id] ? (
                        <div className="text-xs">
                          <div className="font-medium text-gray-900">{ownerCache[listing.id]!.owner_name}</div>
                          <div className="flex items-center gap-1 text-gray-600">
                            <Phone size={10} /> {ownerCache[listing.id]!.phone_number}
                          </div>
                          <div className="text-gray-400">{ownerCache[listing.id]!.source_type}</div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">No owner</span>
                      )
                    ) : (
                      <button
                        onClick={() => handleRevealOwner(listing.id)}
                        className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                      >
                        <Eye size={12} /> Reveal
                      </button>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right flex items-center justify-end gap-2">
                    <button
                      onClick={() => setTourListing(listing)}
                      className="px-2.5 py-1 rounded bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 text-xs font-semibold flex items-center gap-1"
                      title="Preview 360° VR Tour"
                    >
                      <RotateCw size={12} />
                      <span>360° VR</span>
                    </button>
                    <button
                      onClick={() => handleDelete(listing.id)}
                      className="text-red-500 hover:text-red-700 p-1"
                      title="Delete listing + owner"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* 360° Virtual Tour Studio Modal */}
      {tourListing && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 z-50">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-5xl w-full p-4 overflow-hidden shadow-2xl relative">
            <button
              onClick={() => setTourListing(null)}
              className="absolute top-6 right-6 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 z-30"
            >
              <X size={20} />
            </button>
            <VirtualTourStudio unitId={tourListing.id} />
          </div>
        </div>
      )}

      {/* Create Modal */}
      {showCreateModal && (
        <CreateListingModal
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            loadListings();
          }}
        />
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
 *  CREATE LISTING MODAL (with owner PII — atomic batch write)
 * ═══════════════════════════════════════════════════════════════════════════ */

function CreateListingModal({ onClose, onCreated }: {
  onClose: () => void;
  onCreated: () => void;
}) {
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Listing fields
  const [compoundName, setCompoundName] = useState('');
  const [locationSector, setLocationSector] = useState('');
  const [propertyType, setPropertyType] = useState<PropertyType>('apartment');
  const [bedrooms, setBedrooms] = useState(3);
  const [bathrooms, setBathrooms] = useState(2);
  const [areaSqm, setAreaSqm] = useState(180);
  const [priceEgp, setPriceEgp] = useState(10000000);
  const [mode, setMode] = useState<ListingMode>('sale');
  const [finishing, setFinishing] = useState<FinishingLevel>('fully_finished');
  const [deliveryStatus, setDeliveryStatus] = useState<DeliveryStatus>('ready');
  const [paymentPlan, setPaymentPlan] = useState('');
  const [virtualTourUrl, setVirtualTourUrl] = useState('');
  const [vrAvailable, setVrAvailable] = useState(false);
  const [vrLink, setVrLink] = useState('');
  const [status, setStatus] = useState<ListingStatus>('draft');

  // Owner fields (PII)
  const [ownerName, setOwnerName] = useState('');
  const [ownerPhone, setOwnerPhone] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [sourceType, setSourceType] = useState<'direct' | 'broker'>('direct');
  const [brokerName, setBrokerName] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!compoundName.trim() || !ownerName.trim() || !ownerPhone.trim()) {
      setError('Compound name, owner name, and owner phone are required.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const listingInput: ListingInput = {
        status,
        property_type: propertyType,
        compound_name: compoundName.trim(),
        location_sector: locationSector.trim(),
        price_egp: Number(priceEgp),
        area_sqm: Number(areaSqm),
        bedrooms: Number(bedrooms),
        bathrooms: Number(bathrooms),
        finishing,
        mode,
        delivery_status: deliveryStatus,
        payment_plan: paymentPlan.trim() || undefined,
        virtual_tour_url: virtualTourUrl.trim() || undefined,
        vr_available: vrAvailable,
        vr_link: vrLink.trim() || undefined,
      };
      const ownerInput = {
        owner_name: ownerName.trim(),
        phone_number: ownerPhone.trim(),
        email: ownerEmail.trim() || undefined,
        source_type: sourceType,
        broker_name: sourceType === 'broker' ? brokerName.trim() : undefined,
      };

      // ⭐ Atomic batch write — listing + owner created together with same ID
      await createListingWithOwner({ listing: listingInput, owner: ownerInput });
      onCreated();
    } catch (err: any) {
      setError(err.message || 'Failed to create listing');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-6 py-4 flex items-center justify-between">
          <h2 className="text-lg font-bold">Create Listing + Owner</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2 text-sm text-red-700">
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {/* ── Listing Section ── */}
          <div>
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <Building2 size={16} /> Listing Details (Public)
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Compound Name" required>
                <input type="text" value={compoundName} onChange={e => setCompoundName(e.target.value)}
                  className="input" placeholder="e.g. Mivida" required />
              </Field>
              <Field label="Location Sector">
                <input type="text" value={locationSector} onChange={e => setLocationSector(e.target.value)}
                  className="input" placeholder="e.g. 5th Settlement" />
              </Field>
              <Field label="Property Type">
                <select value={propertyType} onChange={e => setPropertyType(e.target.value as PropertyType)} className="input">
                  {PROPERTY_TYPES.map(t => <option key={t} value={t}>{t.replace('_', ' ')}</option>)}
                </select>
              </Field>
              <Field label="Mode">
                <select value={mode} onChange={e => setMode(e.target.value as ListingMode)} className="input">
                  <option value="sale">Sale</option>
                  <option value="rent">Rent</option>
                </select>
              </Field>
              <Field label="Bedrooms">
                <input type="number" min="0" max="10" value={bedrooms} onChange={e => setBedrooms(+e.target.value)} className="input" />
              </Field>
              <Field label="Bathrooms">
                <input type="number" min="0" max="10" value={bathrooms} onChange={e => setBathrooms(+e.target.value)} className="input" />
              </Field>
              <Field label="Area (m²)">
                <input type="number" min="0" value={areaSqm} onChange={e => setAreaSqm(+e.target.value)} className="input" />
              </Field>
              <Field label="Price (EGP)">
                <input type="number" min="0" value={priceEgp} onChange={e => setPriceEgp(+e.target.value)} className="input" />
              </Field>
              <Field label="Finishing">
                <select value={finishing} onChange={e => setFinishing(e.target.value as FinishingLevel)} className="input">
                  {FINISHING_LEVELS.map(f => <option key={f} value={f}>{f.replace('_', ' ')}</option>)}
                </select>
              </Field>
              <Field label="Delivery">
                <select value={deliveryStatus} onChange={e => setDeliveryStatus(e.target.value as DeliveryStatus)} className="input">
                  {DELIVERY_STATUSES.map(d => <option key={d} value={d}>{d.replace('_', ' ')}</option>)}
                </select>
              </Field>
              <Field label="Status">
                <select value={status} onChange={e => setStatus(e.target.value as ListingStatus)} className="input">
                  <option value="draft">Draft</option>
                  <option value="active">Active (public)</option>
                  <option value="sold">Sold</option>
                </select>
              </Field>
              <Field label="VR Available">
                <input type="checkbox" checked={vrAvailable} onChange={e => setVrAvailable(e.target.checked)} className="mt-2 h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
              </Field>
              {vrAvailable && (
                <Field label="VR Link">
                  <input type="text" value={vrLink} onChange={e => setVrLink(e.target.value)} className="input" placeholder="e.g. Firebase storage link" />
                </Field>
              )}
              <Field label="Payment Plan (optional)">
                <input type="text" value={paymentPlan} onChange={e => setPaymentPlan(e.target.value)}
                  className="input" placeholder="e.g. 10% down, 5 years" />
              </Field>
              <div className="col-span-2">
                <Field label="Virtual Tour URL (optional)">
                  <input type="url" value={virtualTourUrl} onChange={e => setVirtualTourUrl(e.target.value)}
                    className="input" placeholder="https://listing3d.com/..." />
                </Field>
              </div>
            </div>
          </div>

          {/* ── Owner Section (PII) ── */}
          <div className="border-t pt-4">
            <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-2">
              <Phone size={16} /> Owner Details (Private PII — admin only)
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Owner Name" required>
                <input type="text" value={ownerName} onChange={e => setOwnerName(e.target.value)}
                  className="input" placeholder="Full name" required />
              </Field>
              <Field label="Phone Number" required>
                <input type="tel" value={ownerPhone} onChange={e => setOwnerPhone(e.target.value)}
                  className="input" placeholder="+20XXXXXXXXXX" required dir="ltr" />
              </Field>
              <Field label="Email (optional)">
                <input type="email" value={ownerEmail} onChange={e => setOwnerEmail(e.target.value)}
                  className="input" placeholder="owner@example.com" dir="ltr" />
              </Field>
              <Field label="Source">
                <select value={sourceType} onChange={e => setSourceType(e.target.value as 'direct' | 'broker')} className="input">
                  <option value="direct">Direct Owner</option>
                  <option value="broker">Broker</option>
                </select>
              </Field>
              {sourceType === 'broker' && (
                <div className="col-span-2">
                  <Field label="Broker Name">
                    <input type="text" value={brokerName} onChange={e => setBrokerName(e.target.value)}
                      className="input" placeholder="Broker / agency name" />
                  </Field>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-2 border-t">
            <button type="button" onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg">
              Cancel
            </button>
            <button type="submit" disabled={saving}
              className="inline-flex items-center gap-2 px-5 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
              {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
              {saving ? 'Creating...' : 'Create Listing + Owner'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ──────────────────────────────────────────────────────────────────────────
 *  HELPER: Form field wrapper
 * ────────────────────────────────────────────────────────────────────────── */
function Field({ label, required, children }: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-gray-600 mb-1 block">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
    </label>
  );
}
