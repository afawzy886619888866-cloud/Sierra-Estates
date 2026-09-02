 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }import { db } from './firebase';
import { logger } from '@/lib/logger';
import {
  collection,
  getDocs,
  query,
  where,

} from 'firebase/firestore';

/**
 * sierra estates — DATA INTERFACE MODEL
 * Strict TypeScript schema for all property documents
 */




























/**
 * Async Query: Fetch properties by type
 */
export async function fetchPropertiesFromDB(
  type
) {
  try {
    const constraints = [
      where('type', '==', type),
      where('status', '==', 'Available'),
    ];

    const q = query(collection(db, 'properties'), ...constraints);
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: _optionalChain([doc, 'access', _ => _.data, 'call', _2 => _2(), 'access', _3 => _3.createdAt, 'optionalAccess', _4 => _4.toDate, 'optionalCall', _5 => _5()]) || new Date(),
      updatedAt: _optionalChain([doc, 'access', _6 => _6.data, 'call', _7 => _7(), 'access', _8 => _8.updatedAt, 'optionalAccess', _9 => _9.toDate, 'optionalCall', _10 => _10()]) || new Date(),
    } ));
  } catch (error) {
    logger.error(`[DB] Error fetching ${type} properties:`, error);
    return [];
  }
}

/**
 * Async Query: Fetch all map-ready properties (spatial viewport)
 * Returns properties with complete geolocation data
 */
export async function fetchAllMapProperties() {
  try {
    const constraints = [
      where('status', '==', 'Available'),
      where('location.lat', '!=', null),
      where('location.lng', '!=', null),
    ];

    const q = query(collection(db, 'properties'), ...constraints);
    const querySnapshot = await getDocs(q);

    return querySnapshot.docs
      .map((doc) => ({
        id: doc.id,
        ...doc.data(),
        createdAt: _optionalChain([doc, 'access', _11 => _11.data, 'call', _12 => _12(), 'access', _13 => _13.createdAt, 'optionalAccess', _14 => _14.toDate, 'optionalCall', _15 => _15()]) || new Date(),
        updatedAt: _optionalChain([doc, 'access', _16 => _16.data, 'call', _17 => _17(), 'access', _18 => _18.updatedAt, 'optionalAccess', _19 => _19.toDate, 'optionalCall', _20 => _20()]) || new Date(),
      } ))
      .filter((prop) => prop.location.lat && prop.location.lng);
  } catch (error) {
    logger.error('[DB] Error fetching map properties:', error);
    return [];
  }
}

/**
 * Batch fetch with compound filtering
 */
export async function fetchPropertiesByCompound(
  compound
) {
  try {
    const q = query(
      collection(db, 'properties'),
      where('compound', '==', compound),
      where('status', '==', 'Available')
    );

    const querySnapshot = await getDocs(q);
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
      createdAt: _optionalChain([doc, 'access', _21 => _21.data, 'call', _22 => _22(), 'access', _23 => _23.createdAt, 'optionalAccess', _24 => _24.toDate, 'optionalCall', _25 => _25()]) || new Date(),
      updatedAt: _optionalChain([doc, 'access', _26 => _26.data, 'call', _27 => _27(), 'access', _28 => _28.updatedAt, 'optionalAccess', _29 => _29.toDate, 'optionalCall', _30 => _30()]) || new Date(),
    } ));
  } catch (error) {
    logger.error(`[DB] Error fetching ${compound} properties:`, error);
    return [];
  }
}
