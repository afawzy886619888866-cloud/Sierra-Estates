function buildPropertyBlock(item, compoundPool, agentPhone, agentEmail) {
  const ref = item.pf_reference_number || item.code || item.ref_id || `SE-${item.id.slice(0, 8).toUpperCase()}`;
  const offeringType = mapOfferingType(item.deal_type);
  const propType = mapPropertyType(item.property_type);
  const city = item.city || 'Cairo';
  const community = item.location_area || '';
  const subCommunity = item.compound || '';
  const titleEn = item.title || `${item.property_type || 'Property'} in ${item.compound || ''}`;
  const descEn = item.description || titleEn;
  const price = Number(item.price) || 0;
  const size = Number(item.area_sqm) || 0;
  const beds = Number(item.bedrooms) || 0;
  const baths = Number(item.bathrooms) || 0;

  let images = sanitizeFeedImages(item.images);
  if (images.length === 0 && subCommunity && Array.isArray(compoundPool[subCommunity])) {
    images = compoundPool[subCommunity].slice(0, 5);
  }

  let block = `  <property last_update="${new Date(item.updated_at || Date.now()).toISOString().replace('T', ' ').slice(0, 19)}">\n`;
  block += `    <reference_number>${escapeXml(ref)}</reference_number>\n`;
  block += `    <offering_type>${offeringType}</offering_type>\n`;
  block += `    <property_type>${propType}</property_type>\n`;
  block += `    <price_on_application>${price > 0 ? '0' : '1'}</price_on_application>\n`;
  block += `    <price>${price}</price>\n`;
  if (offeringType === 'RR') {
    block += `    <rental_period>M</rental_period>\n`;
  }
  block += `    <currency>${escapeXml(item.price_currency || 'EGP')}</currency>\n`;
  block += `    <city>${escapeXml(city)}</city>\n`;
  block += `    <community>${escapeXml(community)}</community>\n`;
  if (subCommunity) {
    block += `    <sub_community>${escapeXml(subCommunity)}</sub_community>\n`;
  }
