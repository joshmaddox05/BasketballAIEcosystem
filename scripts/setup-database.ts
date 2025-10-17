#!/usr/bin/env ts-node

import { DatabaseMigrator } from '../src/database/migrations';

/**
 * Database setup script for development environment
 * Runs all pending migrations and seeds initial data
 */
async function setupDatabase() {
  console.log('🚀 Setting up database...');
  
  const migrator = new DatabaseMigrator();
  
  try {
    // Run all pending migrations
    console.log('📦 Running database migrations...');
    await migrator.runMigrations();
    
    console.log('✅ Database setup complete!');
    console.log('\n📊 Database Schema v1.0.0 includes:');
    console.log('  • User profiles and authentication');
    console.log('  • Video analysis and shot tracking');
    console.log('  • Training plans and drills (5 basketball drills included)');
    console.log('  • Scoring system and leaderboards');
    console.log('  • Community features');
    console.log('\n🎯 Ready for development!');
    
  } catch (error) {
    console.error('❌ Database setup failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  setupDatabase();
}

export { setupDatabase };
