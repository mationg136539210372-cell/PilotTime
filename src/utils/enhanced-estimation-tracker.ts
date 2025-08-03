/**
 * Enhanced Estimation Tracker with ML-style learning capabilities
 */

export interface TaskEstimationContext {
  // Basic factors
  taskType: string;
  category: string;
  complexity: 'simple' | 'medium' | 'complex';
  
  // Environmental factors
  timeOfDay: 'morning' | 'afternoon' | 'evening';
  dayOfWeek: number;
  isWeekend: boolean;
  energyLevel?: 'low' | 'medium' | 'high';
  
  // Task characteristics
  hasDeadlinePressure: boolean;
  isNewDomain: boolean;
  requiresCreativity: boolean;
  requiresResearch: boolean;
  requiresCollaboration: boolean;
  involvesTechnology: boolean;
  
  // User context
  similarTasksCompleted: number;
  recentAccuracy: number; // Recent estimation accuracy for this type
  currentWorkload: 'light' | 'medium' | 'heavy';
  availableTimeSlot: number; // hours available for the session
}

export interface EstimationFactors {
  // Personal multipliers learned over time
  personalMultipliers: {
    [taskType: string]: {
      baseMultiplier: number;
      confidenceScore: number; // 0-1, how reliable this multiplier is
      sampleSize: number;
    };
  };
  
  // Context-based adjustments
  contextualAdjustments: {
    timeOfDay: { morning: number; afternoon: number; evening: number };
    dayOfWeek: number[]; // multiplier for each day 0-6
    workload: { light: number; medium: number; heavy: number };
    energyLevel: { low: number; medium: number; high: number };
  };
  
  // Complexity patterns
  complexityPatterns: {
    [taskType: string]: {
      simple: number;
      medium: number;
      complex: number;
    };
  };
}

export interface EstimationSuggestion {
  suggestedHours: number;
  confidenceLevel: 'low' | 'medium' | 'high';
  reasoning: string[];
  alternativeEstimates: {
    conservative: number;
    optimistic: number;
    realistic: number;
  };
  breakdownSuggestion?: {
    sessions: number;
    hoursPerSession: number;
    reasoning: string;
  };
}

class EnhancedEstimationTracker {
  private storageKey = 'timepilot-enhanced-estimation';
  private factors: EstimationFactors;

  constructor() {
    this.factors = this.loadFactors();
  }

  private loadFactors(): EstimationFactors {
    const saved = localStorage.getItem(this.storageKey);
    if (saved) {
      return JSON.parse(saved);
    }
    
    return this.getDefaultFactors();
  }

  private saveFactors(): void {
    localStorage.setItem(this.storageKey, JSON.stringify(this.factors));
  }

  private getDefaultFactors(): EstimationFactors {
    return {
      personalMultipliers: {},
      contextualAdjustments: {
        timeOfDay: { morning: 0.9, afternoon: 1.0, evening: 1.1 },
        dayOfWeek: [1.1, 0.9, 0.9, 0.9, 0.9, 1.0, 1.2], // Sun-Sat
        workload: { light: 0.9, medium: 1.0, heavy: 1.2 },
        energyLevel: { low: 1.3, medium: 1.0, high: 0.8 }
      },
      complexityPatterns: {
        Writing: { simple: 1.0, medium: 1.3, complex: 1.6 },
        Learning: { simple: 1.0, medium: 1.4, complex: 1.8 },
        Creating: { simple: 1.0, medium: 1.5, complex: 2.0 },
        Planning: { simple: 1.0, medium: 1.3, complex: 1.7 },
        Administrative: { simple: 1.0, medium: 1.4, complex: 1.9 }
      }
    };
  }

  /**
   * Record completion to improve future estimates
   */
  recordTaskCompletion(
    estimatedHours: number,
    actualHours: number,
    context: TaskEstimationContext
  ): void {
    const efficiency = actualHours / estimatedHours;
    
    // Update personal multipliers for this task type
    const taskTypeKey = context.taskType;
    if (!this.factors.personalMultipliers[taskTypeKey]) {
      this.factors.personalMultipliers[taskTypeKey] = {
        baseMultiplier: efficiency,
        confidenceScore: 0.1,
        sampleSize: 1
      };
    } else {
      const current = this.factors.personalMultipliers[taskTypeKey];
      const newSampleSize = current.sampleSize + 1;
      
      // Weighted average with more weight on recent data
      const weight = Math.min(0.3, 1 / newSampleSize);
      current.baseMultiplier = current.baseMultiplier * (1 - weight) + efficiency * weight;
      current.sampleSize = newSampleSize;
      current.confidenceScore = Math.min(1.0, newSampleSize / 10); // Confidence builds with sample size
    }

    // Update contextual adjustments based on when the task was done vs estimated
    this.updateContextualFactors(context, efficiency);
    
    this.saveFactors();
  }

  private updateContextualFactors(context: TaskEstimationContext, efficiency: number): void {
    // Update time of day patterns
    const timeMultiplier = this.factors.contextualAdjustments.timeOfDay[context.timeOfDay];
    const adjustedTimeMultiplier = timeMultiplier * 0.95 + efficiency * 0.05; // Slow learning
    this.factors.contextualAdjustments.timeOfDay[context.timeOfDay] = adjustedTimeMultiplier;

    // Update day of week patterns
    const dayMultiplier = this.factors.contextualAdjustments.dayOfWeek[context.dayOfWeek];
    const adjustedDayMultiplier = dayMultiplier * 0.95 + efficiency * 0.05;
    this.factors.contextualAdjustments.dayOfWeek[context.dayOfWeek] = adjustedDayMultiplier;

    // Update workload patterns
    const workloadMultiplier = this.factors.contextualAdjustments.workload[context.currentWorkload];
    const adjustedWorkloadMultiplier = workloadMultiplier * 0.95 + efficiency * 0.05;
    this.factors.contextualAdjustments.workload[context.currentWorkload] = adjustedWorkloadMultiplier;
  }

  /**
   * Generate smart estimation suggestion
   */
  generateEstimation(
    baseEstimate: number,
    context: TaskEstimationContext
  ): EstimationSuggestion {
    let multiplier = 1.0;
    const reasoning: string[] = [];

    // Apply personal learning
    const personalData = this.factors.personalMultipliers[context.taskType];
    if (personalData && personalData.confidenceScore > 0.3) {
      multiplier *= personalData.baseMultiplier;
      reasoning.push(`Based on your ${personalData.sampleSize} previous ${context.taskType} tasks`);
    }

    // Apply complexity
    const complexityMultiplier = this.factors.complexityPatterns[context.taskType]?.[context.complexity] || 1.0;
    multiplier *= complexityMultiplier;
    if (complexityMultiplier !== 1.0) {
      reasoning.push(`${context.complexity} complexity: ${complexityMultiplier > 1 ? '+' : ''}${Math.round((complexityMultiplier - 1) * 100)}%`);
    }

    // Apply contextual factors
    const timeMultiplier = this.factors.contextualAdjustments.timeOfDay[context.timeOfDay];
    multiplier *= timeMultiplier;
    if (timeMultiplier !== 1.0) {
      reasoning.push(`${context.timeOfDay} productivity: ${timeMultiplier > 1 ? '+' : ''}${Math.round((timeMultiplier - 1) * 100)}%`);
    }

    const workloadMultiplier = this.factors.contextualAdjustments.workload[context.currentWorkload];
    multiplier *= workloadMultiplier;
    if (workloadMultiplier !== 1.0) {
      reasoning.push(`${context.currentWorkload} workload: ${workloadMultiplier > 1 ? '+' : ''}${Math.round((workloadMultiplier - 1) * 100)}%`);
    }

    // Special factors
    if (context.hasDeadlinePressure) {
      multiplier *= 0.85; // People work faster under pressure but might sacrifice quality
      reasoning.push('Deadline pressure: -15%');
    }

    if (context.isNewDomain) {
      multiplier *= 1.4;
      reasoning.push('New domain/unfamiliar: +40%');
    }

    if (context.requiresCreativity) {
      multiplier *= 1.2;
      reasoning.push('Creative work: +20%');
    }

    if (context.requiresResearch) {
      multiplier *= 1.3;
      reasoning.push('Research required: +30%');
    }

    if (context.requiresCollaboration) {
      multiplier *= 1.25;
      reasoning.push('Collaboration needed: +25%');
    }

    // Calculate final estimate
    const suggestedHours = baseEstimate * multiplier;
    
    // Calculate confidence based on data quality
    let confidenceLevel: 'low' | 'medium' | 'high' = 'medium';
    if (personalData && personalData.confidenceScore > 0.7) {
      confidenceLevel = 'high';
    } else if (!personalData || personalData.confidenceScore < 0.3) {
      confidenceLevel = 'low';
    }

    // Generate alternative estimates
    const conservativeMultiplier = multiplier * 1.3;
    const optimisticMultiplier = multiplier * 0.8;

    // Suggest session breakdown for larger tasks
    let breakdownSuggestion;
    if (suggestedHours > 3) {
      const idealSessionLength = context.availableTimeSlot > 2 ? 2 : 1.5;
      const sessions = Math.ceil(suggestedHours / idealSessionLength);
      const hoursPerSession = suggestedHours / sessions;
      
      breakdownSuggestion = {
        sessions,
        hoursPerSession: Math.round(hoursPerSession * 4) / 4, // Round to quarters
        reasoning: `Large task broken into ${sessions} sessions for better focus and progress tracking`
      };
    }

    return {
      suggestedHours: Math.round(suggestedHours * 4) / 4, // Round to quarters
      confidenceLevel,
      reasoning,
      alternativeEstimates: {
        conservative: Math.round(baseEstimate * conservativeMultiplier * 4) / 4,
        optimistic: Math.round(baseEstimate * optimisticMultiplier * 4) / 4,
        realistic: Math.round(suggestedHours * 4) / 4
      },
      breakdownSuggestion
    };
  }

  /**
   * Get user's estimation patterns and insights
   */
  getEstimationInsights(): {
    overallAccuracy: number;
    strengths: string[];
    weaknesses: string[];
    recommendations: string[];
  } {
    const insights = {
      overallAccuracy: 0,
      strengths: [] as string[],
      weaknesses: [] as string[],
      recommendations: [] as string[]
    };

    const multipliers = Object.values(this.factors.personalMultipliers);
    if (multipliers.length === 0) {
      insights.recommendations.push('Complete a few tasks to get personalized insights');
      return insights;
    }

    // Calculate overall accuracy
    const weightedAccuracy = multipliers.reduce((sum, data) => {
      return sum + (1 / data.baseMultiplier) * data.confidenceScore;
    }, 0) / multipliers.reduce((sum, data) => sum + data.confidenceScore, 0);

    insights.overallAccuracy = Math.round(weightedAccuracy * 100);

    // Identify strengths and weaknesses
    Object.entries(this.factors.personalMultipliers).forEach(([taskType, data]) => {
      if (data.confidenceScore > 0.5) {
        const accuracy = 1 / data.baseMultiplier;
        if (accuracy > 0.85 && accuracy < 1.15) {
          insights.strengths.push(`Accurate estimation for ${taskType} tasks`);
        } else if (accuracy < 0.8) {
          insights.weaknesses.push(`Tends to overestimate ${taskType} tasks`);
          insights.recommendations.push(`Try reducing initial estimates for ${taskType} by 15-20%`);
        } else if (accuracy > 1.2) {
          insights.weaknesses.push(`Tends to underestimate ${taskType} tasks`);
          insights.recommendations.push(`Add buffer time for ${taskType} tasks`);
        }
      }
    });

    // Time of day insights
    const bestTime = Object.entries(this.factors.contextualAdjustments.timeOfDay)
      .reduce((best, [time, multiplier]) => multiplier < best.multiplier ? { time, multiplier } : best, 
        { time: 'morning', multiplier: 1.0 });
    
    if (bestTime.multiplier < 0.95) {
      insights.strengths.push(`Most productive in the ${bestTime.time}`);
      insights.recommendations.push(`Schedule important tasks in the ${bestTime.time} when possible`);
    }

    return insights;
  }
}

export const enhancedEstimationTracker = new EnhancedEstimationTracker();
