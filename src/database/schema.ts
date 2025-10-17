/**
 * Firebase/Firestore Database Schema v1
 * 
 * This file defines the complete data model for the Basketball AI Ecosystem.
 * Collections: users, videos, shots, metrics, drills, plans, plan_items, scores
 */

import { Timestamp } from 'firebase/firestore';

// ========================================
// CORE USER SCHEMA
// ========================================

export type UserRole = 'free' | 'premium' | 'admin' | 'coach';

export interface User {
  id: string; // Firebase Auth UID
  email: string;
  displayName: string;
  role: UserRole;
  avatar?: string;
  phone?: string;
  dateOfBirth?: string;
  height?: number; // inches
  weight?: number; // pounds
  position?: 'PG' | 'SG' | 'SF' | 'PF' | 'C';
  experience: 'beginner' | 'intermediate' | 'advanced' | 'professional';
  createdAt: Timestamp;
  updatedAt: Timestamp;
  
  // User statistics
  stats: UserStats;
  
  // User preferences
  preferences: UserPreferences;
  
  // Subscription info
  subscription?: UserSubscription;
}

export interface UserStats {
  totalShots: number;
  improvedShots: number;
  currentStreak: number;
  bestStreak: number;
  totalPoints: number;
  level: number;
  totalTrainingTime: number; // minutes
  completedPlans: number;
  averageScore: number;
  lastActive: Timestamp;
}

export interface UserPreferences {
  notifications: boolean;
  shareProgress: boolean;
  preferredUnits: 'metric' | 'imperial';
  reminderTime?: string; // HH:mm format
  privacyLevel: 'public' | 'friends' | 'private';
  autoShare: boolean;
}

export interface UserSubscription {
  plan: 'free' | 'premium' | 'coach';
  status: 'active' | 'canceled' | 'past_due';
  startDate: Timestamp;
  endDate?: Timestamp;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
}

// ========================================
// VIDEO SCHEMA
// ========================================

export interface Video {
  id: string;
  userId: string;
  fileName: string;
  originalName: string;
  mimeType: string;
  size: number; // bytes
  duration: number; // seconds
  fps?: number;
  resolution?: {
    width: number;
    height: number;
  };
  storageUrl: string;
  thumbnailUrl?: string;
  status: 'uploading' | 'processing' | 'ready' | 'failed';
  uploadedAt: Timestamp;
  processedAt?: Timestamp;
  
  // Video metadata
  metadata: VideoMetadata;
}

export interface VideoMetadata {
  shootingAngle?: 'front' | 'side' | '3quarter';
  court?: string;
  location?: GeoLocation;
  lighting?: 'indoor' | 'outdoor' | 'low_light';
  backgroundType?: 'clean' | 'crowded' | 'mixed';
  playerCount?: number;
}

export interface GeoLocation {
  lat: number;
  lng: number;
  address?: string;
  venue?: string;
}

// ========================================
// SHOT ANALYSIS SCHEMA
// ========================================

export interface Shot {
  id: string;
  userId: string;
  videoId: string;
  status: 'queued' | 'processing' | 'completed' | 'failed';
  
  // Analysis results
  metrics?: ShotMetrics;
  
  // Timestamps
  createdAt: Timestamp;
  analyzedAt?: Timestamp;
  
  // Metadata
  shotType?: 'free_throw' | 'mid_range' | 'three_pointer' | 'layup';
  result?: 'make' | 'miss';
  shared: boolean;
  tags?: string[];
}

export interface ShotMetrics {
  // Core biomechanics
  release_ms: number;
  elbow_angle_deg: number;
  wrist_flick_deg_s: number;
  arc_proxy_deg: number;
  
  // Derived scores
  consistency_score: number; // 0-10
  form_score: number; // 0-10
  timing_score: number; // 0-10
  overall_score: number; // 0-10
  
  // Improvement suggestions
  tips: string[];
  improvements: string[];
  
  // Detailed analysis
  keypoints?: KeypointData[];
  trajectory?: TrajectoryData;
}

export interface KeypointData {
  frame: number;
  timestamp: number; // milliseconds
  joints: {
    [jointName: string]: {
      x: number;
      y: number;
      confidence: number;
    };
  };
}

export interface TrajectoryData {
  points: {
    x: number;
    y: number;
    timestamp: number;
  }[];
  peak_height: number;
  release_angle: number;
  entry_angle: number;
}

// ========================================
// DRILL SCHEMA
// ========================================

export interface Drill {
  id: string;
  title: string;
  description: string;
  category: 'shooting' | 'dribbling' | 'defense' | 'footwork' | 'conditioning';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  duration: number; // minutes
  equipment: string[];
  
  // Instructions
  instructions: DrillInstruction[];
  
  // Media
  videoUrl?: string;
  imageUrl?: string;
  
  // Metadata
  tags: string[];
  popularity: number;
  averageRating: number;
  
  // AI coaching
  focusAreas: string[]; // What this drill improves
  prerequisites?: string[]; // Required skills
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
  createdBy?: string; // userId for custom drills
}

export interface DrillInstruction {
  step: number;
  title: string;
  description: string;
  duration?: number; // seconds for this step
  repetitions?: number;
  restTime?: number; // seconds
  imageUrl?: string;
  videoUrl?: string;
}

// ========================================
// TRAINING PLAN SCHEMA
// ========================================

export interface TrainingPlan {
  id: string;
  userId: string;
  title: string;
  description: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedDuration: number; // minutes
  
  // Plan structure
  planItems: string[]; // Array of plan_item IDs
  
  // AI recommendations
  aiRecommendations: string[];
  generatedFrom?: 'ai_analysis' | 'template' | 'custom';
  
  // Progress tracking
  progress: PlanProgress;
  
  // Scheduling
  scheduledFor?: Timestamp;
  dueDate?: Timestamp;
  
  // Metadata
  createdAt: Timestamp;
  updatedAt: Timestamp;
  completedAt?: Timestamp;
}

export interface PlanProgress {
  completedItems: number;
  totalItems: number;
  timeSpent: number; // minutes
  startedAt?: Timestamp;
  lastWorkedOn?: Timestamp;
  completionPercentage: number;
}

// ========================================
// PLAN ITEMS SCHEMA
// ========================================

export interface PlanItem {
  id: string;
  planId: string;
  drillId: string;
  order: number; // Position in the plan
  
  // Customizations for this specific plan
  customDuration?: number;
  customInstructions?: string;
  customRepetitions?: number;
  
  // Completion tracking
  completed: boolean;
  completedAt?: Timestamp;
  timeSpent?: number; // minutes
  userRating?: number; // 1-5 stars
  userNotes?: string;
  
  // Performance data
  performanceData?: PlanItemPerformance;
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface PlanItemPerformance {
  attempts?: number;
  successes?: number;
  improvements?: string[];
  difficulty_rating?: number; // 1-5, how hard was this?
  energy_level?: number; // 1-5, energy after completion
}

// ========================================
// SCORING/METRICS SCHEMA
// ========================================

export interface Score {
  id: string;
  userId: string;
  type: 'shot_analysis' | 'drill_completion' | 'plan_completion' | 'streak' | 'achievement';
  
  // Related entities
  shotId?: string;
  drillId?: string;
  planId?: string;
  
  // Score data
  points: number;
  multiplier?: number;
  category: string;
  
  // Composite scoring
  rawScore?: number;
  normalizedScore?: number;
  
  // Context
  description: string;
  achievement?: string;
  
  // Timestamps
  earnedAt: Timestamp;
  
  // Leaderboard data
  isPublic: boolean;
  rank?: number;
}

// ========================================
// COMMUNITY & SOCIAL SCHEMA
// ========================================

export interface CommunityPost {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  type: 'shot_analysis' | 'achievement' | 'general' | 'training_plan' | 'drill_completion';
  
  // Media attachments
  media?: string[];
  
  // Related entities
  shotId?: string;
  trainingPlanId?: string;
  drillId?: string;
  
  // Engagement
  likes: number;
  comments: number;
  shares: number;
  
  // Moderation
  reported: boolean;
  moderated: boolean;
  approved: boolean;
  
  // Metadata
  tags?: string[];
  visibility: 'public' | 'friends' | 'private';
  
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ========================================
// UTILITY TYPES
// ========================================

export type Collections = 
  | 'users'
  | 'videos' 
  | 'shots'
  | 'drills'
  | 'plans'
  | 'plan_items'
  | 'scores'
  | 'community_posts';

export interface DatabaseMetadata {
  version: string;
  lastMigration: Timestamp;
  collections: Collections[];
}

// ========================================
// VALIDATION SCHEMAS
// ========================================

export const VALIDATION_RULES = {
  user: {
    displayName: { minLength: 2, maxLength: 50 },
    email: { required: true, format: 'email' },
    phone: { format: 'phone', optional: true },
  },
  shot: {
    metrics: {
      release_ms: { min: 100, max: 2000 },
      elbow_angle_deg: { min: 0, max: 180 },
      wrist_flick_deg_s: { min: 0, max: 1000 },
      arc_proxy_deg: { min: 0, max: 90 },
      scores: { min: 0, max: 10 },
    },
  },
  drill: {
    title: { minLength: 5, maxLength: 100 },
    duration: { min: 1, max: 180 }, // 1 minute to 3 hours
    difficulty: ['beginner', 'intermediate', 'advanced'],
  },
} as const;

// Export validation rules and constants
export default {
  VALIDATION_RULES,
};
