import { 
  StudySession, 
  StudyPlan, 
  FixedCommitment, 
  UserSettings,
  SessionSchedulingMetadata
} from '../types';
import { getLocalDateString, doesCommitmentApplyToDate, getEffectiveStudyWindow } from './scheduling';

export interface ConflictDetails {
  type: 'session_overlap' | 'commitment_conflict' | 'daily_limit_exceeded' | 'invalid_time_slot' | 'all_day_conflict';
  message: string;
  sessionId?: string;
  conflictingSessionId?: string;
  conflictingCommitmentId?: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggestion?: string;
}

export interface ConflictValidationResult {
  isValid: boolean;
  conflicts: ConflictDetails[];
  warnings: ConflictDetails[];
  suggestions: string[];
  canProceed: boolean; // Whether redistribution can continue despite conflicts
}

export interface TimeSlotReservation {
  sessionId: string;
  date: string;
  startTime: string;
  endTime: string;
  allocatedHours: number;
  priority: number;
  isReserved: boolean;
}

/**
 * Enhanced Conflict Prevention Engine
 * Provides comprehensive conflict detection and prevention for the unified redistribution system
 */
export class ConflictPreventionEngine {
  private settings: UserSettings;
  private fixedCommitments: FixedCommitment[];
  private reservedSlots: Map<string, TimeSlotReservation[]> = new Map();

  constructor(settings: UserSettings, fixedCommitments: FixedCommitment[]) {
    this.settings = settings;
    this.fixedCommitments = fixedCommitments;
  }

  /**
   * Validate study plans before redistribution starts
   */
  validateBeforeRedistribution(
    studyPlans: StudyPlan[], 
    sessionsToRedistribute: StudySession[]
  ): ConflictValidationResult {
    const conflicts: ConflictDetails[] = [];
    const warnings: ConflictDetails[] = [];
    const suggestions: string[] = [];

    // Check if there are available future days
    const today = getLocalDateString();
    const futurePlans = studyPlans.filter(plan => plan.date >= today);
    
    if (futurePlans.length === 0) {
      conflicts.push({
        type: 'invalid_time_slot',
        message: 'No future study days available for redistribution',
        severity: 'critical',
        suggestion: 'Add more study days to your schedule'
      });
    }

    // Check daily capacity availability
    const totalHoursToRedistribute = sessionsToRedistribute.reduce(
      (sum, session) => sum + session.allocatedHours, 0
    );
    
    const totalAvailableCapacity = futurePlans.reduce(
      (sum, plan) => {
        const usedHours = plan.plannedTasks.reduce((planSum, session) => planSum + session.allocatedHours, 0);
        return sum + Math.max(0, this.settings.dailyAvailableHours - usedHours);
      }, 0
    );

    if (totalHoursToRedistribute > totalAvailableCapacity) {
      conflicts.push({
        type: 'daily_limit_exceeded',
        message: `Need ${totalHoursToRedistribute.toFixed(1)}h but only ${totalAvailableCapacity.toFixed(1)}h available`,
        severity: 'high',
        suggestion: 'Consider increasing daily available hours or extending deadlines'
      });
    } else if (totalHoursToRedistribute > totalAvailableCapacity * 0.8) {
      warnings.push({
        type: 'daily_limit_exceeded',
        message: `Redistribution will use ${(totalHoursToRedistribute / totalAvailableCapacity * 100).toFixed(0)}% of available capacity`,
        severity: 'medium',
        suggestion: 'Schedule may become very tight'
      });
    }

    // Check for existing conflicts in current plans
    const existingConflicts = this.detectExistingConflicts(studyPlans);
    conflicts.push(...existingConflicts);

    // Initialize reservation system
    this.initializeReservations(futurePlans);

    return {
      isValid: conflicts.filter(c => c.severity === 'critical' || c.severity === 'high').length === 0,
      conflicts,
      warnings,
      suggestions,
      canProceed: conflicts.filter(c => c.severity === 'critical').length === 0
    };
  }

  /**
   * Reserve time slots for sessions being redistributed
   */
  reserveTimeSlots(sessions: StudySession[], dates: string[]): Map<string, TimeSlotReservation[]> {
    const reservations = new Map<string, TimeSlotReservation[]>();

    dates.forEach(date => {
      const dailyReservations: TimeSlotReservation[] = [];
      
      sessions.forEach(session => {
        const reservation: TimeSlotReservation = {
          sessionId: `${session.taskId}-${session.sessionNumber}`,
          date,
          startTime: session.startTime || '00:00',
          endTime: session.endTime || '23:59',
          allocatedHours: session.allocatedHours,
          priority: session.schedulingMetadata?.priority || 0,
          isReserved: false
        };
        
        dailyReservations.push(reservation);
      });

      reservations.set(date, dailyReservations);
    });

    return reservations;
  }

  /**
   * Validate after redistribution is complete
   */
  validateAfterRedistribution(studyPlans: StudyPlan[]): ConflictValidationResult {
    const conflicts: ConflictDetails[] = [];
    const warnings: ConflictDetails[] = [];
    const suggestions: string[] = [];

    // Check each plan for conflicts
    studyPlans.forEach(plan => {
      const planConflicts = this.validateSinglePlan(plan);
      conflicts.push(...planConflicts.conflicts);
      warnings.push(...planConflicts.warnings);
    });

    // Check for scheduling density issues
    const densityIssues = this.checkSchedulingDensity(studyPlans);
    warnings.push(...densityIssues);

    // Generate suggestions based on found issues
    if (conflicts.length > 0) {
      suggestions.push('Review and resolve scheduling conflicts before proceeding');
    }
    
    if (warnings.length > 0) {
      suggestions.push('Consider optimizing schedule for better balance');
    }

    return {
      isValid: conflicts.length === 0,
      conflicts,
      warnings,
      suggestions,
      canProceed: conflicts.filter(c => c.severity === 'critical' || c.severity === 'high').length === 0
    };
  }

  /**
   * Check if a specific time slot is available
   */
  isTimeSlotAvailable(
    date: string,
    startTime: string,
    endTime: string,
    existingSessions: StudySession[],
    excludeSessionId?: string
  ): ConflictValidationResult {
    const conflicts: ConflictDetails[] = [];
    const warnings: ConflictDetails[] = [];

    // Basic time validation
    if (!this.isValidTimeRange(startTime, endTime)) {
      conflicts.push({
        type: 'invalid_time_slot',
        message: 'Invalid time range',
        severity: 'high'
      });
    }

    // Check study window
    const effectiveWindow = getEffectiveStudyWindow(date, this.settings);
    if (!this.isWithinStudyWindow(startTime, endTime, effectiveWindow)) {
      conflicts.push({
        type: 'invalid_time_slot',
        message: `Time slot outside study window (${effectiveWindow.startHour}:00 - ${effectiveWindow.endHour}:00)`,
        severity: 'high'
      });
    }

    // Check work days
    const dayOfWeek = new Date(date).getDay();
    if (!this.settings.workDays.includes(dayOfWeek)) {
      conflicts.push({
        type: 'invalid_time_slot',
        message: 'Date is not a work day',
        severity: 'high'
      });
    }

    // Check session overlaps
    const sessionConflicts = this.checkSessionOverlaps(
      date, startTime, endTime, existingSessions, excludeSessionId
    );
    conflicts.push(...sessionConflicts);

    // Check commitment conflicts
    const commitmentConflicts = this.checkCommitmentConflicts(date, startTime, endTime);
    conflicts.push(...commitmentConflicts);

    // Check daily limits
    const dailyLimitConflicts = this.checkDailyLimits(date, startTime, endTime, existingSessions);
    conflicts.push(...dailyLimitConflicts);

    return {
      isValid: conflicts.length === 0,
      conflicts,
      warnings,
      suggestions: conflicts.length > 0 ? ['Find alternative time slot'] : [],
      canProceed: conflicts.filter(c => c.severity === 'critical' || c.severity === 'high').length === 0
    };
  }

  /**
   * Perform rollback validation
   */
  rollbackOnConflict(originalPlans: StudyPlan[], workingPlans: StudyPlan[]): boolean {
    const conflicts = this.validateAfterRedistribution(workingPlans);
    
    if (!conflicts.isValid) {
      // Restore original plans
      workingPlans.length = 0;
      workingPlans.push(...JSON.parse(JSON.stringify(originalPlans)));
      
      console.warn('Rollback performed due to conflicts:', conflicts.conflicts);
      return true;
    }
    
    return false;
  }

  /**
   * Detect existing conflicts in study plans
   */
  private detectExistingConflicts(studyPlans: StudyPlan[]): ConflictDetails[] {
    const conflicts: ConflictDetails[] = [];

    studyPlans.forEach(plan => {
      const planConflicts = this.validateSinglePlan(plan);
      conflicts.push(...planConflicts.conflicts);
    });

    return conflicts;
  }

  /**
   * Validate a single study plan
   */
  private validateSinglePlan(plan: StudyPlan): ConflictValidationResult {
    const conflicts: ConflictDetails[] = [];
    const warnings: ConflictDetails[] = [];

    // Check for session overlaps within the plan
    const sessions = plan.plannedTasks.filter(s => s.startTime && s.endTime);
    
    for (let i = 0; i < sessions.length - 1; i++) {
      for (let j = i + 1; j < sessions.length; j++) {
        const session1 = sessions[i];
        const session2 = sessions[j];
        
        if (this.sessionsOverlap(session1, session2)) {
          conflicts.push({
            type: 'session_overlap',
            message: `Sessions overlap: ${session1.startTime}-${session1.endTime} and ${session2.startTime}-${session2.endTime}`,
            sessionId: `${session1.taskId}-${session1.sessionNumber}`,
            conflictingSessionId: `${session2.taskId}-${session2.sessionNumber}`,
            severity: 'high',
            suggestion: 'Adjust session times to avoid overlap'
          });
        }
      }
    }

    // Check commitment conflicts for each session
    sessions.forEach(session => {
      if (session.startTime && session.endTime) {
        const commitmentConflicts = this.checkCommitmentConflicts(
          plan.date, session.startTime, session.endTime
        );
        conflicts.push(...commitmentConflicts.map(conflict => ({
          ...conflict,
          sessionId: `${session.taskId}-${session.sessionNumber}`
        })));
      }
    });

    // Check daily limits
    const totalHours = sessions.reduce((sum, s) => sum + s.allocatedHours, 0);
    if (totalHours > this.settings.dailyAvailableHours) {
      warnings.push({
        type: 'daily_limit_exceeded',
        message: `Day exceeds available hours: ${totalHours.toFixed(1)}h > ${this.settings.dailyAvailableHours}h`,
        severity: 'medium',
        suggestion: 'Consider redistributing some sessions to other days'
      });
    }

    return {
      isValid: conflicts.length === 0,
      conflicts,
      warnings,
      suggestions: [],
      canProceed: true
    };
  }

  /**
   * Initialize reservation system
   */
  private initializeReservations(studyPlans: StudyPlan[]): void {
    this.reservedSlots.clear();
    
    studyPlans.forEach(plan => {
      const reservations: TimeSlotReservation[] = [];
      
      plan.plannedTasks.forEach(session => {
        if (session.startTime && session.endTime) {
          reservations.push({
            sessionId: `${session.taskId}-${session.sessionNumber}`,
            date: plan.date,
            startTime: session.startTime,
            endTime: session.endTime,
            allocatedHours: session.allocatedHours,
            priority: session.schedulingMetadata?.priority || 0,
            isReserved: true
          });
        }
      });
      
      this.reservedSlots.set(plan.date, reservations);
    });
  }

  /**
   * Check for session overlaps
   */
  private checkSessionOverlaps(
    date: string,
    startTime: string,
    endTime: string,
    existingSessions: StudySession[],
    excludeSessionId?: string
  ): ConflictDetails[] {
    const conflicts: ConflictDetails[] = [];
    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);
    
    existingSessions.forEach(session => {
      const sessionId = `${session.taskId}-${session.sessionNumber}`;
      if (excludeSessionId && sessionId === excludeSessionId) return;
      
      if (session.startTime && session.endTime) {
        const sessionStart = this.timeToMinutes(session.startTime);
        const sessionEnd = this.timeToMinutes(session.endTime);
        
        if (startMinutes < sessionEnd && endMinutes > sessionStart) {
          conflicts.push({
            type: 'session_overlap',
            message: `Overlaps with existing session (${session.startTime} - ${session.endTime})`,
            conflictingSessionId: sessionId,
            severity: 'high',
            suggestion: 'Choose a different time slot'
          });
        }
      }
    });
    
    return conflicts;
  }

  /**
   * Check commitment conflicts
   */
  private checkCommitmentConflicts(
    date: string,
    startTime: string,
    endTime: string
  ): ConflictDetails[] {
    const conflicts: ConflictDetails[] = [];
    const startMinutes = this.timeToMinutes(startTime);
    const endMinutes = this.timeToMinutes(endTime);
    const dayOfWeek = new Date(date).getDay();
    
    this.fixedCommitments.forEach(commitment => {
      if (doesCommitmentApplyToDate(commitment, date)) {
        // Handle all-day events
        if (commitment.isAllDay) {
          conflicts.push({
            type: 'all_day_conflict',
            message: `Conflicts with all-day commitment: ${commitment.title}`,
            conflictingCommitmentId: commitment.id,
            severity: 'high',
            suggestion: 'Choose a different day'
          });
          return;
        }
        
        // Handle time-specific events
        if (commitment.startTime && commitment.endTime) {
          const commitmentStart = this.timeToMinutes(commitment.startTime);
          const commitmentEnd = this.timeToMinutes(commitment.endTime);
          
          if (startMinutes < commitmentEnd && endMinutes > commitmentStart) {
            conflicts.push({
              type: 'commitment_conflict',
              message: `Conflicts with ${commitment.title} (${commitment.startTime} - ${commitment.endTime})`,
              conflictingCommitmentId: commitment.id,
              severity: 'high',
              suggestion: 'Choose a different time slot'
            });
          }
        }
      }
    });
    
    return conflicts;
  }

  /**
   * Check daily limits
   */
  private checkDailyLimits(
    date: string,
    startTime: string,
    endTime: string,
    existingSessions: StudySession[]
  ): ConflictDetails[] {
    const conflicts: ConflictDetails[] = [];
    const sessionDuration = this.calculateDuration(startTime, endTime);
    
    const existingDailyHours = existingSessions.reduce(
      (sum, session) => sum + session.allocatedHours, 0
    );
    
    const totalHours = existingDailyHours + sessionDuration;
    
    if (totalHours > this.settings.dailyAvailableHours) {
      conflicts.push({
        type: 'daily_limit_exceeded',
        message: `Would exceed daily limit (${totalHours.toFixed(1)}h > ${this.settings.dailyAvailableHours}h)`,
        severity: 'medium',
        suggestion: 'Reduce session length or choose a different day'
      });
    }
    
    return conflicts;
  }

  /**
   * Check scheduling density for potential issues
   */
  private checkSchedulingDensity(studyPlans: StudyPlan[]): ConflictDetails[] {
    const warnings: ConflictDetails[] = [];
    
    studyPlans.forEach(plan => {
      const totalHours = plan.plannedTasks.reduce((sum, s) => sum + s.allocatedHours, 0);
      const utilizationRate = totalHours / this.settings.dailyAvailableHours;
      
      if (utilizationRate > 0.9) {
        warnings.push({
          type: 'daily_limit_exceeded',
          message: `Day ${plan.date} is ${(utilizationRate * 100).toFixed(0)}% utilized`,
          severity: 'low',
          suggestion: 'Consider spreading sessions across more days'
        });
      }
    });
    
    return warnings;
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
   * Validate time range
   */
  private isValidTimeRange(startTime: string, endTime: string): boolean {
    const start = this.timeToMinutes(startTime);
    const end = this.timeToMinutes(endTime);
    return start < end && start >= 0 && end <= 24 * 60;
  }

  /**
   * Check if time is within study window
   */
  private isWithinStudyWindow(
    startTime: string, 
    endTime: string, 
    effectiveWindow: { startHour: number; endHour: number }
  ): boolean {
    const start = this.timeToMinutes(startTime);
    const end = this.timeToMinutes(endTime);
    const windowStart = effectiveWindow.startHour * 60;
    const windowEnd = effectiveWindow.endHour * 60;
    
    return start >= windowStart && end <= windowEnd;
  }

  /**
   * Calculate duration between times
   */
  private calculateDuration(startTime: string, endTime: string): number {
    const start = this.timeToMinutes(startTime);
    const end = this.timeToMinutes(endTime);
    return (end - start) / 60; // Convert to hours
  }

  // Utility methods
  private timeToMinutes(timeString: string): number {
    const [hours, minutes] = timeString.split(':').map(Number);
    return (hours || 0) * 60 + (minutes || 0);
  }
}

/**
 * Factory function to create conflict prevention engine
 */
export function createConflictPreventionEngine(
  settings: UserSettings,
  fixedCommitments: FixedCommitment[]
): ConflictPreventionEngine {
  return new ConflictPreventionEngine(settings, fixedCommitments);
}
