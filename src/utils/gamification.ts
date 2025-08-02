import { 
  Achievement, 
  UserStats, 
  DailyChallenge, 
  StudyStreak, 
  Milestone, 
  WeeklyGoal, 
  MotivationalMessage, 
  UserLevel,
  GamificationData 
} from '../types-gamification';
import { StudyPlan, StudySession, Task } from '../types';

// Achievement definitions
export const ACHIEVEMENTS: Achievement[] = [
  // Streak Achievements
  {
    id: 'streak_3',
    title: 'Getting Started',
    description: 'Study for 3 days in a row',
    icon: '🔥',
    category: 'streak',
    condition: { type: 'study_streak', target: 3 },
    rarity: 'common',
    points: 50
  },
  {
    id: 'streak_7',
    title: 'Week Warrior',
    description: 'Study for 7 days in a row',
    icon: '🔥',
    category: 'streak',
    condition: { type: 'study_streak', target: 7 },
    rarity: 'rare',
    points: 150
  },
  {
    id: 'streak_30',
    title: 'Study Master',
    description: 'Study for 30 days in a row',
    icon: '🔥',
    category: 'streak',
    condition: { type: 'study_streak', target: 30 },
    rarity: 'epic',
    points: 500
  },
  {
    id: 'streak_100',
    title: 'Unstoppable Force',
    description: 'Study for 100 days in a row',
    icon: '🔥',
    category: 'streak',
    condition: { type: 'study_streak', target: 100 },
    rarity: 'legendary',
    points: 1000
  },

  // Milestone Achievements
  {
    id: 'hours_10',
    title: 'First Steps',
    description: 'Complete 10 hours of study',
    icon: '⏰',
    category: 'milestone',
    condition: { type: 'total_hours', target: 10 },
    rarity: 'common',
    points: 30
  },
  {
    id: 'hours_50',
    title: 'Dedicated Learner',
    description: 'Complete 50 hours of study',
    icon: '📚',
    category: 'milestone',
    condition: { type: 'total_hours', target: 50 },
    rarity: 'rare',
    points: 100
  },
  {
    id: 'hours_100',
    title: 'Study Champion',
    description: 'Complete 100 hours of study',
    icon: '🏆',
    category: 'milestone',
    condition: { type: 'total_hours', target: 100 },
    rarity: 'epic',
    points: 300
  },
  {
    id: 'hours_500',
    title: 'Knowledge Seeker',
    description: 'Complete 500 hours of study',
    icon: '🌟',
    category: 'milestone',
    condition: { type: 'total_hours', target: 500 },
    rarity: 'legendary',
    points: 1500
  },

  // Task Completion Achievements
  {
    id: 'tasks_5',
    title: 'Task Tackler',
    description: 'Complete 5 tasks',
    icon: '✅',
    category: 'milestone',
    condition: { type: 'tasks_completed', target: 5 },
    rarity: 'common',
    points: 25
  },
  {
    id: 'tasks_25',
    title: 'Goal Getter',
    description: 'Complete 25 tasks',
    icon: '🎯',
    category: 'milestone',
    condition: { type: 'tasks_completed', target: 25 },
    rarity: 'rare',
    points: 100
  },
  {
    id: 'tasks_100',
    title: 'Achievement Unlocked',
    description: 'Complete 100 tasks',
    icon: '🏅',
    category: 'milestone',
    condition: { type: 'tasks_completed', target: 100 },
    rarity: 'epic',
    points: 400
  },

  // Efficiency Achievements
  {
    id: 'perfect_week',
    title: 'Perfect Week',
    description: 'Complete all planned sessions for a week',
    icon: '💯',
    category: 'efficiency',
    condition: { type: 'perfect_week', target: 1, timeframe: 'weekly' },
    rarity: 'rare',
    points: 200
  },
  {
    id: 'early_finisher',
    title: 'Ahead of Schedule',
    description: 'Complete 10 tasks before their deadline',
    icon: '⚡',
    category: 'efficiency',
    condition: { type: 'early_finisher', target: 10 },
    rarity: 'rare',
    points: 150
  },
  {
    id: 'early_bird',
    title: 'Early Bird',
    description: 'Start studying before 7 AM for 7 days',
    icon: '🌅',
    category: 'special',
    condition: { type: 'early_bird', target: 7 },
    rarity: 'rare',
    points: 120
  },
  {
    id: 'night_owl',
    title: 'Night Owl',
    description: 'Study after 9 PM for 7 days',
    icon: '🦉',
    category: 'special',
    condition: { type: 'night_owl', target: 7 },
    rarity: 'rare',
    points: 120
  },
  {
    id: 'efficiency_master',
    title: 'Efficiency Master',
    description: 'Maintain 90%+ efficiency for 2 weeks',
    icon: '⚙️',
    category: 'efficiency',
    condition: { type: 'efficiency_master', target: 90 },
    rarity: 'epic',
    points: 350
  }
];

// Level system
export function calculateLevel(points: number): UserLevel {
  const levels = [
    { level: 1, threshold: 0, title: 'Beginner', benefits: ['Basic progress tracking'] },
    { level: 2, threshold: 100, title: 'Student', benefits: ['Daily challenges unlocked'] },
    { level: 3, threshold: 300, title: 'Scholar', benefits: ['Weekly goals available'] },
    { level: 4, threshold: 600, title: 'Learner', benefits: ['Advanced statistics'] },
    { level: 5, threshold: 1000, title: 'Achiever', benefits: ['Streak bonuses'] },
    { level: 6, threshold: 1500, title: 'Expert', benefits: ['Custom themes'] },
    { level: 7, threshold: 2200, title: 'Master', benefits: ['Exclusive achievements'] },
    { level: 8, threshold: 3000, title: 'Guru', benefits: ['Leaderboard access'] },
    { level: 9, threshold: 4000, title: 'Legend', benefits: ['Beta features'] },
    { level: 10, threshold: 5500, title: 'TimePilot Elite', benefits: ['All features unlocked'] }
  ];

  let currentLevel = levels[0];
  let nextLevel = levels[1];

  for (let i = 0; i < levels.length; i++) {
    if (points >= levels[i].threshold) {
      currentLevel = levels[i];
      nextLevel = levels[i + 1] || levels[i];
    } else {
      break;
    }
  }

  return {
    current: currentLevel.level,
    points,
    pointsToNext: nextLevel ? nextLevel.threshold - points : 0,
    title: currentLevel.title,
    benefits: currentLevel.benefits
  };
}

// Update user stats based on study data
export function updateUserStats(
  currentStats: UserStats,
  studyPlans: StudyPlan[],
  tasks: Task[]
): UserStats {
  const completedSessions = studyPlans.flatMap(plan => 
    plan.plannedTasks.filter(session => session.status === 'completed' || session.done)
  );
  
  const completedTasks = tasks.filter(task => task.status === 'completed');
  
  const totalHours = completedSessions.reduce((sum, session) => 
    sum + (session.actualHours || session.allocatedHours), 0
  );

  const averageSessionLength = completedSessions.length > 0 
    ? totalHours / completedSessions.length * 60 // Convert to minutes
    : 0;

  // Calculate efficiency score (actual vs estimated time)
  const efficiencyScore = calculateEfficiencyScore(completedSessions);

  // Determine favorite study time
  const favoriteStudyTime = determineFavoriteStudyTime(completedSessions);

  return {
    ...currentStats,
    totalStudyHours: totalHours,
    totalTasksCompleted: completedTasks.length,
    totalSessions: completedSessions.length,
    averageSessionLength,
    efficiencyScore,
    favoriteStudyTime,
    lastActiveDate: new Date().toISOString()
  };
}

// Check for achievement unlocks
export function checkAchievementUnlocks(
  currentAchievements: string[],
  stats: UserStats,
  streak: StudyStreak
): string[] {
  const newUnlocks: string[] = [];

  ACHIEVEMENTS.forEach(achievement => {
    if (currentAchievements.includes(achievement.id)) return;

    let isUnlocked = false;
    let progress = 0;

    switch (achievement.condition.type) {
      case 'study_streak':
        progress = streak.current;
        isUnlocked = streak.current >= achievement.condition.target;
        break;
      case 'total_hours':
        progress = stats.totalStudyHours;
        isUnlocked = stats.totalStudyHours >= achievement.condition.target;
        break;
      case 'tasks_completed':
        progress = stats.totalTasksCompleted;
        isUnlocked = stats.totalTasksCompleted >= achievement.condition.target;
        break;
      case 'perfect_week':
        progress = stats.perfectWeeks;
        isUnlocked = stats.perfectWeeks >= achievement.condition.target;
        break;
      case 'early_finisher':
        progress = stats.earlyFinishes;
        isUnlocked = stats.earlyFinishes >= achievement.condition.target;
        break;
      case 'efficiency_master':
        progress = stats.efficiencyScore;
        isUnlocked = stats.efficiencyScore >= achievement.condition.target;
        break;
      // Add more conditions as needed
    }

    // Update achievement progress
    achievement.progress = progress;

    if (isUnlocked) {
      achievement.unlockedAt = new Date().toISOString();
      newUnlocks.push(achievement.id);
    }
  });

  return newUnlocks;
}

// Generate daily challenge
export function generateDailyChallenge(stats: UserStats): DailyChallenge {
  const challenges = [
    {
      id: 'study_2_hours',
      title: 'Study Session',
      description: 'Study for 2 hours today',
      icon: '📚',
      target: 2,
      points: 30,
      type: 'study_hours' as const
    },
    {
      id: 'complete_3_tasks',
      title: 'Task Master',
      description: 'Complete 3 study sessions today',
      icon: '✅',
      target: 3,
      points: 40,
      type: 'complete_tasks' as const
    },
    {
      id: 'use_timer',
      title: 'Focused Study',
      description: 'Use the timer for all sessions today',
      icon: '⏱️',
      target: 1,
      points: 25,
      type: 'use_timer' as const
    },
    {
      id: 'early_start',
      title: 'Early Bird',
      description: 'Start your first session before 9 AM',
      icon: '🌅',
      target: 1,
      points: 35,
      type: 'early_start' as const
    }
  ];

  const randomChallenge = challenges[Math.floor(Math.random() * challenges.length)];
  
  return {
    ...randomChallenge,
    progress: 0,
    completed: false,
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  };
}

// Motivational messages
export function getMotivationalMessage(context: string, stats: UserStats): MotivationalMessage {
  const messages: Record<string, MotivationalMessage[]> = {
    streak_continue: [
      {
        id: 'streak_1',
        message: `Amazing! You're on a ${stats.currentStreak}-day streak! Keep the momentum going! 🔥`,
        type: 'encouragement',
        context: 'streak_continue',
        icon: '🔥'
      }
    ],
    study_start: [
      {
        id: 'start_1',
        message: "Every expert was once a beginner. You've got this! 💪",
        type: 'encouragement',
        context: 'study_start',
        icon: '💪'
      },
      {
        id: 'start_2',
        message: "Focus is your superpower. Time to unleash it! ⚡",
        type: 'encouragement',
        context: 'study_start',
        icon: '⚡'
      }
    ],
    study_complete: [
      {
        id: 'complete_1',
        message: "Session complete! You're building great habits! 🎉",
        type: 'celebration',
        context: 'study_complete',
        icon: '🎉'
      }
    ]
  };

  const contextMessages = messages[context] || messages.study_start;
  return contextMessages[Math.floor(Math.random() * contextMessages.length)];
}

// Helper functions
function calculateEfficiencyScore(sessions: StudySession[]): number {
  if (sessions.length === 0) return 100;
  
  const sessionsWithActual = sessions.filter(s => s.actualHours);
  if (sessionsWithActual.length === 0) return 100;
  
  const totalEstimated = sessionsWithActual.reduce((sum, s) => sum + s.allocatedHours, 0);
  const totalActual = sessionsWithActual.reduce((sum, s) => sum + (s.actualHours || 0), 0);
  
  return Math.round((totalEstimated / totalActual) * 100);
}

function determineFavoriteStudyTime(sessions: StudySession[]): 'morning' | 'afternoon' | 'evening' {
  if (sessions.length === 0) return 'morning';
  
  const timeSlots = { morning: 0, afternoon: 0, evening: 0 };
  
  sessions.forEach(session => {
    const hour = parseInt(session.startTime.split(':')[0]);
    if (hour < 12) timeSlots.morning++;
    else if (hour < 18) timeSlots.afternoon++;
    else timeSlots.evening++;
  });
  
  const maxSlot = Object.entries(timeSlots).reduce((a, b) => 
    timeSlots[a[0] as keyof typeof timeSlots] > timeSlots[b[0] as keyof typeof timeSlots] ? a : b
  );
  
  return maxSlot[0] as 'morning' | 'afternoon' | 'evening';
}

// Update study streak
export function updateStudyStreak(
  currentStreak: StudyStreak,
  studyPlans: StudyPlan[]
): StudyStreak {
  const today = new Date().toISOString().split('T')[0];
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0];
  
  // Check if user studied today
  const todayPlan = studyPlans.find(plan => plan.date === today);
  const hasStudiedToday = todayPlan?.plannedTasks.some(session => 
    session.status === 'completed' || session.done
  ) || false;
  
  // Check if user studied yesterday
  const yesterdayPlan = studyPlans.find(plan => plan.date === yesterday);
  const hasStudiedYesterday = yesterdayPlan?.plannedTasks.some(session => 
    session.status === 'completed' || session.done
  ) || false;

  let newStreak = { ...currentStreak };
  
  if (hasStudiedToday) {
    if (currentStreak.lastStudyDate === yesterday || currentStreak.current === 0) {
      // Continue or start streak
      newStreak.current = currentStreak.current + 1;
      newStreak.longest = Math.max(newStreak.longest, newStreak.current);
      newStreak.lastStudyDate = today;
      newStreak.streakDates = [...currentStreak.streakDates, today];
    }
  } else if (currentStreak.lastStudyDate === yesterday && !hasStudiedToday) {
    // Streak might be broken, but give them until end of day
    // This will be handled by daily check
  } else if (currentStreak.lastStudyDate < yesterday) {
    // Streak is broken
    newStreak.current = 0;
    newStreak.streakDates = [];
  }
  
  return newStreak;
}
