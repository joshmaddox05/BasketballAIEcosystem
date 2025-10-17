/**
 * Database Repository Tests
 * 
 * Unit tests for the Firebase/Firestore repository layer
 */

// Mock Firebase before importing anything else
jest.mock('../services/firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'test-user-123' } }
}));

// Import repository classes and utilities
import {
  UserRepository,
  VideoRepository,
  ShotRepository,
  DrillRepository,
  TrainingPlanRepository,
  ScoreRepository,
  CommunityPostRepository,
  RepositoryFactory,
  migrator,
  initializeDatabase
} from '../database/repositories';

// Mock Firestore functions
jest.mock('firebase/firestore', () => ({
  collection: jest.fn(),
  doc: jest.fn(),
  setDoc: jest.fn().mockResolvedValue(undefined),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  updateDoc: jest.fn().mockResolvedValue(undefined),
  deleteDoc: jest.fn().mockResolvedValue(undefined),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  onSnapshot: jest.fn(),
  serverTimestamp: jest.fn(() => new Date()),
  writeBatch: jest.fn(),
  increment: jest.fn()
}));

// Mock Firebase
jest.mock('../services/firebase', () => ({
  db: {},
  auth: { currentUser: { uid: 'test-user-123' } }
}));

// Mock Firestore functions
const mockFirestore = {
  collection: jest.fn(),
  doc: jest.fn(),
  setDoc: jest.fn(),
  getDoc: jest.fn(),
  getDocs: jest.fn(),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  onSnapshot: jest.fn(),
  serverTimestamp: jest.fn(() => new Date()),
  writeBatch: jest.fn(),
  increment: jest.fn()
};

jest.mock('firebase/firestore', () => mockFirestore);

describe('Database Repository Layer', () => {
  const testUserId = 'test-user-123';
  const testVideoId = 'test-video-456';
  const testShotId = 'test-shot-789';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Setup mock implementations
    mockFirestore.collection.mockReturnValue({});
    mockFirestore.doc.mockReturnValue({});
    mockFirestore.query.mockReturnValue({});
    mockFirestore.where.mockReturnValue({});
    mockFirestore.orderBy.mockReturnValue({});
    mockFirestore.limit.mockReturnValue({});
    
    // Mock successful operations
    mockFirestore.setDoc.mockResolvedValue(undefined);
    mockFirestore.updateDoc.mockResolvedValue(undefined);
    mockFirestore.deleteDoc.mockResolvedValue(undefined);
    
    // Mock document snapshots
    mockFirestore.getDoc.mockResolvedValue({
      exists: () => true,
      id: 'test-id',
      data: () => ({ name: 'Test Data' })
    });
    
    mockFirestore.getDocs.mockResolvedValue({
      docs: [
        { id: 'doc1', data: () => ({ name: 'Doc 1' }) },
        { id: 'doc2', data: () => ({ name: 'Doc 2' }) }
      ]
    });
  });

  describe('UserRepository', () => {
    let userRepo: UserRepository;

    beforeEach(() => {
      userRepo = RepositoryFactory.users();
    });

    test('should create user profile with default values', async () => {
      const userData = {
        email: 'test@example.com',
        displayName: 'Test User'
      };

      await userRepo.createProfile(testUserId, userData);

      expect(mockFirestore.setDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          id: testUserId,
          email: userData.email,
          displayName: userData.displayName,
          role: 'free',
          experience: 'beginner',
          stats: expect.objectContaining({
            totalShots: 0,
            level: 1
          }),
          preferences: expect.objectContaining({
            notifications: true,
            shareProgress: true
          })
        })
      );
    });

    test('should update user stats with increment', async () => {
      const statUpdates = {
        totalShots: 5,
        totalPoints: 50
      };

      await userRepo.updateStats(testUserId, statUpdates);

      expect(mockFirestore.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          'stats.totalShots': expect.anything(),
          'stats.totalPoints': expect.anything(),
          updatedAt: expect.anything()
        })
      );
    });

    test('should get leaderboard with proper constraints', async () => {
      await userRepo.getLeaderboard(5);

      expect(mockFirestore.query).toHaveBeenCalled();
      expect(mockFirestore.where).toHaveBeenCalledWith('preferences.privacyLevel', '==', 'public');
      expect(mockFirestore.orderBy).toHaveBeenCalledWith('stats.totalPoints', 'desc');
      expect(mockFirestore.limit).toHaveBeenCalledWith(5);
    });
  });

  describe('VideoRepository', () => {
    let videoRepo: VideoRepository;

    beforeEach(() => {
      videoRepo = RepositoryFactory.videos();
    });

    test('should create video with proper metadata', async () => {
      const videoData = {
        fileName: 'test-video.mp4',
        originalName: 'My Basketball Shot.mp4',
        mimeType: 'video/mp4',
        size: 1024000,
        duration: 30,
        storageUrl: 'https://storage.googleapis.com/bucket/video.mp4',
        metadata: {
          shootingAngle: 'side' as const,
          court: 'Home Court',
          lighting: 'indoor' as const
        }
      };

      await videoRepo.createVideo(testVideoId, testUserId, videoData);

      expect(mockFirestore.setDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          id: testVideoId,
          userId: testUserId,
          status: 'ready',
          ...videoData
        })
      );
    });

    test('should get videos by user', async () => {
      await videoRepo.getByUser(testUserId);

      expect(mockFirestore.where).toHaveBeenCalledWith('userId', '==', testUserId);
      expect(mockFirestore.orderBy).toHaveBeenCalledWith('uploadedAt', 'desc');
    });

    test('should update video status', async () => {
      await videoRepo.updateStatus(testVideoId, 'processing');

      expect(mockFirestore.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          status: 'processing'
        })
      );
    });
  });

  describe('ShotRepository', () => {
    let shotRepo: ShotRepository;

    beforeEach(() => {
      shotRepo = RepositoryFactory.shots();
    });

    test('should create shot with default status', async () => {
      await shotRepo.createShot(testShotId, testUserId, testVideoId);

      expect(mockFirestore.setDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          id: testShotId,
          userId: testUserId,
          videoId: testVideoId,
          status: 'queued',
          shared: false
        })
      );
    });

    test('should update shot analysis', async () => {
      const metrics = {
        release_ms: 450,
        elbow_angle_deg: 85,
        wrist_flick_deg_s: 180,
        arc_proxy_deg: 45,
        consistency_score: 8.5,
        form_score: 8.2,
        timing_score: 8.8,
        overall_score: 8.5,
        tips: ['Great follow-through!'],
        improvements: ['Increase arc slightly']
      };

      await shotRepo.updateAnalysis(testShotId, metrics, 'make');

      expect(mockFirestore.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          metrics,
          status: 'completed',
          result: 'make',
          analyzedAt: expect.anything()
        })
      );
    });

    test('should get shared shots', async () => {
      await shotRepo.getSharedShots(10);

      expect(mockFirestore.where).toHaveBeenCalledWith('shared', '==', true);
      expect(mockFirestore.where).toHaveBeenCalledWith('status', '==', 'completed');
      expect(mockFirestore.orderBy).toHaveBeenCalledWith('metrics.overall_score', 'desc');
      expect(mockFirestore.limit).toHaveBeenCalledWith(10);
    });
  });

  describe('DrillRepository', () => {
    let drillRepo: DrillRepository;

    beforeEach(() => {
      drillRepo = RepositoryFactory.drills();
    });

    test('should get drills by category', async () => {
      await drillRepo.getDrillsByCategory('shooting');

      expect(mockFirestore.where).toHaveBeenCalledWith('category', '==', 'shooting');
      expect(mockFirestore.orderBy).toHaveBeenCalledWith('popularity', 'desc');
    });

    test('should get drills by difficulty', async () => {
      await drillRepo.getDrillsByDifficulty('beginner');

      expect(mockFirestore.where).toHaveBeenCalledWith('difficulty', '==', 'beginner');
      expect(mockFirestore.orderBy).toHaveBeenCalledWith('averageRating', 'desc');
    });

    test('should increment drill popularity', async () => {
      await drillRepo.incrementPopularity('drill-123');

      expect(mockFirestore.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          popularity: expect.anything()
        })
      );
    });
  });

  describe('TrainingPlanRepository', () => {
    let planRepo: TrainingPlanRepository;

    beforeEach(() => {
      planRepo = RepositoryFactory.plans();
    });

    test('should create training plan with progress tracking', async () => {
      const planData = {
        title: 'Beginner Shooting Plan',
        description: 'Basic shooting fundamentals',
        difficulty: 'beginner' as const,
        estimatedDuration: 30,
        planItems: ['item1', 'item2', 'item3']
      };

      await planRepo.createPlan('plan-123', testUserId, planData);

      expect(mockFirestore.setDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          ...planData,
          userId: testUserId,
          progress: expect.objectContaining({
            completedItems: 0,
            totalItems: 3,
            timeSpent: 0,
            completionPercentage: 0
          })
        })
      );
    });

    test('should update plan progress', async () => {
      const progress = {
        completedItems: 2,
        timeSpent: 45,
        completionPercentage: 67
      };

      await planRepo.updateProgress('plan-123', progress);

      expect(mockFirestore.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          'progress.completedItems': 2,
          'progress.timeSpent': 45,
          'progress.completionPercentage': 67,
          updatedAt: expect.anything()
        })
      );
    });
  });

  describe('ScoreRepository', () => {
    let scoreRepo: ScoreRepository;

    beforeEach(() => {
      scoreRepo = RepositoryFactory.scores();
    });

    test('should create score with proper data', async () => {
      const scoreData = {
        type: 'shot_analysis' as const,
        points: 100,
        category: 'shooting',
        description: 'Perfect form shot',
        shotId: testShotId
      };

      await scoreRepo.createScore('score-123', testUserId, scoreData);

      expect(mockFirestore.setDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          ...scoreData,
          userId: testUserId,
          isPublic: true,
          earnedAt: expect.anything()
        })
      );
    });

    test('should get leaderboard scores', async () => {
      await scoreRepo.getLeaderboard('shot_analysis', 5);

      expect(mockFirestore.where).toHaveBeenCalledWith('isPublic', '==', true);
      expect(mockFirestore.where).toHaveBeenCalledWith('type', '==', 'shot_analysis');
      expect(mockFirestore.orderBy).toHaveBeenCalledWith('points', 'desc');
      expect(mockFirestore.limit).toHaveBeenCalledWith(5);
    });
  });

  describe('CommunityPostRepository', () => {
    let communityRepo: CommunityPostRepository;

    beforeEach(() => {
      communityRepo = RepositoryFactory.community();
    });

    test('should create community post', async () => {
      const postData = {
        content: 'Just hit 10 free throws in a row!',
        type: 'achievement' as const,
        tags: ['free-throws', 'practice']
      };

      await communityRepo.createPost('post-123', testUserId, 'Test User', postData);

      expect(mockFirestore.setDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          ...postData,
          userId: testUserId,
          userName: 'Test User',
          likes: 0,
          comments: 0,
          approved: true,
          visibility: 'public'
        })
      );
    });

    test('should get public feed', async () => {
      await communityRepo.getFeed('public', 15);

      expect(mockFirestore.where).toHaveBeenCalledWith('visibility', '==', 'public');
      expect(mockFirestore.where).toHaveBeenCalledWith('approved', '==', true);
      expect(mockFirestore.orderBy).toHaveBeenCalledWith('createdAt', 'desc');
      expect(mockFirestore.limit).toHaveBeenCalledWith(15);
    });

    test('should like post', async () => {
      await communityRepo.likePost('post-123');

      expect(mockFirestore.updateDoc).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          likes: expect.anything()
        })
      );
    });
  });

  describe('Database Migrations', () => {
    test('should run migrations successfully', async () => {
      // Mock the migrator methods
      const getCurrentVersionSpy = jest.spyOn(migrator, 'getCurrentVersion').mockResolvedValue('0.0.0');
      const setVersionSpy = jest.spyOn(migrator, 'setVersion').mockResolvedValue();
      const validateSchemaSpy = jest.spyOn(migrator, 'validateSchema').mockResolvedValue({
        valid: true,
        errors: []
      });
      const getStatsSpy = jest.spyOn(migrator, 'getStats').mockResolvedValue({
        users: 0,
        videos: 0,
        shots: 0,
        drills: 5
      });

      await expect(initializeDatabase()).resolves.not.toThrow();

      expect(getCurrentVersionSpy).toHaveBeenCalled();
      expect(setVersionSpy).toHaveBeenCalledWith('1.0.0');
      expect(validateSchemaSpy).toHaveBeenCalled();
      expect(getStatsSpy).toHaveBeenCalled();
    });

    test('should validate schema correctly', async () => {
      const validation = await migrator.validateSchema();

      expect(validation).toHaveProperty('valid');
      expect(validation).toHaveProperty('errors');
      expect(Array.isArray(validation.errors)).toBe(true);
    });
  });

  describe('Repository Factory', () => {
    test('should return singleton instances', () => {
      const users1 = RepositoryFactory.users();
      const users2 = RepositoryFactory.users();
      
      expect(users1).toBe(users2);
    });

    test('should return different instances for different repositories', () => {
      const users = RepositoryFactory.users();
      const videos = RepositoryFactory.videos();
      
      expect(users).not.toBe(videos);
    });
  });
});
