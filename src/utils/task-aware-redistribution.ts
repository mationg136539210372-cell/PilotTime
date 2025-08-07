import { 
  Task, 
  StudyPlan, 
  StudySession, 
  UserSettings, 
  FixedCommitment
} from '../types';
import { getLocalDateString } from './scheduling';

interface TaskRedistributionContext {
  task: Task;
  totalEstimatedHours: number;
  completedHours: number;
  remainingHours: number;
  missedSessions: Array<{
    session: StudySession;
    originalPlanDate: string;
  }>;
  plannedButNotCompletedSessions: Array<{
    session: StudySession;
    planDate: string;
  }>;
  availableDaysUntilDeadline: string[];
}

interface TaskAwareRedistributionResult {
  success: boolean;
  redistribution: {
    [taskId: string]: {
      removedSessions: StudySession[];
      newSessions: StudySession[];
      redistributedHours: number;
    };
  };
  feedback: {
    message: string;
    details: {
      tasksProcessed: number;
      totalHoursRedistributed: number;
      issuesEncountered: string[];
    };
  };
}

/**
 * Task-Aware Redistribution Engine
 * 
 * This system addresses the core issue where missed sessions should be treated as part of 
 * the overall remaining work for a task rather than individual sessions to be moved.
 * 
 * Example scenario:
 * - 4-hour task due in 4 days (1h/day planned)
 * - Day 1: Completed 1h session ✓
 * - Day 2: Missed 1h session ✗
 * - Remaining: 3h total work (not just moving the 1h missed session)
 * 
 * This engine will:
 * 1. Calculate total remaining work per task
 * 2. Remove all incomplete sessions for that task
 * 3. Re-plan the remaining work optimally across available days
 */
export class TaskAwareRedistributionEngine {
  private settings: UserSettings;
  private fixedCommitments: FixedCommitment[];

  constructor(settings: UserSettings, fixedCommitments: FixedCommitment[]) {
    this.settings = settings;
    this.fixedCommitments = fixedCommitments;
  }

  /**
   * Main task-aware redistribution method
   */
  async redistributeTasksWithMissedSessions(
    studyPlans: StudyPlan[],
    tasks: Task[]
  ): Promise<TaskAwareRedistributionResult> {
    
    const today = getLocalDateString();
    const redistribution: TaskAwareRedistributionResult['redistribution'] = {};
    const issues: string[] = [];
    let totalHoursRedistributed = 0;

    // Step 1: Identify tasks that have missed sessions
    const tasksWithMissedSessions = this.identifyTasksWithMissedSessions(studyPlans, tasks, today);
    
    if (tasksWithMissedSessions.length === 0) {
      return {
        success: true,
        redistribution: {},
        feedback: {
          message: "No tasks with missed sessions found.",
          details: {
            tasksProcessed: 0,
            totalHoursRedistributed: 0,
            issuesEncountered: []
          }
        }
      };
    }

    console.log(`Found ${tasksWithMissedSessions.length} tasks with missed sessions to redistribute`);

    // Step 2: Process each task individually
    for (const taskContext of tasksWithMissedSessions) {
      try {
        const result = await this.redistributeSingleTask(taskContext, studyPlans);
        
        if (result.success) {
          redistribution[taskContext.task.id] = {
            removedSessions: result.removedSessions,
            newSessions: result.newSessions,
            redistributedHours: result.redistributedHours
          };
          totalHoursRedistributed += result.redistributedHours;
          
          console.log(`Successfully redistributed ${result.redistributedHours}h for task "${taskContext.task.title}"`);
        } else {
          issues.push(`${taskContext.task.title}: ${result.reason}`);
          console.warn(`Failed to redistribute task "${taskContext.task.title}": ${result.reason}`);
        }
      } catch (error) {
        const errorMessage = `${taskContext.task.title}: System error during redistribution`;
        issues.push(errorMessage);
        console.error(errorMessage, error);
      }
    }

    const successfulTasks = Object.keys(redistribution).length;
    const success = successfulTasks > 0;

    return {
      success,
      redistribution,
      feedback: {
        message: success 
          ? `Successfully redistributed ${totalHoursRedistributed.toFixed(1)} hours across ${successfulTasks} tasks`
          : `Failed to redistribute any tasks. Issues: ${issues.join('; ')}`,
        details: {
          tasksProcessed: tasksWithMissedSessions.length,
          totalHoursRedistributed,
          issuesEncountered: issues
        }
      }
    };
  }

  /**
   * Identify tasks that have missed sessions and need redistribution
   */
  private identifyTasksWithMissedSessions(
    studyPlans: StudyPlan[], 
    tasks: Task[], 
    today: string
  ): TaskRedistributionContext[] {
    
    const taskContexts: TaskRedistributionContext[] = [];

    tasks.forEach(task => {
      if (task.status !== 'pending') return;

      const missedSessions: TaskRedistributionContext['missedSessions'] = [];
      const plannedButNotCompletedSessions: TaskRedistributionContext['plannedButNotCompletedSessions'] = [];
      let completedHours = 0;

      // Analyze all sessions for this task
      studyPlans.forEach(plan => {
        plan.plannedTasks.forEach(session => {
          if (session.taskId !== task.id) return;

          if (session.done || session.status === 'completed') {
            // Count completed hours
            completedHours += session.actualHours || session.allocatedHours;
          } else if (session.status === 'skipped_user' || session.status === 'skipped_system') {
            // Skipped sessions count as "done" for planning purposes
            completedHours += session.allocatedHours;
          } else if (plan.date < today) {
            // This is a missed session
            missedSessions.push({
              session,
              originalPlanDate: plan.date
            });
          } else {
            // This is a future planned session that hasn't been completed
            plannedButNotCompletedSessions.push({
              session,
              planDate: plan.date
            });
          }
        });
      });

      // Only process tasks that have actual missed sessions
      if (missedSessions.length > 0) {
        const remainingHours = Math.max(0, task.estimatedHours - completedHours);
        
        // Calculate available days until deadline
        const deadline = new Date(task.deadline);
        if (this.settings.bufferDays > 0) {
          deadline.setDate(deadline.getDate() - this.settings.bufferDays);
        }
        
        const availableDaysUntilDeadline = this.getAvailableDaysUntilDeadline(today, deadline);

        taskContexts.push({
          task,
          totalEstimatedHours: task.estimatedHours,
          completedHours,
          remainingHours,
          missedSessions,
          plannedButNotCompletedSessions,
          availableDaysUntilDeadline
        });

        console.log(`Task "${task.title}": ${completedHours}h completed, ${remainingHours}h remaining, ${missedSessions.length} missed sessions`);
      }
    });

    // Sort by priority (important tasks first, then by deadline urgency)
    return taskContexts.sort((a, b) => {
      if (a.task.importance !== b.task.importance) {
        return a.task.importance ? -1 : 1;
      }
      return new Date(a.task.deadline).getTime() - new Date(b.task.deadline).getTime();
    });
  }

  /**
   * Redistribute a single task's remaining work
   */
  private async redistributeSingleTask(
    context: TaskRedistributionContext,
    studyPlans: StudyPlan[]
  ): Promise<{
    success: boolean;
    removedSessions: StudySession[];
    newSessions: StudySession[];
    redistributedHours: number;
    reason?: string;
  }> {
    
    const { task, remainingHours, missedSessions, plannedButNotCompletedSessions, availableDaysUntilDeadline } = context;

    if (remainingHours <= 0) {
      return {
        success: true,
        removedSessions: [],
        newSessions: [],
        redistributedHours: 0,
        reason: 'Task already completed'
      };
    }

    if (availableDaysUntilDeadline.length === 0) {
      return {
        success: false,
        removedSessions: [],
        newSessions: [],
        redistributedHours: 0,
        reason: 'No available days until deadline'
      };
    }

    // Step 1: Remove all incomplete sessions for this task from study plans
    const removedSessions: StudySession[] = [];
    
    // Remove missed sessions
    missedSessions.forEach(({ session, originalPlanDate }) => {
      const plan = studyPlans.find(p => p.date === originalPlanDate);
      if (plan) {
        const sessionIndex = plan.plannedTasks.findIndex(s => 
          s.taskId === session.taskId && s.sessionNumber === session.sessionNumber
        );
        if (sessionIndex !== -1) {
          removedSessions.push(plan.plannedTasks.splice(sessionIndex, 1)[0]);
          plan.totalStudyHours = Math.max(0, plan.totalStudyHours - session.allocatedHours);
        }
      }
    });

    // Remove planned but not completed sessions
    plannedButNotCompletedSessions.forEach(({ session, planDate }) => {
      const plan = studyPlans.find(p => p.date === planDate);
      if (plan) {
        const sessionIndex = plan.plannedTasks.findIndex(s => 
          s.taskId === session.taskId && s.sessionNumber === session.sessionNumber
        );
        if (sessionIndex !== -1) {
          removedSessions.push(plan.plannedTasks.splice(sessionIndex, 1)[0]);
          plan.totalStudyHours = Math.max(0, plan.totalStudyHours - session.allocatedHours);
        }
      }
    });

    // Step 2: Re-plan the remaining work optimally
    const newSessions = this.planRemainingWork(
      task,
      remainingHours,
      availableDaysUntilDeadline,
      studyPlans
    );

    if (newSessions.length === 0) {
      return {
        success: false,
        removedSessions,
        newSessions: [],
        redistributedHours: 0,
        reason: 'Unable to find available time slots for remaining work'
      };
    }

    // Step 3: Add new sessions to study plans
    newSessions.forEach(session => {
      const plan = studyPlans.find(p => p.date === session.scheduledTime.split(' ')[0]);
      if (plan) {
        plan.plannedTasks.push(session);
        plan.totalStudyHours += session.allocatedHours;
      }
    });

    return {
      success: true,
      removedSessions,
      newSessions,
      redistributedHours: remainingHours
    };
  }

  /**
   * Plan the remaining work for a task across available days
   */
  private planRemainingWork(
    task: Task,
    remainingHours: number,
    availableDays: string[],
    studyPlans: StudyPlan[]
  ): StudySession[] {
    
    const newSessions: StudySession[] = [];
    const minSessionLength = (this.settings.minSessionLength || 15) / 60; // Convert to hours
    const maxSessionLength = Math.min(4, this.settings.dailyAvailableHours);
    
    // For one-time tasks, try to fit all remaining work in one session
    if (task.isOneTimeTask && remainingHours <= maxSessionLength) {
      for (const date of availableDays) {
        const session = this.createSessionForDate(
          task,
          remainingHours,
          date,
          1,
          studyPlans
        );
        
        if (session) {
          newSessions.push(session);
          break;
        }
      }
      
      return newSessions;
    }
    
    // For regular tasks, distribute work evenly across available days
    const sessionsNeeded = Math.ceil(remainingHours / maxSessionLength);
    const daysToUse = Math.min(availableDays.length, sessionsNeeded);
    const hoursPerSession = remainingHours / daysToUse;
    
    let sessionNumber = 1;
    let remainingToSchedule = remainingHours;
    
    for (let i = 0; i < daysToUse && remainingToSchedule > 0; i++) {
      const date = availableDays[i];
      const sessionHours = Math.min(
        Math.max(minSessionLength, hoursPerSession),
        remainingToSchedule,
        maxSessionLength
      );
      
      const session = this.createSessionForDate(
        task,
        sessionHours,
        date,
        sessionNumber,
        studyPlans
      );
      
      if (session) {
        newSessions.push(session);
        remainingToSchedule -= sessionHours;
        sessionNumber++;
      } else {
        console.warn(`Could not create session for ${sessionHours}h on ${date} for task "${task.title}"`);
      }
    }
    
    return newSessions;
  }

  /**
   * Create a session for a specific date if time is available
   */
  private createSessionForDate(
    task: Task,
    hours: number,
    date: string,
    sessionNumber: number,
    studyPlans: StudyPlan[]
  ): StudySession | null {
    
    // Get or create plan for this date
    let plan = studyPlans.find(p => p.date === date);
    if (!plan) {
      plan = {
        id: `plan-${date}`,
        date,
        plannedTasks: [],
        totalStudyHours: 0,
        availableHours: this.settings.dailyAvailableHours
      };
      studyPlans.push(plan);
    }
    
    // Check if there's enough capacity
    const usedHours = plan.plannedTasks.reduce((sum, s) => sum + s.allocatedHours, 0);
    const availableHours = this.settings.dailyAvailableHours - usedHours;
    
    if (availableHours < hours) {
      return null; // Not enough time available
    }
    
    // Find available time slot (simplified - could use the conflict checker for more sophistication)
    const timeSlot = this.findSimpleTimeSlot(hours, plan.plannedTasks);
    
    if (!timeSlot) {
      return null; // No available time slot
    }
    
    return {
      taskId: task.id,
      scheduledTime: `${date} ${timeSlot.start}`,
      startTime: timeSlot.start,
      endTime: timeSlot.end,
      allocatedHours: hours,
      sessionNumber,
      isFlexible: true,
      status: 'scheduled'
    };
  }

  /**
   * Simple time slot finder (could be enhanced with the full conflict checker)
   */
  private findSimpleTimeSlot(
    requiredHours: number,
    existingSessions: StudySession[]
  ): { start: string; end: string } | null {
    
    const requiredMinutes = requiredHours * 60;
    const studyStart = this.settings.studyWindowStartHour * 60;
    const studyEnd = this.settings.studyWindowEndHour * 60;
    
    // Create list of busy intervals
    const busyIntervals = existingSessions
      .filter(s => s.startTime && s.endTime)
      .map(s => ({
        start: this.timeToMinutes(s.startTime!),
        end: this.timeToMinutes(s.endTime!)
      }))
      .sort((a, b) => a.start - b.start);
    
    // Find first available gap
    let currentTime = studyStart;
    
    for (const interval of busyIntervals) {
      const availableGap = interval.start - currentTime;
      
      if (availableGap >= requiredMinutes) {
        return {
          start: this.minutesToTime(currentTime),
          end: this.minutesToTime(currentTime + requiredMinutes)
        };
      }
      
      currentTime = Math.max(currentTime, interval.end);
    }
    
    // Check final gap
    const finalGap = studyEnd - currentTime;
    if (finalGap >= requiredMinutes) {
      return {
        start: this.minutesToTime(currentTime),
        end: this.minutesToTime(currentTime + requiredMinutes)
      };
    }
    
    return null;
  }

  /**
   * Get available days until deadline
   */
  private getAvailableDaysUntilDeadline(today: string, deadline: Date): string[] {
    const availableDays: string[] = [];
    const currentDate = new Date(today);
    
    while (currentDate <= deadline) {
      const dateStr = currentDate.toISOString().split('T')[0];
      const dayOfWeek = currentDate.getDay();
      
      if (dateStr >= today && this.settings.workDays.includes(dayOfWeek)) {
        availableDays.push(dateStr);
      }
      
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    return availableDays;
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
 * Factory function to create task-aware redistribution engine
 */
export function createTaskAwareRedistributionEngine(
  settings: UserSettings,
  fixedCommitments: FixedCommitment[]
): TaskAwareRedistributionEngine {
  return new TaskAwareRedistributionEngine(settings, fixedCommitments);
}
