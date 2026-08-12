#!/usr/bin/env node
/**
 * sierra estates FIRESTORE DATA SEEDING SCRIPT
 * Populates Firestore with sample properties, users, and leads for development/testing
 *
 * Usage: node scripts/seed-firestore.mjs
 *
 * Requirements:
 * - Firebase Admin SDK configured
 * - .env.local with Firebase credentials
 */

import admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';

// ══════════════════════════════════════════════════════════════════════════════
// SAMPLE DATA
// ══════════════════════════════════════════════════════════════════════════════

const SAMPLE_PROPERTIES = [
  {
    id: 'prop-001',
    title: 'Aurora Penthouse',
    titleAr: 'بنتهاوس أورورا',
    location: 'Madinaty',
    locationAr: 'مدينتي',
    compound: 'Madinaty',
    bedrooms: 4,
    bathrooms: 3,
    area: 320,
    price: 8500000,
    status: 'available',
    badge: 'Hidden Gem',
    badgeColor: '#7C3AED',
    furnished: 'furnished',
    finishingType: 'Fully Furnished',
    imageUrl: 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?w=700&q=80',
    description: 'Luxurious penthouse with panoramic city views and modern amenities',
    descriptionAr: 'بنتهاوس فاخر مع إطلالات بانورامية على المدينة ووسائل راحة حديثة',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'prop-002',
    title: 'Villa Lumière',
    titleAr: 'فيلا لوميير',
    location: 'Fifth Settlement',
    locationAr: 'التجمع الخامس',
    compound: 'Fifth Settlement',
    bedrooms: 5,
    bathrooms: 4,
    area: 480,
    price: 14200000,
    status: 'available',
    badge: 'Featured',
    badgeColor: '#C8961A',
    furnished: 'unfurnished',
    finishingType: 'Semi Furnished',
    imageUrl: 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?w=700&q=80',
    description: 'Elegant villa with premium golf course views in exclusive location',
    descriptionAr: 'فيلا أنيقة مع إطلالات ممتازة على ملاعب الجولف في موقع حصري',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'prop-003',
    title: 'The Boulevard',
    titleAr: 'ذا بوليفار',
    location: 'Mostakbal City',
    locationAr: 'مستقبل سيتي',
    compound: 'Mostakbal City',
    bedrooms: 3,
    bathrooms: 2,
    area: 185,
    price: 3800000,
    status: 'available',
    badge: 'New',
    badgeColor: '#1B6CA8',
    furnished: 'furnished',
    finishingType: 'Fully Furnished',
    imageUrl: 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=700&q=80',
    description: 'Modern apartment in vibrant community with excellent amenities',
    descriptionAr: 'شقة حديثة في مجتمع نابض بالحياة مع وسائل راحة ممتازة',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'prop-004',
    title: 'Emirates Crown',
    titleAr: 'إيمارتس كراون',
    location: 'Fifth Settlement',
    locationAr: 'التجمع الخامس',
    compound: 'Fifth Settlement',
    bedrooms: 6,
    bathrooms: 5,
    area: 650,
    price: 22000000,
    status: 'reserved',
    badge: 'Off Market',
    badgeColor: '#059669',
    furnished: 'unfurnished',
    finishingType: 'Shell & Core',
    imageUrl: 'https://images.unsplash.com/photo-1512917774080-9991f1c4c750?w=700&q=80',
    description: 'Ultra-premium villa with smart home integration and private pool',
    descriptionAr: 'فيلا فائقة الفخامة مع تكامل المنزل الذكي وحمام سباحة خاص',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'prop-005',
    title: 'Palm Residences',
    titleAr: 'بالم ريزيدنسز',
    location: 'Madinaty',
    locationAr: 'مدينتي',
    compound: 'Madinaty',
    bedrooms: 3,
    bathrooms: 3,
    area: 240,
    price: 5900000,
    status: 'available',
    badge: 'High ROI',
    badgeColor: '#DC2626',
    furnished: 'furnished',
    finishingType: 'Fully Furnished',
    imageUrl: 'https://images.unsplash.com/photo-1570129477492-45c003edd2be?w=700&q=80',
    description: 'Investment property with strong rental yield potential',
    descriptionAr: 'عقار استثماري بإمكانية عائد إيجاري قوي',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

const SAMPLE_LEADS = [
  {
    id: 'lead-001',
    name: 'Marcus Chen',
    email: 'marcus@example.com',
    phone: '+201001234567',
    source: 'property-finder',
    stage: 'inbound',
    phase: 'qualify',
    originChannel: 'website',
    status: 'active',
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: 'lead-002',
    name: 'Layla Hassan',
    email: 'layla@example.com',
    phone: '+201101234567',
    source: 'whatsapp',
    stage: 'engage',
    phase: 'proposal',
    originChannel: 'telegram',
    status: 'active',
    createdAt: new Date(Date.now() - 86400000),
    updatedAt: new Date(Date.now() - 86400000),
  },
  {
    id: 'lead-003',
    name: 'Omar Mansour',
    email: 'omar@example.com',
    phone: '+201201234567',
    source: 'referral',
    stage: 'viewing',
    phase: 'viewing',
    originChannel: 'referral',
    status: 'active',
    createdAt: new Date(Date.now() - 172800000),
    updatedAt: new Date(Date.now() - 172800000),
  },
];

const SAMPLE_USERS = [
  {
    uid: 'user-ceo-001',
    email: 'ahmed.fawzy@sierra-estates.net',
    displayName: 'Ahmed Fawzy',
    role: 'admin',
    title: 'Chief Executive Officer & Sales Manager',
    photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=AhmedFawzy',
    createdAt: new Date(),
  },
  {
    uid: 'user-teamlead-002',
    email: 'farida@sierra-estates.net',
    displayName: 'Farida',
    role: 'manager',
    title: 'Sales Team Leader & HR Manager',
    photoURL: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Farida',
    createdAt: new Date(),
  },
];

// ══════════════════════════════════════════════════════════════════════════════
// INITIALIZATION & SEEDING FUNCTIONS
// ══════════════════════════════════════════════════════════════════════════════

async function initializeFirebase() {
  try {
    // Try to initialize with service account if available
    const serviceAccountPath = path.join(process.cwd(), 'firebase-service-account.json');

    if (fs.existsSync(serviceAccountPath)) {
      const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
      console.log('✅ Firebase initialized with service account');
    } else {
      console.log('⚠️  Service account file not found at:', serviceAccountPath);
      console.log('📝 To use this script for production seeding, create firebase-service-account.json');
      console.log('   For development, use the Firebase Emulator Suite instead.');
      process.exit(1);
    }
  } catch (error) {
    console.error('❌ Firebase initialization failed:', error.message);
    process.exit(1);
  }
}

async function seedProperties(db) {
  console.log('\n📦 Seeding Properties...');

  try {
    const realJsonPath = path.join(process.cwd(), 'data/real-listings.json');
    let propertiesToSeed = SAMPLE_PROPERTIES;
    if (fs.existsSync(realJsonPath)) {
      const realData = JSON.parse(fs.readFileSync(realJsonPath, 'utf8'));
      propertiesToSeed = realData.map(item => ({
        id: item.code || `prop-${item.id}`,
        title: `${item.type} in ${item.compound}`,
        location: item.zone || item.compound,
        compound: item.compound,
        bedrooms: item.beds || 3,
        bathrooms: item.baths || 2,
        area: item.area || 150,
        price: item.price || 0,
        status: item.status?.toLowerCase() || 'available',
        badge: item.tag || 'Verified Owner',
        badgeColor: '#C8961A',
        furnished: item.finishing || 'Fully Furnished',
        finishingType: item.finishing || 'Fully Furnished',
        imageUrl: item.img,
        description: item.comment || `${item.type} in ${item.compound} for ${item.mode}`,
        createdAt: new Date(),
        updatedAt: new Date(),
      }));
      console.log(`📡 Loaded ${propertiesToSeed.length} live real properties from real-listings.json`);
    }

    for (const prop of propertiesToSeed) {
      const docRef = db.collection('properties').doc(prop.id);
      await docRef.set(prop);
      console.log(`   ✅ Created property: ${prop.title} [${prop.id}]`);
    }
    console.log(`\n✅ Successfully seeded ${propertiesToSeed.length} properties to Firestore`);
  } catch (error) {
    console.error('❌ Error seeding properties:', error.message);
    throw error;
  }
}

async function seedLeads(db) {
  console.log('\n👥 Seeding Leads...');

  try {
    for (const lead of SAMPLE_LEADS) {
      const docRef = db.collection('leads').doc(lead.id);
      await docRef.set(lead);
      console.log(`   ✅ Created lead: ${lead.name}`);
    }
    console.log(`\n✅ Successfully seeded ${SAMPLE_LEADS.length} leads`);
  } catch (error) {
    console.error('❌ Error seeding leads:', error.message);
    throw error;
  }
}

async function seedUsers(db) {
  console.log('\n👤 Seeding Users...');

  try {
    for (const user of SAMPLE_USERS) {
      const docRef = db.collection('users').doc(user.uid);
      await docRef.set(user);
      console.log(`   ✅ Created user: ${user.displayName} (${user.role})`);
    }
    console.log(`\n✅ Successfully seeded ${SAMPLE_USERS.length} users`);
  } catch (error) {
    console.error('❌ Error seeding users:', error.message);
    throw error;
  }
}

async function main() {
  console.log('🌱 Sierra Estates Firestore Data Seeding Script\n');
  console.log('═══════════════════════════════════════════\n');

  try {
    // Initialize Firebase
    initializeFirebase();
    const db = admin.firestore();

    // Verify connection
    console.log('🔗 Verifying Firestore connection...');
    await db.collection('_health').doc('check').set({ timestamp: new Date() });
    console.log('✅ Firestore connection verified\n');

    // Seed data
    await seedProperties(db);
    await seedLeads(db);
    await seedUsers(db);

    // Summary
    console.log('\n═══════════════════════════════════════════');
    console.log('✅ DATA SEEDING COMPLETED SUCCESSFULLY!\n');
    console.log('📊 Summary:');
    console.log(`   - Properties: ${SAMPLE_PROPERTIES.length}`);
    console.log(`   - Leads: ${SAMPLE_LEADS.length}`);
    console.log(`   - Users: ${SAMPLE_USERS.length}`);
    console.log('\n💡 Next steps:');
    console.log('   1. Visit http://localhost:3000');
    console.log('   2. Properties should now appear in listings');
    console.log('   3. Admin dashboard will show leads and deals');
    console.log('   4. Use test user credentials to log in\n');

    process.exit(0);
  } catch (error) {
    console.error('\n❌ SEEDING FAILED:', error.message);
    process.exit(1);
  }
}

// Run seeding
main();
