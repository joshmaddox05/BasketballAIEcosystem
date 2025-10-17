/**
 * Basic Database Schema Tests
 * 
 * Simple tests to verify database schema and migration system
 */

describe('Database Schema', () => {
  test('should export schema types', () => {
    // Import schema types
    const schema = require('../database/schema');
    
    expect(schema).toBeDefined();
    expect(schema.VALIDATION_RULES).toBeDefined();
    expect(schema.VALIDATION_RULES.user).toBeDefined();
    expect(schema.VALIDATION_RULES.shot).toBeDefined();
    expect(schema.VALIDATION_RULES.drill).toBeDefined();
  });

  test('should have validation rules for core entities', () => {
    const { VALIDATION_RULES } = require('../database/schema');
    
    // User validation rules
    expect(VALIDATION_RULES.user.displayName.minLength).toBe(2);
    expect(VALIDATION_RULES.user.displayName.maxLength).toBe(50);
    expect(VALIDATION_RULES.user.email.required).toBe(true);
    
    // Shot validation rules
    expect(VALIDATION_RULES.shot.metrics.release_ms.min).toBe(100);
    expect(VALIDATION_RULES.shot.metrics.release_ms.max).toBe(2000);
    
    // Drill validation rules
    expect(VALIDATION_RULES.drill.duration.min).toBe(1);
    expect(VALIDATION_RULES.drill.duration.max).toBe(180);
  });
});

describe('Database Migrations', () => {
  // Mock Firebase before importing migrations
  jest.mock('../services/firebase', () => ({
    db: {
      collection: jest.fn(),
      doc: jest.fn()
    }
  }));

  test('should export migration functions', () => {
    const migrations = require('../database/migrations');
    
    expect(migrations.initializeDatabase).toBeDefined();
    expect(migrations.migrator).toBeDefined();
    expect(migrations.CURRENT_VERSION).toBeDefined();
  });

  test('should have current version defined', () => {
    const { CURRENT_VERSION } = require('../database/migrations');
    
    expect(CURRENT_VERSION).toBe('1.0.0');
  });
});

describe('Repository Layer', () => {
  test('should export repository classes', () => {
    // Mock Firebase first
    jest.mock('../services/firebase', () => ({
      db: {}
    }));
    
    const repositories = require('../database/repositories');
    
    expect(repositories.UserRepository).toBeDefined();
    expect(repositories.VideoRepository).toBeDefined();
    expect(repositories.ShotRepository).toBeDefined();
    expect(repositories.DrillRepository).toBeDefined();
    expect(repositories.RepositoryFactory).toBeDefined();
  });
});

describe('Firestore Service V2', () => {
  test('should export legacy compatible services', () => {
    // Mock dependencies
    jest.mock('../database/repositories', () => ({
      repositories: {
        users: { createProfile: jest.fn(), getById: jest.fn() },
        shots: { createShot: jest.fn(), updateAnalysis: jest.fn() },
        community: { createPost: jest.fn(), getFeed: jest.fn() }
      }
    }));
    
    jest.mock('../database/migrations', () => ({
      initializeDatabase: jest.fn().mockResolvedValue(undefined)
    }));
    
    const firestoreV2 = require('../services/firestoreV2');
    
    expect(firestoreV2.userService).toBeDefined();
    expect(firestoreV2.shotService).toBeDefined();
    expect(firestoreV2.communityService).toBeDefined();
    expect(firestoreV2.trainingService).toBeDefined();
  });
});
