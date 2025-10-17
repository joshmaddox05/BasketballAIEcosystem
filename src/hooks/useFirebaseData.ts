import { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { 
  userService, 
  shotService, 
  trainingService, 
  communityService,
  UserProfile,
  ShotAnalysis,
  TrainingPlan,
  CommunityPost
} from '../services/firestore';
import { User as DatabaseUser, Shot, CommunityPost as DatabaseCommunityPost } from '../database/schema';

// User Profile Hook
export const useUserProfile = (user: User | null) => {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const loadProfile = async () => {
      try {
        setLoading(true);
        const userProfile = await userService.getProfile(user.uid);
        
        if (!userProfile) {
          // Create profile if it doesn't exist
          await userService.createProfile(user.uid, {
            email: user.email || '',
            displayName: user.displayName || 'Basketball Player',
            role: 'free'
          });
          const newProfile = await userService.getProfile(user.uid);
          setProfile(newProfile);
        } else {
          setProfile(userProfile);
        }
        setError(null);
      } catch (err) {
        console.error('Error loading user profile:', err);
        setError('Failed to load user profile');
      } finally {
        setLoading(false);
      }
    };

    // Subscribe to real-time updates
    const unsubscribe = userService.subscribeToProfile(user.uid, (profile) => {
      setProfile(profile);
      setLoading(false);
    });

    loadProfile();

    return unsubscribe;
  }, [user]);

  const updateProfile = useCallback(async (updates: Partial<UserProfile>) => {
    if (!user) return;
    
    try {
      await userService.updateProfile(user.uid, updates);
    } catch (err) {
      console.error('Error updating profile:', err);
      setError('Failed to update profile');
    }
  }, [user]);

  const updateStats = useCallback(async (statUpdates: Partial<UserProfile['stats']>) => {
    if (!user) return;
    
    try {
      await userService.updateStats(user.uid, statUpdates);
    } catch (err) {
      console.error('Error updating stats:', err);
      setError('Failed to update stats');
    }
  }, [user]);

  return { profile, loading, error, updateProfile, updateStats };
};

// User Shots Hook
export const useUserShots = (user: User | null) => {
  const [shots, setShots] = useState<ShotAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setShots([]);
      setLoading(false);
      return;
    }

    // Subscribe to real-time updates
    const unsubscribe = shotService.subscribeToUserShots(user.uid, (userShots) => {
      setShots(userShots);
      setLoading(false);
      setError(null);
    });

    return unsubscribe;
  }, [user]);

  const createShot = useCallback(async (shotData: {
    videoUrl: string;
    thumbnailUrl?: string;
    location?: { lat: number; lng: number; court?: string };
  }) => {
    if (!user) throw new Error('User must be authenticated');
    
    try {
      const shotId = await shotService.createShot(user.uid, shotData);
      return shotId;
    } catch (err) {
      console.error('Error creating shot:', err);
      setError('Failed to create shot');
      throw err;
    }
  }, [user]);

  const shareShot = useCallback(async (shotId: string) => {
    try {
      await shotService.shareShot(shotId);
    } catch (err) {
      console.error('Error sharing shot:', err);
      setError('Failed to share shot');
    }
  }, []);

  return { shots, loading, error, createShot, shareShot };
};

// Training Plans Hook
export const useTrainingPlans = (user: User | null) => {
  const [plans, setPlans] = useState<TrainingPlan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      setPlans([]);
      setLoading(false);
      return;
    }

    const loadPlans = async () => {
      try {
        setLoading(true);
        const userPlans = await trainingService.getUserPlans(user.uid);
        setPlans(userPlans);
        setError(null);
      } catch (err) {
        console.error('Error loading training plans:', err);
        setError('Failed to load training plans');
      } finally {
        setLoading(false);
      }
    };

    loadPlans();
  }, [user]);

  const createPlan = useCallback(async (planData: Omit<TrainingPlan, 'id' | 'userId' | 'createdAt' | 'updatedAt'>) => {
    if (!user) throw new Error('User must be authenticated');
    
    try {
      const planId = await trainingService.createPlan(user.uid, planData);
      // Refresh plans
      const userPlans = await trainingService.getUserPlans(user.uid);
      setPlans(userPlans);
      return planId;
    } catch (err) {
      console.error('Error creating training plan:', err);
      setError('Failed to create training plan');
      throw err;
    }
  }, [user]);

  const updateDrillCompletion = useCallback(async (
    planId: string, 
    drillIndex: number, 
    completed: boolean, 
    timeSpent?: number
  ) => {
    try {
      await trainingService.updateDrillCompletion(planId, drillIndex, completed, timeSpent);
      // Refresh plans
      if (user) {
        const userPlans = await trainingService.getUserPlans(user.uid);
        setPlans(userPlans);
      }
    } catch (err) {
      console.error('Error updating drill completion:', err);
      setError('Failed to update drill completion');
    }
  }, [user]);

  return { plans, loading, error, createPlan, updateDrillCompletion };
};

// Community Feed Hook
export const useCommunityFeed = () => {
  const [posts, setPosts] = useState<CommunityPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Subscribe to real-time feed updates
    const unsubscribe = communityService.subscribeToFeed((newPosts) => {
      setPosts(newPosts);
      setLoading(false);
      setError(null);
    });

    return unsubscribe;
  }, []);

  const createPost = useCallback(async (
    userId: string,
    postData: Omit<CommunityPost, 'id' | 'userId' | 'userName' | 'userAvatar' | 'likes' | 'comments' | 'createdAt'>
  ) => {
    try {
      const postId = await communityService.createPost(userId, postData);
      return postId;
    } catch (err) {
      console.error('Error creating post:', err);
      setError('Failed to create post');
      throw err;
    }
  }, []);

  const likePost = useCallback(async (postId: string) => {
    try {
      await communityService.likePost(postId);
    } catch (err) {
      console.error('Error liking post:', err);
      setError('Failed to like post');
    }
  }, []);

  return { posts, loading, error, createPost, likePost };
};

// Leaderboard Hook
export const useLeaderboard = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Subscribe to real-time leaderboard updates
    const unsubscribe = communityService.subscribeToLeaderboard((leaderboardUsers) => {
      setUsers(leaderboardUsers);
      setLoading(false);
      setError(null);
    });

    return unsubscribe;
  }, []);

  return { users, loading, error };
};

// Shared Shots Hook (for community features)
export const useSharedShots = () => {
  const [shots, setShots] = useState<ShotAnalysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSharedShots = async () => {
      try {
        setLoading(true);
        const sharedShots = await shotService.getSharedShots(20);
        setShots(sharedShots);
        setError(null);
      } catch (err) {
        console.error('Error loading shared shots:', err);
        setError('Failed to load shared shots');
      } finally {
        setLoading(false);
      }
    };

    loadSharedShots();

    // Refresh every 30 seconds
    const interval = setInterval(loadSharedShots, 30000);
    return () => clearInterval(interval);
  }, []);

  return { shots, loading, error };
};

// Generic loading hook for async operations
export const useAsyncOperation = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const execute = useCallback(async <T>(operation: () => Promise<T>): Promise<T | null> => {
    try {
      setLoading(true);
      setError(null);
      const result = await operation();
      return result;
    } catch (err) {
      console.error('Async operation failed:', err);
      setError(err instanceof Error ? err.message : 'Operation failed');
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, execute };
};
