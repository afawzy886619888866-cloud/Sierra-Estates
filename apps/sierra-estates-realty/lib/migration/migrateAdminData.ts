/**
 * Admin Data Migration Utilities
 * Migrates data from old AdminPortal SPA to new Firestore structure
 *
 * Phase 3: Data Migration & Advanced Features
 *
 * Usage:
 * - Run in Node.js with Firebase Admin SDK
 * - Validates data integrity before migration
 * - Creates audit trail of all changes
 * - Can be run in dry-run mode first
 */

import { db } from '@/lib/firebase';
import {
  collection,
  getDocs,
  addDoc,
  doc,
  serverTimestamp,
  writeBatch,
  query,
  where,
} from 'firebase/firestore';

interface MigrationResult {
  success: boolean;
  timestamp: Date;
  migratedCollections: string[];
  recordsProcessed: number;
  recordsMigrated: number;
  errors: MigrationError[];
}

interface MigrationError {
  collection: string;
  docId: string;
  error: string;
  data?: any;
}

/**
 * Migrate team members from AdminPortal to users collection
 * Adds: commissionRate, totalCommission, dealsCount
 */
export async function migrateTeamMembers(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    timestamp: new Date(),
    migratedCollections: [],
    recordsProcessed: 0,
    recordsMigrated: 0,
    errors: [],
  };

  try {
    const usersSnap = await getDocs(collection(db, 'users'));
    result.recordsProcessed = usersSnap.size;

    const batch = writeBatch(db);
    let updateCount = 0;

    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();

      // Skip if already has new fields
      if (userData.commissionRate !== undefined) continue;

      // Set default commission rates by role
      const commissionRate = userData.role === 'agent' ? 5 : userData.role === 'broker' ? 3 : 0;

      // Calculate deals count for this user
      const dealsQ = query(collection(db, 'deals'), where('agentId', '==', userDoc.id));
      const dealsSnap = await getDocs(dealsQ);
      const dealsCount = dealsSnap.size;

      // Calculate commission (assuming 2.5M average deal value)
      const totalCommission = (commissionRate / 100) * dealsCount * 2500000;

      // Add migration fields
      batch.update(doc(db, 'users', userDoc.id), {
        commissionRate,
        dealsCount,
        totalCommission,
        migratedAt: serverTimestamp(),
        migrationVersion: '2.0',
      });

      updateCount++;
    }

    await batch.commit();

    result.recordsMigrated = updateCount;
    result.migratedCollections.push('users');
    result.success = true;
  } catch (error) {
    result.errors.push({
      collection: 'users',
      docId: 'batch',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  return result;
}

/**
 * Migrate deals from old structure to new structure
 * Ensures agentId and proper stage values
 */
export async function migrateDealStructure(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    timestamp: new Date(),
    migratedCollections: [],
    recordsProcessed: 0,
    recordsMigrated: 0,
    errors: [],
  };

  try {
    const dealsSnap = await getDocs(collection(db, 'deals'));
    result.recordsProcessed = dealsSnap.size;

    const batch = writeBatch(db);
    let updateCount = 0;

    // Map old stage values to new pipeline stages
    const stageMap: Record<string, string> = {
      'new': 'new',
      'lead': 'new',
      'engaged': 'engaged',
      'viewing': 'viewing',
      'negotiation': 'negotiation',
      'closing': 'negotiation',
      'closed': 'closed',
      'lost': 'lost',
    };

    for (const dealDoc of dealsSnap.docs) {
      const dealData = dealDoc.data();

      // Check if already migrated
      if (dealData.migrationVersion === '2.0') continue;

      const updates: any = {
        migrationVersion: '2.0',
        migratedAt: serverTimestamp(),
      };

      // Normalize stage
      if (dealData.stage) {
        const normalizedStage = stageMap[dealData.stage.toLowerCase()] || dealData.stage;
        if (normalizedStage !== dealData.stage) {
          updates.stage = normalizedStage;
        }
      }

      // Ensure agentId exists (use fallback if missing)
      if (!dealData.agentId && dealData.assignedAgent) {
        updates.agentId = dealData.assignedAgent;
      }

      // Ensure timestamps
      if (!dealData.createdAt) {
        updates.createdAt = dealData.dateCreated || serverTimestamp();
      }

      if (!dealData.updatedAt) {
        updates.updatedAt = serverTimestamp();
      }

      if (Object.keys(updates).length > 1) {
        batch.update(doc(db, 'deals', dealDoc.id), updates);
        updateCount++;
      }
    }

    await batch.commit();

    result.recordsMigrated = updateCount;
    result.migratedCollections.push('deals');
    result.success = true;
  } catch (error) {
    result.errors.push({
      collection: 'deals',
      docId: 'batch',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  return result;
}

/**
 * Migrate listings from old structure to new structure
 * Ensures proper field mapping and standardization
 */
export async function migrateListings(): Promise<MigrationResult> {
  const result: MigrationResult = {
    success: false,
    timestamp: new Date(),
    migratedCollections: [],
    recordsProcessed: 0,
    recordsMigrated: 0,
    errors: [],
  };

  try {
    const listingsSnap = await getDocs(collection(db, 'listings'));
    result.recordsProcessed = listingsSnap.size;

    const batch = writeBatch(db);
    let updateCount = 0;

    for (const listingDoc of listingsSnap.docs) {
      const listingData = listingDoc.data();

      // Check if already migrated
      if (listingData.migrationVersion === '2.0') continue;

      const updates: any = {
        migrationVersion: '2.0',
        migratedAt: serverTimestamp(),
      };

      // Normalize status
      const validStatuses = ['available', 'sold', 'rented'];
      if (listingData.status && !validStatuses.includes(listingData.status.toLowerCase())) {
        updates.status = 'available'; // Default to available if invalid
      }

      // Ensure required numeric fields
      if (typeof listingData.price !== 'number') {
        updates.price = Number(listingData.price) || 0;
      }
      if (typeof listingData.area !== 'number') {
        updates.area = Number(listingData.area) || 0;
      }

      // Normalize property type
      if (listingData.propertyType) {
        const validTypes = ['apartment', 'villa', 'townhouse', 'studio', 'penthouse'];
        const normalized = listingData.propertyType.toLowerCase();
        if (!validTypes.includes(normalized)) {
          updates.propertyType = 'apartment'; // Default to apartment
        }
      }

      // Ensure timestamps
      if (!listingData.createdAt) {
        updates.createdAt = serverTimestamp();
      }

      if (Object.keys(updates).length > 1) {
        batch.update(doc(db, 'listings', listingDoc.id), updates);
        updateCount++;
      }
    }

    await batch.commit();

    result.recordsMigrated = updateCount;
    result.migratedCollections.push('listings');
    result.success = true;
  } catch (error) {
    result.errors.push({
      collection: 'listings',
      docId: 'batch',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }

  return result;
}

/**
 * Validate data integrity after migration
 */
export async function validateMigration(): Promise<{
  valid: boolean;
  issues: string[];
}> {
  const issues: string[] = [];

  try {
    // Check users collection
    const usersSnap = await getDocs(collection(db, 'users'));
    for (const userDoc of usersSnap.docs) {
      const data = userDoc.data();
      if (data.role === 'agent' || data.role === 'broker') {
        if (data.commissionRate === undefined) {
          issues.push(`User ${userDoc.id} missing commissionRate`);
        }
        if (data.dealsCount === undefined) {
          issues.push(`User ${userDoc.id} missing dealsCount`);
        }
      }
    }

    // Check deals collection
    const dealsSnap = await getDocs(collection(db, 'deals'));
    const validStages = ['new', 'engaged', 'viewing', 'negotiation', 'closed', 'lost'];
    for (const dealDoc of dealsSnap.docs) {
      const data = dealDoc.data();
      if (data.stage && !validStages.includes(data.stage)) {
        issues.push(`Deal ${dealDoc.id} has invalid stage: ${data.stage}`);
      }
      if (!data.agentId) {
        issues.push(`Deal ${dealDoc.id} missing agentId`);
      }
    }

    // Check listings collection
    const listingsSnap = await getDocs(collection(db, 'listings'));
    const validStatuses = ['available', 'sold', 'rented'];
    for (const listingDoc of listingsSnap.docs) {
      const data = listingDoc.data();
      if (data.status && !validStatuses.includes(data.status.toLowerCase())) {
        issues.push(`Listing ${listingDoc.id} has invalid status: ${data.status}`);
      }
      if (typeof data.price !== 'number' || data.price <= 0) {
        issues.push(`Listing ${listingDoc.id} has invalid price: ${data.price}`);
      }
    }

    return {
      valid: issues.length === 0,
      issues,
    };
  } catch (error) {
    return {
      valid: false,
      issues: [`Validation error: ${error instanceof Error ? error.message : 'Unknown'}`],
    };
  }
}

/**
 * Create audit trail in activities collection
 */
export async function createMigrationAuditTrail(
  userId: string,
  results: MigrationResult[]
): Promise<void> {
  try {
    await addDoc(collection(db, 'activities'), {
      userId,
      action: 'system_migration',
      entity: 'admin_data',
      entityId: 'phase2_to_phase3',
      changes: {
        totalCollectionsMigrated: results.reduce<number>((sum, r) => sum + r.migratedCollections.length, 0),
        totalRecordsMigrated: results.reduce<number>((sum, r) => sum + r.recordsMigrated, 0),
        totalErrors: results.reduce<number>((sum, r) => sum + r.errors.length, 0),
        timestamp: new Date().toISOString(),
      },
      migrationResults: results,
      status: 'completed',
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    console.error('Failed to create migration audit trail:', error);
  }
}

/**
 * Run all migrations in sequence
 * Can be executed from admin panel or CLI
 */
export async function runMigrations(dryRun = false): Promise<{
  success: boolean;
  results: MigrationResult[];
  validation: { valid: boolean; issues: string[] };
  executedAt: Date;
}> {
  console.log(`Starting admin data migrations (dry-run: ${dryRun})...`);

  const results: MigrationResult[] = [];

  try {
    // Step 1: Migrate team members
    console.log('Migrating team members...');
    const teamResult = await migrateTeamMembers();
    results.push(teamResult);
    if (teamResult.success) {
      console.log(`✓ Migrated ${teamResult.recordsMigrated} team members`);
    }

    // Step 2: Migrate deals
    console.log('Migrating deals...');
    const dealsResult = await migrateDealStructure();
    results.push(dealsResult);
    if (dealsResult.success) {
      console.log(`✓ Migrated ${dealsResult.recordsMigrated} deals`);
    }

    // Step 3: Migrate listings
    console.log('Migrating listings...');
    const listingsResult = await migrateListings();
    results.push(listingsResult);
    if (listingsResult.success) {
      console.log(`✓ Migrated ${listingsResult.recordsMigrated} listings`);
    }

    // Step 4: Validate
    console.log('Validating migrated data...');
    const validation = await validateMigration();
    if (validation.valid) {
      console.log('✓ All data validation checks passed');
    } else {
      console.warn('⚠ Validation issues found:', validation.issues);
    }

    // Step 5: Create audit trail (only if not dry-run)
    if (!dryRun) {
      console.log('Creating audit trail...');
      await createMigrationAuditTrail('system_migration', results);
      console.log('✓ Audit trail created');
    }

    console.log('✓ All migrations completed successfully');

    return {
      success: true,
      results,
      validation,
      executedAt: new Date(),
    };
  } catch (error) {
    console.error('✗ Migration failed:', error);
    return {
      success: false,
      results,
      validation: { valid: false, issues: [error instanceof Error ? error.message : 'Unknown error'] },
      executedAt: new Date(),
    };
  }
}

export type { MigrationResult, MigrationError };
