import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc,
  deleteDoc,
  query, 
  where, 
  orderBy, 
  limit,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  addDoc,
  increment
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';
import { auth, db } from './firebase';
import { repositories } from '../database/repositories';
import { initializeDatabase } from '../database/migrations';
import { User as DatabaseUser, Shot as DatabaseShot, TrainingPlan as DatabaseTrainingPlan } from '../database/schema';

// Re-export repository instances for backwards compatibility with method aliases
class UserServiceWrapper {
  private repo = repositories.users;
  
  // Legacy API with type conversion
  async getProfile(userId: string): Promise<UserProfile | null> {
    const user = await this.repo.getProfile(userId);
    return user ? convertUserToProfile(user) : null;
  }
  
  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
    const convertedUpdates = convertProfileToUser(updates);
    return this.repo.updateProfile(userId, convertedUpdates);
  }
  
  subscribeToProfile(userId: string, callback: (profile: UserProfile | null) => void): () => void {
    return this.repo.subscribeToProfile(userId, (user) => {
      callback(user ? convertUserToProfile(user) : null);
    });
  }
  
  // Direct repository delegates
  getById = this.repo.getById.bind(this.repo);
  update = this.repo.update.bind(this.repo);
  create = this.repo.create.bind(this.repo);
  delete = this.repo.delete.bind(this.repo);
  list = this.repo.list.bind(this.repo);
  subscribe = this.repo.subscribe.bind(this.repo);
  createProfile = this.repo.createProfile.bind(this.repo);
  updateStats = this.repo.updateStats.bind(this.repo);
  getLeaderboard = this.repo.getLeaderboard.bind(this.repo);
}

class ShotServiceWrapper {
  private repo = repositories.shots;
  
  // Legacy API with type conversion
  async createShot(userId: string, shotData: Partial<ShotAnalysis>): Promise<string> {
    const convertedData = convertAnalysisToShot(shotData);
    return this.repo.createShotLegacy(userId, convertedData);
  }
  
  async getUserShots(userId: string, includeShared?: boolean): Promise<ShotAnalysis[]> {
    const shots = await this.repo.getUserShots(userId, includeShared);
    return shots.map(convertShotToAnalysis);
  }
  
  subscribeToUserShots(userId: string, callback: (shots: ShotAnalysis[]) => void): () => void {
    return this.repo.subscribeToUserShots(userId, (shots) => {
      callback(shots.map(convertShotToAnalysis));
    });
  }
  
  updateShotAnalysis = this.repo.updateShotAnalysis.bind(this.repo);
  
  // Standard repository methods
  getById = this.repo.getById.bind(this.repo);
  update = this.repo.update.bind(this.repo);
  delete = this.repo.delete.bind(this.repo);
  list = this.repo.list.bind(this.repo);
  subscribe = this.repo.subscribe.bind(this.repo);
  updateAnalysis = this.repo.updateAnalysis.bind(this.repo);
  getByUser = this.repo.getByUser.bind(this.repo);
  getSharedShots = this.repo.getSharedShots.bind(this.repo);
  shareShot = this.repo.shareShot.bind(this.repo);
}

class CommunityServiceWrapper {
  private repo = repositories.community;
  
  // Legacy method mapping
  createPost = this.repo.createPostLegacy.bind(this.repo);
  getLeaderboard = this.repo.getLeaderboard.bind(this.repo);
  subscribeToFeed = this.repo.subscribeToFeed.bind(this.repo);
  subscribeToLeaderboard = this.repo.subscribeToLeaderboard.bind(this.repo);
  
  // Standard repository methods
  getById = this.repo.getById.bind(this.repo);
  update = this.repo.update.bind(this.repo);
  delete = this.repo.delete.bind(this.repo);
  list = this.repo.list.bind(this.repo);
  subscribe = this.repo.subscribe.bind(this.repo);
  getFeed = this.repo.getFeed.bind(this.repo);
  getByUser = this.repo.getByUser.bind(this.repo);
  likePost = this.repo.likePost.bind(this.repo);
  reportPost = this.repo.reportPost.bind(this.repo);
}

export const userService = new UserServiceWrapper();
export const videoService = repositories.videos;
export const shotService = new ShotServiceWrapper();
export const drillService = repositories.drills;
export const planService = repositories.plans;
export const scoreService = repositories.scores;
export const communityService = new CommunityServiceWrapper();
export const trainingService = repositories.plans; // Alias for backwards compatibility

// Initialize database on import
initializeDatabase().catch(console.error);

// Backwards compatibility type aliases
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

export interface TrainingPlan {
  id: string;
  userId: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedDuration: number; // minutes
  drills: {
    id: string;
    title: string;
    description: string;
    duration: number;
    completed: boolean;
    instructions: string[];
    videoUrl?: string;
  }[];
  aiRecommendations: string[];
  progress: {
    completedDrills: number;
    totalDrills: number;
    timeSpent: number;
  };
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface CommunityPost {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  type: 'shot_analysis' | 'achievement' | 'general' | 'training_plan';
  media?: string[];
  shotId?: string;
  trainingPlanId?: string;
  likes: number;
  comments: number;
  createdAt: Timestamp;
  tags?: string[];
}

// Legacy services have been replaced by the repository layer in src/database/repositories.ts
// The exports above (userService, shotService, etc.) now point to the new repository instances
// for backwards compatibility with existing code.

// ========================================
// TYPE CONVERTERS FOR BACKWARDS COMPATIBILITY
// ========================================

// Convert database User to legacy UserProfile
export const convertUserToProfile = (user: DatabaseUser): UserProfile => ({
  id: user.id,
  email: user.email,
  displayName: user.displayName,
  role: user.role === 'coach' ? 'admin' : user.role, // Map coach to admin for legacy compatibility
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
});

// Convert legacy UserProfile to database User partial
export const convertProfileToUser = (profile: Partial<UserProfile>): Partial<DatabaseUser> => ({
  email: profile.email,
  displayName: profile.displayName,
  role: profile.role,
  avatar: profile.avatar,
  stats: profile.stats ? {
    totalShots: profile.stats.totalShots,
    improvedShots: profile.stats.improvedShots,
    currentStreak: profile.stats.currentStreak,
    bestStreak: profile.stats.bestStreak,
    totalPoints: profile.stats.totalPoints,
    level: profile.stats.level,
    // Add required fields with defaults
    totalTrainingTime: 0,
    completedPlans: 0,
    averageScore: 0,
    lastActive: serverTimestamp() as Timestamp
  } : undefined,
  preferences: profile.preferences ? {
    notifications: profile.preferences.notifications,
    shareProgress: profile.preferences.shareProgress,
    preferredUnits: profile.preferences.preferredUnits,
    // Add required fields with defaults
    privacyLevel: 'public',
    autoShare: false
  } : undefined
});

// Convert database Shot to legacy ShotAnalysis
export const convertShotToAnalysis = (shot: DatabaseShot): ShotAnalysis => ({
  id: shot.id,
  userId: shot.userId,
  videoUrl: shot.videoId, // Use videoId as videoUrl for backwards compatibility
  thumbnailUrl: undefined, // Not available in new schema
  status: shot.status === 'queued' ? 'processing' : shot.status,
  metrics: shot.metrics ? {
    release_ms: shot.metrics.release_ms,
    elbow_angle_deg: shot.metrics.elbow_angle_deg,
    wrist_flick_deg_s: shot.metrics.wrist_flick_deg_s,
    arc_proxy_deg: shot.metrics.arc_proxy_deg,
    consistency_score: shot.metrics.consistency_score,
    overall_score: shot.metrics.overall_score,
    tips: shot.metrics.tips
  } : undefined,
  location: undefined, // Location moved to video metadata
  createdAt: shot.createdAt,
  shared: shot.shared
});

// Convert legacy ShotAnalysis data to database Shot
export const convertAnalysisToShot = (analysis: Partial<ShotAnalysis>): Partial<DatabaseShot> => ({
  videoId: analysis.videoUrl || 'unknown',
  status: analysis.status,
  metrics: analysis.metrics ? {
    release_ms: analysis.metrics.release_ms,
    elbow_angle_deg: analysis.metrics.elbow_angle_deg,
    wrist_flick_deg_s: analysis.metrics.wrist_flick_deg_s,
    arc_proxy_deg: analysis.metrics.arc_proxy_deg,
    consistency_score: analysis.metrics.consistency_score,
    overall_score: analysis.metrics.overall_score,
    form_score: analysis.metrics.consistency_score, // Map to form_score
    timing_score: analysis.metrics.consistency_score, // Map to timing_score
    tips: analysis.metrics.tips,
    improvements: [] // Default empty improvements
  } : undefined,
  shared: analysis.shared,
  tags: []
});
