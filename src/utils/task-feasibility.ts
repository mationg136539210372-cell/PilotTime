import { Task, UserSettings, StudyPlan, FixedCommitment } from '../types';

export interface FeasibilityWarning {
  type: 'error' | 'warning' | 'info';
  category: string;
  title: string;
  message: string;
  suggestion?: string;
  severity: 'critical' | 'major' | 'minor';
}

export interface TaskFeasibilityResult {
  isValid: boolean;
  warnings: FeasibilityWarning[];
  estimatedCompletion?: Date;
  alternativeSuggestions?: {
    frequency?: string;
    deadline?: string;
    estimation?: number;
    sessionLength?: number;
  };
}

export const checkTaskFeasibility = (
  taskData: {
    title: string;
    deadline?: string;
    estimatedHours: number;
    targetFrequency: string;
    deadlineType?: string;
    importance: boolean;
    category?: string;
    minWorkBlock?: number;
    maxSessionLength?: number;
    isOneTimeTask?: boolean;
    preferredTimeSlots?: string[];
  },
  userSettings: UserSettings,
  existingTasks: Task[] = [],
  studyPlans: StudyPlan[] = [],
  commitments: FixedCommitment[] = []
): TaskFeasibilityResult => {
  
  const warnings: FeasibilityWarning[] = [];
  const now = new Date();
  const deadline = taskData.deadline ? new Date(taskData.deadline) : null;
  
  // 1. FREQUENCY VS DEADLINE CONFLICTS
  if (deadline && taskData.deadlineType !== 'none') {
    const frequencyWarning = checkFrequencyDeadlineConflict(taskData, deadline, userSettings);
    if (frequencyWarning) warnings.push(frequencyWarning);
  }
  
  // 2. TIME ESTIMATION REALITY CHECKS
  const timeWarnings = checkTimeEstimationFeasibility(taskData, deadline, userSettings);
  warnings.push(...timeWarnings);
  
  // 3. SESSION LENGTH VIABILITY
  const sessionWarnings = checkSessionLengthFeasibility(taskData, userSettings);
  warnings.push(...sessionWarnings);
  
  // 4. SCHEDULE AVAILABILITY CONFLICTS
  if (deadline) {
    const scheduleWarnings = checkScheduleAvailability(taskData, deadline, userSettings, studyPlans, commitments);
    warnings.push(...scheduleWarnings);
  }
  
  // 5. WORKLOAD OVERLOAD WARNINGS
  const workloadWarnings = checkWorkloadFeasibility(taskData, deadline, userSettings, existingTasks, studyPlans);
  warnings.push(...workloadWarnings);
  
  // 6. TASK TYPE INCONSISTENCIES
  const taskTypeWarnings = checkTaskTypeConsistency(taskData, userSettings);
  warnings.push(...taskTypeWarnings);
  
  // 7. STUDY PLAN MODE COMPATIBILITY
  const modeWarnings = checkStudyPlanModeCompatibility(taskData, userSettings);
  warnings.push(...modeWarnings);
  
  // 8. HISTORICAL PATTERN INSIGHTS
  const patternWarnings = checkHistoricalPatterns(taskData, existingTasks, userSettings);
  warnings.push(...patternWarnings);
  
  // 9. BUFFER AND TIMING CONFLICTS
  const bufferWarnings = checkBufferAndTimingIssues(taskData, deadline, userSettings);
  warnings.push(...bufferWarnings);
  
  // 10. CATEGORY-SPECIFIC ADVISORIES
  const categoryWarnings = checkCategorySpecificIssues(taskData, userSettings);
  warnings.push(...categoryWarnings);

  // 11. IMPOSSIBLE SESSION DISTRIBUTION
  const distributionWarnings = checkSessionDistributionFeasibility(taskData, deadline, userSettings);
  warnings.push(...distributionWarnings);

  // 12. DEADLINE REALISM CHECKS
  const deadlineWarnings = checkDeadlineRealism(taskData, deadline, userSettings);
  warnings.push(...deadlineWarnings);

  // 13. WORKDAY DISTRIBUTION ISSUES
  const workdayWarnings = checkWorkdayDistribution(taskData, deadline, userSettings);
  warnings.push(...workdayWarnings);

  // 14. TASK COMPLETION IMPOSSIBILITIES
  const completionWarnings = checkTaskCompletionFeasibility(taskData, deadline, userSettings);
  warnings.push(...completionWarnings);
  
  const criticalWarnings = warnings.filter(w => w.severity === 'critical');
  const isValid = criticalWarnings.length === 0;
  
  return {
    isValid,
    warnings: warnings.sort((a, b) => {
      const severityOrder = { critical: 0, major: 1, minor: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    }),
    alternativeSuggestions: generateAlternativeSuggestions(taskData, warnings, userSettings)
  };
};

// 1. FREQUENCY VS DEADLINE CONFLICTS
const checkFrequencyDeadlineConflict = (
  taskData: any,
  deadline: Date,
  userSettings: UserSettings
): FeasibilityWarning | null => {
  const now = new Date();
  const daysUntilDeadline = Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  const bufferAdjustedDays = Math.max(0, daysUntilDeadline - userSettings.bufferDays);
  
  // Calculate work days until deadline
  let workDays = 0;
  const currentDate = new Date(now);
  while (currentDate <= deadline) {
    if (userSettings.workDays.includes(currentDate.getDay())) {
      workDays++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  const sessionsNeeded = Math.ceil(taskData.estimatedHours / userSettings.dailyAvailableHours);
  
  let requiredFrequency = 'daily';
  let minDaysNeeded = sessionsNeeded;
  
  switch (taskData.targetFrequency) {
    case 'weekly':
      minDaysNeeded = Math.ceil(sessionsNeeded / (workDays / 7)) * 7;
      if (bufferAdjustedDays < minDaysNeeded) {
        return {
          type: 'error',
          category: 'frequency',
          title: 'Weekly frequency impossible with deadline',
          message: `You want to work weekly, but need ${sessionsNeeded} sessions and only have ${Math.floor(bufferAdjustedDays / 7)} weeks available.`,
          suggestion: 'Consider changing to "3x per week" frequency or extending the deadline.',
          severity: 'critical'
        };
      }
      break;
      
    case '3x-week':
      const sessionsPerWeek = 3;
      const weeksNeeded = Math.ceil(sessionsNeeded / sessionsPerWeek);
      if (bufferAdjustedDays < weeksNeeded * 7) {
        return {
          type: 'warning',
          category: 'frequency',
          title: '3x per week frequency is tight',
          message: `Need ${sessionsNeeded} sessions in ${Math.floor(bufferAdjustedDays / 7)} weeks. This requires exactly 3 sessions per week with no flexibility.`,
          suggestion: 'Consider daily frequency for more flexibility, or add a few extra days to deadline.',
          severity: 'major'
        };
      }
      break;
      
    case 'daily':
      if (workDays < sessionsNeeded) {
        return {
          type: 'error',
          category: 'frequency',
          title: 'Not enough work days available',
          message: `Need ${sessionsNeeded} sessions but only ${workDays} work days until deadline.`,
          suggestion: 'Extend deadline, reduce scope, or work on weekends.',
          severity: 'critical'
        };
      }
      break;
  }
  
  return null;
};

// 2. TIME ESTIMATION REALITY CHECKS
const checkTimeEstimationFeasibility = (
  taskData: any,
  deadline: Date | null,
  userSettings: UserSettings
): FeasibilityWarning[] => {
  const warnings: FeasibilityWarning[] = [];
  
  // Extremely large tasks
  if (taskData.estimatedHours > 50) {
    warnings.push({
      type: 'warning',
      category: 'estimation',
      title: 'Very large task detected',
      message: `${taskData.estimatedHours} hours is a substantial project. Consider breaking into smaller sub-tasks.`,
      suggestion: 'Split this into multiple smaller tasks (5-20 hours each) for better tracking and motivation.',
      severity: 'major'
    });
  }
  
  // CRITICAL: Tasks due today that exceed daily capacity (non-one-sitting)
  if (deadline) {
    const now = new Date();

    // Get today's date string in local timezone
    const todayString = now.toISOString().split('T')[0];
    const deadlineString = deadline.toISOString().split('T')[0];
    const isDueToday = deadlineString === todayString;

    // Also check if deadline is before end of today
    const todayEnd = new Date(now);
    todayEnd.setHours(23, 59, 59, 999);
    const isBeforeEndOfToday = deadline <= todayEnd;

    // More lenient check: is the deadline today or has it passed?
    const isUrgentToday = isDueToday || (deadline <= now);

    // Debug logging
    console.log('🔍 Feasibility Debug:', {
      deadline: deadline.toISOString(),
      deadlineString,
      todayString,
      todayEnd: todayEnd.toISOString(),
      isDueToday,
      isBeforeEndOfToday,
      isUrgentToday,
      isOneTimeTask: taskData.isOneTimeTask,
      estimatedHours: taskData.estimatedHours,
      dailyAvailableHours: userSettings.dailyAvailableHours,
      exceedsCapacity: taskData.estimatedHours > userSettings.dailyAvailableHours
    });

    if (isUrgentToday && !taskData.isOneTimeTask && taskData.estimatedHours > userSettings.dailyAvailableHours) {
      console.log('🚨 CRITICAL WARNING TRIGGERED: Task due today exceeds daily capacity');
      warnings.push({
        type: 'error',
        category: 'estimation',
        title: 'Task due today exceeds daily capacity',
        message: `Task requires ${taskData.estimatedHours} hours but you only have ${userSettings.dailyAvailableHours} hours available today. This task isn't marked as "one sitting" so it can't be completed.`,
        suggestion: 'Either mark as "Complete in one sitting" if possible, extend deadline to tomorrow, or reduce scope.',
        severity: 'critical'
      });
    }

    // CRITICAL: Tasks due today that exceed available hours even as one-sitting
    if (isUrgentToday && taskData.isOneTimeTask && taskData.estimatedHours > userSettings.dailyAvailableHours) {
      console.log('🚨 CRITICAL WARNING TRIGGERED: One-sitting task due today exceeds daily capacity');
      warnings.push({
        type: 'error',
        category: 'estimation',
        title: 'One-sitting task due today exceeds daily capacity',
        message: `One-sitting task requires ${taskData.estimatedHours} hours but you only have ${userSettings.dailyAvailableHours} hours available today.`,
        suggestion: 'Extend deadline to tomorrow, reduce scope, or increase daily available hours.',
        severity: 'critical'
      });
    }

    // CRITICAL: Tasks due today that exceed available hours even as one-sitting
    if (isDueToday && taskData.isOneTimeTask && taskData.estimatedHours > userSettings.dailyAvailableHours) {
      warnings.push({
        type: 'error',
        category: 'estimation',
        title: 'One-sitting task due today exceeds daily capacity',
        message: `One-sitting task requires ${taskData.estimatedHours} hours but you only have ${userSettings.dailyAvailableHours} hours available today.`,
        suggestion: 'Extend deadline to tomorrow, reduce scope, or increase daily available hours.',
        severity: 'critical'
      });
    }

    // Calculate days until deadline (minimum 1 for tasks due today)
    const msUntilDeadline = deadline.getTime() - now.getTime();
    const daysUntilDeadline = Math.max(1, Math.ceil(msUntilDeadline / (1000 * 60 * 60 * 24)));
    const requiredDailyHours = taskData.estimatedHours / daysUntilDeadline;

    // CRITICAL: General impossible daily workload
    if (!isDueToday && requiredDailyHours > userSettings.dailyAvailableHours) {
      warnings.push({
        type: 'error',
        category: 'estimation',
        title: 'Impossible daily workload required',
        message: `Would require ${requiredDailyHours.toFixed(1)} hours per day for ${daysUntilDeadline} days, but you only have ${userSettings.dailyAvailableHours} hours available per day.`,
        suggestion: 'Extend deadline, reduce scope, or increase daily available hours.',
        severity: 'critical'
      });
    } else if (!isDueToday && requiredDailyHours > userSettings.dailyAvailableHours * 0.9) {
      // MAJOR: Very intensive but technically possible
      warnings.push({
        type: 'warning',
        category: 'estimation',
        title: 'Extremely intensive schedule required',
        message: `Will require ${requiredDailyHours.toFixed(1)} hours per day (${Math.round(requiredDailyHours / userSettings.dailyAvailableHours * 100)}% of your available time).`,
        suggestion: 'Consider extending deadline for a more sustainable workload.',
        severity: 'major'
      });
    } else if (!isDueToday && requiredDailyHours > userSettings.dailyAvailableHours * 0.7) {
      // MAJOR: High intensity warning
      warnings.push({
        type: 'warning',
        category: 'estimation',
        title: 'High intensity schedule required',
        message: `Will require ${requiredDailyHours.toFixed(1)} hours per day (${Math.round(requiredDailyHours / userSettings.dailyAvailableHours * 100)}% of your available time).`,
        suggestion: 'Consider if this intensive schedule is sustainable.',
        severity: 'major'
      });
    }
  }
  
  // Suspiciously small estimates
  if (taskData.estimatedHours < 0.5) {
    warnings.push({
      type: 'info',
      category: 'estimation',
      title: 'Very short task',
      message: 'Tasks under 30 minutes might be better handled as quick actions rather than scheduled study sessions.',
      suggestion: 'Consider bundling with similar small tasks or handling immediately.',
      severity: 'minor'
    });
  }
  
  return warnings;
};

// 3. SESSION LENGTH VIABILITY  
const checkSessionLengthFeasibility = (
  taskData: any,
  userSettings: UserSettings
): FeasibilityWarning[] => {
  const warnings: FeasibilityWarning[] = [];
  const minSessionMinutes = userSettings.minSessionLength || 15;
  const maxSessionHours = userSettings.dailyAvailableHours;
  
  // One-time tasks that are too long
  if (taskData.isOneTimeTask && taskData.estimatedHours > maxSessionHours) {
    warnings.push({
      type: 'error',
      category: 'session-length',
      title: 'One-sitting task too long',
      message: `Task requires ${taskData.estimatedHours} hours but you only have ${maxSessionHours} hours available per day.`,
      suggestion: 'Either increase daily hours or uncheck "Complete in one sitting".',
      severity: 'critical'
    });
  }
  
  // Sessions that would be too short
  if (!taskData.isOneTimeTask && taskData.targetFrequency === 'daily') {
    const estimatedSessionLength = taskData.estimatedHours; // Rough estimate for daily frequency
    if (estimatedSessionLength * 60 < minSessionMinutes) {
      warnings.push({
        type: 'warning',
        category: 'session-length',
        title: 'Sessions will be very short',
        message: `Daily sessions would be ${Math.round(estimatedSessionLength * 60)} minutes, below your ${minSessionMinutes}min minimum.`,
        suggestion: 'Consider weekly or 3x-week frequency for longer, more focused sessions.',
        severity: 'major'
      });
    }
  }
  
  // Tasks with unrealistic min work blocks
  if (taskData.minWorkBlock && taskData.minWorkBlock > taskData.estimatedHours * 60) {
    warnings.push({
      type: 'error',
      category: 'session-length',
      title: 'Minimum work block longer than total task',
      message: `Minimum work block is ${taskData.minWorkBlock} minutes but total task is only ${Math.round(taskData.estimatedHours * 60)} minutes.`,
      suggestion: 'Reduce minimum work block or increase task estimation.',
      severity: 'critical'
    });
  }
  
  return warnings;
};

// 4. SCHEDULE AVAILABILITY CONFLICTS
const checkScheduleAvailability = (
  taskData: any,
  deadline: Date,
  userSettings: UserSettings,
  studyPlans: StudyPlan[],
  commitments: FixedCommitment[]
): FeasibilityWarning[] => {
  const warnings: FeasibilityWarning[] = [];
  
  // Check if deadline falls on non-work days
  const deadlineDay = deadline.getDay();
  if (!userSettings.workDays.includes(deadlineDay)) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    warnings.push({
      type: 'warning',
      category: 'schedule',
      title: 'Deadline on non-work day',
      message: `Deadline is on ${dayNames[deadlineDay]}, which isn't in your work days.`,
      suggestion: 'Consider moving deadline to a work day or adjusting your work day settings.',
      severity: 'major'
    });
  }
  
  // Check for heavy commitment periods
  const daysUntilDeadline = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  if (daysUntilDeadline <= 7) {
    // Check next 7 days for heavy commitments
    let heavyCommitmentDays = 0;
    for (let i = 0; i < 7; i++) {
      const checkDate = new Date();
      checkDate.setDate(checkDate.getDate() + i);
      const dateStr = checkDate.toISOString().split('T')[0];
      
      const dayCommitments = commitments.filter(c => {
        // Simple check - in real implementation would need proper date checking
        return c.recurring && c.daysOfWeek.includes(checkDate.getDay());
      });
      
      const commitmentHours = dayCommitments.reduce((sum, c) => {
        if (c.startTime && c.endTime) {
          const [sh, sm] = c.startTime.split(':').map(Number);
          const [eh, em] = c.endTime.split(':').map(Number);
          return sum + ((eh * 60 + em) - (sh * 60 + sm)) / 60;
        }
        return sum;
      }, 0);
      
      if (commitmentHours > userSettings.dailyAvailableHours * 0.7) {
        heavyCommitmentDays++;
      }
    }
    
    if (heavyCommitmentDays > 3) {
      warnings.push({
        type: 'warning',
        category: 'schedule',
        title: 'Heavy commitment period ahead',
        message: `${heavyCommitmentDays} of the next 7 days have significant commitments, leaving limited study time.`,
        suggestion: 'Consider starting earlier or extending deadline to avoid the busy period.',
        severity: 'major'
      });
    }
  }
  
  return warnings;
};

// 5. WORKLOAD OVERLOAD WARNINGS
const checkWorkloadFeasibility = (
  taskData: any,
  deadline: Date | null,
  userSettings: UserSettings,
  existingTasks: Task[],
  studyPlans: StudyPlan[]
): FeasibilityWarning[] => {
  const warnings: FeasibilityWarning[] = [];
  
  if (!deadline) return warnings;
  
  // Calculate existing workload until deadline
  const existingHours = existingTasks
    .filter(t => t.deadline && new Date(t.deadline) <= deadline && t.status === 'pending')
    .reduce((sum, t) => sum + t.estimatedHours, 0);
    
  const totalHours = existingHours + taskData.estimatedHours;
  const daysUntilDeadline = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
  const maxCapacity = daysUntilDeadline * userSettings.dailyAvailableHours;
  
  if (totalHours > maxCapacity) {
    warnings.push({
      type: 'error',
      category: 'workload',
      title: 'Impossible workload detected',
      message: `Total work needed: ${totalHours}h. Maximum capacity until deadline: ${maxCapacity}h.`,
      suggestion: 'Extend deadlines, reduce task scope, or increase daily study hours.',
      severity: 'critical'
    });
  } else if (totalHours > maxCapacity * 0.9) {
    warnings.push({
      type: 'warning',
      category: 'workload',
      title: 'Very high workload period',
      message: `Adding this task will use ${Math.round(totalHours / maxCapacity * 100)}% of your available time until deadline.`,
      suggestion: 'Consider if this intensive schedule is sustainable, or adjust timeline.',
      severity: 'major'
    });
  }
  
  return warnings;
};

// 6. TASK TYPE INCONSISTENCIES
const checkTaskTypeConsistency = (
  taskData: any,
  userSettings: UserSettings
): FeasibilityWarning[] => {
  const warnings: FeasibilityWarning[] = [];
  
  // Learning tasks should have consistent frequency
  if (taskData.category === 'Learning' && taskData.targetFrequency === 'weekly') {
    warnings.push({
      type: 'info',
      category: 'task-type',
      title: 'Learning tasks benefit from frequency',
      message: 'Learning tasks typically benefit from more frequent, shorter sessions for better retention.',
      suggestion: 'Consider "3x per week" or "daily" frequency for better learning outcomes.',
      severity: 'minor'
    });
  }
  
  // Large one-time tasks
  if (taskData.isOneTimeTask && taskData.estimatedHours > 4) {
    warnings.push({
      type: 'warning',
      category: 'task-type',
      title: 'Large one-sitting task',
      message: `${taskData.estimatedHours} hours is a long session. Consider if this can realistically be done in one sitting.`,
      suggestion: 'Break into smaller tasks or uncheck "Complete in one sitting".',
      severity: 'major'
    });
  }
  
  return warnings;
};

// 7. STUDY PLAN MODE COMPATIBILITY
const checkStudyPlanModeCompatibility = (
  taskData: any,
  userSettings: UserSettings
): FeasibilityWarning[] => {
  const warnings: FeasibilityWarning[] = [];
  
  if (userSettings.studyPlanMode === 'eisenhower' && !taskData.importance && taskData.deadline) {
    const daysUntilDeadline = Math.ceil((new Date(taskData.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysUntilDeadline <= 7) {
      warnings.push({
        type: 'warning',
        category: 'study-mode',
        title: 'Low priority task with tight deadline',
        message: 'In "Priority First" mode, low importance tasks with tight deadlines may not get scheduled.',
        suggestion: 'Mark as important if truly urgent, or extend deadline.',
        severity: 'major'
      });
    }
  }
  
  return warnings;
};

// 8. HISTORICAL PATTERN INSIGHTS
const checkHistoricalPatterns = (
  taskData: any,
  existingTasks: Task[],
  userSettings: UserSettings
): FeasibilityWarning[] => {
  const warnings: FeasibilityWarning[] = [];
  
  // Check for pattern of overestimation
  const completedTasks = existingTasks.filter(t => t.status === 'completed');
  const averageEstimation = completedTasks.length > 3 ? 
    completedTasks.reduce((sum, t) => sum + t.estimatedHours, 0) / completedTasks.length : null;
    
  if (averageEstimation && taskData.estimatedHours > averageEstimation * 2) {
    warnings.push({
      type: 'info',
      category: 'patterns',
      title: 'Estimation significantly higher than usual',
      message: `This estimate (${taskData.estimatedHours}h) is much higher than your typical tasks (${averageEstimation.toFixed(1)}h average).`,
      suggestion: 'Double-check if this estimation is realistic, or consider breaking down the task.',
      severity: 'minor'
    });
  }
  
  return warnings;
};

// 9. BUFFER AND TIMING CONFLICTS
const checkBufferAndTimingIssues = (
  taskData: any,
  deadline: Date | null,
  userSettings: UserSettings
): FeasibilityWarning[] => {
  const warnings: FeasibilityWarning[] = [];
  
  if (deadline && userSettings.bufferDays > 0) {
    const daysUntilDeadline = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilDeadline <= userSettings.bufferDays) {
      warnings.push({
        type: 'warning',
        category: 'timing',
        title: 'Deadline within buffer period',
        message: `Deadline is in ${daysUntilDeadline} days but you prefer ${userSettings.bufferDays} buffer days.`,
        suggestion: `Consider extending deadline by ${userSettings.bufferDays - daysUntilDeadline} days for your preferred buffer.`,
        severity: 'major'
      });
    }
  }
  
  return warnings;
};

// 10. CATEGORY-SPECIFIC ADVISORIES
const checkCategorySpecificIssues = (
  taskData: any,
  userSettings: UserSettings
): FeasibilityWarning[] => {
  const warnings: FeasibilityWarning[] = [];
  
  // Writing tasks often take longer than estimated
  if (taskData.category === 'Writing' && taskData.estimatedHours < 3) {
    warnings.push({
      type: 'info',
      category: 'category',
      title: 'Writing tasks often take longer',
      message: 'Writing projects frequently require more time than initially estimated for research, drafts, and revisions.',
      suggestion: 'Consider adding 25-50% buffer time to your estimate.',
      severity: 'minor'
    });
  }
  
  return warnings;
};

// ALTERNATIVE SUGGESTIONS GENERATOR
const generateAlternativeSuggestions = (
  taskData: any,
  warnings: FeasibilityWarning[],
  userSettings: UserSettings
): any => {
  const suggestions: any = {};

  // Suggest frequency changes based on various warning types
  const frequencyWarnings = warnings.filter(w => w.category === 'frequency' || w.category === 'distribution');
  if (frequencyWarnings.length > 0) {
    if (taskData.targetFrequency === 'weekly') {
      suggestions.frequency = '3x-week';
    } else if (taskData.targetFrequency === '3x-week') {
      suggestions.frequency = 'daily';
    }
  }

  // Suggest deadline extensions for multiple scenarios
  const deadlineExtensionWarnings = warnings.filter(w =>
    w.category === 'timing' ||
    w.category === 'workload' ||
    w.category === 'estimation' ||
    w.category === 'deadline' ||
    w.category === 'completion'
  );

  if (deadlineExtensionWarnings.length > 0 && taskData.deadline) {
    const currentDeadline = new Date(taskData.deadline);
    const now = new Date();
    const daysUntilDeadline = Math.ceil((currentDeadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

    let extensionDays = 7; // Default 1 week extension

    // More intelligent extension suggestions
    if (daysUntilDeadline <= 1) {
      // For tasks due today/tomorrow, suggest 3-7 days
      extensionDays = Math.max(3, Math.ceil(taskData.estimatedHours / userSettings.dailyAvailableHours) + 1);
    } else if (taskData.estimatedHours > userSettings.dailyAvailableHours * daysUntilDeadline) {
      // For impossible workloads, calculate minimum needed days
      const minDaysNeeded = Math.ceil(taskData.estimatedHours / userSettings.dailyAvailableHours);
      extensionDays = minDaysNeeded - daysUntilDeadline + 1;
    } else if (userSettings.bufferDays > 0 && daysUntilDeadline <= userSettings.bufferDays) {
      // Respect user's buffer preferences
      extensionDays = userSettings.bufferDays - daysUntilDeadline + 2;
    }

    const suggestedDeadline = new Date(currentDeadline);
    suggestedDeadline.setDate(suggestedDeadline.getDate() + extensionDays);
    suggestions.deadline = suggestedDeadline.toISOString().split('T')[0];
  }

  // Suggest estimation adjustments
  const estimationWarnings = warnings.filter(w => w.category === 'estimation');
  if (estimationWarnings.some(w => w.message.includes('small') || w.message.includes('short'))) {
    suggestions.estimation = Math.max(0.5, taskData.estimatedHours);
  } else if (estimationWarnings.some(w => w.message.includes('large') || w.message.includes('substantial'))) {
    // Suggest breaking down large tasks
    suggestions.estimation = Math.min(20, Math.ceil(taskData.estimatedHours / 3));
    suggestions.note = 'Consider creating multiple smaller tasks instead of one large task';
  }

  // Suggest marking as one-sitting for tasks due today that exceed daily hours
  const todayWarnings = warnings.filter(w => w.message.includes('due today') && w.message.includes('one sitting'));
  if (todayWarnings.length > 0 && !taskData.isOneTimeTask && taskData.estimatedHours <= userSettings.dailyAvailableHours * 1.2) {
    suggestions.markAsOneSitting = true;
  }

  // Suggest removing one-sitting for very long tasks
  const oneSittingWarnings = warnings.filter(w => w.message.includes('one-sitting') && w.message.includes('too long'));
  if (oneSittingWarnings.length > 0 && taskData.isOneTimeTask) {
    suggestions.removeOneSitting = true;
  }

  // Suggest increasing daily hours for impossible workloads
  const impossibleWarnings = warnings.filter(w => w.severity === 'critical' && w.message.includes('daily'));
  if (impossibleWarnings.length > 0) {
    const requiredHours = Math.ceil(taskData.estimatedHours / Math.max(1, Math.ceil((new Date(taskData.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24))));
    if (requiredHours <= 12) { // Only suggest if reasonable
      suggestions.increaseDailyHours = requiredHours;
    }
  }

  return suggestions;
};

// 11. IMPOSSIBLE SESSION DISTRIBUTION
const checkSessionDistributionFeasibility = (
  taskData: any,
  deadline: Date | null,
  userSettings: UserSettings
): FeasibilityWarning[] => {
  const warnings: FeasibilityWarning[] = [];

  if (!deadline) return warnings;

  const now = new Date();
  const daysUntilDeadline = Math.max(1, Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  // Count actual work days until deadline
  let workDaysCount = 0;
  const currentDate = new Date(now);
  while (currentDate <= deadline) {
    if (userSettings.workDays.includes(currentDate.getDay())) {
      workDaysCount++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // CRITICAL: No work days until deadline
  if (workDaysCount === 0) {
    warnings.push({
      type: 'error',
      category: 'workdays',
      title: 'No work days until deadline',
      message: `Deadline is in ${daysUntilDeadline} days but none are configured as work days.`,
      suggestion: 'Change deadline to a work day, or adjust your work day settings.',
      severity: 'critical'
    });
  }

  // CRITICAL: Impossible session count for frequency
  const minSessionHours = Math.max((userSettings.minSessionLength || 15) / 60, 0.25); // At least 15 min
  const maxSessionsPerDay = Math.floor(userSettings.dailyAvailableHours / minSessionHours);
  const minSessionsNeeded = Math.ceil(taskData.estimatedHours / userSettings.dailyAvailableHours);

  // Check frequency-specific session distribution
  switch (taskData.targetFrequency) {
    case 'weekly':
      const maxWeeklySessions = Math.floor(workDaysCount / 7) * 2; // Max 2 sessions per week
      if (minSessionsNeeded > maxWeeklySessions) {
        warnings.push({
          type: 'error',
          category: 'distribution',
          title: 'Too many sessions for weekly frequency',
          message: `Task needs ${minSessionsNeeded} sessions but weekly frequency only allows ${maxWeeklySessions} sessions until deadline.`,
          suggestion: 'Change to "3x per week" or "daily" frequency, or extend deadline.',
          severity: 'critical'
        });
      }
      break;

    case '3x-week':
      const maxThreePerWeekSessions = Math.floor(workDaysCount / 7) * 3;
      if (minSessionsNeeded > maxThreePerWeekSessions) {
        warnings.push({
          type: 'error',
          category: 'distribution',
          title: 'Too many sessions for 3x-week frequency',
          message: `Task needs ${minSessionsNeeded} sessions but 3x-week frequency only allows ${maxThreePerWeekSessions} sessions until deadline.`,
          suggestion: 'Change to daily frequency or extend deadline.',
          severity: 'critical'
        });
      }
      break;
  }

  return warnings;
};

// 12. DEADLINE REALISM CHECKS
const checkDeadlineRealism = (
  taskData: any,
  deadline: Date | null,
  userSettings: UserSettings
): FeasibilityWarning[] => {
  const warnings: FeasibilityWarning[] = [];

  if (!deadline) return warnings;

  const now = new Date();
  const todayEnd = new Date(now);
  todayEnd.setHours(23, 59, 59, 999);

  // Note: Past deadline check removed since date input already prevents past dates

  // CRITICAL: Weekend deadline when user doesn't work weekends
  const deadlineDay = deadline.getDay();
  if (!userSettings.workDays.includes(deadlineDay)) {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    warnings.push({
      type: 'error',
      category: 'deadline',
      title: 'Deadline on non-work day',
      message: `Deadline is on ${dayNames[deadlineDay]}, but this isn't configured as a work day.`,
      suggestion: 'Move deadline to a work day or add this day to your work days.',
      severity: 'critical'
    });
  }

  // MAJOR: Very tight deadline for large tasks
  const hoursUntilDeadline = (deadline.getTime() - now.getTime()) / (1000 * 60 * 60);
  if (hoursUntilDeadline < 24 && taskData.estimatedHours > 3) {
    warnings.push({
      type: 'warning',
      category: 'deadline',
      title: 'Large task with very tight deadline',
      message: `${taskData.estimatedHours}-hour task due in ${Math.round(hoursUntilDeadline)} hours may be rushed.`,
      suggestion: 'Consider if quality will suffer with such a tight deadline.',
      severity: 'major'
    });
  }

  return warnings;
};

// 13. WORKDAY DISTRIBUTION ISSUES
const checkWorkdayDistribution = (
  taskData: any,
  deadline: Date | null,
  userSettings: UserSettings
): FeasibilityWarning[] => {
  const warnings: FeasibilityWarning[] = [];

  if (!deadline) return warnings;

  const now = new Date();
  let consecutiveNonWorkDays = 0;
  let maxConsecutiveNonWorkDays = 0;
  const currentDate = new Date(now);

  // Check for long gaps between work days
  while (currentDate <= deadline) {
    if (userSettings.workDays.includes(currentDate.getDay())) {
      consecutiveNonWorkDays = 0;
    } else {
      consecutiveNonWorkDays++;
      maxConsecutiveNonWorkDays = Math.max(maxConsecutiveNonWorkDays, consecutiveNonWorkDays);
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  // MAJOR: Long gaps between work days affect learning tasks
  if (maxConsecutiveNonWorkDays >= 3 && taskData.category === 'Learning') {
    warnings.push({
      type: 'warning',
      category: 'workdays',
      title: 'Long gaps between learning sessions',
      message: `You have ${maxConsecutiveNonWorkDays} consecutive non-work days. Learning tasks benefit from consistent practice.`,
      suggestion: 'Consider adding weekend study days for learning tasks, or adjust frequency.',
      severity: 'major'
    });
  }

  // MAJOR: Very few work days configured
  if (userSettings.workDays.length <= 2) {
    warnings.push({
      type: 'warning',
      category: 'workdays',
      title: 'Very limited work days',
      message: `Only ${userSettings.workDays.length} work days per week configured. This limits scheduling flexibility.`,
      suggestion: 'Consider adding more work days or increasing daily hours on existing work days.',
      severity: 'major'
    });
  }

  return warnings;
};

// 14. TASK COMPLETION IMPOSSIBILITIES
const checkTaskCompletionFeasibility = (
  taskData: any,
  deadline: Date | null,
  userSettings: UserSettings
): FeasibilityWarning[] => {
  const warnings: FeasibilityWarning[] = [];

  // CRITICAL: Zero or negative time estimates
  if (taskData.estimatedHours <= 0) {
    warnings.push({
      type: 'error',
      category: 'completion',
      title: 'Invalid time estimate',
      message: 'Tasks must have a positive time estimate.',
      suggestion: 'Enter a realistic time estimate for this task.',
      severity: 'critical'
    });
  }

  // CRITICAL: Extremely large one-sitting tasks
  if (taskData.isOneTimeTask && taskData.estimatedHours > 12) {
    warnings.push({
      type: 'error',
      category: 'completion',
      title: 'Unrealistic one-sitting duration',
      message: `${taskData.estimatedHours} hours is too long for a single work session. Human concentration and productivity drop significantly after 6-8 hours.`,
      suggestion: 'Either break into multiple sessions or reduce scope to under 8 hours.',
      severity: 'critical'
    });
  }

  // CRITICAL: Minimum work block larger than daily capacity
  if (taskData.minWorkBlock && taskData.minWorkBlock > userSettings.dailyAvailableHours * 60) {
    warnings.push({
      type: 'error',
      category: 'completion',
      title: 'Minimum work block exceeds daily capacity',
      message: `Minimum work block of ${taskData.minWorkBlock} minutes exceeds your ${userSettings.dailyAvailableHours * 60} minutes of daily available time.`,
      suggestion: 'Reduce minimum work block or increase daily available hours.',
      severity: 'critical'
    });
  }

  // MAJOR: Very short sessions for complex tasks
  if (taskData.estimatedHours > 10 && taskData.targetFrequency === 'daily' && deadline) {
    const daysUntilDeadline = Math.max(1, Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
    const averageSessionLength = taskData.estimatedHours / daysUntilDeadline;

    if (averageSessionLength < 1) {
      warnings.push({
        type: 'warning',
        category: 'completion',
        title: 'Very short sessions for complex task',
        message: `Complex ${taskData.estimatedHours}h task would have ${(averageSessionLength * 60).toFixed(0)}-minute sessions. This may not allow meaningful progress.`,
        suggestion: 'Consider weekly or 3x-week frequency for longer, more focused sessions.',
        severity: 'major'
      });
    }
  }

  // MAJOR: Buffer time issues
  if (deadline && userSettings.bufferDays > 0) {
    const daysUntilDeadline = Math.ceil((deadline.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
    if (daysUntilDeadline <= userSettings.bufferDays) {
      warnings.push({
        type: 'warning',
        category: 'completion',
        title: 'Deadline conflicts with buffer preference',
        message: `Deadline is in ${daysUntilDeadline} days but you prefer ${userSettings.bufferDays} buffer days.`,
        suggestion: `Extend deadline by ${userSettings.bufferDays - daysUntilDeadline + 1} days for your preferred buffer.`,
        severity: 'major'
      });
    }
  }

  return warnings;
};
