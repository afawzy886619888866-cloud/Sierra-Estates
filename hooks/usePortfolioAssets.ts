import { useState as _useState, useEffect as _useEffect, useCallback } from "react";
import {
  getFirestore as _getFirestore,
  collection as _collection,
  query as _query,
  where as _where,
  orderBy as _orderBy,
  onSnapshot as _onSnapshot,
} from "firebase/firestore";
import type { SBRAsset as SBRPortfolioAsset, RegistrySyncResult as PFSyncResult } from "../lib/integrations/portfolio-asset-registry";
import { pushAssetToRegistry as pushAssetToPF, getAssetRegistryAnalytics as getPFAssetAnalytics } from "../lib/integrations/portfolio-asset-registry";

export interface AssetWithAnalytics extends SBRPortfolioAsset {
  pfViews?: number;
  pfStakeholderInterests?: number;
  pfPhoneReveals?: number;
  pfImpressions?: number;
  pfCTR?: number;
  syncedToPF?: boolean;
  investmentTier?: string;
}

export function usePortfolioAssets(options: {
  syncedOnly?: boolean;
  compound?: string;
  maxLimit?: number;
} = {}) {
  const { syncedOnly = false, compound, maxLimit = 50 } = options;

  const [assets, _setAssets] = _useState<AssetWithAnalytics[]>([]);
  const [loading, _setLoading] = _useState(true);
  const [error,   _setError]   = _useState<string | null>(null);

  _useEffect(() => {
    const db = _getFirestore();
    const constraints: any[] = [
      _where("status", "==", "active"),
      _orderBy("strategicScore", "desc"),
    ];

    if (syncedOnly) constraints.unshift(_where("syncedToPF", "==", true));
    if (compound)   constraints.unshift(_where("compound", "==", compound));

    const q = _query(_collection(db, "portfolio_assets"), ...constraints);

    const unsub = _onSnapshot(q, snap => {
      const docs = snap.docs
        .slice(0, maxLimit)
        .map(d => ({ id: d.id, ...d.data() } as AssetWithAnalytics));
      _setAssets(docs);
      _setLoading(false);
    }, err => {
      _setError(err.message);
      _setLoading(false);
    });

    return () => unsub();
  }, [syncedOnly, compound, maxLimit]);

  const syncAsset = useCallback(
    async (asset: SBRPortfolioAsset): Promise<PFSyncResult> => {
      return pushAssetToPF(asset);
    },
    []
  );

  const fetchAnalytics = useCallback(
    async (pfAssetId: string) => {
      return getPFAssetAnalytics(pfAssetId);
    },
    []
  );

  const syncedCount   = assets.filter(l => l.syncedToPF).length;
  const unsyncedCount = assets.filter(l => !l.syncedToPF).length;
  const flagshipAssets = assets.filter(l => l.investmentTier === "Flagship");

  return {
    assets,
    loading,
    error,
    syncAsset,
    fetchAnalytics,
    syncedCount,
    unsyncedCount,
    flagshipAssets,
    totalActive: assets.length,
  };
}
