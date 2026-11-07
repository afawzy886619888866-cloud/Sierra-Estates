'use strict';

const crypto = require('node:crypto');
const { resolveCanonicalCompound } = require('./compound-canonical');

function computeUnitSyncHash(unit) {
  const identity = [
    resolveCanonicalCompound(unit.compound),
    unit.area,
    unit.price,
    unit.bedrooms,
    String(unit.propertyType || 'apartment').toLowerCase(),
    String(unit.dealType || 'sale').toLowerCase(),
  ].join('|');

  return crypto.createHash('sha256').update(identity).digest('hex');
}

module.exports = { computeUnitSyncHash };
