'use client';

/**
 * RE-EXPORT SHIM
 * The canonical, CSS-module styled, 4K GIS map implementation lives in
 * `components/site/CartographicMap.tsx`. Re-exporting here ensures
 * SierraMasterRegistryApp uses the identical zero-regression engine.
 */
export { CartographicMap, default } from '../site/CartographicMap';
