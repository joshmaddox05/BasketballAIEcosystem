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

// Types for our data structures
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
  drills: Array<{
    id: string;
    title: string;
    description: string;
    duration: number;
    completed: boolean;
    instructions: string[];
    videoUrl?: string;
  }>;
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

// User Profile Service
export const userService = {
  async createProfile(userId: string, userData: {
    email: string;
    displayName: string;
    role?: 'free' | 'premium' | 'admin';
  }): Promise<void> {
    const userRef = doc(db, 'users', userId);
    await setDoc(userRef, {
      ...userData,
      role: userData.role || 'free',
      avatar: null,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      stats: {
        totalShots: 0,
        improvedShots: 0,
        currentStreak: 0,
        bestStreak: 0,
        totalPoints: 0,
        level: 1
      },
      preferences: {
        notifications: true,
        shareProgress: true,
        preferredUnits: 'imperial'
      }
    });
  },

  async getProfile(userId: string): Promise<UserProfile | null> {
    const userRef = doc(db, 'users', userId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      return { id: userSnap.id, ...userSnap.data() } as UserProfile;
    }
    return null;
  },

  async updateProfile(userId: string, updates: Partial<UserProfile>): Promise<void> {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  },

  async updateStats(userId: string, statUpdates: Partial<UserProfile['stats']>): Promise<void> {
    const userRef = doc(db, 'users', userId);
    const updateData: any = { updatedAt: serverTimestamp() };
    
    // Use increment for numeric stats
    Object.entries(statUpdates).forEach(([key, value]) => {
      if (typeof value === 'number') {
        updateData[`stats.${key}`] = increment(value);
      } else {
        updateData[`stats.${key}`] = value;
      }
    });

    await updateDoc(userRef, updateData);
  },

  subscribeToProfile(userId: string, callback: (profile: UserProfile | null) => void) {
    const userRef = doc(db, 'users', userId);
    return onSnapshot(userRef, (doc) => {
      if (doc.exists()) {
        callback({ id: doc.id, ...doc.data() } as UserProfile);
      } else {
        callback(null);
      }
    });
  }
};

// Shot Analysis Service
export const shotService = {
  async createShot(userId: string, shotData: {
    videoUrl: string;
    thumbnailUrl?: string;
    location?: { lat: number; lng: number; court?: string };
  }): Promise<string> {
    const shotRef = doc(collection(db, 'shots'));
    await setDoc(shotRef, {
      userId,
      ...shotData,
      status: 'processing',
      shared: false,
      createdAt: serverTimestamp()
    });
    return shotRef.id;
  },

  async updateShotAnalysis(shotId: string, analysis: ShotAnalysis['metrics']): Promise<void> {
    const shotRef = doc(db, 'shots', shotId);
    await updateDoc(shotRef, {
      metrics: analysis,
      status: 'completed'
    });
  },

  async getUserShots(userId: string, limitCount = 20): Promise<ShotAnalysis[]> {
    const shotsQuery = query(
      collection(db, 'shots'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const shotsSnap = await getDocs(shotsQuery);
    return shotsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShotAnalysis));
  },

  async getSharedShots(limitCount = 20): Promise<ShotAnalysis[]> {
    const shotsQuery = query(
      collection(db, 'shots'),
      where('shared', '==', true),
      where('status', '==', 'completed'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const shotsSnap = await getDocs(shotsQuery);
    return shotsSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShotAnalysis));
  },

  async shareShot(shotId: string): Promise<void> {
    const shotRef = doc(db, 'shots', shotId);
    await updateDoc(shotRef, { shared: true });
  },

  subscribeToUserShots(userId: string, callback: (shots: ShotAnalysis[]) => void) {
    const shotsQuery = query(
      collection(db, 'shots'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    
    return onSnapshot(shotsQuery, (snapshot) => {
      const shots = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShotAnalysis));
      callback(shots);
    });
  }
};

// Training Plan Service
export const trainingService = {
  async createPlan(userId: string, planData: Omit<TrainingPlan, 'id' | 'userId' | 'createdAt' | 'updatedAt'>): Promise<string> {
    const planRef = doc(collection(db, 'training_plans'));
    await setDoc(planRef, {
      userId,
      ...planData,
      progress: {
        completedDrills: 0,
        totalDrills: planData.drills.length,
        timeSpent: 0
      },
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });
    return planRef.id;
  },

  async getUserPlans(userId: string): Promise<TrainingPlan[]> {
    const plansQuery = query(
      collection(db, 'training_plans'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const plansSnap = await getDocs(plansQuery);
    return plansSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as TrainingPlan));
  },

  async updateDrillCompletion(planId: string, drillIndex: number, completed: boolean, timeSpent?: number): Promise<void> {
    const planRef = doc(db, 'training_plans', planId);
    const planSnap = await getDoc(planRef);
    
    if (planSnap.exists()) {
      const planData = planSnap.data() as TrainingPlan;
      const updatedDrills = [...planData.drills];
      updatedDrills[drillIndex].completed = completed;
      
      const completedCount = updatedDrills.filter(drill => drill.completed).length;
      
      const updates: any = {
        drills: updatedDrills,
        'progress.completedDrills': completedCount,
        updatedAt: serverTimestamp()
      };

      if (timeSpent) {
        updates['progress.timeSpent'] = increment(timeSpent);
      }
      
      await updateDoc(planRef, updates);
    }
  },

  async getPlan(planId: string): Promise<TrainingPlan | null> {
    const planRef = doc(db, 'training_plans', planId);
    const planSnap = await getDoc(planRef);
    if (planSnap.exists()) {
      return { id: planSnap.id, ...planSnap.data() } as TrainingPlan;
    }
    return null;
  }
};

// Community Service
export const communityService = {
  async createPost(userId: string, postData: Omit<CommunityPost, 'id' | 'userId' | 'userName' | 'userAvatar' | 'likes' | 'comments' | 'createdAt'>): Promise<string> {
    // Get user info for the post
    const userProfile = await userService.getProfile(userId);
    
    const postRef = doc(collection(db, 'community_posts'));
    await setDoc(postRef, {
      userId,
      userName: userProfile?.displayName || 'Anonymous',
      userAvatar: userProfile?.avatar || null,
      ...postData,
      likes: 0,
      comments: 0,
      createdAt: serverTimestamp()
    });
    return postRef.id;
  },

  async getFeed(limitCount = 20): Promise<CommunityPost[]> {
    const feedQuery = query(
      collection(db, 'community_posts'),
      orderBy('createdAt', 'desc'),
      limit(limitCount)
    );
    const feedSnap = await getDocs(feedQuery);
    return feedSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as CommunityPost));
  },

  async likePost(postId: string): Promise<void> {
    const postRef = doc(db, 'community_posts', postId);
    await updateDoc(postRef, {
      likes: increment(1)
    });
  },

  async getLeaderboard(limitCount = 10): Promise<UserProfile[]> {
    const usersQuery = query(
      collection(db, 'users'),
      orderBy('stats.totalPoints', 'desc'),
      limit(limitCount)
    );
    const usersSnap = await getDocs(usersQuery);
    return usersSnap.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
  },

  subscribeToFeed(callback: (posts: CommunityPost[]) => void) {
    const feedQuery = query(
      collection(db, 'community_posts'),
      orderBy('createdAt', 'desc'),
      limit(20)
    );
    
    return onSnapshot(feedQuery, (snapshot) => {
      const posts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as CommunityPost));
      callback(posts);
    });
  },

  subscribeToLeaderboard(callback: (users: UserProfile[]) => void) {
    const leaderboardQuery = query(
      collection(db, 'users'),
      orderBy('stats.totalPoints', 'desc'),
      limit(10)
    );
    
    return onSnapshot(leaderboardQuery, (snapshot) => {
      const users = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as UserProfile));
      callback(users);
    });
  }
};
