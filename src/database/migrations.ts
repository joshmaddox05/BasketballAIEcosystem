/**
 * Firebase Database Migrations and Initialization
 * 
 * This module handles database schema migrations, seeding, and initialization
 * for the Basketball AI Ecosystem Firebase/Firestore database.
 */

import { 
  getFirestore, 
  collection, 
  doc, 
  writeBatch, 
  setDoc, 
  getDoc,
  serverTimestamp,
  Timestamp,
  deleteDoc,
  getDocs,
  query,
  limit
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { 
  Drill, 
  DatabaseMetadata, 
  Collections, 
  VALIDATION_RULES 
} from './schema';

// ========================================
// MIGRATION SYSTEM
// ========================================

export interface Migration {
  version: string;
  description: string;
  up: () => Promise<void>;
  down: () => Promise<void>;
}

const CURRENT_VERSION = '1.0.0';

export class DatabaseMigrator {
  private db = db;

  async getCurrentVersion(): Promise<string> {
    try {
      const metadataDoc = await getDoc(doc(this.db, '_metadata', 'database'));
      if (metadataDoc.exists()) {
        return metadataDoc.data().version || '0.0.0';
      }
      return '0.0.0';
    } catch (error) {
      console.error('Error getting database version:', error);
      return '0.0.0';
    }
  }

  async setVersion(version: string): Promise<void> {
    const metadata: DatabaseMetadata = {
      version,
      lastMigration: serverTimestamp() as Timestamp,
      collections: [
        'users',
        'videos', 
        'shots',
        'drills',
        'plans',
        'plan_items',
        'scores',
        'community_posts'
      ]
    };

    await setDoc(doc(this.db, '_metadata', 'database'), metadata);
  }

  async runMigrations(): Promise<void> {
    const currentVersion = await this.getCurrentVersion();
    console.log(`📊 Current database version: ${currentVersion}`);
    
    if (currentVersion === CURRENT_VERSION) {
      console.log('✅ Database is up to date');
      return;
    }

    console.log(`🔄 Migrating database from ${currentVersion} to ${CURRENT_VERSION}`);
    
    // Run migrations in order
    const migrations = this.getMigrations();
    
    for (const migration of migrations) {
      if (this.shouldRunMigration(currentVersion, migration.version)) {
        console.log(`⬆️  Running migration: ${migration.description}`);
        try {
          await migration.up();
          console.log(`✅ Migration ${migration.version} completed`);
        } catch (error) {
          console.error(`❌ Migration ${migration.version} failed:`, error);
          throw error;
        }
      }
    }

    await this.setVersion(CURRENT_VERSION);
    console.log(`🎉 Database migrated to version ${CURRENT_VERSION}`);
  }

  async rollback(targetVersion: string): Promise<void> {
    const currentVersion = await this.getCurrentVersion();
    console.log(`📊 Rolling back from ${currentVersion} to ${targetVersion}`);
    
    const migrations = this.getMigrations().reverse();
    
    for (const migration of migrations) {
      if (this.shouldRollback(currentVersion, targetVersion, migration.version)) {
        console.log(`⬇️  Rolling back migration: ${migration.description}`);
        try {
          await migration.down();
          console.log(`✅ Rollback ${migration.version} completed`);
        } catch (error) {
          console.error(`❌ Rollback ${migration.version} failed:`, error);
          throw error;
        }
      }
    }

    await this.setVersion(targetVersion);
    console.log(`🎉 Database rolled back to version ${targetVersion}`);
  }

  private shouldRunMigration(currentVersion: string, migrationVersion: string): boolean {
    return this.compareVersions(migrationVersion, currentVersion) > 0;
  }

  private shouldRollback(currentVersion: string, targetVersion: string, migrationVersion: string): boolean {
    return this.compareVersions(migrationVersion, targetVersion) > 0 && 
           this.compareVersions(migrationVersion, currentVersion) <= 0;
  }

  private compareVersions(a: string, b: string): number {
    const aParts = a.split('.').map(Number);
    const bParts = b.split('.').map(Number);
    
    for (let i = 0; i < Math.max(aParts.length, bParts.length); i++) {
      const aPart = aParts[i] || 0;
      const bPart = bParts[i] || 0;
      
      if (aPart > bPart) return 1;
      if (aPart < bPart) return -1;
    }
    
    return 0;
  }

  private getMigrations(): Migration[] {
    return [
      {
        version: '1.0.0',
        description: 'Initial schema setup with collections and seed data',
        up: async () => {
          await this.seedInitialDrills();
          await this.createIndexes();
        },
        down: async () => {
          await this.clearAllCollections();
        }
      }
    ];
  }

  // ========================================
  // SEEDING FUNCTIONS
  // ========================================

  private async seedInitialDrills(): Promise<void> {
    console.log('🌱 Seeding initial drills...');
    
    const drills: Partial<Drill>[] = [
      {
        id: 'basic-form-shooting',
        title: 'Basic Form Shooting',
        description: 'Fundamental shooting form development with close-range shots',
        category: 'shooting',
        difficulty: 'beginner',
        duration: 15,
        equipment: ['basketball', 'hoop'],
        instructions: [
          {
            step: 1,
            title: 'Setup Position',
            description: 'Stand 3 feet from the basket, feet shoulder-width apart',
            duration: 30,
            repetitions: 1
          },
          {
            step: 2,
            title: 'Form Check',
            description: 'Check shooting hand position and elbow alignment',
            duration: 60,
            repetitions: 5
          },
          {
            step: 3,
            title: 'Slow Motion Shots',
            description: 'Take 10 slow, controlled shots focusing on form',
            duration: 300,
            repetitions: 10
          }
        ],
        tags: ['fundamentals', 'form', 'close-range'],
        popularity: 0,
        averageRating: 0,
        focusAreas: ['shooting form', 'muscle memory', 'consistency'],
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp
      },
      {
        id: 'free-throw-routine',
        title: 'Free Throw Routine',
        description: 'Develop consistency in free throw shooting with a repeatable routine',
        category: 'shooting',
        difficulty: 'beginner',
        duration: 20,
        equipment: ['basketball', 'free-throw-line'],
        instructions: [
          {
            step: 1,
            title: 'Line Up',
            description: 'Position yourself at the free throw line',
            duration: 10,
            repetitions: 1
          },
          {
            step: 2,
            title: 'Pre-Shot Routine',
            description: 'Develop a consistent 3-second pre-shot routine',
            duration: 60,
            repetitions: 1
          },
          {
            step: 3,
            title: 'Shoot',
            description: 'Take 20 free throws, focusing on routine consistency',
            duration: 600,
            repetitions: 20
          }
        ],
        tags: ['free-throws', 'routine', 'consistency'],
        popularity: 0,
        averageRating: 0,
        focusAreas: ['free throw accuracy', 'mental routine', 'pressure shooting'],
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp
      },
      {
        id: 'arc-development',
        title: 'Shot Arc Development',
        description: 'Improve shooting arc for better accuracy and soft touch',
        category: 'shooting',
        difficulty: 'intermediate',
        duration: 25,
        equipment: ['basketball', 'hoop'],
        instructions: [
          {
            step: 1,
            title: 'High Arc Shots',
            description: 'Focus on shooting with high arc from various distances',
            duration: 600,
            repetitions: 15
          },
          {
            step: 2,
            title: 'Arc Visualization',
            description: 'Visualize rainbow trajectory before each shot',
            duration: 300,
            repetitions: 10
          },
          {
            step: 3,
            title: 'Soft Touch Practice',
            description: 'Practice shots that barely touch the rim',
            duration: 600,
            repetitions: 15
          }
        ],
        tags: ['arc', 'trajectory', 'touch'],
        popularity: 0,
        averageRating: 0,
        focusAreas: ['shot arc', 'soft touch', 'accuracy'],
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp
      },
      {
        id: 'spot-shooting',
        title: 'Five-Spot Shooting',
        description: 'Systematic shooting from five spots around the three-point line',
        category: 'shooting',
        difficulty: 'intermediate',
        duration: 30,
        equipment: ['basketball', 'hoop', 'cones'],
        instructions: [
          {
            step: 1,
            title: 'Mark Spots',
            description: 'Set up five shooting spots around the three-point line',
            duration: 120,
            repetitions: 1
          },
          {
            step: 2,
            title: 'Spot Rotation',
            description: 'Shoot 10 shots from each spot before moving',
            duration: 1200,
            repetitions: 50
          },
          {
            step: 3,
            title: 'Track Results',
            description: 'Record makes/misses for each spot',
            duration: 180,
            repetitions: 1
          }
        ],
        tags: ['three-point', 'spots', 'tracking'],
        popularity: 0,
        averageRating: 0,
        focusAreas: ['range shooting', 'consistency', 'game situations'],
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp
      },
      {
        id: 'catch-and-shoot',
        title: 'Catch and Shoot',
        description: 'Practice quick release shots from passes',
        category: 'shooting',
        difficulty: 'intermediate',
        duration: 20,
        equipment: ['basketball', 'hoop', 'partner'],
        instructions: [
          {
            step: 1,
            title: 'Ready Position',
            description: 'Get in shooting ready position',
            duration: 30,
            repetitions: 1
          },
          {
            step: 2,
            title: 'Catch and Shoot',
            description: 'Receive pass and shoot in one fluid motion',
            duration: 900,
            repetitions: 30
          },
          {
            step: 3,
            title: 'Quick Release',
            description: 'Focus on reducing time from catch to release',
            duration: 270,
            repetitions: 10
          }
        ],
        tags: ['catch-shoot', 'quick-release', 'game-speed'],
        popularity: 0,
        averageRating: 0,
        focusAreas: ['quick release', 'game situations', 'reaction time'],
        createdAt: serverTimestamp() as Timestamp,
        updatedAt: serverTimestamp() as Timestamp
      }
    ];

    const batch = writeBatch(this.db);
    
    for (const drill of drills) {
      const drillRef = doc(this.db, 'drills', drill.id!);
      batch.set(drillRef, drill);
    }

    await batch.commit();
    console.log(`✅ Seeded ${drills.length} initial drills`);
  }

  private async createIndexes(): Promise<void> {
    console.log('🔍 Creating database indexes...');
    // Note: Firestore indexes are typically created via Firebase Console
    // or firebase.indexes.json file. This is a placeholder for index creation logic.
    
    console.log('ℹ️  Firestore indexes should be created via Firebase Console or firebase.indexes.json');
    console.log('📋 Recommended indexes:');
    console.log('   - users: email, role, createdAt');
    console.log('   - shots: userId, status, createdAt');
    console.log('   - videos: userId, status, uploadedAt');
    console.log('   - drills: category, difficulty, popularity');
    console.log('   - plans: userId, scheduledFor, createdAt');
    console.log('   - scores: userId, type, earnedAt');
    console.log('   - community_posts: userId, type, createdAt, visibility');
  }

  private async clearAllCollections(): Promise<void> {
    console.log('🧹 Clearing all collections...');
    
    const collections: Collections[] = [
      'users', 'videos', 'shots', 'drills', 
      'plans', 'plan_items', 'scores', 'community_posts'
    ];
    
    for (const collectionName of collections) {
      await this.clearCollection(collectionName);
    }
  }

  private async clearCollection(collectionName: string): Promise<void> {
    const collectionRef = collection(this.db, collectionName);
    const snapshot = await getDocs(query(collectionRef, limit(500)));
    
    if (snapshot.empty) return;
    
    const batch = writeBatch(this.db);
    snapshot.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();
    
    console.log(`🗑️  Cleared ${snapshot.size} documents from ${collectionName}`);
  }

  // ========================================
  // VALIDATION FUNCTIONS
  // ========================================

  async validateSchema(): Promise<{ valid: boolean; errors: string[] }> {
    console.log('🔍 Validating database schema...');
    const errors: string[] = [];

    try {
      // Check if all required collections exist and have proper structure
      const requiredCollections: Collections[] = [
        'users', 'videos', 'shots', 'drills', 
        'plans', 'plan_items', 'scores', 'community_posts'
      ];

      for (const collectionName of requiredCollections) {
        const collectionRef = collection(this.db, collectionName);
        const snapshot = await getDocs(query(collectionRef, limit(1)));
        
        if (snapshot.empty) {
          console.log(`ℹ️  Collection '${collectionName}' is empty (this is OK for new databases)`);
        } else {
          console.log(`✅ Collection '${collectionName}' exists and has data`);
        }
      }

      // Validate drills collection has seed data
      const drillsSnapshot = await getDocs(query(collection(this.db, 'drills'), limit(5)));
      if (drillsSnapshot.size < 5) {
        errors.push('Drills collection should have at least 5 seed drills');
      }

      return { valid: errors.length === 0, errors };

    } catch (error) {
      errors.push(`Schema validation failed: ${error}`);
      return { valid: false, errors };
    }
  }

  // ========================================
  // UTILITY FUNCTIONS
  // ========================================

  async getStats(): Promise<{[key: string]: number}> {
    const stats: {[key: string]: number} = {};
    
    const collections: Collections[] = [
      'users', 'videos', 'shots', 'drills', 
      'plans', 'plan_items', 'scores', 'community_posts'
    ];

    for (const collectionName of collections) {
      try {
        const snapshot = await getDocs(collection(this.db, collectionName));
        stats[collectionName] = snapshot.size;
      } catch (error) {
        console.warn(`Could not get stats for ${collectionName}:`, error);
        stats[collectionName] = 0;
      }
    }

    return stats;
  }
}

// ========================================
// EXPORTED FUNCTIONS
// ========================================

export const migrator = new DatabaseMigrator();

export async function initializeDatabase(): Promise<void> {
  console.log('🚀 Initializing Basketball AI Ecosystem database...');
  
  try {
    await migrator.runMigrations();
    
    const validation = await migrator.validateSchema();
    if (!validation.valid) {
      console.warn('⚠️  Schema validation warnings:', validation.errors);
    }

    const stats = await migrator.getStats();
    console.log('📊 Database statistics:', stats);
    
    console.log('✅ Database initialization completed successfully');
  } catch (error) {
    console.error('❌ Database initialization failed:', error);
    throw error;
  }
}

export async function rollbackDatabase(version: string): Promise<void> {
  console.log(`🔄 Rolling back database to version ${version}...`);
  await migrator.rollback(version);
}

export { CURRENT_VERSION };
