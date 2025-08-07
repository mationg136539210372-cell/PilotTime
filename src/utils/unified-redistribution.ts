import { 
  Task, 
  StudyPlan, 
  StudySession, 
  UserSettings, 
  FixedCommitment,
  TimeSlot
} from '../types';
import { getLocalDateString, formatTime } from './scheduling';

// Enhanced session states for clear state management
export type SessionState = 
  | 'scheduled'           // Normal planned session
  | 'in_progress'         // Currently being studied
  | 'completed'           // Successfully finished
  | 'missed_original'     // Originally missed (needs redistribution)
  | 'redistributed'       // Successfully moved to new time
  | 'failed_redistribution' // Could not be redistributed
  | 'skipped_user'        // User chose to skip
  | 'skipped_system';     // System skipped due to conflicts

// Priority calculation for redistribution queue
export interface RedistributionPriority {
  taskImportance: number;     // 0-1000 points
  deadlineUrgency: number;    // 0-500 points  
  sessionAge: number;         // 0-200 points
  sessionSize: number;        // 0-100 points
  totalPriority: number;      // Sum of above
}

// Enhanced metadata tracking
export interface RedistributionMetadata {
  originalSlot: {
    date: string;
    startTime: string;
    endTime: string;
  };
  redistributionHistory: Array<{
    from: { date: string; startTime: string; endTime: string };
    to: { date: string; startTime: string; endTime: string };
    timestamp: string;
    reason: string;
    success: boolean;
  }>;
  failureReasons?: string[];
  successfulMoves: number;
  lastProcessedAt: string;
  priority: RedistributionPriority;
  state: SessionState;
}

// Validation results
export interface ValidationResult {
  isValid: boolean;
  conflicts: Array<{
    type: string;
    message: string;
    sessionId?: string;
    conflictingItem?: any;
  }>;
  suggestions?: string[];
}

// Redistribution options
export interface UnifiedRedistributionOptions {
  respectDailyLimits: boolean;
  allowWeekendOverflow: boolean;
  maxRedistributionDays: number;
  prioritizeImportantTasks: boolean;
  preserveSessionSize: boolean;
  enableRollback: boolean;
}

// Redistribution result
export interface UnifiedRedistributionResult {
  success: boolean;
  redistributedSessions: StudySession[];
  failedSessions: StudySession[];
  conflictsResolved: number;
  totalSessionsMoved: number;
  rollbackPerformed: boolean;
  feedback: {
    message: string;
    details: {
      totalProcessed: number;
      successfullyMoved: number;
      failedToMove: number;
      reasons: string[];
      suggestions: string[];
    };
  };
}

/**
 * Unified Redistribution Engine
 * Replaces multiple existing redistribution systems with a single, coordinated approach
 */
export class UnifiedRedistributionEngine {
  private settings: UserSettings;
  private fixedCommitments: FixedCommitment[];

  constructor(settings: UserSettings, fixedCommitments: FixedCommitment[]) {
    this.settings = settings;
    this.fixedCommitments = fixedCommitments;
  }

  /**
   * Main redistribution method that processes all missed sessions
   */
  async redistributeMissedSessions(
    studyPlans: StudyPlan[],
    tasks: Task[],
    options: UnifiedRedistributionOptions = {
      respectDailyLimits: true,
      allowWeekendOverflow: false,
      maxRedistributionDays: 14,
      prioritizeImportantTasks: true,
      preserveSessionSize: true,
      enableRollback: true
    }
  ): Promise<UnifiedRedistributionResult> {
    
    const startTime = new Date().toISOString();
    const originalPlans = options.enableRollback ? JSON.parse(JSON.stringify(studyPlans)) : null;
    
    try {
      // Step 1: Collect and analyze all missed sessions
      const missedSessions = this.collectMissedSessions(studyPlans, tasks);
      
      if (missedSessions.length === 0) {
        return this.createSuccessResult([], [], 0, "No missed sessions found.");
      }

      // Step 2: Calculate priorities for redistribution queue
      const prioritizedSessions = this.calculateRedistributionPriorities(missedSessions);

      // Step 3: Pre-redistribution validation
      const preValidation = this.validateBeforeRedistribution(studyPlans, prioritizedSessions);
      if (!preValidation.isValid) {
        return this.createFailureResult(missedSessions.map(ms => ms.session), 
          `Pre-redistribution validation failed: ${preValidation.conflicts.map(c => c.message).join(', ')}`);
      }

      // Step 4: Process sessions in priority order
      const workingPlans = JSON.parse(JSON.stringify(studyPlans)) as StudyPlan[];
      const result = await this.processRedistributionQueue(workingPlans, prioritizedSessions, tasks, options);

      // Step 5: Post-redistribution validation
      const postValidation = this.validateAfterRedistribution(workingPlans);
      if (!postValidation.isValid && options.enableRollback) {
        console.warn('Post-redistribution validation failed, performing rollback');
        return this.performRollback(originalPlans!, missedSessions.map(ms => ms.session), 
          `Post-redistribution conflicts detected: ${postValidation.conflicts.map(c => c.message).join(', ')}`);
      }

      // Step 6: Update original plans with results
      if (result.success) {
        studyPlans.length = 0;
        studyPlans.push(...workingPlans);
      }

      return result;

    } catch (error) {
      console.error('Unified redistribution failed:', error);
      
      if (options.enableRollback && originalPlans) {
        return this.performRollback(originalPlans, [], `System error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
      
      return this.createFailureResult([], `System error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Collect all sessions that need redistribution
   */
  private collectMissedSessions(studyPlans: StudyPlan[], tasks: Task[]): Array<{
    session: StudySession;
    originalPlanDate: string;
    task: Task;
    metadata: RedistributionMetadata;
  }> {
    const missedSessions: Array<{
      session: StudySession;
      originalPlanDate: string;
      task: Task;
      metadata: RedistributionMetadata;
    }> = [];
    
    const today = getLocalDateString();

    studyPlans.forEach(plan => {
      if (plan.date < today) {
        plan.plannedTasks.forEach(session => {
          // Check if session is truly missed and needs redistribution
          if (this.shouldRedistributeSession(session, plan.date, today)) {
            const task = tasks.find(t => t.id === session.taskId);
            if (task && task.status === 'pending') {
              
              // Create or enhance metadata
              const metadata: RedistributionMetadata = {
                originalSlot: {
                  date: plan.date,
                  startTime: session.startTime || '00:00',
                  endTime: session.endTime || '23:59'
                },
                redistributionHistory: session.schedulingMetadata?.rescheduleHistory || [],
                failureReasons: [],
                successfulMoves: session.schedulingMetadata?.rescheduleHistory?.length || 0,
                lastProcessedAt: new Date().toISOString(),
                priority: {
                  taskImportance: 0,
                  deadlineUrgency: 0,
                  sessionAge: 0,
                  sessionSize: 0,
                  totalPriority: 0
                },
                state: 'missed_original'
              };

              missedSessions.push({
                session: { ...session, status: 'missed_original' },
                originalPlanDate: plan.date,
                task,
                metadata
              });
            }
          }
        });
      }
    });

    return missedSessions;
  }

  /**
   * Determine if a session should be redistributed
   */
  private shouldRedistributeSession(session: StudySession, planDate: string, today: string): boolean {
    // Don't redistribute completed or skipped sessions
    if (session.done || session.status === 'completed' || 
        session.status === 'skipped_user' || session.status === 'skipped_system') {
      return false;
    }

    // Don't redistribute already redistributed sessions unless they failed
    if (session.status === 'redistributed') {
      return false;
    }

    // Don't redistribute sessions that have manual overrides (user moved them intentionally)
    if (session.isManualOverride) {
      return false;
    }

    // Redistribute missed sessions from past dates
    if (planDate < today && !session.done) {
      return true;
    }

    // Redistribute explicitly marked missed sessions
    if (session.status === 'missed' || session.status === 'missed_original') {
      return true;
    }

    return false;
  }

  /**
   * Calculate redistribution priorities for all missed sessions
   */
  private calculateRedistributionPriorities(
    missedSessions: Array<{
      session: StudySession;
      originalPlanDate: string;
      task: Task;
      metadata: RedistributionMetadata;
    }>
  ): Array<{
    session: StudySession;
    originalPlanDate: string;
    task: Task;
    metadata: RedistributionMetadata;
  }> {
    const now = new Date();

    return missedSessions.map(item => {
      const priority: RedistributionPriority = {
        taskImportance: 0,
        deadlineUrgency: 0,
        sessionAge: 0,
        sessionSize: 0,
        totalPriority: 0
      };

      // Task importance (0-1000 points)
      if (item.task.importance) {
        priority.taskImportance = 1000;
      }

      // Deadline urgency (0-500 points)
      const daysUntilDeadline = (new Date(item.task.deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      if (daysUntilDeadline < 0) {
        priority.deadlineUrgency = 500; // Overdue tasks get maximum urgency
      } else if (daysUntilDeadline <= 1) {
        priority.deadlineUrgency = 400;
      } else if (daysUntilDeadline <= 3) {
        priority.deadlineUrgency = 300;
      } else if (daysUntilDeadline <= 7) {
        priority.deadlineUrgency = 200;
      } else {
        priority.deadlineUrgency = Math.max(0, 100 - daysUntilDeadline);
      }

      // Session age (0-200 points) - older missed sessions get higher priority
      const daysMissed = (now.getTime() - new Date(item.originalPlanDate).getTime()) / (1000 * 60 * 60 * 24);
      priority.sessionAge = Math.min(200, daysMissed * 10);

      // Session size bonus (0-100 points) - longer sessions get slight priority
      priority.sessionSize = Math.min(100, item.session.allocatedHours * 20);

      // Calculate total priority
      priority.totalPriority = priority.taskImportance + priority.deadlineUrgency + 
                              priority.sessionAge + priority.sessionSize;

      // Update metadata
      item.metadata.priority = priority;
      
      return item;
    }).sort((a, b) => b.metadata.priority.totalPriority - a.metadata.priority.totalPriority);
  }

  /**
   * Validate before starting redistribution
   */
  private validateBeforeRedistribution(
    studyPlans: StudyPlan[], 
    missedSessions: any[]
  ): ValidationResult {
    const conflicts: ValidationResult['conflicts'] = [];

    // Check if there are any available days
    const today = getLocalDateString();
    const futurePlans = studyPlans.filter(plan => plan.date >= today);
    
    if (futurePlans.length === 0) {
      conflicts.push({
        type: 'no_future_days',
        message: 'No future study days available for redistribution'
      });
    }

    // Check if tasks are still pending
    const pendingTasks = missedSessions.filter(ms => ms.task.status === 'pending');
    if (pendingTasks.length === 0 && missedSessions.length > 0) {
      conflicts.push({
        type: 'no_pending_tasks',
        message: 'All tasks with missed sessions are no longer pending'
      });
    }

    return {
      isValid: conflicts.length === 0,
      conflicts,
      suggestions: conflicts.length > 0 ? ['Check task statuses and available study days'] : undefined
    };
  }

  /**
   * Process the redistribution queue
   */
  private async processRedistributionQueue(
    workingPlans: StudyPlan[],
    prioritizedSessions: any[],
    tasks: Task[],
    options: UnifiedRedistributionOptions
  ): Promise<UnifiedRedistributionResult> {
    
    const redistributedSessions: StudySession[] = [];
    const failedSessions: StudySession[] = [];
    const failureReasons: string[] = [];
    let conflictsResolved = 0;

    for (const missedSession of prioritizedSessions) {
      try {
        const result = await this.redistributeSingleSession(
          missedSession, 
          workingPlans, 
          tasks, 
          options
        );

        if (result.success && result.newSession && result.targetDate) {
          // Update session with redistribution metadata
          result.newSession.schedulingMetadata = {
            ...missedSession.metadata,
            redistributionHistory: [
              ...missedSession.metadata.redistributionHistory,
              {
                from: missedSession.metadata.originalSlot,
                to: {
                  date: result.targetDate,
                  startTime: result.newSession.startTime || '00:00',
                  endTime: result.newSession.endTime || '23:59'
                },
                timestamp: new Date().toISOString(),
                reason: 'unified_redistribution',
                success: true
              }
            ]
          };
          result.newSession.status = 'redistributed';

          // Remove original session and add new one
          this.removeSessionFromPlans(workingPlans, missedSession);
          this.addSessionToPlans(workingPlans, result.newSession, result.targetDate);

          redistributedSessions.push(result.newSession);
          conflictsResolved++;

        } else {
          failedSessions.push(missedSession.session);
          if (result.reason) {
            failureReasons.push(`${missedSession.task.title}: ${result.reason}`);
          }

          // Update session state to failed redistribution
          missedSession.session.status = 'failed_redistribution';
          missedSession.metadata.failureReasons = [...(missedSession.metadata.failureReasons || []), result.reason || 'Unknown error'];
        }

      } catch (error) {
        console.error(`Error redistributing session for task ${missedSession.task.title}:`, error);
        failedSessions.push(missedSession.session);
        failureReasons.push(`${missedSession.task.title}: System error`);
      }
    }

    const success = redistributedSessions.length > 0;
    const message = success 
      ? `Successfully redistributed ${redistributedSessions.length} of ${prioritizedSessions.length} missed sessions`
      : `Failed to redistribute any of ${prioritizedSessions.length} missed sessions`;

    return {
      success,
      redistributedSessions,
      failedSessions,
      conflictsResolved,
      totalSessionsMoved: redistributedSessions.length,
      rollbackPerformed: false,
      feedback: {
        message,
        details: {
          totalProcessed: prioritizedSessions.length,
          successfullyMoved: redistributedSessions.length,
          failedToMove: failedSessions.length,
          reasons: failureReasons,
          suggestions: this.generateSuggestions(failedSessions, failureReasons)
        }
      }
    };
  }

  /**
   * Redistribute a single session
   */
  private async redistributeSingleSession(
    missedSession: any,
    workingPlans: StudyPlan[],
    tasks: Task[],
    options: UnifiedRedistributionOptions
  ): Promise<{ success: boolean; newSession?: StudySession; targetDate?: string; reason?: string }> {
    
    const { session, task } = missedSession;
    const today = getLocalDateString();
    
    // Calculate deadline with buffer
    const deadline = new Date(task.deadline);
    if (this.settings.bufferDays > 0) {
      deadline.setDate(deadline.getDate() - this.settings.bufferDays);
    }
    const deadlineDateStr = deadline.toISOString().split('T')[0];
    
    // Find available time slots within deadline
    for (let dayOffset = 0; dayOffset < options.maxRedistributionDays; dayOffset++) {
      const targetDate = new Date(today);
      targetDate.setDate(targetDate.getDate() + dayOffset);
      const targetDateStr = targetDate.toISOString().split('T')[0];
      
      // Check if within deadline
      if (targetDateStr > deadlineDateStr) {
        break;
      }
      
      // Check if it's a work day
      if (!this.settings.workDays.includes(targetDate.getDay())) {
        continue;
      }
      
      // Get or create target plan
      let targetPlan = workingPlans.find(p => p.date === targetDateStr);
      if (!targetPlan) {
        targetPlan = {
          id: `plan-${targetDateStr}`,
          date: targetDateStr,
          plannedTasks: [],
          totalStudyHours: 0,
          availableHours: this.settings.dailyAvailableHours
        };
        workingPlans.push(targetPlan);
      }
      
      // Check daily capacity
      const usedHours = targetPlan.plannedTasks.reduce((sum, s) => sum + s.allocatedHours, 0);
      const availableHours = this.settings.dailyAvailableHours - usedHours;
      
      if (options.respectDailyLimits && availableHours < session.allocatedHours) {
        continue;
      }
      
      // Find specific time slot
      const timeSlot = this.findAvailableTimeSlot(
        session.allocatedHours,
        targetDateStr,
        targetPlan.plannedTasks,
        options.preserveSessionSize
      );
      
      if (timeSlot) {
        const newSession: StudySession = {
          ...session,
          startTime: timeSlot.start,
          endTime: timeSlot.end,
          status: 'redistributed'
        };
        
        return {
          success: true,
          newSession,
          targetDate: targetDateStr
        };
      }
    }
    
    return {
      success: false,
      reason: 'No available time slots found within deadline'
    };
  }

  /**
   * Find available time slot for a session
   */
  private findAvailableTimeSlot(
    requiredHours: number,
    date: string,
    existingSessions: StudySession[],
    preserveSize: boolean
  ): { start: string; end: string } | null {
    
    const studyStart = this.settings.studyWindowStartHour || 6;
    const studyEnd = this.settings.studyWindowEndHour || 23;
    const bufferMinutes = this.settings.bufferTimeBetweenSessions || 0;
    
    // Create time slots map
    const busyIntervals: Array<{ start: number; end: number }> = [];
    
    // Add existing sessions
    existingSessions.forEach(session => {
      if (session.startTime && session.endTime) {
        const start = this.timeToMinutes(session.startTime);
        const end = this.timeToMinutes(session.endTime);
        busyIntervals.push({ start, end });
      }
    });
    
    // Add fixed commitments for this date
    const dayOfWeek = new Date(date).getDay();
    this.fixedCommitments.forEach(commitment => {
      if (this.commitmentAppliesTo(commitment, date, dayOfWeek)) {
        if (commitment.isAllDay) {
          // All-day commitment blocks entire day
          busyIntervals.push({ start: 0, end: 24 * 60 });
        } else if (commitment.startTime && commitment.endTime) {
          busyIntervals.push({
            start: this.timeToMinutes(commitment.startTime),
            end: this.timeToMinutes(commitment.endTime)
          });
        }
      }
    });
    
    // Sort intervals
    busyIntervals.sort((a, b) => a.start - b.start);
    
    // Find available gap
    const requiredMinutes = requiredHours * 60;
    let currentTime = studyStart * 60;
    const endTime = studyEnd * 60;
    
    for (const interval of busyIntervals) {
      const availableGap = interval.start - currentTime;
      
      if (availableGap >= requiredMinutes + bufferMinutes) {
        const startTime = this.minutesToTime(currentTime);
        const endTime = this.minutesToTime(currentTime + requiredMinutes);
        return { start: startTime, end: endTime };
      }
      
      currentTime = Math.max(currentTime, interval.end + bufferMinutes);
    }
    
    // Check final gap
    const finalGap = endTime - currentTime;
    if (finalGap >= requiredMinutes) {
      const startTime = this.minutesToTime(currentTime);
      const endTimeStr = this.minutesToTime(currentTime + requiredMinutes);
      return { start: startTime, end: endTimeStr };
    }
    
    return null;
  }

  /**
   * Check if commitment applies to a specific date
   */
  private commitmentAppliesTo(commitment: FixedCommitment, date: string, dayOfWeek: number): boolean {
    if (commitment.deletedOccurrences?.includes(date)) {
      return false;
    }

    if (commitment.recurring) {
      if (!commitment.daysOfWeek.includes(dayOfWeek)) {
        return false;
      }
      
      if (commitment.dateRange?.startDate && commitment.dateRange?.endDate) {
        const endDate = new Date(commitment.dateRange.endDate);
        endDate.setDate(endDate.getDate() + 1);
        const inclusiveEndDate = endDate.toISOString().split('T')[0];
        return date >= commitment.dateRange.startDate && date < inclusiveEndDate;
      }
      
      return true;
    } else {
      return commitment.specificDates?.includes(date) || false;
    }
  }

  /**
   * Validate after redistribution
   */
  private validateAfterRedistribution(workingPlans: StudyPlan[]): ValidationResult {
    const conflicts: ValidationResult['conflicts'] = [];

    // Check for overlapping sessions
    workingPlans.forEach(plan => {
      const sessions = plan.plannedTasks.filter(s => s.startTime && s.endTime);
      
      for (let i = 0; i < sessions.length - 1; i++) {
        for (let j = i + 1; j < sessions.length; j++) {
          const session1 = sessions[i];
          const session2 = sessions[j];
          
          if (this.sessionsOverlap(session1, session2)) {
            conflicts.push({
              type: 'session_overlap',
              message: `Sessions overlap on ${plan.date}: ${session1.startTime}-${session1.endTime} and ${session2.startTime}-${session2.endTime}`,
              sessionId: `${session1.taskId}-${session1.sessionNumber}`
            });
          }
        }
      }
    });

    return {
      isValid: conflicts.length === 0,
      conflicts
    };
  }

  /**
   * Check if two sessions overlap
   */
  private sessionsOverlap(session1: StudySession, session2: StudySession): boolean {
    if (!session1.startTime || !session1.endTime || !session2.startTime || !session2.endTime) {
      return false;
    }

    const start1 = this.timeToMinutes(session1.startTime);
    const end1 = this.timeToMinutes(session1.endTime);
    const start2 = this.timeToMinutes(session2.startTime);
    const end2 = this.timeToMinutes(session2.endTime);

    return start1 < end2 && start2 < end1;
  }

  /**
   * Perform rollback
   */
  private performRollback(
    originalPlans: StudyPlan[], 
    failedSessions: StudySession[], 
    reason: string
  ): UnifiedRedistributionResult {
    return {
      success: false,
      redistributedSessions: [],
      failedSessions,
      conflictsResolved: 0,
      totalSessionsMoved: 0,
      rollbackPerformed: true,
      feedback: {
        message: `Redistribution failed and was rolled back: ${reason}`,
        details: {
          totalProcessed: failedSessions.length,
          successfullyMoved: 0,
          failedToMove: failedSessions.length,
          reasons: [reason],
          suggestions: ['Review study plan conflicts and try again']
        }
      }
    };
  }

  /**
   * Remove session from plans
   */
  private removeSessionFromPlans(workingPlans: StudyPlan[], missedSession: any): void {
    const plan = workingPlans.find(p => p.date === missedSession.originalPlanDate);
    if (plan) {
      const sessionIndex = plan.plannedTasks.findIndex(
        s => s.taskId === missedSession.session.taskId && 
             s.sessionNumber === missedSession.session.sessionNumber
      );
      if (sessionIndex !== -1) {
        plan.plannedTasks.splice(sessionIndex, 1);
        plan.totalStudyHours = Math.max(0, plan.totalStudyHours - missedSession.session.allocatedHours);
      }
    }
  }

  /**
   * Add session to plans
   */
  private addSessionToPlans(workingPlans: StudyPlan[], newSession: StudySession, targetDate: string): void {
    let targetPlan = workingPlans.find(p => p.date === targetDate);
    
    if (!targetPlan) {
      targetPlan = {
        id: `plan-${targetDate}`,
        date: targetDate,
        plannedTasks: [],
        totalStudyHours: 0,
        availableHours: this.settings.dailyAvailableHours
      };
      workingPlans.push(targetPlan);
    }
    
    targetPlan.plannedTasks.push(newSession);
    targetPlan.totalStudyHours += newSession.allocatedHours;
  }

  /**
   * Generate suggestions for failed redistributions
   */
  private generateSuggestions(failedSessions: StudySession[], reasons: string[]): string[] {
    const suggestions = [];
    
    if (failedSessions.length > 0) {
      suggestions.push('Consider increasing daily available hours');
      suggestions.push('Check if task deadlines are realistic');
      suggestions.push('Review fixed commitments for conflicts');
      
      if (reasons.some(r => r.includes('deadline'))) {
        suggestions.push('Extend task deadlines if possible');
      }
      
      if (reasons.some(r => r.includes('capacity'))) {
        suggestions.push('Reduce daily study load or extend study period');
      }
    }
    
    return suggestions;
  }

  /**
   * Create success result
   */
  private createSuccessResult(
    redistributed: StudySession[], 
    failed: StudySession[], 
    conflicts: number, 
    message: string
  ): UnifiedRedistributionResult {
    return {
      success: true,
      redistributedSessions: redistributed,
      failedSessions: failed,
      conflictsResolved: conflicts,
      totalSessionsMoved: redistributed.length,
      rollbackPerformed: false,
      feedback: {
        message,
        details: {
          totalProcessed: redistributed.length + failed.length,
          successfullyMoved: redistributed.length,
          failedToMove: failed.length,
          reasons: [],
          suggestions: []
        }
      }
    };
  }

  /**
   * Create failure result
   */
  private createFailureResult(failed: StudySession[], message: string): UnifiedRedistributionResult {
    return {
      success: false,
      redistributedSessions: [],
      failedSessions: failed,
      conflictsResolved: 0,
      totalSessionsMoved: 0,
      rollbackPerformed: false,
      feedback: {
        message,
        details: {
          totalProcessed: failed.length,
          successfullyMoved: 0,
          failedToMove: failed.length,
          reasons: [message],
          suggestions: this.generateSuggestions(failed, [message])
        }
      }
    };
  }

  // Utility methods
  private timeToMinutes(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return (hours || 0) * 60 + (minutes || 0);
  }

  private minutesToTime(minutes: number): string {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
  }
}

/**
 * Factory function to create unified redistribution engine
 */
export function createUnifiedRedistributionEngine(
  settings: UserSettings,
  fixedCommitments: FixedCommitment[]
): UnifiedRedistributionEngine {
  return new UnifiedRedistributionEngine(settings, fixedCommitments);
}
