/* Ported from deploy/data.js — regenerate from source rather than hand-editing. */
import snapshot from '@/lib/inventory/snapshot.json';

const rawUnits: any[] = ((snapshot as any)?.units || []).filter(
  (u: any) =>
    u.party !== 'Owner' &&
    u.sourceType !== 'owner' &&
    u.segment !== 'owners_rent' &&
    u.segment !== 'owners_buy' &&
    u.tag !== 'Direct Owner'
);
const defaultListings = rawUnits.length > 0
  ? rawUnits.slice(0, 36).map((u: any, i: number) => ({
      id: i + 1,
      code: u.code || `SE-${String(i + 1).padStart(3, '0')}`,
      cmp: u.compound || 'New Cairo',
      zone: u.zone || '5th Settlement',
      type: u.type || 'Apartment',
      beds: u.beds || 3,
      bath: u.bath || 2,
      area: u.area || 160,
      egpM: u.egpM || Number(((u.price || 8000000) / 1000000).toFixed(1)),
      usd: u.usd || (u.mode === 'rent' ? Math.round((u.price || 40000) / 50) : Math.round((u.price || 8000000) / 5000)),
      ai: u.aiScore || 9.2,
      tag: u.tag && u.tag !== 'Verified Owner' && u.tag !== 'Direct Owner' ? u.tag : 'Verified Portfolio',
      mode: u.mode || 'sale',
      agent: 'Sierra Advisor Desk',
      ago: 'Master Inventory Sync',
      img: u.img,
      whatsapp: 'https://wa.me/201092048333',
      segment: u.segment,
    }))
  : [
      { id: 1, code: 'HP-VL-01', cmp: 'Hyde Park', zone: '5th Settlement', type: 'Villa', beds: 5, bath: 5, area: 480, egpM: 28.5, usd: 5200, ai: 9.8, tag: 'Premium', mode: 'sale', agent: 'Layla Mansour', ago: '2d ago', img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=55' },
      { id: 2, code: 'MVW-TH-02', cmp: 'Mountain View iCity', zone: '5th Settlement', type: 'Twin House', beds: 4, bath: 3, area: 280, egpM: 15.5, usd: 2400, ai: 9.6, tag: 'Featured', mode: 'sale', agent: 'Karim Fahmy', ago: '5h ago', img: 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=55' },
      { id: 3, code: 'MV-AP-03', cmp: 'Mivida', zone: '5th Settlement', type: 'Apartment', beds: 3, bath: 2, area: 145, egpM: 6.8, usd: 1650, ai: 9.1, tag: 'Smart Match', mode: 'rent', agent: 'Nour Saleh', ago: '1d ago', img: 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=55' },
      { id: 4, code: 'UPC-PH-04', cmp: 'Uptown Cairo', zone: 'Mokattam', type: 'Penthouse', beds: 4, bath: 3, area: 300, egpM: 18.5, usd: 3800, ai: 9.5, tag: 'Exclusive', mode: 'sale', agent: 'Omar Magdy', ago: '6h ago', img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=55' },
      { id: 5, code: 'TAJ-VL-05', cmp: 'Taj City', zone: 'New Cairo', type: 'Villa', beds: 5, bath: 5, area: 500, egpM: 35.0, usd: 6500, ai: 9.5, tag: 'Premium', mode: 'sale', agent: 'Yara Hakim', ago: '4d ago', img: 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800&q=55' },
      { id: 6, code: 'VLT-VL-06', cmp: 'Villette', zone: '5th Settlement', type: 'Villa', beds: 4, bath: 4, area: 390, egpM: 24.5, usd: 4400, ai: 9.3, tag: 'New', mode: 'sale', agent: 'Rana Adel', ago: '3d ago', img: 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800&q=55' },
      { id: 7, code: 'PH-VL-07', cmp: 'Palm Hills NC', zone: '5th Settlement', type: 'Villa', beds: 4, bath: 3, area: 380, egpM: 23.5, usd: 4200, ai: 9.2, tag: 'Best ROI', mode: 'sale', agent: 'Layla Mansour', ago: '1w ago', img: 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800&q=55' },
      { id: 8, code: 'EST-DX-08', cmp: 'Eastown', zone: '5th Settlement', type: 'Duplex', beds: 3, bath: 2, area: 220, egpM: 11.5, usd: 2400, ai: 9.1, tag: null, mode: 'rent', agent: 'Karim Fahmy', ago: '2d ago', img: 'https://images.unsplash.com/photo-1615873968403-89e068629265?w=800&q=55' },
    ];

const DATA: any = {
  slides: [
    { id: 1, pre: 'FIRST & ONLY WEBSITE IN EGYPT DESIGNED FOR NEW CAIRO', preAr: 'الموقع الأول والوحيد في مصر المصمم للقاهرة الجديدة',
      main: 'The First Exclusive Destination for New Cairo Properties. Rent & Resale.', mainAr: 'الوجهة الحصرية الأولى لعقارات القاهرة الجديدة. إيجار وبيع.',
      img: 'https://images.unsplash.com/photo-1613977257363-707ba9348227?w=900&q=55' },
    { id: 2, pre: 'BEST-IN-CLASS DESIGN', preAr: 'تصميم من الطراز الأول',
      main: 'Redefining Luxury Living with AI-Driven Excellence', mainAr: 'نعيد تعريف الفخامة بتميّز الذكاء الاصطناعي',
      img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&q=55' },
    { id: 3, pre: 'AI-DRIVEN EXCELLENCE', preAr: 'تميّز بالذكاء الاصطناعي',
      main: 'Smart Matches for Smart Investors', mainAr: 'توافق ذكي لمستثمرين أذكياء',
      img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=900&q=55' },
    { id: 4, pre: 'EXCLUSIVE NETWORK', preAr: 'شبكة حصرية',
      main: 'Unrivaled Access to Premium Compounds', mainAr: 'وصول لا يُضاهى لأرقى الكمبوندات',
      img: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=900&q=55' },
    { id: 5, pre: 'CURATED PORTFOLIO', preAr: 'محفظة منتقاة',
      main: 'Your Journey to Exceptional Homes Begins Here', mainAr: 'رحلتك نحو منزل استثنائي تبدأ هنا',
      img: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=900&q=55' }
  ],
  listings: defaultListings,
  rooms: [
    { id: 1, name: 'Luxury Living Room', sub: 'Hyde Park · Grand Villa · 5th Settlement', img: 'https://images.unsplash.com/photo-1556228453-efd6c1ff04f6?w=900&q=55' },
    { id: 2, name: 'Master Bedroom Suite', sub: 'Mountain View iCity · Penthouse Level', img: 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=900&q=55' },
    { id: 3, name: 'Garden Courtyard', sub: 'Villette · Villa G-Type', img: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=900&q=55' },
    { id: 4, name: 'Infinity Pool & Deck', sub: 'Taj City · Signature Villa', img: 'https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=900&q=55' },
    { id: 5, name: 'Rooftop Sky Terrace', sub: 'Uptown Cairo · Penthouse Level', img: 'https://images.unsplash.com/photo-1622547748225-3fc4abd2cca0?w=900&q=55' }
  ],
  interiors: [
    'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=900&q=55',
    'https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=900&q=55',
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=900&q=55',
    'https://images.unsplash.com/photo-1600566753086-00f18fb6b3ea?w=900&q=55',
    'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&q=55'
  ],
  agentImg: 'https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=300&q=55',
  compounds: [
    { id: 1, n: 'Katameya Heights', c: [29.99, 31.48], g: '+10%', ai: 9.0, z: 'Katameya', priceM: 26, rent: 5000 },
    { id: 1, n: 'Katameya Dunes', c: [29.985, 31.492], g: '+12%', ai: 8.8, z: 'Katameya', priceM: 18, rent: 3400 },
    { id: 2, n: 'Swan Lake Residence', c: [30.045, 31.635], g: '+15%', ai: 8.9, z: '5th Settlement', priceM: 8.5, rent: 1700 },
    { id: 3, n: 'Mivida', c: [30.007, 31.589], g: '+18%', ai: 9.1, z: '5th Settlement', priceM: 10.5, rent: 2100 },
    { id: 4, n: 'Cairo Festival City Residences', c: [30.016, 31.469], g: '+12%', ai: 8.7, z: 'New Cairo', priceM: 7.5, rent: 1500 },
    { id: 5, n: 'Hyde Park New Cairo', c: [30.008, 31.645], g: '+22%', ai: 9.8, z: '5th Settlement', priceM: 28.5, rent: 5200 },
    { id: 6, n: 'Taj City', c: [30.065, 31.531], g: '+19%', ai: 9.5, z: 'New Cairo', priceM: 35, rent: 6500 },
    { id: 7, n: 'Eastown (SODIC)', c: [30.018, 31.587], g: '+19%', ai: 9.0, z: '5th Settlement', priceM: 11.5, rent: 2400 },
    { id: 8, n: 'Mountain View iCity', c: [30.014, 31.618], g: '+24%', ai: 9.6, z: '5th Settlement', priceM: 22, rent: 3200 },
    { id: 9, n: 'Zed East (Ora)', c: [30.095, 31.61], g: '+13%', ai: 8.7, z: 'New Cairo', priceM: 8, rent: 1600 },
    { id: 10, n: 'Palm Hills New Cairo', c: [30.002, 31.608], g: '+21%', ai: 9.2, z: '5th Settlement', priceM: 25, rent: 4800 },
    { id: 11, n: 'The Waterway', c: [30.04, 31.47], g: '+14%', ai: 8.8, z: 'New Cairo', priceM: 12, rent: 2300 },
    { id: 12, n: 'Lake View Residence', c: [30.022, 31.532], g: '+13%', ai: 8.7, z: 'New Cairo', priceM: 9.5, rent: 1900 },
    { id: 13, n: 'Fifth Square (Al Marasem)', c: [30.025, 31.578], g: '+17%', ai: 9.0, z: '5th Settlement', priceM: 8.5, rent: 1750 },
    { id: 14, n: 'Villette (SODIC)', c: [30.053, 31.598], g: '+20%', ai: 9.3, z: '5th Settlement', priceM: 24.5, rent: 4400 },
    { id: 15, n: 'Stone Residence (Rooya)', c: [30.028, 31.557], g: '+15%', ai: 8.8, z: 'New Cairo', priceM: 7.8, rent: 1550 },
    { id: 16, n: 'The Square (Al Ahly Sabbour)', c: [30.033, 31.542], g: '+16%', ai: 8.9, z: 'New Cairo', priceM: 9, rent: 1800 },
    { id: 17, n: 'El Patio Oro (La Vista)', c: [30.029, 31.56], g: '+15%', ai: 8.9, z: 'New Cairo', priceM: 10, rent: 2000 },
    { id: 18, n: 'El Patio 7 (La Vista)', c: [30.035, 31.565], g: '+14%', ai: 8.8, z: 'New Cairo', priceM: 8.5, rent: 1700 },
    { id: 19, n: 'Katameya Gardens', c: [29.992, 31.488], g: '+11%', ai: 8.6, z: 'Katameya', priceM: 15, rent: 2800 },
    { id: 20, n: 'Village Gardens Katameya', c: [29.988, 31.484], g: '+11%', ai: 8.6, z: 'Katameya', priceM: 16, rent: 3000 },
    { id: 21, n: 'Galleria Moon Valley', c: [30.02, 31.55], g: '+13%', ai: 8.7, z: 'New Cairo', priceM: 7, rent: 1400 },
    { id: 22, n: '90 Avenue (Tabarak)', c: [30.028, 31.572], g: '+14%', ai: 8.8, z: '5th Settlement', priceM: 8, rent: 1600 },
    { id: 23, n: 'Azzar New Cairo', c: [30.022, 31.568], g: '+13%', ai: 8.7, z: 'New Cairo', priceM: 7.5, rent: 1500 },
    { id: 24, n: 'District 5 (Marakez)', c: [30.012, 31.5], g: '+16%', ai: 8.9, z: 'New Cairo', priceM: 9.5, rent: 1900 },
    { id: 25, n: 'The Brooks (PRE)', c: [30.07, 31.57], g: '+17%', ai: 8.9, z: 'Mostakbal', priceM: 7, rent: 1400 },
    { id: 26, n: 'STEI8HT (LMD)', c: [30.075, 31.575], g: '+16%', ai: 8.8, z: 'Mostakbal', priceM: 6.5, rent: 1300 },
    { id: 27, n: 'The Crest (IL Cazar)', c: [30.068, 31.562], g: '+15%', ai: 8.7, z: 'Mostakbal', priceM: 7.2, rent: 1450 },
    { id: 28, n: 'Azad & Azad Views', c: [30.078, 31.558], g: '+14%', ai: 8.6, z: 'Mostakbal', priceM: 6.8, rent: 1350 },
    { id: 29, n: 'Sarai (MNHD)', c: [30.005, 31.66], g: '+16%', ai: 9.0, z: 'Mostakbal', priceM: 9.5, rent: 1900 },
    { id: 30, n: 'Bloomfields (Tatweer Misr)', c: [30.06, 31.67], g: '+18%', ai: 9.1, z: 'Mostakbal', priceM: 8.5, rent: 1700 },
    { id: 31, n: 'Taj Sultan', c: [30.062, 31.535], g: '+13%', ai: 8.7, z: 'New Cairo', priceM: 8, rent: 1600 },
    { id: 32, n: 'La Mirada (Inertia)', c: [30.058, 31.685], g: '+14%', ai: 8.6, z: 'Mostakbal', priceM: 7, rent: 1400 },
    { id: 33, n: 'Aeon (Tabarak)', c: [30.03, 31.58], g: '+15%', ai: 8.8, z: '5th Settlement', priceM: 8.2, rent: 1650 },
    { id: 34, n: 'Mountain View Executive', c: [30.018, 31.61], g: '+20%', ai: 9.2, z: '5th Settlement', priceM: 18, rent: 3000 },
    { id: 35, n: 'Hyde Park Phase 2', c: [30.012, 31.652], g: '+22%', ai: 9.6, z: '5th Settlement', priceM: 27, rent: 5000 },
    { id: 36, n: 'Madinaty District 1', c: [30.108, 31.62], g: '+13%', ai: 8.8, z: 'Madinaty', priceM: 9, rent: 1600 },
    { id: 37, n: 'Madinaty District 3', c: [30.098, 31.63], g: '+13%', ai: 8.7, z: 'Madinaty', priceM: 8.5, rent: 1550 },
    { id: 38, n: 'Madinaty District 7', c: [30.09, 31.64], g: '+14%', ai: 8.9, z: 'Madinaty', priceM: 10, rent: 1800 },
    { id: 39, n: 'Madinaty District 8', c: [30.102, 31.648], g: '+14%', ai: 8.9, z: 'Madinaty', priceM: 11, rent: 1900 },
    { id: 40, n: 'Madinaty Executive Villas', c: [30.115, 31.635], g: '+17%', ai: 9.3, z: 'Madinaty', priceM: 24, rent: 4200 },
    { id: 41, n: 'Madinaty Lake Park', c: [30.088, 31.655], g: '+16%', ai: 9.1, z: 'Madinaty', priceM: 15, rent: 2600 },
    { id: 42, n: 'El Shorouk City', c: [30.128, 31.62], g: '+11%', ai: 8.4, z: 'Shorouk', priceM: 6.5, rent: 1300 },
    { id: 43, n: 'El Shorouk Springs', c: [30.135, 31.615], g: '+12%', ai: 8.5, z: 'Shorouk', priceM: 7, rent: 1350 },
    { id: 44, n: 'Al Burouj (Capital Group)', c: [30.155, 31.63], g: '+18%', ai: 9.2, z: 'Shorouk', priceM: 13, rent: 2400 },
    { id: 45, n: 'El Patio 5 East (La Vista)', c: [30.14, 31.6], g: '+14%', ai: 8.7, z: 'Shorouk', priceM: 8, rent: 1600 },
    { id: 46, n: 'Dar Misr El Shorouk', c: [30.132, 31.635], g: '+10%', ai: 8.3, z: 'Shorouk', priceM: 5.5, rent: 1150 },
    { id: 47, n: 'Green Square (Sabbour)', c: [30.148, 31.61], g: '+15%', ai: 8.8, z: 'Shorouk', priceM: 8.8, rent: 1750 },
    { id: 48, n: 'Mivida Parks', c: [30.003, 31.595], g: '+17%', ai: 9.0, z: '5th Settlement', priceM: 11, rent: 2200 },
    { id: 49, n: 'Fifth Square Boulevard', c: [30.027, 31.582], g: '+16%', ai: 8.9, z: '5th Settlement', priceM: 9, rent: 1850 },
    { id: 50, n: 'Layan Residence (MNHD)', c: [30.01, 31.655], g: '+14%', ai: 8.7, z: 'Mostakbal', priceM: 7.5, rent: 1500 },
    { id: 51, n: 'Jayd (IWAN)', c: [30.045, 31.665], g: '+15%', ai: 8.8, z: 'Mostakbal', priceM: 8, rent: 1600 }
  ],
  // ═══ Arabic name map for compounds (used when site language = Arabic) ═══
  // Brand-name compounds keep transliteration; descriptive names translated.
  compoundNamesAr: {
    'Katameya Heights': 'كاتاميا هايتس',
    'Katameya Dunes': 'كاتاميا ديونز',
    'Swan Lake Residence': 'سوان ليك ريزيدنس',
    'Mivida': 'ميفيدا',
    'Cairo Festival City Residences': 'كايرو فيستيفال سيتي ريزيدنس',
    'Hyde Park New Cairo': 'هايد بارك القاهرة الجديدة',
    'Taj City': 'تاج سيتي',
    'Eastown (SODIC)': 'إيستاون (سوديك)',
    'Mountain View iCity': 'ماونتن فيو آي سيتي',
    'Zed East (Ora)': 'زد إيست (أورا)',
    'Palm Hills New Cairo': 'بالم هيلز القاهرة الجديدة',
    'The Waterway': 'ذا ووتر واي',
    'Lake View Residence': 'ليك فيو ريزيدنس',
    'Fifth Square (Al Marasem)': 'فيفت سكوير (المراسم)',
    'Villette (SODIC)': 'فيليت (سوديك)',
    'Stone Residence (Rooya)': 'ستون ريزيدنس (روية)',
    'The Square (Al Ahly Sabbour)': 'ذا سكوير (الأهلي صبور)',
    'El Patio Oro (La Vista)': 'إل باتيو أورو (لا فيستا)',
    'El Patio 7 (La Vista)': 'إل باتيو 7 (لا فيستا)',
    'Katameya Gardens': 'كاتاميا جاردنز',
    'Village Gardens Katameya': 'فيليدج جاردنز كاتاميا',
    'Galleria Moon Valley': 'جاليريا مون فالي',
    '90 Avenue (Tabarak)': '90 أفينيو (تبارك)',
    'Azzar New Cairo': 'أزار القاهرة الجديدة',
    'District 5 (Marakez)': 'ديستريكت 5 (ماراكيز)',
    'The Brooks (PRE)': 'ذا بروكس (بري)',
    'STEI8HT (LMD)': 'ستييت (إل إم دي)',
    'The Crest (IL Cazar)': 'ذا كريست (إل كازار)',
    'Azad & Azad Views': 'آزاد و آزاد فيوز',
    'Sarai (MNHD)': 'ساراي (المهندسون)',
    'Bloomfields (Tatweer Misr)': 'بلومفيلدز (تطوير مصر)',
    'Taj Sultan': 'تاج سلطان',
    'La Mirada (Inertia)': 'لا ميرادا (إنيرشا)',
    'Aeon (Tabarak)': 'إيون (تبارك)',
    'Mountain View Executive': 'ماونتن فيو التنفيذي',
    'Hyde Park Phase 2': 'هايد بارك المرحلة 2',
    'Madinaty District 1': 'مدينتي الحي 1',
    'Madinaty District 3': 'مدينتي الحي 3',
    'Madinaty District 7': 'مدينتي الحي 7',
    'Madinaty District 8': 'مدينتي الحي 8',
    'Madinaty Executive Villas': 'مدينتي فلل إكزيكيوتيف',
    'Madinaty Lake Park': 'مدينتي ليك بارك',
    'El Shorouk City': 'مدينة الشروق',
    'El Shorouk Springs': 'الشروق سبرينغز',
    'Al Burouj (Capital Group)': 'البروج (كابيتال جروب)',
    'El Patio 5 East (La Vista)': 'إل باتيو 5 إيست (لا فيستا)',
    'Dar Misr El Shorouk': 'دار مصر الشروق',
    'Green Square (Sabbour)': 'جرين سكوير (صبور)',
    'Mivida Parks': 'ميفيدا باركس',
    'Fifth Square Boulevard': 'فيفت سكوير بوليفارد',
    'Layan Residence (MNHD)': 'لايان ريزيدنس (المهندسون)',
    'Jayd (IWAN)': 'جايد (إيوان)'
  },
  // Helper: get compound name in current language
  compoundName: function (name: any, lang: any) {
    if (lang === 'ar' && this.compoundNamesAr && this.compoundNamesAr[name]) {
      return this.compoundNamesAr[name];
    }
    return name;
  },
  // ═══ Featured compounds — these pulse/glow on the home page map ═══
  featured: ['Mivida', 'Hyde Park New Cairo', 'Mountain View iCity', 'Villette (SODIC)', 'Madinaty District 1', 'Taj City'],
  compoundImgs: {
    'Hyde Park New Cairo': 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=55',
    'Mivida': 'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=55',
    'Mountain View iCity': 'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=55',
    'Eastown (SODIC)': 'https://images.unsplash.com/photo-1615873968403-89e068629265?w=800&q=55',
    'Taj City': 'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800&q=55',
    'Villette (SODIC)': 'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800&q=55',
    'Palm Hills New Cairo': 'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800&q=55',
    'Katameya Heights': 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=55'
  },
  price: function (p: any) {
    return p.mode === 'rent' ? '$' + p.usd.toLocaleString() + '/mo' : 'EGP ' + p.egpM.toFixed(1) + 'M';
  }
};

(function (D: any) {
  'use strict';
  const cache: any = {};
  const TYPES = ['Apartment', 'Apartment', 'Apartment', 'Duplex', 'Twin House', 'Townhouse', 'Penthouse', 'Villa', 'Villa'];
  const AGENTS = ['Layla Mansour', 'Karim Fahmy', 'Nour Saleh', 'Omar Magdy', 'Yara Hakim', 'Rana Adel'];
  const IMGS = [
    'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=55',
    'https://images.unsplash.com/photo-1568605114967-8130f3a36994?w=800&q=55',
    'https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=800&q=55',
    'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=800&q=55',
    'https://images.unsplash.com/photo-1583608205776-bfd35f0d9f83?w=800&q=55',
    'https://images.unsplash.com/photo-1600047509807-ba8f99d2cdde?w=800&q=55',
    'https://images.unsplash.com/photo-1615873968403-89e068629265?w=800&q=55',
    'https://images.unsplash.com/photo-1600607687920-4e2a09cf159d?w=800&q=55'
  ];
  function hash(s: any) { let h = 0; for (let i = 0; i < s.length; i++) { h = (h * 31 + s.charCodeAt(i)) >>> 0; } return h; }
  function rng(seed: any) { let x = seed || 1; return function () { x = (x * 1103515245 + 12345) >>> 0; return (x >>> 8) / 16777216; }; }
  const AREAS: any = { 'Apartment': [110, 220], 'Duplex': [200, 320], 'Twin House': [250, 340], 'Townhouse': [220, 300], 'Penthouse': [240, 380], 'Villa': [350, 620] };
  const MULT: any = { 'Apartment': 0.32, 'Duplex': 0.5, 'Twin House': 0.62, 'Townhouse': 0.55, 'Penthouse': 0.75, 'Villa': 1 };

  function cleanCpd(s: any) {
    return String(s || '')
      .toLowerCase()
      .replace(/\(.*?\)/g, '')
      .replace(/\b(new cairo|residence|residences|district \d+|phase \d+)\b/g, '')
      .trim();
  }

  D.unitsFor = function (name: any) {
    if (cache[name]) return cache[name];
    const target = cleanCpd(name);

    // 1. Look up real master inventory units
    const snapshotUnits: any[] = (snapshot as any)?.units || [];
    const matched = snapshotUnits.filter((u: any) => {
      const cmp = cleanCpd(u.compound || u.location);
      if (!cmp) return false;
      return cmp === target || cmp.startsWith(target) || target.startsWith(cmp);
    });

    if (matched.length > 0) {
      const mapped = matched.map((u: any, idx: number) => ({
        code: u.code || `SE-${String(idx + 1).padStart(4, '0')}`,
        type: u.type || u.propertyType || 'Apartment',
        beds: Number(u.beds || 3),
        bath: Number(u.bath || 2),
        area: Number(u.area || 160),
        floor: u.type === 'Villa' || u.type === 'Twin House' || u.type === 'Townhouse' ? 'G+2' : `${(idx % 5) + 1}th Floor`,
        mode: u.mode === 'rent' ? 'rent' : 'sale',
        egpM: u.egpM || Number(((u.price || 8000000) / 1000000).toFixed(1)),
        usd: u.usd || (u.mode === 'rent' ? Math.round((u.price || 40000) / 50) : Math.round((u.price || 8000000) / 5000)),
        ai: u.aiScore || 9.0,
        status: u.status || 'available',
        delivery: idx % 3 === 0 ? 'under_construction' : 'ready',
        agent: 'Sierra Advisor Desk',
        img: u.img || IMGS[idx % IMGS.length],
        whatsapp: 'https://wa.me/201092048333',
        segment: u.segment || 'all',
        segmentLabel: u.segmentLabel || 'Verified Inventory',
        description: u.description || ''
      }));
      cache[name] = mapped;
      return mapped;
    }

    // 2. Deterministic fallback for compounds pending catalog import
    const c = D.compounds.find(function (x: any) { return x.n === name; });
    if (!c) return [];
    const r = rng(hash(name));
    const count = 8 + Math.floor(r() * 17); // 8–24 units
    const abbr = name.replace(/\(.*\)/, '').trim().split(/\s+/).map(function (w: any) { return w[0]; }).join('').toUpperCase().slice(0, 3);
    const units: any[] = [];
    for (let i = 0; i < count; i++) {
      const type = TYPES[Math.floor(r() * TYPES.length)];
      const span = AREAS[type];
      const area = Math.round((span[0] + r() * (span[1] - span[0])) / 5) * 5;
      const mode = r() < 0.3 ? 'rent' : 'sale';
      const beds = type === 'Villa' ? 4 + Math.floor(r() * 2) : type === 'Apartment' ? 2 + Math.floor(r() * 2) : 3 + Math.floor(r() * 2);
      const bath = Math.max(2, beds - Math.floor(r() * 2));
      const egpM = Math.round(c.priceM * MULT[type] * (0.85 + r() * 0.5) * 10) / 10;
      const usd = Math.round(c.rent * MULT[type] * (0.85 + r() * 0.5) / 50) * 50;
      const ai = Math.round(Math.min(9.9, Math.max(7.8, c.ai + (r() - 0.5) * 0.8)) * 10) / 10;
      const floor = type === 'Villa' || type === 'Twin House' || type === 'Townhouse' ? 'G+2' : (1 + Math.floor(r() * 8)) + '';
      units.push({
        code: abbr + '-' + type.charAt(0) + (101 + i),
        type: type, beds: beds, bath: bath, area: area, floor: floor,
        mode: mode, egpM: egpM, usd: usd, ai: ai,
        status: r() < 0.14 ? 'reserved' : 'available',
        delivery: r() < 0.65 ? 'ready' : 'under_construction',
        agent: AGENTS[Math.floor(r() * AGENTS.length)],
        img: IMGS[Math.floor(r() * IMGS.length)]
      });
    }
    cache[name] = units;
    return units;
  };

  D.findListing = function (id: any) {
    if (!id) return null;
    const strId = String(id).trim().toLowerCase();
    const foundDef = defaultListings.find(
      (x: any) => String(x.id).toLowerCase() === strId || String(x.code).toLowerCase() === strId
    );
    if (foundDef) return foundDef;

    const raw = rawUnits.find(
      (x: any) => String(x.id).toLowerCase() === strId || String(x.code).toLowerCase() === strId
    );
    if (raw) {
      return {
        id: raw.id,
        code: raw.code || raw.id,
        cmp: raw.compound || raw.location || 'New Cairo',
        zone: raw.zone || '5th Settlement',
        type: raw.type || 'Apartment',
        beds: Number(raw.beds || 3),
        bath: Number(raw.bath || 2),
        area: Number(raw.area || 160),
        egpM: raw.egpM || Number(((raw.price || 8000000) / 1000000).toFixed(1)),
        usd: raw.usd || (raw.mode === 'rent' ? Math.round((raw.price || 40000) / 50) : Math.round((raw.price || 8000000) / 5000)),
        ai: Number(raw.aiScore || 9.2),
        tag: raw.tag || (raw.mode === 'rent' ? 'Verified Rent' : 'Verified Sale'),
        mode: raw.mode || 'sale',
        agent: raw.agent || 'Sierra Direct Advisor',
        ago: 'Master Inventory Sync',
        img: raw.img || 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=800&q=55',
        whatsapp: raw.whatsapp,
        segment: raw.segment,
      };
    }
    return null;
  };
})(DATA);

export const HZDATA = DATA;
export type Listing = {
  id: number; code: string; cmp: string; zone: string; type: string;
  beds: number; bath: number; area: number; egpM: number; usd: number;
  ai: number; tag: string | null; mode: 'sale' | 'rent';
  agent: string; ago: string; img: string;
};
export type Compound = {
  id: number; n: string; z: string; priceM: number; rent: number; ai: number; c: [number, number]; g: string;
  [k: string]: any;
};
