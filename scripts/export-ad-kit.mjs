  x.push('    <currency>EGP</currency>');
  x.push(`    <city>${escapeXml(r.city || 'Cairo')}</city>`);
  x.push(`    <community>${escapeXml(r.location_area || '')}</community>`);
  if (r.compound) x.push(`    <sub_community>${escapeXml(r.compound)}</sub_community>`);
  x.push(`    <title_en><![CDATA[${r.title || `${r.property_type} in ${r.compound || r.location_area || ''}`}]]></title_en>`);
  if (r.title_ar) x.push(`    <title_ar><![CDATA[${r.title_ar}]]></title_ar>`);
  const desc = r.description || r.title || `${r.property_type} in ${r.compound || ''}`;
  x.push(`    <description_en><![CDATA[${desc}]]></description_en>`);
  if (r.description_ar) x.push(`    <description_ar><![CDATA[${r.description_ar}]]></description_ar>`);
  if (Number(r.area_sqm) > 0) x.push(`    <size>${Number(r.area_sqm)}</size>`);
  if (Number(r.bedrooms) > 0) x.push(`    <bedroom>${Number(r.bedrooms)}</bedroom>`);
  if (Number(r.bathrooms) > 0) x.push(`    <bathroom>${Number(r.bathrooms)}</bathroom>`);
  x.push('    <agent>');
  x.push(`      <name>${escapeXml(r.agent_name || 'Sierra Estates Team')}</name>`);
  x.push('      <email>info@sierra-estates.net</email>');
  x.push('      <phone>+201000000000</phone>');
  x.push('    </agent>');
  x.push('    <photo>');
  for (const u of r.images) if (typeof u === 'string' && u.startsWith('http')) x.push(`      <url>${escapeXml(u)}</url>`);
  x.push('    </photo>');
  x.push('  </property>');
  x.push('</list>');
  return x.join('\n');
}

function adCopy(r, ref, photoFiles) {
  const isRent = mapOfferingType(r.deal_type) === 'RR';
  const price = Number(r.price) || 0;
  const priceEn = price > 0 ? `${price.toLocaleString('en-EG')} EGP${isRent ? ' / month' : ''}` : 'Price on application';
  const priceAr = price > 0 ? `${price.toLocaleString('en-EG')} جنيه${isRent ? ' / شهريًا' : ''}` : 'السعر عند الطلب';
  const specs = [];
  if (Number(r.bedrooms) > 0) specs.push(['Bedrooms', String(r.bedrooms), 'غرف النوم']);
  if (Number(r.bathrooms) > 0) specs.push(['Bathrooms', String(r.bathrooms), 'الحمامات']);
  if (Number(r.area_sqm) > 0) specs.push(['Area', `${Number(r.area_sqm)} sqm`, 'المساحة']);
  if (r.finishing_type) specs.push(['Finishing', String(r.finishing_type), 'التشطيب']);
  const L = [];
  L.push(`# ${r.title || `${r.property_type} in ${r.compound || ''}`}`);
  L.push('');
