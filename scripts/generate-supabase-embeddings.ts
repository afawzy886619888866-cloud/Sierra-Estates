/**
 * Sierra Estates — Vector Embeddings Generator for Supabase
 *
 * Uses Gemini text-embedding-004 to create 768-dimensional semantic
 * embeddings for all properties in the Supabase database.
 */
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';
import * as path from 'path';
import * as dotenv from 'dotenv';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env.local') });
dotenv.config();

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://REDACTED-PROJECT.supabase.co';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const GEMINI_KEY = process.env.GOOGLE_GENAI_API_KEY || process.env.GEMINI_API_KEY || '';

if (!SUPABASE_KEY) {
    console.error('❌ SUPABASE_SERVICE_ROLE_KEY missing in .env.local');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const genAI = new GoogleGenerativeAI(GEMINI_KEY);

async function generateEmbeddings() {
    console.log('🧠 Starting AI Vector Embedding Generation for Supabase Listings...');

    // Fetch listings that don't have embeddings yet
    const { data: listings, error } = await supabase
        .from('listings')
        .select('id, ref_id, title, compound, property_type, deal_type, price, bedrooms, bathrooms, area_sqm, finishing_type, description')
        .is('embedding_768', null)
        .limit(100);

    if (error) {
        console.error('❌ Error fetching listings:', error.message);
        return;
    }

    if (!listings || listings.length === 0) {
        console.log('✅ All listings already have embeddings generated!');
        return;
    }

    console.log(`📊 Processing ${listings.length} listings with Gemini text-embedding-004...`);

    const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
    let successCount = 0;

    for (const listing of listings) {
        try {
            const contextText = [
                `Title: ${listing.title}`,
                `Compound: ${listing.compound}`,
                `Type: ${listing.property_type}`,
                `Deal: ${listing.deal_type}`,
                `Price: ${listing.price} EGP`,
                `Bedrooms: ${listing.bedrooms}`,
                `Area: ${listing.area_sqm} sqm`,
                `Finishing: ${listing.finishing_type || 'Finished'}`,
                `Description: ${listing.description || ''}`,
            ].join(' | ');

            const embeddingResult = await model.embedContent(contextText);
            const embedding = Array.from(embeddingResult.embedding.values);

            const { error: updateErr } = await supabase
                .from('listings')
                .update({ embedding_768: embedding })
                .eq('id', listing.id);

            if (!updateErr) {
                successCount++;
                process.stdout.write('.');
            }
        } catch (e: any) {
            console.warn(`\n⚠️ Failed for ${listing.ref_id}:`, e.message);
        }
    }

    console.log(`\n🎉 Successfully generated embeddings for ${successCount} listings!`);
}

generateEmbeddings().catch(err => {
    console.error('Fatal error in embeddings generation:', err);
});
