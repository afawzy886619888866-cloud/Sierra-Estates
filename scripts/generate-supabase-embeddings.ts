/**
 * Sierra Estates — Vector Embeddings Generator for Supabase
 *
 * Uses Gemini gemini-embedding-001 (with outputDimensionality: 768) to create
 * high-precision semantic embeddings for all property listings in Supabase.
 *
 * Usage:
 *   pnpm embeddings:generate
 *   pnpm embeddings:generate -- --batch=200
 *   pnpm embeddings:generate -- --continuous
 *   pnpm embeddings:generate -- --dry-run   # capability pre-flight, zero writes
 */
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../apps/sierra-estates-realty/.env.local') });
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gaxfqcietzoonlmatiot.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const GEMINI_KEY = process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY || '';

const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');

if (isDryRun) {
    // Capability pre-flight — reports exactly what is armed and what blocks
    // a live run (§21: honest gaps, zero network calls, zero writes).
    console.log('═══════════════════════════════════════════════════════════════════════');
    console.log('  EMBEDDINGS GENERATOR — DRY-RUN CAPABILITY CHECK');
    console.log('═══════════════════════════════════════════════════════════════════════');
    console.log(`  Supabase URL:        ${SUPABASE_URL}`);
    console.log(`  SUPABASE_SERVICE_ROLE_KEY: ${SUPABASE_KEY ? '✓ present' : '✗ MISSING — add in GitHub Secrets / Cloudflare Workers (deploy-cloudflare.yml)'}`);
    console.log(`  GOOGLE_GENAI_API_KEY:      ${GEMINI_KEY ? '✓ present' : '✗ MISSING — add in GitHub Secrets / Cloudflare Workers (deploy-cloudflare.yml)'}`);
    console.log(`  Model:               gemini-embedding-001 (768 dimensions)`);
    console.log('');
    if (!SUPABASE_KEY || !GEMINI_KEY) {
        console.log('  Result: NOT READY — add the missing secret(s), redeploy, re-run this dry-run, then:');
        console.log('          pnpm embeddings:generate -- --continuous');
        process.exit(1);
    }
    console.log('  Result: READY — run `pnpm embeddings:generate -- --continuous` to embed every pending listing.');
    process.exit(0);
}

if (!SUPABASE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY missing in environment');
    console.error('   Add it in GitHub Secrets / Cloudflare Workers (deploy-cloudflare.yml), or export it locally.');
    process.exit(1);
}

if (!GEMINI_KEY) {
    console.error('❌ GOOGLE_GENAI_API_KEY missing in environment');
    console.error('   Add it in GitHub Secrets / Cloudflare Workers (deploy-cloudflare.yml), or export it locally.');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false }
});

const genAI = new GoogleGenerativeAI(GEMINI_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-embedding-001' });

// Parse command line arguments
const batchArg = args.find(a => a.startsWith('--batch='));
const delayArg = args.find(a => a.startsWith('--delay='));
const compoundArg = args.find(a => a.startsWith('--compound='));
const isContinuous = args.includes('--continuous');
const skipFlagshipPriority = args.includes('--all-order');

const BATCH_SIZE = batchArg ? parseInt(batchArg.split('=')[1], 10) : 100;
const PACING_DELAY_MS = delayArg ? parseInt(delayArg.split('=')[1], 10) : 120;
const TARGET_COMPOUND = compoundArg ? compoundArg.split('=')[1].trim() : '';

const FLAGSHIP_COMPOUNDS = [
    'Hyde Park',
    'Mivida',
    'Mountain View',
    'Uptown Cairo',
    'Eastown',
    'Villette',
    'Palm Hills',
    'Taj City',
    'Madinaty',
    'Al Rehab',
];

const COMPOUND_AR_ALIASES: Array<[RegExp, string]> = [
    [/hyde\s*park/i, 'هايد بارك القاهرة الجديدة'],
    [/mivida/i, 'ميفيدا التجمع الخامس إعمار'],
    [/mountain\s*view/i, 'ماونتن فيو أي سيتي القاهرة الجديدة'],
    [/uptown/i, 'أب تاون كايرو المقطم'],
    [/eastown/i, 'إيستاون سوديك التجمع الخامس'],
    [/villette/i, 'فيليت سوديك القاهرة الجديدة'],
    [/palm\s*hills/i, 'بالم هيلز التجمع'],
    [/taj\s*city/i, 'تاج سيتي القاهرة الجديدة'],
    [/madinaty/i, 'مدينتي'],
    [/rehab/i, 'الرحاب القاهرة الجديدة'],
];

function buildBilingualContextText(listing: any): string {
    const comp = String(listing.compound || '').trim();
    const deal = String(listing.deal_type || '').toLowerCase();
    const ptype = String(listing.property_type || '').toLowerCase();

    const arComp = COMPOUND_AR_ALIASES
        .filter(([re]) => re.test(comp))
        .map(([, ar]) => ar)
        .join(' / ');

    const arDeal = deal.includes('rent') ? 'للإيجار إيجار شهري' : deal.includes('sale') || deal.includes('resale') ? 'للبيع إعادة بيع تمليك' : '';
    const arType =
        ptype.includes('apartment') ? 'شقة سكنية' :
        ptype.includes('standalone') ? 'فيلا مستقلة ستاند الون' :
        ptype.includes('villa') ? 'فيلا' :
        ptype.includes('town') ? 'تاون هاوس' :
        ptype.includes('twin') ? 'توين هاوس' :
        ptype.includes('penthouse') ? 'بنتهاوس روف' :
        ptype.includes('duplex') ? 'دوبلكس' : '';

    return [
        listing.title ? `Title: ${listing.title}` : null,
        comp ? `Compound: ${comp}${arComp ? ` / ${arComp}` : ''}` : null,
        listing.property_type ? `Type: ${listing.property_type}${arType ? ` / ${arType}` : ''}` : null,
        listing.deal_type ? `Deal: ${listing.deal_type}${arDeal ? ` / ${arDeal}` : ''}` : null,
        `Price: ${listing.price ? Number(listing.price).toLocaleString() + ' EGP' : 'Price on request'}`,
        listing.bedrooms ? `Bedrooms: ${listing.bedrooms} (${listing.bedrooms} غرف)` : null,
        listing.area_sqm ? `Area: ${listing.area_sqm} sqm (${listing.area_sqm} متر)` : null,
        listing.finishing_type ? `Finishing: ${listing.finishing_type}` : null,
        listing.description ? `Description: ${listing.description}` : null,
    ].filter(Boolean).join(' | ');
}

function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function embedWithRetry(contextText: string, maxRetries = 4): Promise<number[]> {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            const result = await model.embedContent({
                content: { role: 'user', parts: [{ text: contextText }] },
                outputDimensionality: 768,
            } as any);
            return Array.from(result.embedding.values);
        } catch (err: any) {
            const isRateLimit = err?.message?.includes('429') || err?.message?.includes('quota');
            if (isRateLimit && attempt < maxRetries) {
                const backoff = attempt * 2000;
                console.warn(`\n⏳ Rate limit encountered (429). Retrying in ${backoff / 1000}s...`);
                await sleep(backoff);
                continue;
            }
            if (attempt === maxRetries) throw err;
            await sleep(attempt * 1000);
        }
    }
    throw new Error('Failed to embed content after maximum retries');
}

async function processBatch(batchSize: number): Promise<number> {
    // 1. Check counts
    const { count: pendingCount, error: countErr } = await supabase
        .from('listings')
        .select('*', { count: 'exact', head: true })
        .is('embedding_768', null);

    if (countErr) {
        console.error('❌ Error checking pending count:', countErr.message);
        return 0;
    }

    if (!pendingCount || pendingCount === 0) {
        console.log('\n🎉 All catalog listings already have 768-dim vector embeddings!');
        return 0;
    }

    console.log(`\n📦 Pending catalog listings: ${pendingCount.toLocaleString()}`);
    console.log(`🚀 Fetching next batch of up to ${batchSize} listings...`);

    let listings: any[] = [];
    if (TARGET_COMPOUND) {
        const { data, error } = await supabase
            .from('listings')
            .select('id, ref_id, title, compound, property_type, deal_type, price, bedrooms, bathrooms, area_sqm, finishing_type, description')
            .is('embedding_768', null)
            .ilike('compound', `%${TARGET_COMPOUND}%`)
            .limit(batchSize);
        if (error) console.error('❌ Error fetching compound listings:', error.message);
        listings = data || [];
    } else {
        if (!skipFlagshipPriority) {
            const perCompound = Math.max(5, Math.ceil(batchSize / FLAGSHIP_COMPOUNDS.length));
            for (const comp of FLAGSHIP_COMPOUNDS) {
                if (listings.length >= batchSize) break;
                const { data } = await supabase
                    .from('listings')
                    .select('id, ref_id, title, compound, property_type, deal_type, price, bedrooms, bathrooms, area_sqm, finishing_type, description')
                    .is('embedding_768', null)
                    .eq('publish_status', 'PUBLISHABLE')
                    .ilike('compound', `%${comp}%`)
                    .limit(Math.min(perCompound, batchSize - listings.length));
                if (data?.length) listings.push(...data);
            }
        }
        if (listings.length < batchSize) {
            const remaining = batchSize - listings.length;
            const { data, error } = await supabase
                .from('listings')
                .select('id, ref_id, title, compound, property_type, deal_type, price, bedrooms, bathrooms, area_sqm, finishing_type, description')
                .is('embedding_768', null)
                .order('compound', { ascending: true, nullsFirst: false })
                .limit(remaining);
            if (error) console.error('❌ Error fetching listings:', error.message);
            if (data?.length) listings.push(...data);
        }
    }

    if (listings.length === 0) {
        return 0;
    }

    console.log(`📊 Processing ${listings.length} listings with Gemini embedding-001 (768-dim)...`);
    let batchSuccess = 0;

    for (let i = 0; i < listings.length; i++) {
        const listing = listings[i];
        try {
            // §21 no-fabrication: strictly factual fields + bilingual synonyms of actual values
            const contextText = buildBilingualContextText(listing);

            const embedding = await embedWithRetry(contextText);

            const { error: updateErr } = await supabase
                .from('listings')
                .update({ embedding_768: `[${embedding.join(',')}]` })
                .eq('id', listing.id);

            if (!updateErr) {
                batchSuccess++;
                const percent = Math.round(((i + 1) / listings.length) * 100);
                process.stdout.write(`\r[${i + 1}/${listings.length}] (${percent}%) - ${listing.compound || listing.ref_id || listing.id}: ${listing.title?.slice(0, 35)}...`);
            }

            // Pacing delay to avoid burst rate limits
            if (PACING_DELAY_MS > 0) {
                await sleep(PACING_DELAY_MS);
            }
        } catch (e: any) {
            console.warn(`\n⚠️ Failed for ${listing.ref_id || listing.id}:`, e.message);
        }
    }

    console.log(`\n✅ Completed batch: ${batchSuccess} / ${listings.length} embeddings generated and saved to Supabase.`);
    return batchSuccess;
}

async function main() {
    console.log('═══════════════════════════════════════════════════════════════════════');
    console.log('  SIERRA ESTATES — GEMINI 768-DIM VECTOR EMBEDDING GENERATOR');
    console.log('═══════════════════════════════════════════════════════════════════════');
    console.log(`- Supabase URL: ${SUPABASE_URL}`);
    console.log(`- Model: gemini-embedding-001 (768 dimensions)`);
    console.log(`- Batch Size: ${BATCH_SIZE}`);
    console.log(`- Pacing Delay: ${PACING_DELAY_MS}ms`);
    console.log(`- Mode: ${isContinuous ? 'Continuous (Loop until finished)' : 'Single Batch'}`);

    if (isContinuous) {
        let totalEmbedded = 0;
        let round = 1;
        while (true) {
            console.log(`\n--- Cycle #${round} ---`);
            const processed = await processBatch(BATCH_SIZE);
            if (processed === 0) break;
            totalEmbedded += processed;
            round++;
            await sleep(1000);
        }
        console.log(`\n🎉 Continuous execution complete! Total new embeddings generated: ${totalEmbedded.toLocaleString()}`);
    } else {
        await processBatch(BATCH_SIZE);
    }
}

main().catch(err => {
    console.error('Fatal error in embeddings generator:', err);
});
