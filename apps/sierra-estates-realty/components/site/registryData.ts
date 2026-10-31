/**
 * registryData — re-export shim.
 *
 * The canonical cadastral registry data (COMPOUNDS, UNIT_LISTINGS,
 * REGISTRY_STATS, ARTERY_ROADS + the live-inventory hydration helpers) lives
 * in `components/MasterRegistryMap/registryData.ts`. This file used to be a
 * byte-identical 1,377-line copy of it; it now just re-exports the canonical
 * module so `components/site/CartographicMap.tsx` keeps working unchanged.
 * Import from the MasterRegistryMap path in any new code.
 */
export * from '../MasterRegistryMap/registryData';
