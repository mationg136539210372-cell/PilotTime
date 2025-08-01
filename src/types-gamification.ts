export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon: string; // Emoji or icon name
  category: 'streak' | 'milestone' | 'efficiency' | 'consistency' | 'special';
  condition: {
    type: 'study_streak' | 'total_hours' | 'tasks_completed' | 'perfect_week' | 'early_finisher' | 'night_owl' | 'early_bird' | 'efficiency_master';
    target: number;
    timeframe?: 'daily' | 'weekly' | 'monthly' | 'all_time';
  };
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  points: number;
  unlockedAt?: string; // ISO timestamp
  progress?: number; // Current progress toward achievement
}

export interface UserStats {
  totalStudyHours: number;
  totalTasksCompleted: number;
  currentStreak: number;
  longestStreak: number;
  perfectWeeks: number; // Weeks where all planned sessions were completed
  earlyFinishes: number; // Tasks completed before deadline
  totalSessions: number;
  averageSessionLength: number;
  favoriteStudyTime: 'morning' | 'afternoon' | 'evening';
  efficiencyScore: number; // Ratio of actual vs estimated time
  level: number;
  totalPoints: number;
  joinedDate: string;
  lastActiveDate: string;
}

export interface DailyChallenge {
  id: string;
  title: string;
  description: string;
  icon: string;
  target: number;
  progress: number;
  completed: boolean;
  points: number;
  expiresAt: string; // End of day
  type: 'study_hours' | 'complete_tasks' | 'use_timer' | 'early_start' | 'no_missed_sessions';
}

export interface StudyStreak {
  current: number;
  longest: number;
  lastStudyDate: string;
  streakDates: string[]; // Array of dates in streak
}

export interface Milestone {
  id: string;
  title: string;
  description: string;
  icon: string;
  target: number;
  progress: number;
  category: 'hours' | 'tasks' | 'days' | 'efficiency';
  completed: boolean;
  completedAt?: string;
}

export interface WeeklyGoal {
  weekStart: string; // ISO date string for Monday of the week
  targetHours: number;
  actualHours: number;
  targetTasks: number;
  actualTasks: number;
  perfectDays: number; // Days where all planned sessions were completed
  completed: boolean;
  bonus: boolean; // Exceeded goals by 20%
}

export interface MotivationalMessage {
  id: string;
  message: string;
  type: 'encouragement' | 'celebration' | 'tip' | 'reminder';
  context: 'streak_continue' | 'streak_break' | 'goal_achieved' | 'study_start' | 'study_complete' | 'weekly_review';
  icon: string;
}

export interface UserLevel {
  current: number;
  points: number;
  pointsToNext: number;
  title: string;
  benefits: string[];
}

export interface GamificationData {
  achievements: Achievement[];
  unlockedAchievements: string[]; // Achievement IDs
  stats: UserStats;
  streak: StudyStreak;
  milestones: Milestone[];
  dailyChallenge?: DailyChallenge;
  weeklyGoal?: WeeklyGoal;
  level: UserLevel;
  recentUnlocks: string[]; // Recent achievement IDs for notifications
}
