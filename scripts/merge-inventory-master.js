import * as fs from 'fs';
import * as path from 'path';





























const MASTER_SHEET_PATH = path.resolve(process.cwd(), 'apps/sierra-estates-realty/data/real-listings.json');
const WA_EXTRACTED_PATH = path.resolve(process.cwd(), 'packages/whatsapp-shared/inventory_extracted_units.json');
const OBSIDIAN_STORE_PATH = path.resolve(process.cwd(), 'obsidian-store.json');
const OUTPUT_CONSOLIDATED_PATH = path.resolve(process.cwd(), 'apps/sierra-estates-realty/data/consolidated-master-inventory.json');

function isNew(ts) {
  if (!ts) return false;
  const time = new Date(ts).getTime();
  return Date.now() - time < 48 * 60 * 60 * 1000;
}

function normalizeCompound(raw) {
  if (!raw) return 'New Cairo';
  const l = raw.toLowerCase().trim();
  if (l.includes('mivida') || l.includes('ميفيدا')) return 'Mivida';
  if (l.includes('hyde park') || l.includes('هايد')) return 'Hyde Park';
  if (l.includes('madinaty') || l.includes('مدينتي')) return 'Madinaty';
  if (l.includes('rehab') || l.includes('الرحاب')) return 'Al Rehab';
  if (l.includes('palm hills') || l.includes('بالم')) return 'Palm Hills';
  if (l.includes('mountain view') || l.includes('ماونتن')) return 'Mountain View';
  if (l.includes('swan lake') || l.includes('سوان')) return 'Swan Lake';
  if (l.includes('eastown') || l.includes('ايست تاون') || l.includes('إيست')) return 'Eastown (SODIC)';
  if (l.includes('villette') || l.includes('فيلييت')) return 'Villette (SODIC)';
  if (l.includes('badya') || l.includes('بادية')) return 'Badya (Palm Hills)';
  if (l.includes('marassi') || l.includes('مراسي')) return 'Marassi';
  if (l.includes('fifth square') || l.includes('المراسم')) return 'Fifth Square';
  if (l.includes('zed') || l.includes('زد')) return 'Zed East';
  if (l.includes('tag sultan') || l.includes('تاج')) return 'Tag Sultan';
  if (l.includes('uptown') || l.includes('ابتاون')) return 'Uptown Cairo';
  return raw.trim() || 'New Cairo';
}

function normalizeType(raw) {
  if (!raw) return 'Apartment';
  const l = raw.toLowerCase().trim();
  if (l.includes('villa') || l.includes('فيلا مستقلة') || l.includes('standalone')) return 'Standalone Villa';
  if (l.includes('twin') || l.includes('توين')) return 'Twinhouse';
  if (l.includes('town') || l.includes('تاون')) return 'Townhouse';
  if (l.includes('penthouse') || l.includes('بنتهاوس') || l.includes('روف')) return 'Penthouse';
  if (l.includes('duplex') || l.includes('دوبلكس')) return 'Duplex';
  if (l.includes('floor with garden') || l.includes('ارضي بحديقة') || l.includes('أرضي')) return 'Ground with Garden';
  if (l.includes('chalet') || l.includes('شاليه')) return 'Chalet';
  if (l.includes('office') || l.includes('commercial') || l.includes('مكتب') || l.includes('تجاري')) return 'Commercial/Office';
  return 'Apartment';
}

function runMergeAndReport() {
  console.log('════════════════════════════════════════════════════════════════════');
  console.log('🔄 SIERRA ESTATES — UNIFIED MASTER INVENTORY MERGER & RECONCILIATION');
  console.log('════════════════════════════════════════════════════════════════════\n');

  const unifiedMap = new Map();

  // 1. Ingest Master Sheet (real-listings.json — all 330 units)
  let masterCount = 0;
  if (fs.existsSync(MASTER_SHEET_PATH)) {
    const rawMaster = JSON.parse(fs.readFileSync(MASTER_SHEET_PATH, 'utf-8'));
    masterCount = rawMaster.length;
    console.log(`📋 Loaded Master Sheet: ${masterCount} records`);

    for (const u of rawMaster) {
      const compound = normalizeCompound(u.compound || u.cmp || u.zone);
      const propertyType = normalizeType(u.type);
      const isRent = (u.mode || '').toLowerCase() === 'rent' || (u.price > 0 && u.price < 500000 && (u.mode || '').toLowerCase() !== 'sale');
      const op = isRent ? 'Rent' : 'Sale';
      const code = u.code || `SE-${compound.slice(0, 2).toUpperCase()}-${String(u.id).padStart(3, '0')}`;
      const ownerTypeStr = (u.ownerType || '').toLowerCase();
      const isOwner = ownerTypeStr === 'owner' || (u.tag || '').includes('Owner') || Boolean(u.ownerName && !u.ownerName.toLowerCase().includes('broker'));
      const listedAt = u.updatedAt || new Date().toISOString();

      let priceFormatted = 'Price on Call';
      if (u.price && u.price > 0) {
        priceFormatted = op === 'Rent' ? `${u.price.toLocaleString()} EGP / Month` : `${u.price.toLocaleString()} EGP`;
      } else {
        priceFormatted = op === 'Rent' ? 'Rent on Negotiation' : 'Price on Call / Direct Owner';
      }

      const unit = {
        id: `MS-${u.id}`,
        sierraCode: code,
        type: propertyType,
        compound,
        location: u.zone ? `${compound} / ${u.zone}` : compound,
        operation: op,
        price: u.price || 0,
        currency: 'EGP',
        priceFormatted,
        area_sqm: u.area || 0,
        bedrooms: u.beds || 3,
        bathrooms: u.baths || 2,
        finishing: u.finishing || 'semi_finished',
        sourceType: isOwner ? 'owner' : 'broker',
        sourceGroup: 'Master Sheet Synchronized',
        contact_info: u.mobile ? `+20${u.mobile}` : u.ownerName,
        ownerName: u.ownerName,
        status: u.status || 'Available',
        isNewListing: isNew(listedAt),
        listedAt,
        description: u.comment || u.tag,
        origin: 'master_sheet',
      };

      unifiedMap.set(`MS-${u.id}`, unit);
    }
  }

  // 2. Ingest WhatsApp Extracted Units (inventory_extracted_units.json)
  let waCount = 0;
  if (fs.existsSync(WA_EXTRACTED_PATH)) {
    const rawWA = JSON.parse(fs.readFileSync(WA_EXTRACTED_PATH, 'utf-8'));
    waCount = rawWA.length;
    console.log(`📲 Loaded WhatsApp Groups Scraped: ${waCount} records`);

    for (const u of rawWA) {
      const compound = normalizeCompound(u.compound || u.location);
      const propertyType = normalizeType(u.type);
      const op = (u.operation || '').toLowerCase() === 'rent' ? 'Rent' : 'Sale';
      const isOwner = (u.groupName || '').toLowerCase().includes('owner') || (u.sender || '').toLowerCase().includes('owner');
      const isArchived = (u.groupName || '').toLowerCase().includes('archive') || (u.groupId || '').includes('363777777777777777');
      const listedAt = u.dateAdded || new Date().toISOString();
      const code = u.id;

      const unit = {
        id: u.id,
        sierraCode: code,
        title: u.title,
        titleAr: u.titleAr,
        type: propertyType,
        compound,
        location: u.location || compound,
        operation: op,
        price: u.price,
        currency: u.currency || 'EGP',
        priceFormatted: u.priceFormatted || `${u.price.toLocaleString()} EGP`,
        area_sqm: u.area_sqm,
        bedrooms: u.bedrooms,
        bathrooms: u.bathrooms,
        furnishing: u.furnishing,
        sourceType: isArchived ? 'archive' : isOwner ? 'owner' : 'broker',
        sourceGroup: u.groupName,
        contact_info: u.sender,
        status: u.status || 'Available',
        isNewListing: isNew(listedAt),
        listedAt,
        description: u.description,
        origin: 'whatsapp_group',
      };

      unifiedMap.set(code, unit);
    }
  }

  // 3. Ingest Obsidian Memory Inventory Store
  let memCount = 0;
  if (fs.existsSync(OBSIDIAN_STORE_PATH)) {
    const rawMem = JSON.parse(fs.readFileSync(OBSIDIAN_STORE_PATH, 'utf-8'));
    const memKeys = Object.keys(rawMem);
    console.log(`💾 Loaded Obsidian Memory Store: ${memKeys.length} total keys`);

    for (const key of memKeys) {
      const item = rawMem[key];
      if (item && item.tags && item.tags.includes('inventory-listing') && item.value) {
        memCount++;
        const v = item.value;
        const code = v.sierraCode || key;
        if (!unifiedMap.has(code) && v.price && v.price > 0) {
          const compound = normalizeCompound(v.compound || v.location);
          const propertyType = normalizeType(v.type);
          const op = (v.operation || '').toLowerCase() === 'rent' ? 'Rent' : 'Sale';
          const listedAt = v.listedAt || v.createdAt || item.createdAt || new Date().toISOString();

          unifiedMap.set(code, {
            id: key,
            sierraCode: code,
            type: propertyType,
            compound,
            location: v.location || compound,
            operation: op,
            price: v.price,
            currency: v.currency || 'EGP',
            priceFormatted: op === 'Rent' ? `${v.price.toLocaleString()} EGP / Month` : `${v.price.toLocaleString()} EGP`,
            area_sqm: v.area_sqm || 0,
            bedrooms: v.bedrooms || 3,
            bathrooms: v.bathrooms || 2,
            finishing: v.finishing,
            sourceType: v.sourceType || 'broker',
            sourceGroup: v.whatsappGroupName || 'Direct Ingestion',
            contact_info: v.contact_info,
            status: v.status || 'available',
            isNewListing: isNew(listedAt),
            listedAt,
            description: v.notes,
            origin: 'obsidian_memory',
          });
        }
      }
    }
  }

  const allUnits = Array.from(unifiedMap.values());
  fs.writeFileSync(OUTPUT_CONSOLIDATED_PATH, JSON.stringify(allUnits, null, 2), 'utf-8');
  console.log(`\n💾 Saved Consolidated Inventory Master: ${OUTPUT_CONSOLIDATED_PATH} (${allUnits.length} units)\n`);

  // ════════════════════════════════════════════════════════════════════════════
  // METRICS COMPUTATION
  // ════════════════════════════════════════════════════════════════════════════
  const total = allUnits.length;
  const forSale = allUnits.filter((u) => u.operation === 'Sale');
  const forRent = allUnits.filter((u) => u.operation === 'Rent');

  const owners = allUnits.filter((u) => u.sourceType === 'owner');
  const brokers = allUnits.filter((u) => u.sourceType === 'broker');
  const archives = allUnits.filter((u) => u.sourceType === 'archive');

  const newUnits = allUnits.filter((u) => u.isNewListing);

  // Group by Compound
  const compoundCounts = {};
  for (const u of allUnits) {
    if (!compoundCounts[u.compound]) {
      compoundCounts[u.compound] = { total: 0, sale: 0, rent: 0, owner: 0, broker: 0, avgPriceM: 0 };
    }
    const stat = compoundCounts[u.compound];
    stat.total++;
    if (u.operation === 'Sale') stat.sale++; else stat.rent++;
    if (u.sourceType === 'owner') stat.owner++; else stat.broker++;
  }

  // Group by Property Type
  const typeCounts = {};
  for (const u of allUnits) {
    typeCounts[u.type] = (typeCounts[u.type] || 0) + 1;
  }

  // Price calculations for Sale (filtering price > 0 for statistical validity)
  const salePrices = forSale.filter((u) => u.price > 0).map((u) => u.price).sort((a, b) => a - b);
  const minSale = salePrices[0] || 0;
  const maxSale = salePrices[salePrices.length - 1] || 0;
  const avgSale = salePrices.reduce((a, b) => a + b, 0) / (salePrices.length || 1);
  const medianSale = salePrices[Math.floor(salePrices.length / 2)] || 0;

  // Price calculations for Rent (filtering price > 0 for statistical validity)
  const rentPrices = forRent.filter((u) => u.price > 0).map((u) => u.price).sort((a, b) => a - b);
  const minRent = rentPrices[0] || 0;
  const maxRent = rentPrices[rentPrices.length - 1] || 0;
  const avgRent = rentPrices.reduce((a, b) => a + b, 0) / (rentPrices.length || 1);
  const medianRent = rentPrices[Math.floor(rentPrices.length / 2)] || 0;

  const salePricedCount = salePrices.length;
  const rentPricedCount = rentPrices.length;

  // ════════════════════════════════════════════════════════════════════════════
  // OUTPUT REPORT
  // ════════════════════════════════════════════════════════════════════════════
  console.log('╔════════════════════════════════════════════════════════════════════╗');
  console.log('║           📊 SIERRA ESTATES — FINAL RECONCILED INVENTORY REPORT    ║');
  console.log('╚════════════════════════════════════════════════════════════════════╝');
  console.log(`\n🌟 TOTAL CONSOLIDATED UNIQUE UNITS : ${total.toLocaleString()}`);
  console.log('────────────────────────────────────────────────────────────────────');
  console.log(`  🏷️  For Sale Units               : ${forSale.length.toLocaleString()} (${((forSale.length / total) * 100).toFixed(1)}%)`);
  console.log(`  🔑  For Rent Units               : ${forRent.length.toLocaleString()} (${((forRent.length / total) * 100).toFixed(1)}%)`);
  console.log(`  🆕  New Listings (Last 48 Hours) : ${newUnits.length.toLocaleString()} (${((newUnits.length / total) * 100).toFixed(1)}%)`);
  console.log('\n👥 SOURCE & CHANNEL BREAKDOWN:');
  console.log('────────────────────────────────────────────────────────────────────');
  console.log(`  🟢  Direct Verified Owners       : ${owners.length.toLocaleString()} (${((owners.length / total) * 100).toFixed(1)}%)`);
  console.log(`  🔵  Broker Network Listings      : ${brokers.length.toLocaleString()} (${((brokers.length / total) * 100).toFixed(1)}%)`);
  console.log(`  🗃️   Archived Group Listings      : ${archives.length.toLocaleString()} (${((archives.length / total) * 100).toFixed(1)}%)`);
  console.log('\n🏡 PROPERTY TYPE DISTRIBUTION:');
  console.log('────────────────────────────────────────────────────────────────────');
  Object.entries(typeCounts)
    .sort(([, a], [, b]) => b - a)
    .forEach(([type, count]) => {
      console.log(`  • ${type.padEnd(24)} : ${String(count).padStart(4)} units (${((count / total) * 100).toFixed(1)}%)`);
    });

  console.log('\n📍 TOP COMPOUND & REGIONAL DISTRIBUTION:');
  console.log('────────────────────────────────────────────────────────────────────');
  Object.entries(compoundCounts)
    .sort(([, a], [, b]) => b.total - a.total)
    .slice(0, 15)
    .forEach(([compound, stat]) => {
      console.log(`  • ${compound.padEnd(24)} : ${String(stat.total).padStart(3)} units | Sale: ${String(stat.sale).padStart(3)} | Rent: ${String(stat.rent).padStart(2)} | Owners: ${String(stat.owner).padStart(3)}`);
    });

  console.log('\n💰 VALUATION & PRICING STATISTICS (Priced Units):');
  console.log('────────────────────────────────────────────────────────────────────');
  console.log(`  [SALE PROPERTIES] (${salePricedCount} priced units, ${forSale.length - salePricedCount} on-call/direct negotiation)`);
  console.log(`   - Minimum Price  : ${(minSale / 1000000).toFixed(2)}M EGP`);
  console.log(`   - Maximum Price  : ${(maxSale / 1000000).toFixed(2)}M EGP`);
  console.log(`   - Average Price  : ${(avgSale / 1000000).toFixed(2)}M EGP`);
  console.log(`   - Median Price   : ${(medianSale / 1000000).toFixed(2)}M EGP`);
  console.log(`  [RENTAL PROPERTIES] (${rentPricedCount} priced units, ${forRent.length - rentPricedCount} on-call/direct negotiation)`);
  console.log(`   - Minimum Rent   : ${minRent.toLocaleString()} EGP / Month`);
  console.log(`   - Maximum Rent   : ${maxRent.toLocaleString()} EGP / Month`);
  console.log(`   - Average Rent   : ${Math.round(avgRent).toLocaleString()} EGP / Month`);
  console.log(`   - Median Rent    : ${medianRent.toLocaleString()} EGP / Month`);
  console.log('════════════════════════════════════════════════════════════════════\n');
}

runMergeAndReport();
