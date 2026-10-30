  const csvRows = [csvHeaders.join(',')];
  const cleanStr = (s) => `"${String(s || '').replace(/"/g, '""').replace(/\r?\n/g, ' ')}"`;

  for (const u of allPhotoUnits) {
    const ref = getStableRef(u);
    const photoUrls = String(u['Photo URLs'] || '').split(/[\n,;]+/).map(s => s.trim()).filter(s => s.startsWith('http'));
    const photoCols = Array.from({ length: maxPhotos }, (_, i) => cleanStr(photoUrls[i] || ''));

    csvRows.push([
      cleanStr(ref),
      cleanStr(u._category),
      cleanStr(mapOfferingType(u['Deal Type'])),
      cleanStr(mapPropertyType(u['Property Type'])),
      cleanStr(u['Compound'] || ''),
      cleanStr(u['Zone / Area'] || ''),
      u['Price (EGP)'] || 0,
      mapOfferingType(u['Deal Type']) === 'RR' ? 'Monthly' : '',
      u['Bedrooms'] || 0,
      u['Bathrooms'] || 0,
      u['Area (sqm)'] || 0,
      ...photoCols,
      cleanStr(photoUrls.join(' | ')),
      cleanStr(`${u['Property Type']} in ${u['Compound'] || ''}`),
      cleanStr(u['Description'] || ''),
    ].join(','));
  }

  const csvPath = path.join(outputDir, 'propertyfinder-photos-only.csv');
  fs.writeFileSync(csvPath, '\uFEFF' + csvRows.join('\n'), 'utf8');
  console.log(`[✓] Generated Property Finder Portal CSV (${allPhotoUnits.length} ads) → ${csvPath}`);
}

main().catch(console.error);
