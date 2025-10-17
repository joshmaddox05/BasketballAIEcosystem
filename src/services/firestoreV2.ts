/**
 * Updated Firestore Service Layer
 * 
 * This file provides backwards compatibility with the existing firestore service
 * while using the new repository-based architecture.
 */

import { Timestamp } from 'firebase/firestore';
import { repositories } from '../database/repositories';
import { initializeDatabase } from '../database/migrations';
import { 
  User, 
  Video, 
  Shot, 
  Drill, 
  TrainingPlan, 
  Score, 
  CommunityPost 
} from '../database/schema';

// ========================================
// BACKWARDS COMPATIBILITY LAYER
// ========================================

// Legacy UserProfile interface for backwards compatibility
export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  role: 'free' | 'premium' | 'admin';
  avatar?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  stats: {
    totalShots: number;
    improvedShots: number;
    currentStreak: number;
    bestStreak: number;
    totalPoints: number;
    level: number;
  };
  preferences: {
    notifications: boolean;
    shareProgress: boolean;
    preferredUnits: 'metric' | 'imperial';
  };
}

// Legacy ShotAnalysis interface
export interface ShotAnalysis {
  id: string;
  userId: string;
  videoUrl: string;
  thumbnailUrl?: string;
  status: 'processing' | 'completed' | 'failed';
  metrics?: {
    release_ms: number;
    elbow_angle_deg: number;
    wrist_flick_deg_s: number;
    arc_proxy_deg: number;
    consistency_score: number;
    overall_score: number;
    tips: string[];
  };
  location?: {
    lat: number;
    lng: number;
    court?: string;
  };
  createdAt: Timestamp;
  shared: boolean;
}

// ========================================
// USER SERVICE (Legacy Compatible)
// ========================================

export const userService = {
  async createProfile(
    userId: string, 
    userData: {
      email: string;
      displayName: string;
      role?: 'free' | 'premium' | 'admin';
    }
  ): Promise<void> {
    await repositories.users.createProfile(userId, {
      ...userData,
      role: userData.role || 'free'
    });
  },

  async getProfile(userId: string): Promise<UserProfile | null> {
    const user = await repositories.users.getById(userId);
    if (!user) return null;

    // Convert new User format to legacy UserProfile
    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      role: user.role as 'free' | 'premium' | 'admin',
      avatar: user.avatar,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      stats: {
        totalShots: user.stats.totalShots,
        improvedShots: user.stats.improvedShots,
        currentStreak: user.stats.currentStreak,
        bestStreak: user.stats.bestStreak,
        totalPoints: user.stats.totalPoints,
        level: user.stats.level
      },
      preferences: {
        notifications: user.preferences.notifications,
        shareProgress: user.preferences.shareProgress,
        preferredUnits: user.preferences.preferredUnits
      }
    };
  },

  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
    await repositories.users.update(userId, updates);
  },

  async updateStats(userId: string, statUpdates: Partial<UserProfile['stats']>): Promise<void> {
    await repositories.users.updateStats(userId, statUpdates);
  },

  subscribeToProfile(userId: string, callback: (profile: UserProfile | null) => void) {
    return repositories.users.subscribe((users) => {
      const user = users.find(u => u.id === userId);
      if (user) {
        // Convert to legacy format
        const legacyProfile: UserProfile = {
          id: user.id,
          email: user.email,
          displayName: user.displayName,
          role: user.role as 'free' | 'premium' | 'admin',
          avatar: user.avatar,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          stats: {
            totalShots: user.stats.totalShots,
            improvedShots: user.stats.improvedShots,
            currentStreak: user.stats.currentStreak,
            bestStreak: user.stats.bestStreak,
            totalPoints: user.stats.totalPoints,
            level: user.stats.level
          },
          preferences: {
            notifications: user.preferences.notifications,
            shareProgress: user.preferences.shareProgress,
            preferredUnits: user.preferences.preferredUnits
          }
        };
        callback(legacyProfile);
      } else {
        callback(null);
      }
    });
  }
};

// ========================================
// SHOT SERVICE (Legacy Compatible)
// ========================================

export const shotService = {
  async createShot(
    userId: string,
    shotData: {
      videoUrl: string;
      thumbnailUrl?: string;
      location?: { lat: number; lng: number; court?: string };
    }
  ): Promise<string> {
    const shotId = `shot_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Create video record first (if not exists)
    const videoId = `video_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    await repositories.shots.createShot(shotId, userId, videoId, {
      shared: false,
      tags: []
    });

    return shotId;
  },

  async updateShotAnalysis(
    shotId: string,
    metrics: {
      release_ms: number;
      elbow_angle_deg: number;
      wrist_flick_deg_s: number;
      arc_proxy_deg: number;
      consistency_score: number;
      overall_score: number;
      tips: string[];
    }
  ): Promise<void> {
    const shotMetrics = {
      ...metrics,
      form_score: metrics.overall_score,
      timing_score: metrics.overall_score,
      improvements: metrics.tips
    };

    await repositories.shots.updateAnalysis(shotId, shotMetrics);
  },

  async getUserShots(userId: string): Promise<ShotAnalysis[]> {
    const shots = await repositories.shots.getByUser(userId);
    
    // Convert to legacy format
    return shots.map(shot => ({
      id: shot.id,
      userId: shot.userId,
      videoUrl: '', // Would need to get from video service
      thumbnailUrl: undefined,
      status: shot.status === 'queued' ? 'processing' : shot.status as 'processing' | 'completed' | 'failed',
      metrics: shot.metrics ? {
        release_ms: shot.metrics.release_ms,
        elbow_angle_deg: shot.metrics.elbow_angle_deg,
        wrist_flick_deg_s: shot.metrics.wrist_flick_deg_s,
        arc_proxy_deg: shot.metrics.arc_proxy_deg,
        consistency_score: shot.metrics.consistency_score,
        overall_score: shot.metrics.overall_score,
        tips: shot.metrics.tips
      } : undefined,
      createdAt: shot.createdAt,
      shared: shot.shared
    }));
  }
};

// ========================================
// COMMUNITY SERVICE
// ========================================

export const communityService = {
  async createPost(
    userId: string,
    postData: {
      content: string;
      type: 'general' | 'achievement' | 'shot_analysis';
      tags?: string[];
    }
  ): Promise<string> {
    const postId = `post_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    await repositories.community.createPost(
      postId,
      userId,
      'User', // Would get from user service
      {
        content: postData.content,
        type: postData.type as any,
        tags: postData.tags
      }
    );

    return postId;
  },

  async getFeed(limit: number = 20): Promise<CommunityPost[]> {
    return repositories.community.getFeed('public', limit);
  },

  async likePost(postId: string): Promise<void> {
    await repositories.community.likePost(postId);
  }
};

// ========================================
// TRAINING SERVICE
// ========================================

export const trainingService = {
  async createPlan(
    userId: string,
    planData: {
      title: string;
      description: string;
      difficulty: 'beginner' | 'intermediate' | 'advanced';
      drills: string[];
    }
  ): Promise<string> {
    const planId = `plan_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    await repositories.plans.createPlan(planId, userId, {
      title: planData.title,
      description: planData.description,
      difficulty: planData.difficulty,
      estimatedDuration: planData.drills.length * 15, // Estimate 15 min per drill
      planItems: planData.drills
    });

    return planId;
  },

  async getUserPlans(userId: string): Promise<TrainingPlan[]> {
    return repositories.plans.getByUser(userId);
  },

  async updatePlanProgress(planId: string, progress: Partial<TrainingPlan['progress']>): Promise<void> {
    await repositories.plans.updateProgress(planId, progress);
  }
};

// ========================================
// INITIALIZATION
// ========================================

// Initialize database when this module is imported
let initPromise: Promise<void> | null = null;

export const initFirestore = (): Promise<void> => {
  if (!initPromise) {
    initPromise = initializeDatabase().catch(error => {
      console.error('Failed to initialize database:', error);
      throw error;
    });
  }
  return initPromise;
};

// Auto-initialize (but don't await to avoid blocking imports)
initFirestore().catch(console.error);

// Export repository access for advanced usage
export { repositories };

// Export new schema types
export * from '../database/schema';
export * from '../database/repositories';
