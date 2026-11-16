'use client';

/**
 * Client Compatibility Shim for CompoundsMap & InventoryMap
 *
 * Re-exports the illustrated CompoundsMap from ../site/CompoundsMap
 * and the spatial GIS InventoryMap from ./InventoryMap.
 */

export { default } from '../site/CompoundsMap';
export * from '../site/CompoundsMap';
export { default as InventoryMap } from './InventoryMap';
export * from './InventoryMap';
