import { userService, shotService, trainingService, communityService } from '../services/firestore';

// Mock Firebase functions for testing
jest.mock('../services/firebase', () => ({
  auth: {
    currentUser: {
      uid: 'test-user-id',
      email: 'test@example.com',
      displayName: 'Test User'
    }
  },
  db: {},
  storage: {},
  functions: {}
}));

// Mock Firestore functions
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  collection: jest.fn(),
  doc: jest.fn(),
  setDoc: jest.fn(),
  getDoc: jest.fn(() => ({
    exists: () => true,
    data: () => ({
      id: 'test-id',
      email: 'test@example.com',
      displayName: 'Test User',
      role: 'free',
      stats: {
        totalShots: 0,
        improvedShots: 0,
        currentStreak: 0,
        bestStreak: 0,
        totalPoints: 0,
        level: 1
      }
    })
  })),
  getDocs: jest.fn(() => ({
    docs: []
  })),
  updateDoc: jest.fn(),
  deleteDoc: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  onSnapshot: jest.fn(() => jest.fn()),
  serverTimestamp: jest.fn(() => 'mock-timestamp'),
  increment: jest.fn((value) => value),
  addDoc: jest.fn()
}));

describe('Firebase Services', () => {
  const mockUserId = 'test-user-id';

  describe('UserService', () => {
    test('should create user profile', async () => {
      const userData = {
        email: 'test@example.com',
        displayName: 'Test User',
        role: 'free' as const
      };

      await expect(userService.createProfile(mockUserId, userData)).resolves.not.toThrow();
    });

    test('should get user profile', async () => {
      const profile = await userService.getProfile(mockUserId);
      expect(profile).toBeDefined();
    });

    test('should update user profile', async () => {
      const updates = { displayName: 'Updated Name' };
      await expect(userService.updateProfile(mockUserId, updates)).resolves.not.toThrow();
    });

    test('should update user stats', async () => {
      const statUpdates = { totalShots: 1, totalPoints: 10 };
      await expect(userService.updateStats(mockUserId, statUpdates)).resolves.not.toThrow();
    });
  });

  describe('ShotService', () => {
    test('should create shot analysis', async () => {
      const shotData = {
        videoUrl: 'https://example.com/video.mp4',
        thumbnailUrl: 'https://example.com/thumb.jpg',
        location: { lat: 40.7128, lng: -74.0060 }
      };

      const shotId = await shotService.createShot(mockUserId, shotData);
      expect(shotId).toBeDefined();
    });

    test('should get user shots', async () => {
      const shots = await shotService.getUserShots(mockUserId);
      expect(Array.isArray(shots)).toBe(true);
    });

    test('should share shot', async () => {
      const shotId = 'test-shot-id';
      await expect(shotService.shareShot(shotId)).resolves.not.toThrow();
    });
  });

  describe('TrainingService', () => {
    test('should create training plan', async () => {
      const planData = {
        title: 'Beginner Training',
        description: 'Basic basketball training plan',
        difficulty: 'beginner' as const,
        estimatedDuration: 30,
        drills: [
          {
            id: 'drill-1',
            title: 'Free Throws',
            description: 'Practice free throw shooting',
            duration: 10,
            completed: false,
            instructions: ['Stand at the free throw line', 'Take 10 shots']
          }
        ],
        aiRecommendations: ['Focus on follow-through'],
        progress: {
          completedDrills: 0,
          totalDrills: 1,
          timeSpent: 0
        }
      };

      const planId = await trainingService.createPlan(mockUserId, planData);
      expect(planId).toBeDefined();
    });

    test('should get user training plans', async () => {
      const plans = await trainingService.getUserPlans(mockUserId);
      expect(Array.isArray(plans)).toBe(true);
    });

    test('should update drill completion', async () => {
      const planId = 'test-plan-id';
      await expect(
        trainingService.updateDrillCompletion(planId, 0, true, 5)
      ).resolves.not.toThrow();
    });
  });

  describe('CommunityService', () => {
    test('should create community post', async () => {
      const postData = {
        content: 'Great shooting session today!',
        type: 'general' as const,
        tags: ['basketball', 'training']
      };

      const postId = await communityService.createPost(mockUserId, postData);
      expect(postId).toBeDefined();
    });

    test('should get community feed', async () => {
      const posts = await communityService.getFeed();
      expect(Array.isArray(posts)).toBe(true);
    });

    test('should like post', async () => {
      const postId = 'test-post-id';
      await expect(communityService.likePost(postId)).resolves.not.toThrow();
    });

    test('should get leaderboard', async () => {
      const users = await communityService.getLeaderboard();
      expect(Array.isArray(users)).toBe(true);
    });
  });
});
