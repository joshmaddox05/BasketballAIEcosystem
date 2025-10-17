/**
 * Repository Layer for Basketball AI Ecosystem
 * 
 * This module provides type-safe repository services for all database operations
 * using the defined schema and validation rules.
 */

import { 
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
  writeBatch,
  increment,
  Timestamp,
  DocumentReference,
  QueryConstraint
} from 'firebase/firestore';
import { db } from '../services/firebase';
import { 
  User, 
  Video, 
  Shot, 
  Drill, 
  TrainingPlan, 
  PlanItem, 
  Score, 
  CommunityPost,
  Collections,
  VALIDATION_RULES
} from './schema';

// ========================================
// BASE REPOSITORY CLASS
// ========================================

abstract class BaseRepository<T extends { id: string }> {
  protected db = db;
  protected abstract collectionName: Collections;

  protected getCollection() {
    return collection(this.db, this.collectionName);
  }

  protected getDocRef(id: string) {
    return doc(this.db, this.collectionName, id);
  }

  async create(id: string, data: Omit<T, 'id'>): Promise<void> {
    const docRef = this.getDocRef(id);
    const docData = { ...data, id } as T;
    await setDoc(docRef, docData);
  }

  async getById(id: string): Promise<T | null> {
    const docRef = this.getDocRef(id);
    const docSnap = await getDoc(docRef);
    
    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as T;
    }
    return null;
  }

  async update(id: string, updates: Partial<Omit<T, 'id'>>): Promise<void> {
    const docRef = this.getDocRef(id);
    await updateDoc(docRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  }

  async delete(id: string): Promise<void> {
    const docRef = this.getDocRef(id);
    await deleteDoc(docRef);
  }

  async list(constraints: QueryConstraint[] = []): Promise<T[]> {
    const q = query(this.getCollection(), ...constraints);
    const snapshot = await getDocs(q);
    
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    } as T));
  }

  subscribe(
    callback: (items: T[]) => void,
    constraints: QueryConstraint[] = []
  ): () => void {
    const q = query(this.getCollection(), ...constraints);
    
    return onSnapshot(q, (snapshot) => {
      const items = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as T));
      callback(items);
    });
  }
}

// ========================================
// USER REPOSITORY
// ========================================

export class UserRepository extends BaseRepository<User> {
  protected collectionName: Collections = 'users';

  async createProfile(
    userId: string, 
    userData: {
      email: string;
      displayName: string;
      role?: 'free' | 'premium' | 'admin' | 'coach';
      experience?: 'beginner' | 'intermediate' | 'advanced' | 'professional';
    }
  ): Promise<void> {
    const user: Omit<User, 'id'> = {
      email: userData.email,
      displayName: userData.displayName,
      role: userData.role || 'free',
      experience: userData.experience || 'beginner',
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
      stats: {
        totalShots: 0,
        improvedShots: 0,
        currentStreak: 0,
        bestStreak: 0,
        totalPoints: 0,
        level: 1,
        totalTrainingTime: 0,
        completedPlans: 0,
        averageScore: 0,
        lastActive: serverTimestamp() as Timestamp
      },
      preferences: {
        notifications: true,
        shareProgress: true,
        preferredUnits: 'imperial',
        privacyLevel: 'public',
        autoShare: false
      }
    };

    await this.create(userId, user);
  }

  async updateStats(userId: string, statUpdates: Partial<User['stats']>): Promise<void> {
    const userRef = this.getDocRef(userId);
    const updateData: any = { updatedAt: serverTimestamp() };
    
    // Use increment for numeric stats
    Object.entries(statUpdates).forEach(([key, value]) => {
      if (typeof value === 'number' && key !== 'level') {
        updateData[`stats.${key}`] = increment(value);
      } else {
        updateData[`stats.${key}`] = value;
      }
    });

    await updateDoc(userRef, updateData);
  }

  async getLeaderboard(limit_count: number = 10): Promise<User[]> {
    return this.list([
      where('preferences.privacyLevel', '==', 'public'),
      orderBy('stats.totalPoints', 'desc'),
      limit(limit_count)
    ]);
  }

  // ========================================
  // BACKWARDS COMPATIBILITY METHODS
  // ========================================

  // Legacy method aliases for existing codebase
  async getProfile(userId: string): Promise<User | null> {
    return this.getById(userId);
  }

  async updateProfile(userId: string, updates: Partial<Omit<User, 'id'>>): Promise<void> {
    return this.update(userId, updates);
  }

  subscribeToProfile(userId: string, callback: (profile: User | null) => void): () => void {
    const docRef = this.getDocRef(userId);
    return onSnapshot(docRef, (doc: any) => {
      if (doc.exists()) {
        callback({ id: doc.id, ...doc.data() } as User);
      } else {
        callback(null);
      }
    });
  }
}

// ========================================
// VIDEO REPOSITORY
// ========================================

export class VideoRepository extends BaseRepository<Video> {
  protected collectionName: Collections = 'videos';

  async createVideo(
    videoId: string,
    userId: string,
    videoData: {
      fileName: string;
      originalName: string;
      mimeType: string;
      size: number;
      duration: number;
      storageUrl: string;
      metadata: Video['metadata'];
    }
  ): Promise<void> {
    const video: Omit<Video, 'id'> = {
      ...videoData,
      userId,
      status: 'ready',
      uploadedAt: serverTimestamp() as Timestamp
    };

    await this.create(videoId, video);
  }

  async getByUser(userId: string): Promise<Video[]> {
    return this.list([
      where('userId', '==', userId),
      orderBy('uploadedAt', 'desc')
    ]);
  }

  async updateStatus(videoId: string, status: Video['status']): Promise<void> {
    await this.update(videoId, { 
      status,
      ...(status === 'ready' ? { processedAt: serverTimestamp() as Timestamp } : {})
    });
  }
}

// ========================================
// SHOT REPOSITORY
// ========================================

export class ShotRepository extends BaseRepository<Shot> {
  protected collectionName: Collections = 'shots';

  async createShot(
    shotId: string,
    userId: string,
    videoId: string,
    shotData?: Partial<Shot>
  ): Promise<void> {
    const shot: Omit<Shot, 'id'> = {
      userId,
      videoId,
      status: 'queued',
      shared: false,
      createdAt: serverTimestamp() as Timestamp,
      ...shotData
    };

    await this.create(shotId, shot);
  }

  async updateAnalysis(
    shotId: string, 
    metrics: Shot['metrics'],
    result?: 'make' | 'miss'
  ): Promise<void> {
    await this.update(shotId, {
      metrics,
      status: 'completed',
      analyzedAt: serverTimestamp() as Timestamp,
      ...(result ? { result } : {})
    });
  }

  async getByUser(userId: string, includeShared: boolean = false): Promise<Shot[]> {
    const constraints: QueryConstraint[] = [where('userId', '==', userId)];
    
    if (includeShared) {
      constraints.push(where('shared', '==', true));
    }
    
    constraints.push(orderBy('createdAt', 'desc'));
    
    return this.list(constraints);
  }

  async getSharedShots(limit_count: number = 20): Promise<Shot[]> {
    return this.list([
      where('shared', '==', true),
      where('status', '==', 'completed'),
      orderBy('metrics.overall_score', 'desc'),
      limit(limit_count)
    ]);
  }

  async shareShot(shotId: string): Promise<void> {
    await this.update(shotId, { shared: true });
  }

  // ========================================
  // BACKWARDS COMPATIBILITY METHODS
  // ========================================

  // Legacy method aliases for existing codebase
  async getUserShots(userId: string, includeShared: boolean = false): Promise<Shot[]> {
    return this.getByUser(userId, includeShared);
  }

  subscribeToUserShots(userId: string, callback: (shots: Shot[]) => void): () => void {
    return this.subscribe(callback, [
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    ]);
  }

  async updateShotAnalysis(
    shotId: string, 
    metrics: Shot['metrics'],
    result?: 'make' | 'miss'
  ): Promise<void> {
    return this.updateAnalysis(shotId, metrics, result);
  }

  // Legacy wrapper method - creates shot with auto-generated IDs
  async createShotLegacy(userId: string, shotData: Partial<Shot>): Promise<string> {
    const shotId = `shot_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const videoId = shotData.videoId || `video_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    await this.createShot(shotId, userId, videoId, shotData);
    return shotId;
  }
}

// ========================================
// DRILL REPOSITORY
// ========================================

export class DrillRepository extends BaseRepository<Drill> {
  protected collectionName: Collections = 'drills';

  async getDrillsByCategory(category: Drill['category']): Promise<Drill[]> {
    return this.list([
      where('category', '==', category),
      orderBy('popularity', 'desc')
    ]);
  }

  async getDrillsByDifficulty(difficulty: Drill['difficulty']): Promise<Drill[]> {
    return this.list([
      where('difficulty', '==', difficulty),
      orderBy('averageRating', 'desc')
    ]);
  }

  async searchDrills(tags: string[]): Promise<Drill[]> {
    // Note: Firestore doesn't support array-contains-any with other filters
    // This would typically be handled by a more complex query or search service
    return this.list([
      orderBy('popularity', 'desc'),
      limit(50)
    ]);
  }

  async incrementPopularity(drillId: string): Promise<void> {
    const drillRef = this.getDocRef(drillId);
    await updateDoc(drillRef, {
      popularity: increment(1)
    });
  }
}

// ========================================
// TRAINING PLAN REPOSITORY
// ========================================

export class TrainingPlanRepository extends BaseRepository<TrainingPlan> {
  protected collectionName: Collections = 'plans';

  async createPlan(
    planId: string,
    userId: string,
    planData: {
      title: string;
      description: string;
      difficulty: TrainingPlan['difficulty'];
      estimatedDuration: number;
      planItems: string[];
    }
  ): Promise<void> {
    const plan: Omit<TrainingPlan, 'id'> = {
      ...planData,
      userId,
      aiRecommendations: [],
      progress: {
        completedItems: 0,
        totalItems: planData.planItems.length,
        timeSpent: 0,
        completionPercentage: 0
      },
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp
    };

    await this.create(planId, plan);
  }

  async getByUser(userId: string): Promise<TrainingPlan[]> {
    return this.list([
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    ]);
  }

  async updateProgress(planId: string, progress: Partial<TrainingPlan['progress']>): Promise<void> {
    const updateData: any = { updatedAt: serverTimestamp() };
    
    Object.entries(progress).forEach(([key, value]) => {
      updateData[`progress.${key}`] = value;
    });

    const planRef = this.getDocRef(planId);
    await updateDoc(planRef, updateData);
  }

  async completePlan(planId: string): Promise<void> {
    const planRef = this.getDocRef(planId);
    await updateDoc(planRef, {
      completedAt: serverTimestamp(),
      'progress.completionPercentage': 100
    });
  }

  // ========================================
  // BACKWARDS COMPATIBILITY METHODS
  // ========================================

  // Legacy method aliases for existing codebase
  async getUserPlans(userId: string): Promise<TrainingPlan[]> {
    return this.list([
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    ]);
  }

  async updateDrillCompletion(planId: string, drillId: string, completed: boolean): Promise<void> {
    // This would typically update a plan item, but for backwards compatibility
    // we'll update the plan's progress
    const planRef = this.getDocRef(planId);
    await updateDoc(planRef, {
      [`progress.lastWorkedOn`]: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
  }
}

// ========================================
// PLAN ITEM REPOSITORY
// ========================================

export class PlanItemRepository extends BaseRepository<PlanItem> {
  protected collectionName: Collections = 'plan_items';

  async createPlanItem(
    itemId: string,
    planId: string,
    drillId: string,
    order: number,
    customizations?: Partial<PlanItem>
  ): Promise<void> {
    const planItem: Omit<PlanItem, 'id'> = {
      planId,
      drillId,
      order,
      completed: false,
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp,
      ...customizations
    };

    await this.create(itemId, planItem);
  }

  async getByPlan(planId: string): Promise<PlanItem[]> {
    return this.list([
      where('planId', '==', planId),
      orderBy('order', 'asc')
    ]);
  }

  async completePlanItem(
    itemId: string,
    timeSpent: number,
    userRating?: number,
    userNotes?: string
  ): Promise<void> {
    await this.update(itemId, {
      completed: true,
      completedAt: serverTimestamp() as Timestamp,
      timeSpent,
      userRating,
      userNotes
    });
  }
}

// ========================================
// SCORE REPOSITORY
// ========================================

export class ScoreRepository extends BaseRepository<Score> {
  protected collectionName: Collections = 'scores';

  async createScore(
    scoreId: string,
    userId: string,
    scoreData: {
      type: Score['type'];
      points: number;
      category: string;
      description: string;
      shotId?: string;
      drillId?: string;
      planId?: string;
    }
  ): Promise<void> {
    const score: Omit<Score, 'id'> = {
      ...scoreData,
      userId,
      earnedAt: serverTimestamp() as Timestamp,
      isPublic: true // Default to public for leaderboards
    };

    await this.create(scoreId, score);
  }

  async getByUser(userId: string, type?: Score['type']): Promise<Score[]> {
    const constraints: QueryConstraint[] = [where('userId', '==', userId)];
    
    if (type) {
      constraints.push(where('type', '==', type));
    }
    
    constraints.push(orderBy('earnedAt', 'desc'));
    
    return this.list(constraints);
  }

  async getLeaderboard(type?: Score['type'], limit_count: number = 10): Promise<Score[]> {
    const constraints: QueryConstraint[] = [where('isPublic', '==', true)];
    
    if (type) {
      constraints.push(where('type', '==', type));
    }
    
    constraints.push(orderBy('points', 'desc'), limit(limit_count));
    
    return this.list(constraints);
  }
}

// ========================================
// COMMUNITY POST REPOSITORY
// ========================================

export class CommunityPostRepository extends BaseRepository<CommunityPost> {
  protected collectionName: Collections = 'community_posts';

  async createPost(
    postId: string,
    userId: string,
    userName: string,
    postData: {
      content: string;
      type: CommunityPost['type'];
      media?: string[];
      shotId?: string;
      trainingPlanId?: string;
      drillId?: string;
      tags?: string[];
    }
  ): Promise<void> {
    const post: Omit<CommunityPost, 'id'> = {
      ...postData,
      userId,
      userName,
      likes: 0,
      comments: 0,
      shares: 0,
      reported: false,
      moderated: false,
      approved: true, // Auto-approve for now
      visibility: 'public',
      createdAt: serverTimestamp() as Timestamp,
      updatedAt: serverTimestamp() as Timestamp
    };

    await this.create(postId, post);
  }

  async getFeed(visibility: 'public' | 'friends' = 'public', limit_count: number = 20): Promise<CommunityPost[]> {
    return this.list([
      where('visibility', '==', visibility),
      where('approved', '==', true),
      orderBy('createdAt', 'desc'),
      limit(limit_count)
    ]);
  }

  async getByUser(userId: string): Promise<CommunityPost[]> {
    return this.list([
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    ]);
  }

  async likePost(postId: string): Promise<void> {
    const postRef = this.getDocRef(postId);
    await updateDoc(postRef, {
      likes: increment(1)
    });
  }

  async reportPost(postId: string): Promise<void> {
    await this.update(postId, { reported: true });
  }

  // ========================================
  // BACKWARDS COMPATIBILITY METHODS
  // ========================================

  // Legacy method aliases for existing codebase
  async getLeaderboard(): Promise<User[]> {
    // This method should be on UserRepository, but we'll delegate to it
    const userRepo = new UserRepository();
    return userRepo.getLeaderboard();
  }

  subscribeToFeed(callback: (posts: CommunityPost[]) => void): () => void {
    return this.subscribe(callback, [
      where('visibility', '==', 'public'),
      where('approved', '==', true),
      orderBy('createdAt', 'desc'),
      limit(20)
    ]);
  }

  subscribeToLeaderboard(callback: (users: User[]) => void): () => void {
    // This should delegate to UserRepository
    const userRepo = new UserRepository();
    return userRepo.subscribe(callback, [
      where('preferences.privacyLevel', '==', 'public'),
      orderBy('stats.totalPoints', 'desc'),
      limit(10)
    ]);
  }

  // Legacy wrapper method - creates post with auto-generated userName
  async createPostLegacy(userId: string, postData: any): Promise<string> {
    const postId = `post_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const userName = `User_${userId.substr(0, 8)}`; // Fallback username
    
    await this.createPost(postId, userId, userName, postData);
    return postId;
  }
}

// ========================================
// REPOSITORY FACTORY
// ========================================

export class RepositoryFactory {
  private static instances: Map<string, any> = new Map();

  static getRepository<T extends BaseRepository<any>>(
    repositoryClass: new () => T
  ): T {
    const className = repositoryClass.name;
    
    if (!this.instances.has(className)) {
      this.instances.set(className, new repositoryClass());
    }
    
    return this.instances.get(className);
  }

  // Convenience methods
  static users(): UserRepository {
    return this.getRepository(UserRepository);
  }

  static videos(): VideoRepository {
    return this.getRepository(VideoRepository);
  }

  static shots(): ShotRepository {
    return this.getRepository(ShotRepository);
  }

  static drills(): DrillRepository {
    return this.getRepository(DrillRepository);
  }

  static plans(): TrainingPlanRepository {
    return this.getRepository(TrainingPlanRepository);
  }

  static planItems(): PlanItemRepository {
    return this.getRepository(PlanItemRepository);
  }

  static scores(): ScoreRepository {
    return this.getRepository(ScoreRepository);
  }

  static community(): CommunityPostRepository {
    return this.getRepository(CommunityPostRepository);
  }
}

// Export singleton instances
export const repositories = {
  users: RepositoryFactory.users(),
  videos: RepositoryFactory.videos(),
  shots: RepositoryFactory.shots(),
  drills: RepositoryFactory.drills(),
  plans: RepositoryFactory.plans(),
  planItems: RepositoryFactory.planItems(),
  scores: RepositoryFactory.scores(),
  community: RepositoryFactory.community()
};

// Export migration utilities
export { migrator, initializeDatabase } from './migrations';
