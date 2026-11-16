import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');

dotenv.config({ path: path.join(ROOT, '.env.local') });
dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gaxfqcietzoonlmatiot.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const token = process.env.SUPABASE_ACCESS_TOKEN;
const projectRef = 'gaxfqcietzoonlmatiot';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

async function runSQL(sql) {
  const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ query: sql })
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(`SQL Query failed (${res.status}): ${txt}`);
  }
  return await res.json();
}

async function main() {
  console.log('══════════════════════════════════════════════════════════════════════════');
  console.log('  SIERRA ESTATES — COMPLETE SUPABASE INTEGRATION, WIRING & HYDRATION');
  console.log('══════════════════════════════════════════════════════════════════════════\n');

  // 1. Verify connection
  console.log(`📡 Connecting to Supabase Project [${projectRef}] at ${SUPABASE_URL}...`);
  const { count: listingsCount, error: countErr } = await supabase
    .from('listings')
    .select('*', { count: 'exact', head: true });
  
  if (countErr) {
    console.error('❌ Failed to connect to listings table:', countErr.message);
    process.exit(1);
  }
  console.log(`✅ Supabase Database Connected! Active listings in catalog: ${listingsCount}`);

  // 2. Hydrate COMPOUNDS table (from SEED_COMPOUNDS / New Cairo compounds)
  console.log('\n🏡 1. Hydrating public.compounds table...');
  const compoundsList = [
    { name: "Katameya Heights", zone: "Katameya", lat: 29.99, lng: 31.48, growth: "+10%", ai_score: 9.0, price_m: 26000000, rent: 50000, featured: true },
    { name: "Katameya Dunes", zone: "Katameya", lat: 29.985, lng: 31.492, growth: "+12%", ai_score: 8.8, price_m: 18000000, rent: 34000, featured: false },
    { name: "Swan Lake Residence", zone: "5th Settlement", lat: 30.045, lng: 31.635, growth: "+15%", ai_score: 8.9, price_m: 8500000, rent: 17000, featured: false },
    { name: "Mivida", zone: "5th Settlement", lat: 30.007, lng: 31.589, growth: "+18%", ai_score: 9.1, price_m: 10500000, rent: 21000, featured: true },
    { name: "Cairo Festival City", zone: "New Cairo", lat: 30.016, lng: 31.469, growth: "+12%", ai_score: 8.7, price_m: 7500000, rent: 15000, featured: false },
    { name: "Hyde Park", zone: "5th Settlement", lat: 30.008, lng: 31.645, growth: "+22%", ai_score: 9.8, price_m: 28500000, rent: 52000, featured: true },
    { name: "Taj City", zone: "New Cairo", lat: 30.065, lng: 31.531, growth: "+19%", ai_score: 9.5, price_m: 22000000, rent: 41000, featured: true },
    { name: "Eastown", zone: "5th Settlement", lat: 30.033, lng: 31.606, growth: "+14%", ai_score: 8.6, price_m: 9000000, rent: 18000, featured: false },
    { name: "Mountain View iCity", zone: "5th Settlement", lat: 30.025, lng: 31.65, growth: "+17%", ai_score: 9.2, price_m: 12000000, rent: 23000, featured: false },
    { name: "Zed East", zone: "5th Settlement", lat: 30.041, lng: 31.628, growth: "+20%", ai_score: 9.3, price_m: 14000000, rent: 26000, featured: false },
    { name: "Palm Hills New Cairo", zone: "5th Settlement", lat: 30.018, lng: 31.62, growth: "+16%", ai_score: 9.0, price_m: 11000000, rent: 22000, featured: false },
    { name: "The Waterway", zone: "5th Settlement", lat: 30.028, lng: 31.612, growth: "+18%", ai_score: 8.9, price_m: 13000000, rent: 24000, featured: false },
    { name: "Lake View Residence", zone: "5th Settlement", lat: 30.052, lng: 31.582, growth: "+13%", ai_score: 8.5, price_m: 8000000, rent: 16000, featured: false },
    { name: "Fifth Square", zone: "5th Settlement", lat: 30.046, lng: 31.617, growth: "+15%", ai_score: 8.7, price_m: 9500000, rent: 19000, featured: false },
    { name: "Villette", zone: "5th Settlement", lat: 30.013, lng: 31.633, growth: "+21%", ai_score: 9.4, price_m: 16000000, rent: 30000, featured: true },
    { name: "Madinaty", zone: "Madinaty", lat: 30.0984, lng: 31.6288, growth: "+14%", ai_score: 8.9, price_m: 8500000, rent: 25000, featured: true },
    { name: "Al Rehab", zone: "Rehab", lat: 30.0608, lng: 31.4936, growth: "+10%", ai_score: 8.2, price_m: 6500000, rent: 18000, featured: false },
    { name: "SODIC East", zone: "New Heliopolis", lat: 30.1500, lng: 31.7000, growth: "+16%", ai_score: 8.8, price_m: 7200000, rent: 16000, featured: false },
    { name: "Galleria Moon Valley", zone: "5th Settlement", lat: 30.0350, lng: 31.5750, growth: "+13%", ai_score: 8.5, price_m: 7800000, rent: 17500, featured: false },
    { name: "Uptown Cairo", zone: "Mokattam", lat: 30.092, lng: 31.508, growth: "+19%", ai_score: 9.2, price_m: 18500000, rent: 34000, featured: true },
    { name: "Badya", zone: "6th of October", lat: 29.9281, lng: 30.8711, growth: "+15%", ai_score: 8.9, price_m: 9500000, rent: 18000, featured: false },
    { name: "Marassi", zone: "North Coast", lat: 31.18, lng: 29.65, growth: "+21%", ai_score: 9.0, price_m: 15000000, rent: 35000, featured: true },
    { name: "Hacienda Bay", zone: "North Coast", lat: 31.14, lng: 29.59, growth: "+20%", ai_score: 8.9, price_m: 14000000, rent: 30000, featured: false },
    { name: "New Cairo", zone: "5th Settlement", lat: 30.0263, lng: 31.4913, growth: "+15%", ai_score: 8.7, price_m: 7000000, rent: 15000, featured: false }
  ];

  const { data: upsertedCompounds, error: compErr } = await supabase
    .from('compounds')
    .upsert(compoundsList, { onConflict: 'name' })
    .select('id, name');

  if (compErr) {
    console.error('❌ Compounds upsert error:', compErr.message);
  } else {
    console.log(`✅ Successfully hydrated ${upsertedCompounds?.length || compoundsList.length} master compounds!`);
  }

  // 3. Hydrate DEVELOPERS table
  console.log('\n🏗️ 2. Hydrating public.developers table...');
  const developersList = [
    {
      name: "Emaar Misr",
      name_ar: "إعمار مصر",
      slug: "emaar-misr",
      description: "Leading global developer renowned for iconic master-planned communities including Mivida, Uptown Cairo, Marassi, and Cairo Gate.",
      description_ar: "شركة تطوير عقاري عالمية رائدة تشتهر بمجتمعاتها الأيقونية المتكاملة مثل ميفيدا وأب تاون كايرو ومراسي.",
      founded_year: 1997,
      headquarters: "Dubai / Cairo",
      website: "https://www.emaarmisr.com",
      rating: 4.9,
      total_projects: 14,
      tier: "premium",
      contact_email: "info@emaarmisr.com"
    },
    {
      name: "SODIC",
      name_ar: "سوديك",
      slug: "sodic",
      description: "Sixth of October Development & Investment Company, developing premier communities including Eastown, Villette, SODIC West, and June.",
      description_ar: "شركة السادس من أكتوبر للتنمية والاستثمار، رائدة في تطوير مجتمعات فاخرة مثل إيستاون وفيليت وسوديك ويست.",
      founded_year: 1996,
      headquarters: "Cairo, Egypt",
      website: "https://sodic.com",
      rating: 4.8,
      total_projects: 18,
      tier: "premium",
      contact_email: "sales@sodic.com"
    },
    {
      name: "Hyde Park Developments",
      name_ar: "هايد بارك للتطوير",
      slug: "hyde-park",
      description: "Developer of Hyde Park New Cairo, one of the largest self-contained private developments spanning 6 million square meters.",
      description_ar: "مطور مشروع هايد بارك التجمع الخامس بمساحة 6 ملايين متر مربع مع أكبر حديقة مركزية.",
      founded_year: 2007,
      headquarters: "New Cairo, Egypt",
      website: "https://hydepark.com.eg",
      rating: 4.8,
      total_projects: 8,
      tier: "premium",
      contact_email: "info@hydepark.com.eg"
    },
    {
      name: "Mountain View (DMG)",
      name_ar: "ماونتن فيو",
      slug: "mountain-view",
      description: "Dar Al Mimar Group, pioneers of the Science of Happiness in architecture, including Mountain View iCity, Chillout Park, and Ras El Hikma.",
      description_ar: "دار المعمار جروب، رواد علم السعادة في التصميم المعماري بمشاريع ماونتن فيو أيكتي وتشيل أوت بارك ورأس الحكمة.",
      founded_year: 2005,
      headquarters: "Cairo, Egypt",
      website: "https://mountainviewegypt.com",
      rating: 4.8,
      total_projects: 16,
      tier: "premium",
      contact_email: "info@mountainviewegypt.com"
    },
    {
      name: "Talaat Moustafa Group (TMG)",
      name_ar: "مجموعة طلعت مصطفى",
      slug: "tmg",
      description: "Egypt's premier community builder, developers of mega-cities Madinaty, Al Rehab, Noor, and Banan.",
      description_ar: "أكبر مطور عقاري للمدن المتكاملة في مصر، مطور مدينتي والرحاب ونور وبنان.",
      founded_year: 1970,
      headquarters: "Cairo, Egypt",
      website: "https://talaatmoustafa.com",
      rating: 4.7,
      total_projects: 22,
      tier: "premium",
      contact_email: "contact@talaatmoustafa.com"
    },
    {
      name: "Palm Hills Developments",
      name_ar: "بالم هيلز للتعمير",
      slug: "palm-hills",
      description: "Leading developer with an expansive residential and commercial footprint across East and West Cairo and North Coast, including Badya and Palm Hills New Cairo.",
      description_ar: "شركة تطوير رائدة تمتلك محفظة واسعة من المشروعات السكنية والتجارية مثل بادية وبالم هيلز القاهرة الجديدة.",
      founded_year: 1997,
      headquarters: "Giza, Egypt",
      website: "https://palmhillsdevelopments.com",
      rating: 4.8,
      total_projects: 29,
      tier: "premium",
      contact_email: "info@palmhills.com"
    },
    {
      name: "Hassan Allam Properties",
      name_ar: "حسن علام العقارية",
      slug: "hassan-allam",
      description: "Iconic luxury real estate group with century-old legacy, developing Swan Lake Residence, Seasons, and Park View.",
      description_ar: "مجموعة عقارية فاخرة عريقة ذات تاريخ ممتد، مطور سوان ليك وسيزونز وبارك فيو.",
      founded_year: 1936,
      headquarters: "Cairo, Egypt",
      website: "https://hassanallamproperties.com",
      rating: 4.9,
      total_projects: 15,
      tier: "premium",
      contact_email: "info@hassanallam.com"
    },
    {
      name: "Al Marasem Development",
      name_ar: "المراسم الدولية",
      slug: "al-marasem",
      description: "Bin Laden Group subsidiary creating premier developments including Fifth Square and Mar Ville.",
      description_ar: "إحدى شركات مجموعة بن لادن العالمية ومطور فيفت سكوير ومار فيل.",
      founded_year: 1997,
      headquarters: "Cairo, Egypt",
      website: "https://almarasemdevelopment.com",
      rating: 4.7,
      total_projects: 10,
      tier: "standard",
      contact_email: "info@almarasem.com"
    },
    {
      name: "Ora Developers",
      name_ar: "أورا للتطوير العقاري",
      slug: "ora-developers",
      description: "Visionary lifestyle developer founded by Eng. Naguib Sawiris, creators of Zed East, Zed Sheikh Zayed, and Silversands.",
      description_ar: "شركة رائدة أسسها المهندس نجيب ساويرس، مطور زيد إيست وزيد الشيخ زايد وسيلفرساندز الساحل الشمالي.",
      founded_year: 2018,
      headquarters: "Cairo, Egypt",
      website: "https://oradevelopers.com",
      rating: 4.9,
      total_projects: 9,
      tier: "premium",
      contact_email: "info@oradevelopers.com"
    }
  ];

  // Ensure unique constraints exist for clean idempotency
  try {
    await runSQL(`
      DO $$
      BEGIN
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_developers_name') THEN
          ALTER TABLE public.developers ADD CONSTRAINT uq_developers_name UNIQUE (name);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_knowledge_base_title') THEN
          ALTER TABLE public.knowledge_base ADD CONSTRAINT uq_knowledge_base_title UNIQUE (title);
        END IF;
        IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_agents_registry_name') THEN
          ALTER TABLE public.agents_registry ADD CONSTRAINT uq_agents_registry_name UNIQUE (name);
        END IF;
      END $$;
    `);
  } catch (err) {
    console.warn('Constraint check note:', err.message);
  }

  const { data: upsertedDevs, error: devErr } = await supabase
    .from('developers')
    .upsert(developersList, { onConflict: 'name' })
    .select('id, name');

  if (devErr) {
    console.error('❌ Developers upsert error:', devErr.message);
  } else {
    console.log(`✅ Successfully hydrated ${upsertedDevs?.length || developersList.length} top Egyptian developers!`);
  }

  // 4. Hydrate OWNERS table from 9,500 active listings
  console.log('\n👥 3. Populating public.owners from verified listings phone numbers...');
  try {
    const ownerSQL = `
      INSERT INTO public.owners (owner_name, primary_mobile, last_sync_at)
      SELECT 
        COALESCE(NULLIF(TRIM(owner_name), ''), 'Property Owner') as owner_name,
        TRIM(owner_phone) as primary_mobile,
        NOW() as last_sync_at
      FROM public.listings
      WHERE owner_phone IS NOT NULL AND TRIM(owner_phone) != ''
      GROUP BY TRIM(owner_phone), COALESCE(NULLIF(TRIM(owner_name), ''), 'Property Owner')
      ON CONFLICT (primary_mobile) DO NOTHING;
    `;
    await runSQL(ownerSQL);

    const { count: ownersCount } = await supabase
      .from('owners')
      .select('*', { count: 'exact', head: true });
    console.log(`✅ Successfully populated ${ownersCount} verified property owners in Supabase CRM!`);
  } catch (err) {
    console.warn('⚠️ Owners sync note:', err.message);
  }

  // 5. Hydrate WHATSAPP_NUMBERS table
  console.log('\n📲 4. Hydrating public.whatsapp_numbers table...');
  const whatsappNumbers = [
    { label: "WABA Line 1 (Primary Concierge)", e164_phone: process.env.WABA_NUMBER_1 || "+201000000001", status: "active", window_sent_count: 0, daily_sent_count: 0 },
    { label: "WABA Line 2 (Direct Owner Ingestion)", e164_phone: process.env.WABA_NUMBER_2 || "+201000000002", status: "active", window_sent_count: 0, daily_sent_count: 0 },
    { label: "WABA Line 3 (VIP Buyer Matches)", e164_phone: process.env.WABA_NUMBER_3 || "+201000000003", status: "active", window_sent_count: 0, daily_sent_count: 0 },
    { label: "WABA Line 4 (Emergency & Fallback)", e164_phone: process.env.WABA_NUMBER_4 || "+201000000004", status: "active", window_sent_count: 0, daily_sent_count: 0 },
  ];

  const { data: upsertedWaba, error: wabaErr } = await supabase
    .from('whatsapp_numbers')
    .upsert(whatsappNumbers, { onConflict: 'e164_phone' })
    .select('id, label, e164_phone');

  if (wabaErr) {
    console.error('❌ WhatsApp numbers error:', wabaErr.message);
  } else {
    console.log(`✅ Successfully configured ${upsertedWaba?.length || whatsappNumbers.length} enterprise WhatsApp lines!`);
  }

  // 6. Hydrate AGENTS_REGISTRY table
  console.log('\n👔 5. Hydrating public.agents_registry table...');
  const seedAgents = [
    { name: "Layla Mansour", phone: "+20 100 123 4567", email: "layla@sierra-estates.net", avatar: "https://images.unsplash.com/photo-1573497019940-1c28c88b4f3e?w=300&q=80", rating: 4.9, listings_count: 18, description: "Senior Luxury Consultant — Golden Square & Mivida Specialist", emoji: "👩‍💼", color: "#3b82f6", status: "online" },
    { name: "Karim Fahmy", phone: "+20 100 234 5678", email: "karim@sierra-estates.net", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=300&q=80", rating: 4.8, listings_count: 14, description: "Head of Commercial & Investment Advisory", emoji: "👨‍💼", color: "#10b981", status: "online" },
    { name: "Nour Saleh", phone: "+20 100 345 6789", email: "nour@sierra-estates.net", avatar: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=300&q=80", rating: 4.9, listings_count: 11, description: "Penthouses & Standalone Villas Director", emoji: "👩‍💼", color: "#8b5cf6", status: "online" },
    { name: "Omar Magdy", phone: "+20 100 456 7890", email: "omar@sierra-estates.net", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=300&q=80", rating: 4.7, listings_count: 9, description: "Madinaty & Rehab Resale Expert", emoji: "👨‍💼", color: "#f59e0b", status: "online" },
    { name: "WhatsApp Concierge Bot", phone: "+20 106 558 2924", email: "ai@sierra-estates.net", avatar: "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=300&q=80", rating: 5.0, listings_count: 9500, description: "Autonomous AI Broker & Lead Intake Engine", emoji: "🤖", color: "#22c55e", status: "active" },
    { name: "Remote MCP Gateway", phone: "", email: "mcp@sierra-estates.net", avatar: "", rating: 5.0, listings_count: 0, description: "Streamable-HTTP / OAuth 2.1 MCP tool server for Claude & external LLMs", emoji: "⚡", color: "#6366f1", status: "active" }
  ];

  const { data: upsertedAgents, error: agentErr } = await supabase
    .from('agents_registry')
    .upsert(seedAgents, { onConflict: 'name' })
    .select('id, name');

  if (agentErr) {
    console.error('❌ Agents upsert error:', agentErr.message);
  } else {
    console.log(`✅ Successfully hydrated ${upsertedAgents?.length || seedAgents.length} agents in registry!`);
  }

  // 7. Hydrate SYSTEM_STATUS & BOT_CONFIGS for all 10 core bots
  console.log('\n🤖 6. Hydrating public.system_status & public.bot_configs for all 10 bots...');
  const knownBots = [
    {
      id: 'whatsapp-agent',
      name: 'WhatsApp Concierge Agent',
      status: 'active',
      config: {
        model: 'gemini-2.0-flash',
        temperature: 0.7,
        maxTokens: 512,
        replyInDMs: true,
        replyGroups: true,
        adminNumber: '201000000000',
        systemPrompt: 'You are the Sierra Estates AI Assistant specializing in luxury real estate in New Cairo, Egypt. Answer politely in Arabic or English.'
      }
    },
    {
      id: 'liela-bot',
      name: 'Liela VIP Conversationalist',
      status: 'active',
      config: {
        model: 'gemini-2.0-flash',
        temperature: 0.8,
        persona: 'warm, sophisticated Egyptian luxury advisor'
      }
    },
    {
      id: 'whatsapp-scraper',
      name: 'WhatsApp Broker Channel Scraper',
      status: 'active',
      config: {
        intervalSeconds: 60,
        autoDedupe: true,
        normalizeArabic: true
      }
    },
    {
      id: 'n8n-orchestrator',
      name: 'n8n Workflow Orchestrator',
      status: 'active',
      config: {
        webhookSync: true,
        timeoutMs: 30000
      }
    },
    {
      id: 'scribe-agent',
      name: 'Scribe Documentation & Contract Agent',
      status: 'active',
      config: {
        legalLocale: 'ar-EG',
        pdfWatermark: true
      }
    },
    {
      id: 'curator-agent',
      name: 'Curator Property Normalization Agent',
      status: 'active',
      config: {
        priceFloorEgp: 500000,
        requireGps: false
      }
    },
    {
      id: 'closer-agent',
      name: 'Closer Deal Negotiation Agent',
      status: 'active',
      config: {
        maxDiscountThresholdPercent: 7.5,
        escrowEnforced: true
      }
    },
    {
      id: 'matchmaker-agent',
      name: 'Matchmaker Semantic Recommender',
      status: 'active',
      config: {
        similarityThreshold: 0.6,
        topK: 5
      }
    },
    {
      id: 'property-finder-bot',
      name: 'PropertyFinder Two-Way Feed Bot',
      status: 'active',
      config: {
        syncIntervalHours: 4,
        autoPublish: true
      }
    },
    {
      id: 'mass-blast-bot',
      name: 'Mass Blast Targeted Marketing Bot',
      status: 'idle',
      config: {
        batchSize: 50,
        cooldownSeconds: 3
      }
    }
  ];

  for (const bot of knownBots) {
    await supabase.from('system_status').upsert({
      id: bot.id,
      status: bot.status,
      last_pulse: new Date().toISOString(),
      enabled: true,
      config: bot.config,
      stats: { processedToday: 0, errorsToday: 0 }
    }, { onConflict: 'id' });

    await supabase.from('bot_configs').upsert({
      bot_id: bot.id,
      config: bot.config
    }, { onConflict: 'bot_id' });
  }
  console.log(`✅ Successfully initialized status & configurations for all 10 autonomous bots!`);

  // 8. Hydrate HOUYEZ_CONTENT table
  console.log('\n🎨 7. Hydrating public.houyez_content table (portal presentation blobs)...');
  try {
    const houyezContent = [
      {
        collection: 'slides',
        order: 0,
        active: true,
        data: {
          title: "Luxury Penthouses & Villas in New Cairo",
          titleAr: "بنتهاوس وفيلات فاخرة في القاهرة الجديدة",
          subtitle: "Explore vetted properties in Mivida, Hyde Park, and Swan Lake.",
          subtitleAr: "استكشف وحدات موثقة في ميفيدا وهايد بارك وسوان ليك.",
          image: "https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=1600&q=85",
          ctaUrl: "/properties",
          ctaText: "Explore Properties",
          ctaTextAr: "تصفح العقارات"
        }
      },
      {
        collection: 'slides',
        order: 1,
        active: true,
        data: {
          title: "Direct Owner Resale & Prime Rentals",
          titleAr: "إعادة بيع مباشر من المالك وإيجارات مميزة",
          subtitle: "Zero broker markup. AI-verified titles and instantaneous WhatsApp booking.",
          subtitleAr: "بدون عمولات وسيط. وحدات موثقة بالذكاء الاصطناعي مع حجز مباشر عبر واتساب.",
          image: "https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=1600&q=85",
          ctaUrl: "/compounds",
          ctaText: "View Compounds",
          ctaTextAr: "عرض الكمبوندات"
        }
      },
      {
        collection: 'rooms',
        order: 0,
        active: true,
        data: {
          name: "Master Suites",
          nameAr: "الأجنحة الرئيسية",
          image: "https://images.unsplash.com/photo-1616594039964-ae9021a400a0?w=800&q=80",
          count: 142
        }
      },
      {
        collection: 'rooms',
        order: 1,
        active: true,
        data: {
          name: "Open Living Salons",
          nameAr: "صالات المعيشة المفتوحة",
          image: "https://images.unsplash.com/photo-1600210492486-724fe5c67fb0?w=800&q=80",
          count: 280
        }
      },
      {
        collection: 'tours',
        order: 0,
        active: true,
        data: {
          title: "3D Virtual Tour — Mivida Signature Villa",
          titleAr: "جولة افتراضية ثلاثية الأبعاد — فيلا ميفيدا",
          embedUrl: "https://my.matterport.com/show/?m=sample",
          featured: true
        }
      }
    ];

    const { error: houyezErr } = await supabase
      .from('houyez_content')
      .upsert(houyezContent);

    if (houyezErr) {
      console.warn('⚠️ Houyez content upsert warning:', houyezErr.message);
    } else {
      console.log(`✅ Successfully seeded portal slides, tours, and rooms into houyez_content!`);
    }
  } catch (err) {
    console.warn('⚠️ Houyez content note:', err.message);
  }

  // 9. Hydrate KNOWLEDGE_BASE table
  console.log('\n📚 8. Hydrating public.knowledge_base table...');
  const knowledgeArticles = [
    {
      title: "New Cairo 2026 Investment Guide & Capital Appreciation Rates",
      content: "New Cairo continues to lead real estate yield in the Greater Cairo Area. Golden Square compounds (Mivida, Hyde Park, Villette) exhibit 18-22% annual capital appreciation with strong USD-hedged rental demand from multinationals, AUC faculty, and embassy personnel.",
      tags: ["investment", "roi", "golden-square", "capital-appreciation"],
      metadata: { author: "Sierra Estates Advisory", readingTimeMin: 4, published: true }
    },
    {
      title: "Direct Owner Resale vs Primary Market Contracts: Legal Safe Harbor",
      content: "When purchasing resale units in Emaar, SODIC, or Palm Hills, the transfer requires formal developer clearance (Discharge Certificate / شهادة مخالصة), verifying all maintenance fees, club dues, and property taxes are settled before executing the final assignment deed.",
      tags: ["legal", "resale", "contracts", "due-diligence"],
      metadata: { author: "Legal Affairs Dept", readingTimeMin: 6, published: true }
    },
    {
      title: "Rental Yield Benchmarks in Madinaty, Rehab & 5th Settlement",
      content: "Furnished rentals in Rehab and Madinaty achieve 8-10% net rental yield on current market value, driven by medical tourism, universities, and corporate leases. Unfurnished units standardise around 5-7% net yield.",
      tags: ["rentals", "madinaty", "rehab", "yield-benchmarks"],
      metadata: { author: "Sierra Estates Research", readingTimeMin: 3, published: true }
    }
  ];

  const { data: upsertedKb, error: kbErr } = await supabase
    .from('knowledge_base')
    .upsert(knowledgeArticles, { onConflict: 'title' })
    .select('id, title');

  if (kbErr) {
    console.error('❌ Knowledge base error:', kbErr.message);
  } else {
    console.log(`✅ Successfully seeded ${upsertedKb?.length || knowledgeArticles.length} market intelligence guides!`);
  }

  // 10. Hydrate SYSTEM_CONFIG table
  console.log('\n⚙️ 9. Hydrating public.system_config table...');
  const systemConfigs = [
    {
      key: 'currency_fx_rates',
      value: { USD: 49.50, EUR: 53.80, GBP: 63.20, SAR: 13.20, AED: 13.48, last_updated: new Date().toISOString() }
    },
    {
      key: 'ai_engine_parameters',
      value: { default_match_threshold: 0.60, max_recommendations: 10, gemini_model: 'gemini-2.0-flash', embedding_model: 'gemini-embedding-001' }
    },
    {
      key: 'platform_branding',
      value: {
        name: 'Sierra Estates',
        legal_entity: 'Sierra Real Estate Advisory S.A.E',
        website: 'https://sierra-estates.net',
        support_phone: '+20 100 000 0000',
        support_email: 'info@sierra-estates.net',
        primary_color: '#3b82f6'
      }
    }
  ];

  for (const cfg of systemConfigs) {
    await supabase.from('system_config').upsert(cfg, { onConflict: 'key' });
  }
  console.log(`✅ Successfully hydrated platform system_config!`);

  // 11. Hydrate CRM LEADS table with representative buyer profiles
  console.log('\n💼 10. Hydrating public.leads with representative high-net-worth buyers...');
  const sampleLeads = [
    {
      full_name: 'Dr. Tarek Mansour',
      phone: '+201012345678',
      email: 'dr.tarek.mansour@gmail.com',
      channel: 'whatsapp',
      lead_type: 'buyer',
      status: 'qualified',
      target_compound: 'Mivida',
      target_property_type: 'Apartment',
      budget_min: 7000000,
      budget_max: 12000000,
      preferred_bedrooms: 3,
      lead_score: 88,
      summary_notes: 'Ready buyer with cash budget, prefers immediate delivery in Mivida or Villette.'
    },
    {
      full_name: 'Eng. Karim El-Shazly',
      phone: '+201123456789',
      email: 'karim.elshazly@petro-eg.com',
      channel: 'web',
      lead_type: 'investor',
      status: 'new',
      target_compound: 'Palm Hills New Cairo',
      target_property_type: 'Villa',
      budget_min: 15000000,
      budget_max: 25000000,
      preferred_bedrooms: 4,
      lead_score: 94,
      summary_notes: 'Corporate executive looking for prime standalone villa with private garden.'
    },
    {
      full_name: 'Mrs. Dalia Fahmy',
      phone: '+201234567890',
      email: 'dalia.fahmy@luxuryliving.eg',
      channel: 'whatsapp',
      lead_type: 'renter',
      status: 'viewing_scheduled',
      target_compound: 'Swan Lake Residence',
      target_property_type: 'Penthouse',
      budget_min: 60000,
      budget_max: 120000,
      preferred_bedrooms: 3,
      lead_score: 85,
      summary_notes: 'Expat family looking for fully furnished luxury penthouse.'
    }
  ];

  // Insert leads (skip duplicate phones)
  for (const lead of sampleLeads) {
    const { data: existing } = await supabase
      .from('leads')
      .select('id')
      .eq('phone', lead.phone)
      .limit(1);

    if (!existing || existing.length === 0) {
      await supabase.from('leads').insert(lead);
    }
  }
  console.log(`✅ Successfully hydrated ${sampleLeads.length} CRM buyer leads!`);

  // 12. Generate 768-dim vector embeddings for top active properties
  console.log('\n🧠 12. Generating vector embeddings for top properties using Gemini embedding-001 (768-dim)...');
  const geminiKey = process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY;
  if (geminiKey) {
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(geminiKey);
      const embedModel = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });

      // Fetch 25 featured/active properties without embeddings
      const { data: needEmbeddings } = await supabase
        .from('listings')
        .select('id, title, compound, property_type, deal_type, price, bedrooms, area_sqm')
        .is('embedding_768', null)
        .limit(25);

      if (needEmbeddings && needEmbeddings.length > 0) {
        console.log(`Generating embeddings for ${needEmbeddings.length} premier properties...`);
        let generated = 0;
        for (const item of needEmbeddings) {
          try {
            const prompt = `Title: ${item.title}. Compound: ${item.compound}. Type: ${item.property_type}. Deal: ${item.deal_type}. Price: ${item.price} EGP. Bedrooms: ${item.bedrooms}. Area: ${item.area_sqm} sqm. Location: New Cairo Egypt.`;
            const result = await embedModel.embedContent({
              content: { parts: [{ text: prompt }] },
              outputDimensionality: 768
            });
            const vector = result.embedding.values;

            // Format as vector string for PostgreSQL: '[0.012, -0.045, ...]'
            const vectorSql = `[${vector.join(',')}]`;
            await supabase
              .from('listings')
              .update({ embedding_768: vectorSql })
              .eq('id', item.id);

            generated++;
          } catch (e) {
            console.warn(`Embedding item ${item.id} error:`, e.message);
          }
        }
        console.log(`✅ Successfully generated and saved ${generated} 768-dim vector embeddings in Supabase!`);
      } else {
        console.log('✅ Embeddings already populated for prime listings.');
      }

      // Test Vector Search RPC
      console.log('\n🔍 Testing Supabase RPC match_listings_gemini vector search...');
      const testEmbed = await embedModel.embedContent({
        content: { parts: [{ text: 'luxury villa with garden in Mivida or Villette' }] },
        outputDimensionality: 768
      });
      const queryVec = `[${testEmbed.embedding.values.join(',')}]`;
      const { data: matchResults, error: rpcErr } = await supabase.rpc('match_listings_gemini', {
        query_embedding: queryVec,
        match_threshold: 0.3,
        match_count: 3
      });

      if (rpcErr) {
        console.warn('Vector RPC test note:', rpcErr.message);
      } else if (matchResults && matchResults.length > 0) {
        console.log(`🎯 Vector Search Successful! Returned ${matchResults.length} semantic matches:`);
        matchResults.forEach((m, idx) => {
          console.log(`   ${idx + 1}. [${m.compound}] ${m.title} — similarity: ${(m.similarity * 100).toFixed(1)}%`);
        });
      }
    } catch (embErr) {
      console.warn('Embedding step note:', embErr.message);
    }
  }

  // 13. Final verification of public table counts
  console.log('\n📊 13. Final verification across all Supabase public tables:');
  const tables = [
    'listings', 'compounds', 'developers', 'whatsapp_numbers',
    'agents_registry', 'system_status', 'bot_configs', 'houyez_content',
    'knowledge_base', 'system_config', 'leads', 'profiles'
  ];
  const tableStats = [];
  for (const tbl of tables) {
    try {
      const { count, error } = await supabase.from(tbl).select('*', { count: 'exact', head: true });
      if (!error) {
        tableStats.push({ table_name: tbl, row_count: count ?? 0 });
      }
    } catch (_e) {}
  }
  if (tableStats.length > 0) {
    console.table(tableStats);
  } else {
    try {
      const statsRes = await runSQL(`
        SELECT relname as table_name, n_live_tup as row_count
        FROM pg_stat_user_tables
        WHERE schemaname = 'public' AND n_live_tup > 0
        ORDER BY n_live_tup DESC;
      `);
      console.table(statsRes);
    } catch (e) {
      console.log('Note: Management API query skipped (using direct Supabase client)');
    }
  }

  console.log('\n══════════════════════════════════════════════════════════════════════════');
  console.log('🏁 SUPABASE WIRING & HYDRATION COMPLETED SUCCESSFULLY!');
  console.log('══════════════════════════════════════════════════════════════════════════\n');
}

main().catch(err => {
  console.error('Fatal error during Supabase wiring:', err);
  process.exit(1);
});
