 function _optionalChain(ops) { let lastAccessLHS = undefined; let value = ops[0]; let i = 1; while (i < ops.length) { const op = ops[i]; const fn = ops[i + 1]; i += 2; if ((op === 'optionalAccess' || op === 'optionalCall') && value == null) { return undefined; } if (op === 'access' || op === 'optionalAccess') { lastAccessLHS = value; value = fn(value); } else if (op === 'call' || op === 'optionalCall') { value = fn((...args) => value.call(lastAccessLHS, ...args)); lastAccessLHS = undefined; } } return value; }

















export function generateSmartCode(params, region = 'nexus') {
  const { compound, building, tower, type, unitNumber, floor: _floor, rooms, price } = params;

  // 1. Matareya / Cairo Plaza Specific Pattern
  // [Compound]-[Building/Tower]-[Type]-[Unit#]
  if (region === 'matareya' || compound.toLowerCase().includes('cairo plaza') || compound === 'CP') {
    const cpCode = 'CP';
    const bldCode = building || tower || 'BX';
    const typeCode = _optionalChain([type, 'optionalAccess', _ => _.toUpperCase, 'call', _2 => _2(), 'access', _3 => _3.slice, 'call', _4 => _4(0, 3)]) || 'UNT';
    const unitCode = unitNumber || '0000';
    return `${cpCode}-${bldCode}-${typeCode}-${unitCode}`;
  }

  // 2. Tagamoa / Shorouk / Nexus Pattern (Urban Hub OS Global Mandate)
  // [Compound]-[Bedrooms][Furnish]-[PriceShort]
  // Example: VS-3S-45K
  const compCode = getCompoundShortCode(compound);
  const _furnishedCode = params.type === 'commercial' ? 'OFF' : (getFurnishingCode(params.floor || '') || 'U');
  // Wait, user example VS-3S-45K. 3S = 3 Bedrooms, Semi-furnished.
  const bedsCode = rooms ? `${rooms}` : 'X';
  const furnLetter = _optionalChain([params, 'access', _5 => _5.floor, 'optionalAccess', _6 => _6.toUpperCase, 'call', _7 => _7(), 'access', _8 => _8.includes, 'call', _9 => _9('F')]) ? 'F' : (_optionalChain([params, 'access', _10 => _10.floor, 'optionalAccess', _11 => _11.toUpperCase, 'call', _12 => _12(), 'access', _13 => _13.includes, 'call', _14 => _14('S')]) ? 'S' : 'U');
  
  // Refined Logic for the code VS-3S-45K
  const smartBedsFurnish = `${bedsCode}${furnLetter}`;

  let priceShort = '0';
  if (price) {
    if (price >= 1000000) priceShort = (price / 1000000).toFixed(1).replace('.0', '') + 'M';
    else if (price >= 1000) priceShort = (price / 1000).toFixed(0) + 'K';
    else priceShort = price.toString();
  }

  return `${compCode}-${smartBedsFurnish}-${priceShort}`;
}

function getCompoundShortCode(name) {
  const dict = {
    'lake view': 'LVR',
    'mivida': 'MIV',
    'mountain view': 'MV',
    'hyde park': 'HP',
    'cairo festival': 'CFC',
    'gardenia': 'GC',
    'rehab': 'RH',
    'shorouk': 'SHK',
    'madinaty': 'MDN'
  };

  const normalized = name.toLowerCase();
  for (const [key, code] of Object.entries(dict)) {
    if (normalized.includes(key)) return code;
  }

  return name.slice(0, 3).toUpperCase();
}

/**
 * Normalizes furnishing codes based on Urban Hub OS standards.
 */
export function getFurnishingCode(status) {
  const normalized = status.toLowerCase();
  if (normalized.includes('full') || normalized.includes('furnished')) return 'F';
  if (normalized.includes('semi')) return 'S';
  if (normalized.includes('kitchen')) return 'K';
  return 'U';
}

/**
 * Detects extra features based on Urban Hub OS standards.
 */
export function getFeatureCodes(text) {
  const codes = [];
  const normalized = text.toLowerCase();
  
  if (normalized.includes('garden')) codes.push('G');
  if (normalized.includes('pool')) codes.push('P');
  if (normalized.includes('roof')) codes.push('R');
  if (normalized.includes('view')) codes.push('V');
  
  return codes;
}
