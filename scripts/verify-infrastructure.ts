#!/usr/bin/env tsx

/**
 * Infrastructure verification script for T-001 completion
 * Checks that all required files and configurations are in place
 */

import { existsSync, readFileSync } from 'fs';

interface Check {
  name: string;
  path: string;
  required: boolean;
}

const REQUIRED_FILES: Check[] = [
  { name: 'Firebase Config', path: 'firebase.json', required: true },
  { name: 'Firebase Project Config', path: '.firebaserc', required: true },
  { name: 'Firestore Security Rules', path: 'firestore.rules', required: true },
  { name: 'Firestore Indexes', path: 'firestore.indexes.json', required: true },
  { name: 'Database Schema', path: 'src/database/schema.ts', required: true },
  { name: 'Database Migrations', path: 'src/database/migrations.ts', required: true },
  { name: 'Database Repositories', path: 'src/database/repositories.ts', required: true },
  { name: 'Root Package.json', path: 'package.json', required: true },
  { name: 'Mobile Package.json', path: 'src/package.json', required: true },
  { name: 'Makefile', path: 'Makefile', required: true },
  { name: 'CI Configuration', path: '.github/workflows/ci.yml', required: true },
  { name: 'TypeScript Config', path: 'tsconfig.json', required: true },
  { name: 'PNPM Workspace', path: 'pnpm-workspace.yaml', required: true }
];

const REQUIRED_SCRIPTS = [
  'dev',
  'test', 
  'build',
  'lint',
  'type-check',
  'db:setup',
  'firebase:emulator'
];

async function verifyInfrastructure() {
  console.log('🔍 T-001 Infrastructure Verification');
  console.log('=====================================\n');

  let allPassed = true;

  // Check files exist
  console.log('📁 Checking required files...');
  for (const file of REQUIRED_FILES) {
    const exists = existsSync(file.path);
    const status = exists ? '✅' : '❌';
    console.log(`${status} ${file.name}: ${file.path}`);
    
    if (!exists && file.required) {
      allPassed = false;
    }
  }

  // Check package.json scripts
  console.log('\n📦 Checking npm scripts...');
  try {
    const packageJson = JSON.parse(readFileSync('package.json', 'utf-8'));
    const scripts = packageJson.scripts || {};
    
    for (const scriptName of REQUIRED_SCRIPTS) {
      const exists = scriptName in scripts;
      const status = exists ? '✅' : '❌';
      console.log(`${status} Script: ${scriptName}`);
      
      if (!exists) {
        allPassed = false;
      }
    }
  } catch (error) {
    console.log('❌ Failed to read package.json');
    allPassed = false;
  }

  // Check Makefile targets
  console.log('\n🔨 Checking Makefile targets...');
  try {
    const makefile = readFileSync('Makefile', 'utf-8');
    const targets = ['dev', 'test', 'build', 'setup', 'verify', 'ci', 'db-setup'];
    
    for (const target of targets) {
      const exists = makefile.includes(`${target}:`);
      const status = exists ? '✅' : '❌';
      console.log(`${status} Make target: ${target}`);
      
      if (!exists) {
        allPassed = false;
      }
    }
  } catch (error) {
    console.log('❌ Failed to read Makefile');
    allPassed = false;
  }

  // Check database schema
  console.log('\n🗄️  Checking database schema...');
  try {
    const schemaContent = readFileSync('src/database/schema.ts', 'utf-8');
    const collections = ['users', 'videos', 'shots', 'drills', 'plans', 'scores'];
    
    for (const collection of collections) {
      const exists = schemaContent.includes(collection);
      const status = exists ? '✅' : '❌';
      console.log(`${status} Collection: ${collection}`);
      
      if (!exists) {
        allPassed = false;
      }
    }
  } catch (error) {
    console.log('❌ Failed to read database schema');
    allPassed = false;
  }

  console.log('\n=====================================');
  
  if (allPassed) {
    console.log('🎉 T-001 Infrastructure Setup: COMPLETE ✅');
    console.log('');
    console.log('✅ All required files present');
    console.log('✅ All npm scripts configured');
    console.log('✅ All Makefile targets available');
    console.log('✅ Database schema implemented');
    console.log('✅ Firebase configuration ready');
    console.log('✅ CI/CD pipeline configured');
    console.log('');
    console.log('🚀 Ready for development!');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Set up Firebase environment variables');
    console.log('  2. Run "make dev" to start development');
    console.log('  3. Run "make verify" for detailed verification');
    console.log('');
  } else {
    console.log('❌ T-001 Infrastructure Setup: INCOMPLETE');
    console.log('');
    console.log('Some required components are missing.');
    console.log('Please check the failed items above.');
    process.exit(1);
  }
}

// Run verification
if (require.main === module) {
  verifyInfrastructure().catch(console.error);
}

export { verifyInfrastructure };
