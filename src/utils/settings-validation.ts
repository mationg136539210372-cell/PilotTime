import { StudyPlan, StudySession, UserSettings, FixedCommitment } from '../types';

export interface SettingsChangeValidation {
  isValid: boolean;
  conflicts: {
    type: 'manual_reschedule_conflict' | 'study_window_conflict' | 'work_day_conflict';
    session: StudySession;
    planDate: string;
    message: string;
  }[];
  suggestions: string[];
}

export interface SettingsChangeOptions {
  preserveManualReschedules: boolean;
  regenerateAutoSessions: boolean;
  handleConflicts: 'warn' | 'auto_fix' | 'preserve';
}

/**
 * Validates study plans against new settings without modifying existing logic
 * Focuses on preserving manually rescheduled sessions (user intent)
 */
export function validateSettingsChange(
  studyPlans: StudyPlan[],
  oldSettings: UserSettings,
  newSettings: UserSettings
): SettingsChangeValidation {
  const conflicts: SettingsChangeValidation['conflicts'] = [];
  const suggestions: string[] = [];
  
  // Check each study plan for conflicts
  studyPlans.forEach(plan => {
    plan.plannedTasks.forEach(session => {
      // Only check manually rescheduled sessions (preserve user intent)
      if (session.isManualOverride) {
        
        // Check study window conflicts
        const sessionStart = parseInt(session.startTime.split(':')[0]);
        const sessionEnd = parseInt(session.endTime.split(':')[0]);
        
        if (sessionStart < newSettings.studyWindowStartHour || sessionEnd > newSettings.studyWindowEndHour) {
          conflicts.push({
            type: 'study_window_conflict',
            session,
            planDate: plan.date,
            message: `Manually rescheduled session conflicts with new study window (${newSettings.studyWindowStartHour}:00-${newSettings.studyWindowEndHour}:00)`
          });
        }
        
        // Check work days conflicts
        const dayOfWeek = new Date(plan.date).getDay();
        if (!newSettings.workDays.includes(dayOfWeek)) {
          conflicts.push({
            type: 'work_day_conflict',
            session,
            planDate: plan.date,
            message: `Manually rescheduled session is on a day you no longer want to study`
          });
        }
      }
    });
  });
  
  // Generate suggestions
  if (conflicts.length > 0) {
    suggestions.push('Consider keeping your manual reschedules and only regenerating auto-scheduled sessions');
    suggestions.push('Review conflicting sessions and manually adjust them to fit your new settings');
    
    if (conflicts.some(c => c.type === 'study_window_conflict')) {
      suggestions.push('Expand your study window to accommodate existing manual reschedules');
    }
    
    if (conflicts.some(c => c.type === 'work_day_conflict')) {
      suggestions.push('Add back work days that have manually scheduled sessions, or move those sessions');
    }
  }
  
  return {
    isValid: conflicts.length === 0,
    conflicts,
    suggestions
  };
}

/**
 * Provides options for handling settings changes
 */
export function getSettingsChangeRecommendation(
  validation: SettingsChangeValidation
): SettingsChangeOptions {
  if (validation.isValid) {
    return {
      preserveManualReschedules: true,
      regenerateAutoSessions: true,
      handleConflicts: 'preserve'
    };
  }
  
  // If there are conflicts, recommend preserving manual reschedules
  // and letting users decide what to do with conflicts
  return {
    preserveManualReschedules: true,
    regenerateAutoSessions: true,
    handleConflicts: 'warn'
  };
}

/**
 * Creates a user-friendly message about settings changes impact
 */
export function createSettingsChangeMessage(
  validation: SettingsChangeValidation,
  options: SettingsChangeOptions
): string {
  if (validation.isValid) {
    return "Settings updated successfully. Your manually scheduled sessions have been preserved.";
  }
  
  const conflictCount = validation.conflicts.length;
  const manualConflicts = validation.conflicts.filter(c => 
    validation.conflicts.some(conflict => conflict.session.isManualOverride)
  ).length;
  
  if (manualConflicts > 0) {
    return `Settings updated with ${conflictCount} conflicts detected in your manually scheduled sessions. Please review the highlighted sessions and adjust them manually if needed.`;
  }
  
  return `Settings updated. ${conflictCount} auto-scheduled sessions may need regeneration.`;
}
