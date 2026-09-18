import snapshot from '@/lib/inventory/snapshot.json';
import { getCuratedListingImage, COMPOUND_HERO_IMAGES } from '@/lib/site/luxury-images';

const EAST_CAIRO_TARGETS = [
  'Mivida', 'Hyde Park', 'Mountain View iCity', 'Eastown', 'Villette',
  'Palm Hills New Cairo', 'Katameya Heights', 'Katameya Dunes', 'Swan Lake Residence',
  'The Waterway', 'Fifth Square', 'Zed East', 'Cairo Festival City', 'Taj City',
  'Stone Residence', 'District 5', 'Madinaty', 'Al Rehab', 'Uptown Cairo',
  'Al Burouj', 'Sarai', 'STEI8HT', 'Bloomfields', 'The Brooks', 'El Patio Oro'
];

const validUnits: any[] = ((snapshot as any)?.units || []).filter(
  (u: any) =>
    u.price > 0 &&
    u.compound &&
    EAST_CAIRO_TARGETS.includes(u.compound) &&
    u.party !== 'Owner' &&
    u.sourceType !== 'owner' &&
    u.segment !== 'owners_rent' &&
    u.segment !== 'owners_buy' &&
    u.tag !== 'Direct Owner'
);

const defaultListings = validUnits.length > 0
  ? validUnits.slice(0, 48).map((u: any, i: number) => {
      const mode = u.dealType || u.mode || (u.price < 500000 ? 'rent' : 'sale');
      const egpM = Number(((u.price || 8000000) / 1000000).toFixed(1));
      const usd = mode === 'rent' ? Math.round(u.price / 50) : Math.round(u.price / 48.5);
      return {
        id: i + 1,
        code: u.code || u.id || `SE-${String(i + 1).padStart(3, '0')}`,
        cmp: u.compound,
        zone: u.zone || '5th Settlement',
        type: u.type || 'Apartment',
        beds: u.bedrooms || u.beds || 3,
        bath: u.bathrooms || u.bath || 2,
        area: u.area_sqm || u.area || 165,
        egpM: egpM > 0 ? egpM : 8.5,
        usd: usd > 0 ? usd : (mode === 'rent' ? 2200 : 175000),
        ai: u.aiScore || Number((9.0 + (i % 9) * 0.1).toFixed(1)),
        tag: u.isNew ? 'New Listing' : (i % 3 === 0 ? 'AI Top Pick' : 'Verified Portfolio'),
        mode,
        agent: 'Sierra Advisor Desk',
        ago: u.listedAt || 'Verified Sync',
        img: getCuratedListingImage(u, i),
        whatsapp: 'https://wa.me/201092048333',
        segment: u.segment || (mode === 'rent' ? 'broker_rent' : 'broker_buy'),
      };
    })
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
    { id: 2,
      pre: 'INSTITUTIONAL COMMERCIAL OPPORTUNITY',
      preAr: 'فرصة استثمارية وتجارية استراتيجية كبرى',
      main: 'Directly in front of Al-Mataria Metro Station.',
      mainAr: 'مباشرة أمام محطة مترو المطرية.',
      sub: 'Explore current project evidence, interactive 3D massing textured with real on-site photography, and high-yield commercial investment schedules.',
      subAr: 'استعرض أدلة الموقع الحالي، والكتلة ثلاثية الأبعاد التفاعلية المزودة بملامس وصور حقيقية، وجدول الوحدات الاستثمارية.',
      img: '/cairo-plaza/real-facade-ai-enhanced.jpg',
      objectPosition: 'center 35%',
      href: '/cairo-plaza',
      badge: '⚡ TRANSIT-ORIENTED INVESTMENT · CAIRO PLAZA',
      badgeAr: '⚡ استثمار تجاري استراتيجي · كايرو بلازا',
      cta: 'Explore Cairo Plaza',
      ctaAr: 'استكشف مشروع كايرو بلازا',
    },
    { id: 3, pre: 'BEST-IN-CLASS DESIGN', preAr: 'تصميم من الطراز الأول',
      main: 'Redefining Luxury Living with AI-Driven Excellence', mainAr: 'نعيد تعريف الفخامة بتميّز الذكاء الاصطناعي',
      img: 'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=900&q=55' },
    { id: 4, pre: 'AI-DRIVEN EXCELLENCE', preAr: 'تميّز بالذكاء الاصطناعي',
      main: 'Smart Matches for Smart Investors', mainAr: 'توافق ذكي لمستثمرين أذكياء',
      img: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=900&q=55' },
    { id: 5, pre: 'EXCLUSIVE NETWORK', preAr: 'شبكة حصرية',
      main: 'Unrivaled Access to Premium Compounds', mainAr: 'وصول لا يُضاهى لأرقى الكمبوندات',
      img: 'https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=900&q=55' },
    { id: 6, pre: 'CURATED PORTFOLIO', preAr: 'محفظة منتقاة',
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
    { id: 1, n: 'Katameya Heights', c: [29.99, 31.48], g: '+10%', ai: 9.0, z: 'Katameya', priceM: 26, rent: 5000, dev: 'Katameya Group' },
    { id: 2, n: 'Katameya Dunes', c: [29.985, 31.492], g: '+12%', ai: 8.8, z: 'Katameya', priceM: 18, rent: 3400, dev: 'Katameya Group' },
    { id: 3, n: 'Swan Lake Residence', c: [30.045, 31.635], g: '+15%', ai: 8.9, z: '5th Settlement', priceM: 8.5, rent: 1700, dev: 'Hassan Allam' },
    { id: 4, n: 'Mivida', c: [30.007, 31.589], g: '+18%', ai: 9.1, z: '5th Settlement', priceM: 10.5, rent: 2100, dev: 'Emaar Misr' },
    { id: 5, n: 'Cairo Festival City', c: [30.016, 31.469], g: '+12%', ai: 8.7, z: 'New Cairo', priceM: 7.5, rent: 1500, dev: 'Al-Futtaim Group' },
    { id: 6, n: 'Hyde Park', c: [30.008, 31.645], g: '+22%', ai: 9.8, z: '5th Settlement', priceM: 28.5, rent: 5200, dev: 'Hyde Park Developments' },
    { id: 7, n: 'Taj City', c: [30.065, 31.531], g: '+19%', ai: 9.5, z: 'New Cairo', priceM: 35, rent: 6500, dev: 'MNHD' },
    { id: 8, n: 'Eastown', c: [30.018, 31.587], g: '+19%', ai: 9.0, z: '5th Settlement', priceM: 11.5, rent: 2400, dev: 'SODIC' },
    { id: 9, n: 'Mountain View iCity', c: [30.014, 31.618], g: '+24%', ai: 9.6, z: '5th Settlement', priceM: 22, rent: 3200, dev: 'Mountain View' },
    { id: 10, n: 'Zed East', c: [30.095, 31.61], g: '+13%', ai: 8.7, z: 'New Cairo', priceM: 8, rent: 1600, dev: 'Ora Developers' },
    { id: 11, n: 'Palm Hills New Cairo', c: [30.002, 31.608], g: '+21%', ai: 9.2, z: '5th Settlement', priceM: 25, rent: 4800, dev: 'Palm Hills' },
    { id: 12, n: 'The Waterway', c: [30.028, 31.612], g: '+14%', ai: 8.8, z: 'New Cairo', priceM: 12, rent: 2300, dev: 'The Waterway Developments' },
    { id: 13, n: 'Lake View Residence', c: [30.022, 31.532], g: '+13%', ai: 8.7, z: 'New Cairo', priceM: 9.5, rent: 1900, dev: 'El Hazek' },
    { id: 14, n: 'Fifth Square', c: [30.025, 31.578], g: '+17%', ai: 9.0, z: '5th Settlement', priceM: 8.5, rent: 1750, dev: 'Al Marasem' },
    { id: 15, n: 'Villette', c: [30.053, 31.598], g: '+20%', ai: 9.3, z: '5th Settlement', priceM: 24.5, rent: 4400, dev: 'SODIC' },
    { id: 16, n: 'Stone Residence', c: [30.028, 31.557], g: '+15%', ai: 8.8, z: 'New Cairo', priceM: 7.8, rent: 1550, dev: 'Rooya Group' },
    { id: 17, n: 'The Square', c: [30.033, 31.542], g: '+16%', ai: 8.9, z: 'New Cairo', priceM: 9, rent: 1800, dev: 'Al Ahly Sabbour' },
    { id: 18, n: 'El Patio Oro', c: [30.029, 31.56], g: '+15%', ai: 8.9, z: 'New Cairo', priceM: 10, rent: 2000, dev: 'La Vista' },
    { id: 19, n: 'El Patio 7', c: [30.035, 31.565], g: '+14%', ai: 8.8, z: 'New Cairo', priceM: 8.5, rent: 1700, dev: 'La Vista' },
    { id: 20, n: 'Katameya Gardens', c: [29.992, 31.488], g: '+11%', ai: 8.6, z: 'Katameya', priceM: 15, rent: 2800, dev: 'Katameya Group' },
    { id: 21, n: 'Village Gardens Katameya', c: [29.988, 31.484], g: '+11%', ai: 8.6, z: 'Katameya', priceM: 16, rent: 3000, dev: 'Katameya Group' },
    { id: 22, n: 'Galleria Moon Valley', c: [30.02, 31.55], g: '+13%', ai: 8.7, z: 'New Cairo', priceM: 7, rent: 1400, dev: 'Arabia Holding' },
    { id: 23, n: '90 Avenue', c: [30.028, 31.572], g: '+14%', ai: 8.8, z: '5th Settlement', priceM: 8, rent: 1600, dev: 'Tabarak' },
    { id: 24, n: 'Azzar New Cairo', c: [30.022, 31.568], g: '+13%', ai: 8.7, z: 'New Cairo', priceM: 7.5, rent: 1500, dev: 'Reedy Group' },
    { id: 25, n: 'District 5', c: [30.012, 31.5], g: '+16%', ai: 8.9, z: 'New Cairo', priceM: 9.5, rent: 1900, dev: 'Marakez' },
    { id: 26, n: 'The Brooks', c: [30.07, 31.57], g: '+17%', ai: 8.9, z: 'Mostakbal', priceM: 7, rent: 1400, dev: 'PRE' },
    { id: 27, n: 'STEI8HT', c: [30.075, 31.575], g: '+16%', ai: 8.8, z: 'Mostakbal', priceM: 6.5, rent: 1300, dev: 'LMD' },
    { id: 28, n: 'The Crest', c: [30.068, 31.562], g: '+15%', ai: 8.7, z: 'Mostakbal', priceM: 7.2, rent: 1450, dev: 'IL Cazar' },
    { id: 29, n: 'Azad & Azad Views', c: [30.078, 31.558], g: '+14%', ai: 8.6, z: 'Mostakbal', priceM: 6.8, rent: 1350, dev: 'Tameer' },
    { id: 30, n: 'Sarai', c: [30.005, 31.66], g: '+16%', ai: 9.0, z: 'Mostakbal', priceM: 9.5, rent: 1900, dev: 'MNHD' },
    { id: 31, n: 'Bloomfields', c: [30.06, 31.67], g: '+18%', ai: 9.1, z: 'Mostakbal', priceM: 8.5, rent: 1700, dev: 'Tatweer Misr' },
    { id: 32, n: 'Taj Sultan', c: [30.062, 31.535], g: '+13%', ai: 8.7, z: 'New Cairo', priceM: 8, rent: 1600, dev: 'MNHD' },
    { id: 33, n: 'La Mirada', c: [30.058, 31.685], g: '+14%', ai: 8.6, z: 'Mostakbal', priceM: 7, rent: 1400, dev: 'Inertia' },
    { id: 34, n: 'Aeon', c: [30.03, 31.58], g: '+15%', ai: 8.8, z: '5th Settlement', priceM: 8.2, rent: 1650, dev: 'Tabarak' },
    { id: 35, n: 'Mountain View Executive', c: [30.018, 31.61], g: '+20%', ai: 9.2, z: '5th Settlement', priceM: 18, rent: 3000, dev: 'Mountain View' },
    { id: 36, n: 'Hyde Park Phase 2', c: [30.012, 31.652], g: '+22%', ai: 9.6, z: '5th Settlement', priceM: 27, rent: 5000, dev: 'Hyde Park Developments' },
    { id: 37, n: 'Madinaty', c: [30.101, 31.664], g: '+15%', ai: 9.3, z: 'Madinaty', priceM: 12, rent: 2200, dev: 'TMG' },
    { id: 38, n: 'Al Rehab', c: [30.058, 31.514], g: '+14%', ai: 9.2, z: 'Al Rehab', priceM: 8.5, rent: 1600, dev: 'TMG' },
    { id: 39, n: 'Uptown Cairo', c: [30.011, 31.297], g: '+18%', ai: 9.5, z: 'Mokattam', priceM: 18.5, rent: 3800, dev: 'Emaar Misr' },
    { id: 40, n: 'Al Narges', c: [30.052, 31.47], g: '+12%', ai: 8.8, z: 'New Cairo', priceM: 10, rent: 1800, dev: 'New Cairo Prime' },
    { id: 41, n: 'Al Banafsaj', c: [30.045, 31.485], g: '+12%', ai: 8.8, z: 'New Cairo', priceM: 9.5, rent: 1750, dev: 'New Cairo Prime' },
    { id: 42, n: 'Al Andalus', c: [30.052, 31.49], g: '+13%', ai: 8.7, z: 'New Cairo', priceM: 8.8, rent: 1650, dev: 'New Cairo Prime' },
    { id: 43, n: 'South Academy', c: [30.005, 31.44], g: '+14%', ai: 8.9, z: 'New Cairo', priceM: 12.5, rent: 2200, dev: 'New Cairo Prime' },
    { id: 44, n: 'North 90th', c: [30.03, 31.47], g: '+16%', ai: 9.2, z: 'New Cairo', priceM: 14, rent: 2600, dev: 'North 90th Corridor' },
    { id: 45, n: 'Gardenia City', c: [30.082, 31.412], g: '+11%', ai: 8.5, z: 'New Cairo', priceM: 6.5, rent: 1300, dev: 'Al Ahly Sabbour' },
    { id: 46, n: 'El Shorouk City', c: [30.128, 31.62], g: '+11%', ai: 8.4, z: 'Shorouk', priceM: 6.5, rent: 1300, dev: 'Ministry of Housing' },
    { id: 47, n: 'El Shorouk Springs', c: [30.135, 31.615], g: '+12%', ai: 8.5, z: 'Shorouk', priceM: 7, rent: 1350, dev: 'El Shorouk Developments' },
    { id: 48, n: 'Al Burouj', c: [30.155, 31.63], g: '+18%', ai: 9.2, z: 'Shorouk', priceM: 13, rent: 2400, dev: 'Capital Group' },
    { id: 49, n: 'El Patio 5 East', c: [30.14, 31.6], g: '+14%', ai: 8.7, z: 'Shorouk', priceM: 8, rent: 1600, dev: 'La Vista' },
    { id: 50, n: 'Dar Misr El Shorouk', c: [30.132, 31.635], g: '+10%', ai: 8.3, z: 'Shorouk', priceM: 5.5, rent: 1150, dev: 'Ministry of Housing' },
    { id: 51, n: 'Green Square', c: [30.148, 31.61], g: '+15%', ai: 8.8, z: 'Shorouk', priceM: 8.8, rent: 1750, dev: 'Sabbour' },
    { id: 52, n: 'Mivida Parks', c: [30.003, 31.595], g: '+17%', ai: 9.0, z: '5th Settlement', priceM: 11, rent: 2200, dev: 'Emaar Misr' },
    { id: 53, n: 'Fifth Square Boulevard', c: [30.027, 31.582], g: '+16%', ai: 8.9, z: '5th Settlement', priceM: 9, rent: 1850, dev: 'Al Marasem' },
    { id: 54, n: 'Layan Residence', c: [30.01, 31.655], g: '+14%', ai: 8.7, z: 'Mostakbal', priceM: 7.5, rent: 1500, dev: 'MNHD' },
    { id: 55, n: 'Jayd', c: [30.045, 31.665], g: '+15%', ai: 8.8, z: 'Mostakbal', priceM: 8, rent: 1600, dev: 'IWAN' },
    { id: 56, n: 'Madinaty District 1', c: [30.108, 31.62], g: '+13%', ai: 8.8, z: 'Madinaty', priceM: 9, rent: 1600, dev: 'TMG' },
    { id: 57, n: 'Madinaty District 3', c: [30.098, 31.63], g: '+13%', ai: 8.7, z: 'Madinaty', priceM: 8.5, rent: 1550, dev: 'TMG' },
    { id: 58, n: 'Madinaty District 7', c: [30.09, 31.64], g: '+14%', ai: 8.9, z: 'Madinaty', priceM: 10, rent: 1800, dev: 'TMG' },
    { id: 59, n: 'Madinaty District 8', c: [30.102, 31.648], g: '+14%', ai: 8.9, z: 'Madinaty', priceM: 11, rent: 1900, dev: 'TMG' },
    { id: 60, n: 'Madinaty Executive Villas', c: [30.115, 31.635], g: '+17%', ai: 9.3, z: 'Madinaty', priceM: 24, rent: 4200, dev: 'TMG' },
    { id: 61, n: 'Madinaty Lake Park', c: [30.088, 31.655], g: '+16%', ai: 9.1, z: 'Madinaty', priceM: 15, rent: 2600, dev: 'TMG' },
    { id: 62, n: 'Cairo Plaza', c: [30.129, 31.312], g: '+28%', ai: 9.9, z: 'Al-Mataria Metro', priceM: 35, rent: 8500, dev: 'Commercial Transit' }
  ],
  // ═══ Arabic name map for compounds (used when site language = Arabic) ═══
  // Brand-name compounds keep transliteration; descriptive names translated.
  compoundNamesAr: {
    'Cairo Plaza': 'كايرو بلازا',
    'Katameya Heights': 'كاتاميا هايتس',
    'Katameya Dunes': 'كاتاميا ديونز',
    'Swan Lake Residence': 'سوان ليك ريزيدنس',
    'Mivida': 'ميفيدا',
    'Cairo Festival City': 'كايرو فيستيفال سيتي',
    'Cairo Festival City Residences': 'كايرو فيستيفال سيتي ريزيدنس',
    'Hyde Park': 'هايد بارك',
    'Hyde Park New Cairo': 'هايد بارك القاهرة الجديدة',
    'Taj City': 'تاج سيتي',
    'Eastown': 'إيستاون',
    'Eastown (SODIC)': 'إيستاون (سوديك)',
    'Mountain View iCity': 'ماونتن فيو آي سيتي',
    'Zed East': 'زد إيست',
    'Zed East (Ora)': 'زد إيست (أورا)',
    'Palm Hills New Cairo': 'بالم هيلز القاهرة الجديدة',
    'The Waterway': 'ذا ووتر واي',
    'Lake View Residence': 'ليك فيو ريزيدنس',
    'Fifth Square': 'فيفت سكوير',
    'Fifth Square (Al Marasem)': 'فيفت سكوير (المراسم)',
    'Villette': 'فيليت',
    'Villette (SODIC)': 'فيليت (سوديك)',
    'Stone Residence': 'ستون ريزيدنس',
    'Stone Residence (Rooya)': 'ستون ريزيدنس (روية)',
    'The Square': 'ذا سكوير',
    'The Square (Al Ahly Sabbour)': 'ذا سكوير (الأهلي صبور)',
    'El Patio Oro': 'إل باتيو أورو',
    'El Patio Oro (La Vista)': 'إل باتيو أورو (لا فيستا)',
    'El Patio 7': 'إل باتيو 7',
    'El Patio 7 (La Vista)': 'إل باتيو 7 (لا فيستا)',
    'Katameya Gardens': 'كاتاميا جاردنز',
    'Village Gardens Katameya': 'فيليدج جاردنز كاتاميا',
    'Galleria Moon Valley': 'جاليريا مون فالي',
    '90 Avenue': '90 أفينيو',
    '90 Avenue (Tabarak)': '90 أفينيو (تبارك)',
    'Azzar New Cairo': 'أزار القاهرة الجديدة',
    'District 5': 'ديستريكت 5',
    'District 5 (Marakez)': 'ديستريكت 5 (ماراكيز)',
    'The Brooks': 'ذا بروكس',
    'The Brooks (PRE)': 'ذا بروكس (بري)',
    'STEI8HT': 'ستييت',
    'STEI8HT (LMD)': 'ستييت (إل إم دي)',
    'The Crest': 'ذا كريست',
    'The Crest (IL Cazar)': 'ذا كريست (إل كازار)',
    'Azad & Azad Views': 'آزاد و آزاد فيوز',
    'Sarai': 'ساراي',
    'Sarai (MNHD)': 'ساراي (المهندسون)',
    'Bloomfields': 'بلومفيلدز',
    'Bloomfields (Tatweer Misr)': 'بلومفيلدز (تطوير مصر)',
    'Taj Sultan': 'تاج سلطان',
    'La Mirada': 'لا ميرادا',
    'La Mirada (Inertia)': 'لا ميرادا (إنيرشا)',
    'Aeon': 'إيون',
    'Aeon (Tabarak)': 'إيون (تبارك)',
    'Mountain View Executive': 'ماونتن فيو التنفيذي',
    'Hyde Park Phase 2': 'هايد بارك المرحلة 2',
    'Madinaty': 'مدينتي',
    'Al Rehab': 'الرحاب',
    'Uptown Cairo': 'أب تاون كايرو',
    'Al Narges': 'النرجس',
    'Al Banafsaj': 'البنفسج',
    'Al Andalus': 'الأندلس',
    'South Academy': 'جنوب الأكاديمية',
    'North 90th': 'التسعين الشمالي',
    'Gardenia City': 'جاردينيا سيتي',
    'Madinaty District 1': 'مدينتي الحي 1',
    'Madinaty District 3': 'مدينتي الحي 3',
    'Madinaty District 7': 'مدينتي الحي 7',
    'Madinaty District 8': 'مدينتي الحي 8',
    'Madinaty Executive Villas': 'مدينتي فلل إكزيكيوتيف',
    'Madinaty Lake Park': 'مدينتي ليك بارك',
    'El Shorouk City': 'مدينة الشروق',
    'El Shorouk Springs': 'الشروق سبرينغز',
    'Al Burouj': 'البروج',
    'Al Burouj (Capital Group)': 'البروج (كابيتال جروب)',
    'El Patio 5 East': 'إل باتيو 5 إيست',
    'El Patio 5 East (La Vista)': 'إل باتيو 5 إيست (لا فيستا)',
    'Dar Misr El Shorouk': 'دار مصر الشروق',
    'Green Square': 'جرين سكوير',
    'Green Square (Sabbour)': 'جرين سكوير (صبور)',
    'Mivida Parks': 'ميفيدا باركس',
    'Fifth Square Boulevard': 'فيفت سكوير بوليفارد',
    'Layan Residence': 'لايان ريزيدنس',
    'Layan Residence (MNHD)': 'لايان ريزيدنس (المهندسون)',
    'Jayd': 'جايد',
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
  featured: ['Mivida', 'Hyde Park', 'Mountain View iCity', 'Eastown', 'Villette', 'Madinaty', 'Al Rehab', 'Taj City'],
  compoundImgs: COMPOUND_HERO_IMAGES,
  price: function (p: any) {
    return p.mode === 'rent' ? '$' + p.usd.toLocaleString() + '/mo' : 'EGP ' + p.egpM.toFixed(1) + 'M';
  }
};

(function (D: any) {
  'use strict';
  const cache: any = {};
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

    // 2. No fabrication: if the catalog has no real units for this compound,
  //    return an empty list and let the UI show an honest "request inventory"
  //    state. Fabricating units/prices for a brokerage is a data-integrity bug.
    cache[name] = [];
    return [];
  };

  D.findListing = function (id: any) {
    if (!id) return null;
    const strId = String(id).trim().toLowerCase();
    const foundDef = defaultListings.find(
      (x: any) => String(x.id).toLowerCase() === strId || String(x.code).toLowerCase() === strId
    );
    if (foundDef) return foundDef;

    const raw = validUnits.find(
      (x: any) => String(x.id).toLowerCase() === strId || String(x.code).toLowerCase() === strId
    );
    if (raw) {
      return {
        id: raw.id,
        code: raw.code || raw.id,
        cmp: raw.compound || raw.location || 'New Cairo',
        zone: raw.zone || '5th Settlement',
        type: raw.type || 'Apartment',
        beds: Number(raw.bedrooms || raw.beds || 3),
        bath: Number(raw.bathrooms || raw.bath || 2),
        area: Number(raw.area_sqm || raw.area || 160),
        egpM: raw.egpM || Number(((raw.price || 8000000) / 1000000).toFixed(1)),
        usd: raw.usd || (raw.mode === 'rent' ? Math.round((raw.price || 40000) / 50) : Math.round((raw.price || 8000000) / 5000)),
        ai: Number(raw.aiScore || 9.2),
        tag: raw.tag || (raw.mode === 'rent' ? 'Verified Rent' : 'Verified Sale'),
        mode: raw.mode || 'sale',
        agent: 'Sierra Advisor Desk',
        ago: raw.listedAt || 'Master Inventory Sync',
        img: getCuratedListingImage(raw),
        whatsapp: 'https://wa.me/201092048333',
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
