import {
  Task,
  StudyPlan,
  StudySession,
  UserSettings,
  FixedCommitment
} from '../types';
import { generateNewStudyPlan as originalGenerateStudyPlan } from './scheduling';
import { createUnifiedRedistributionEngine, UnifiedRedistributionOptions } from './unified-redistribution';
import { createConflictPreventionEngine } from './conflict-prevention';
import { createTaskAwareRedistributionEngine } from './task-aware-redistribution';

/**
 * Enhanced study plan generation with unified redistribution system
 * This function acts as a bridge between the original scheduling system and the new unified redistribution system
 */
export const generateStudyPlanWithUnifiedRedistribution = async (
  tasks: Task[],
  settings: UserSettings,
  fixedCommitments: FixedCommitment[],
  existingStudyPlans: StudyPlan[] = [],
  redistributionOptions: Partial<UnifiedRedistributionOptions & { useTaskAwareRedistribution?: boolean }> = {}
): Promise<{
  plans: StudyPlan[];
  suggestions: Array<{ taskTitle: string; unscheduledMinutes: number }>;
  redistributionResult?: {
    success: boolean;
    redistributedSessions: StudySession[];
    failedSessions: StudySession[];
    feedback: string;
    redistributionMethod?: 'task-aware' | 'session-based';
  };
}> => {

  console.log('Starting enhanced study plan generation with unified redistribution...');

  // Step 1: Generate initial study plan using existing system
  const initialResult = originalGenerateStudyPlan(tasks, settings, fixedCommitments, []);

  // Step 2: If we have existing plans with potential missed sessions, use unified redistribution
  let redistributionResult: any = null;
  
  if (existingStudyPlans.length > 0) {
    console.log('Existing study plans found, checking for missed sessions...');

    // Create unified redistribution engine
    const redistributionEngine = createUnifiedRedistributionEngine(settings, fixedCommitments);
    
    // Set up redistribution options with defaults
    const options: UnifiedRedistributionOptions = {
      respectDailyLimits: true,
      allowWeekendOverflow: false,
      maxRedistributionDays: 14,
      prioritizeImportantTasks: true,
      preserveSessionSize: true,
      enableRollback: true,
      ...redistributionOptions
    };

    try {
      // Run unified redistribution on existing plans
      const workingPlans = JSON.parse(JSON.stringify(existingStudyPlans)) as StudyPlan[];
      const result = await redistributionEngine.redistributeMissedSessions(workingPlans, tasks, options);

      redistributionResult = {
        success: result.success,
        redistributedSessions: result.redistributedSessions,
        failedSessions: result.failedSessions,
        feedback: result.feedback.message
      };

      if (result.success && result.redistributedSessions.length > 0) {
        console.log(`Unified redistribution successful: ${result.redistributedSessions.length} sessions redistributed`);
        
        // Merge redistributed plans with new plans for any new tasks
        const mergedPlans = mergeStudyPlans(workingPlans, initialResult.plans, tasks);
        
        return {
          plans: mergedPlans,
          suggestions: initialResult.suggestions,
          redistributionResult
        };
      } else {
        console.log('Unified redistribution had no sessions to redistribute or failed');
        
        // Fall back to merged plans
        const mergedPlans = mergeStudyPlans(existingStudyPlans, initialResult.plans, tasks);
        
        return {
          plans: mergedPlans,
          suggestions: initialResult.suggestions,
          redistributionResult
        };
      }

    } catch (error) {
      console.error('Unified redistribution failed:', error);
      
      redistributionResult = {
        success: false,
        redistributedSessions: [],
        failedSessions: [],
        feedback: `Redistribution error: ${error instanceof Error ? error.message : 'Unknown error'}`
      };

      // Fall back to original behavior
      const mergedPlans = mergeStudyPlans(existingStudyPlans, initialResult.plans, tasks);
      
      return {
        plans: mergedPlans,
        suggestions: initialResult.suggestions,
        redistributionResult
      };
    }
  }

  // Step 3: No existing plans, return initial result
  console.log('No existing study plans, returning initial result');
  return {
    plans: initialResult.plans,
    suggestions: initialResult.suggestions,
    redistributionResult
  };
};

/**
 * Merge existing study plans with new plans for any new tasks
 */
function mergeStudyPlans(
  existingPlans: StudyPlan[], 
  newPlans: StudyPlan[], 
  tasks: Task[]
): StudyPlan[] {
  
  const mergedPlans: StudyPlan[] = [];
  const processedDates = new Set<string>();

  // Start with existing plans
  existingPlans.forEach(existingPlan => {
    mergedPlans.push(JSON.parse(JSON.stringify(existingPlan)));
    processedDates.add(existingPlan.date);
  });

  // Add new plans for dates not in existing plans
  newPlans.forEach(newPlan => {
    if (!processedDates.has(newPlan.date)) {
      mergedPlans.push(JSON.parse(JSON.stringify(newPlan)));
      processedDates.add(newPlan.date);
    } else {
      // Merge sessions for existing dates if there are new tasks
      const existingPlan = mergedPlans.find(p => p.date === newPlan.date);
      if (existingPlan) {
        
        // Find sessions for new tasks (tasks not already in existing plan)
        const existingTaskIds = new Set(existingPlan.plannedTasks.map(s => s.taskId));
        const newSessions = newPlan.plannedTasks.filter(s => !existingTaskIds.has(s.taskId));
        
        if (newSessions.length > 0) {
          console.log(`Merging ${newSessions.length} new sessions into existing plan for ${newPlan.date}`);
          
          // Add new sessions to existing plan
          existingPlan.plannedTasks.push(...newSessions);
          existingPlan.totalStudyHours += newSessions.reduce((sum, s) => sum + s.allocatedHours, 0);
          
          // Sort sessions by start time
          existingPlan.plannedTasks.sort((a, b) => {
            if (!a.startTime || !b.startTime) return 0;
            return a.startTime.localeCompare(b.startTime);
          });
        }
      }
    }
  });

  // Sort plans by date
  mergedPlans.sort((a, b) => a.date.localeCompare(b.date));

  return mergedPlans;
}

/**
 * Validate redistribution results using conflict prevention engine
 */
export const validateRedistributionResult = (
  studyPlans: StudyPlan[],
  settings: UserSettings,
  fixedCommitments: FixedCommitment[]
): {
  isValid: boolean;
  conflicts: string[];
  warnings: string[];
  suggestions: string[];
} => {
  
  const conflictEngine = createConflictPreventionEngine(settings, fixedCommitments);
  const validation = conflictEngine.validateAfterRedistribution(studyPlans);

  return {
    isValid: validation.isValid,
    conflicts: validation.conflicts.map(c => c.message),
    warnings: validation.warnings.map(w => w.message),
    suggestions: validation.suggestions
  };
};

/**
 * Quick redistribution for specific missed sessions
 * This is a convenience function for redistributing specific sessions without full plan regeneration
 */
export const redistributeSpecificSessions = async (
  studyPlans: StudyPlan[],
  tasks: Task[],
  settings: UserSettings,
  fixedCommitments: FixedCommitment[],
  sessionIds: string[], // Array of session IDs to redistribute
  options: Partial<UnifiedRedistributionOptions> = {}
): Promise<{
  success: boolean;
  redistributedSessions: StudySession[];
  failedSessions: StudySession[];
  feedback: string;
}> => {
  
  console.log(`Redistributing specific sessions: ${sessionIds.join(', ')}`);

  // Mark specific sessions as needing redistribution
  const workingPlans = JSON.parse(JSON.stringify(studyPlans)) as StudyPlan[];
  
  workingPlans.forEach(plan => {
    plan.plannedTasks.forEach(session => {
      const sessionId = `${session.taskId}-${session.sessionNumber}`;
      if (sessionIds.includes(sessionId)) {
        session.status = 'missed_original';
      }
    });
  });

  // Create and run redistribution engine
  const redistributionEngine = createUnifiedRedistributionEngine(settings, fixedCommitments);
  
  const redistributionOptions: UnifiedRedistributionOptions = {
    respectDailyLimits: true,
    allowWeekendOverflow: false,
    maxRedistributionDays: 14,
    prioritizeImportantTasks: true,
    preserveSessionSize: true,
    enableRollback: true,
    ...options
  };

  try {
    const result = await redistributionEngine.redistributeMissedSessions(workingPlans, tasks, redistributionOptions);

    // Update original plans if successful
    if (result.success) {
      studyPlans.length = 0;
      studyPlans.push(...workingPlans);
    }

    return {
      success: result.success,
      redistributedSessions: result.redistributedSessions,
      failedSessions: result.failedSessions,
      feedback: result.feedback.message
    };

  } catch (error) {
    console.error('Specific session redistribution failed:', error);
    
    return {
      success: false,
      redistributedSessions: [],
      failedSessions: [],
      feedback: `Redistribution error: ${error instanceof Error ? error.message : 'Unknown error'}`
    };
  }
};

/**
 * Check the current state of all sessions in study plans
 */
export const analyzeSessionStates = (
  studyPlans: StudyPlan[],
  tasks: Task[]
): {
  total: number;
  byState: Record<string, number>;
  missedSessions: StudySession[];
  redistributedSessions: StudySession[];
  failedRedistributionSessions: StudySession[];
} => {
  
  let total = 0;
  const byState: Record<string, number> = {};
  const missedSessions: StudySession[] = [];
  const redistributedSessions: StudySession[] = [];
  const failedRedistributionSessions: StudySession[] = [];

  studyPlans.forEach(plan => {
    plan.plannedTasks.forEach(session => {
      total++;
      
      const state = session.status || 'scheduled';
      byState[state] = (byState[state] || 0) + 1;

      // Categorize special sessions
      if (state === 'missed' || state === 'missed_original') {
        missedSessions.push(session);
      } else if (state === 'redistributed') {
        redistributedSessions.push(session);
      } else if (state === 'failed_redistribution') {
        failedRedistributionSessions.push(session);
      }
    });
  });

  return {
    total,
    byState,
    missedSessions,
    redistributedSessions,
    failedRedistributionSessions
  };
};

// Export for backward compatibility
export const generateNewStudyPlan = generateStudyPlanWithUnifiedRedistribution;
