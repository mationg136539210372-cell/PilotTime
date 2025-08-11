import { useState } from 'react';
import { AlertTriangle, AlertCircle, Info, Clock, Calendar, Target, Lightbulb, ChevronDown, ChevronUp, X } from 'lucide-react';
import { FeasibilityWarning, TaskFeasibilityResult } from '../utils/task-feasibility';

interface TaskFeasibilityWarningsProps {
  feasibilityResult: TaskFeasibilityResult;
  onSuggestionApply?: (suggestions: any) => void;
  className?: string;
}

const TaskFeasibilityWarnings: React.FC<TaskFeasibilityWarningsProps> = ({
  feasibilityResult,
  onSuggestionApply,
  className = ''
}) => {
  const [expandedWarnings, setExpandedWarnings] = useState<Set<number>>(new Set());
  const [dismissedWarnings, setDismissedWarnings] = useState<Set<number>>(new Set());
  
  const { warnings, alternativeSuggestions } = feasibilityResult;

  // Debug logging
  console.log('⚠️ TaskFeasibilityWarnings rendered:', {
    totalWarnings: warnings.length,
    warningTypes: warnings.map(w => ({ severity: w.severity, title: w.title })),
    alternativeSuggestions
  });

  // Filter out dismissed warnings
  const visibleWarnings = warnings.filter((_, index) => !dismissedWarnings.has(index));

  if (visibleWarnings.length === 0) {
    console.log('ℹ️ No visible warnings, component returning null');
    // Temporary debug element to confirm component is being called
    return (
      <div className="text-xs text-gray-400 p-1">
        Debug: TaskFeasibilityWarnings component rendered ({warnings.length} total warnings, {visibleWarnings.length} visible)
      </div>
    );
  }
  
  const toggleWarning = (index: number) => {
    const newExpanded = new Set(expandedWarnings);
    if (newExpanded.has(index)) {
      newExpanded.delete(index);
    } else {
      newExpanded.add(index);
    }
    setExpandedWarnings(newExpanded);
  };
  
  const dismissWarning = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newDismissed = new Set(dismissedWarnings);
    newDismissed.add(index);
    setDismissedWarnings(newDismissed);
  };
  
  const getWarningIcon = (warning: FeasibilityWarning) => {
    switch (warning.type) {
      case 'error':
        return <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />;
      case 'warning':
        return <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0" />;
      case 'info':
        return <Info className="w-5 h-5 text-blue-500 flex-shrink-0" />;
      default:
        return <Info className="w-5 h-5 text-gray-500 flex-shrink-0" />;
    }
  };
  
  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'frequency':
        return <Clock className="w-4 h-4" />;
      case 'estimation':
        return <Target className="w-4 h-4" />;
      case 'schedule':
        return <Calendar className="w-4 h-4" />;
      case 'timing':
        return <Clock className="w-4 h-4" />;
      default:
        return <AlertCircle className="w-4 h-4" />;
    }
  };
  
  const getWarningBorderColor = (warning: FeasibilityWarning) => {
    switch (warning.severity) {
      case 'critical':
        return 'border-l-red-500 bg-red-50 dark:bg-red-900/20';
      case 'major':
        return 'border-l-orange-500 bg-orange-50 dark:bg-orange-900/20';
      case 'minor':
        return 'border-l-blue-500 bg-blue-50 dark:bg-blue-900/20';
      default:
        return 'border-l-gray-500 bg-gray-50 dark:bg-gray-900/20';
    }
  };
  
  const applySuggestion = (suggestions: any) => {
    if (onSuggestionApply) {
      onSuggestionApply(suggestions);
    }
  };
  
  const criticalWarnings = visibleWarnings.filter(w => w.severity === 'critical');
  const majorWarnings = visibleWarnings.filter(w => w.severity === 'major');
  const minorWarnings = visibleWarnings.filter(w => w.severity === 'minor');
  
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Summary Banner */}
      {criticalWarnings.length > 0 && (
        <div className="bg-red-100 dark:bg-red-900/30 border border-red-300 dark:border-red-700 rounded-lg p-3">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400" />
            <div>
              <h4 className="font-medium text-red-800 dark:text-red-200">
                Task Not Feasible
              </h4>
              <p className="text-sm text-red-700 dark:text-red-300">
                {criticalWarnings.length} critical issue{criticalWarnings.length > 1 ? 's' : ''} must be resolved before this task can be scheduled.
              </p>
            </div>
          </div>
        </div>
      )}
      
      {/* Warnings List */}
      <div className="space-y-2">
        {visibleWarnings.map((warning, index) => (
          <div
            key={index}
            className={`border-l-4 rounded-lg p-3 transition-all duration-200 ${getWarningBorderColor(warning)}`}
          >
            <div
              className="flex items-start justify-between cursor-pointer"
              onClick={() => toggleWarning(index)}
            >
              <div className="flex items-start space-x-3 flex-1">
                {getWarningIcon(warning)}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2 mb-1">
                    {getCategoryIcon(warning.category)}
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                      {warning.title}
                    </h4>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      warning.severity === 'critical' ? 'bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200' :
                      warning.severity === 'major' ? 'bg-orange-200 text-orange-800 dark:bg-orange-800 dark:text-orange-200' :
                      'bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200'
                    }`}>
                      {warning.severity}
                    </span>
                  </div>
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    {warning.message}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center space-x-2 ml-2">
                <button
                  onClick={(e) => dismissWarning(index, e)}
                  className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700"
                  title="Dismiss warning"
                >
                  <X className="w-4 h-4 text-gray-500" />
                </button>
                {expandedWarnings.has(index) ? (
                  <ChevronUp className="w-4 h-4 text-gray-500" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-gray-500" />
                )}
              </div>
            </div>
            
            {/* Expanded Content */}
            {expandedWarnings.has(index) && warning.suggestion && (
              <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-600">
                <div className="flex items-start space-x-2">
                  <Lightbulb className="w-4 h-4 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <h5 className="font-medium text-gray-900 dark:text-gray-100 text-sm mb-1">
                      Suggestion:
                    </h5>
                    <p className="text-sm text-gray-700 dark:text-gray-300">
                      {warning.suggestion}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
      
      {/* Smart Suggestions Panel */}
      {alternativeSuggestions && Object.keys(alternativeSuggestions).length > 0 && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
                💡 Smart Suggestions
              </h4>
              <p className="text-sm text-blue-800 dark:text-blue-200 mb-3">
                Based on the issues detected, here are some automatic adjustments that might help:
              </p>
              
              <div className="space-y-2">
                {alternativeSuggestions.frequency && (
                  <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded p-2">
                    <span className="text-sm">
                      Change frequency to <strong>{alternativeSuggestions.frequency}</strong>
                    </span>
                    <button
                      onClick={() => applySuggestion({ frequency: alternativeSuggestions.frequency })}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                )}
                
                {alternativeSuggestions.deadline && (
                  <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded p-2">
                    <span className="text-sm">
                      Extend deadline to <strong>{new Date(alternativeSuggestions.deadline).toLocaleDateString()}</strong>
                    </span>
                    <button
                      onClick={() => applySuggestion({ deadline: alternativeSuggestions.deadline })}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                )}
                
                {alternativeSuggestions.estimation && (
                  <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded p-2">
                    <span className="text-sm">
                      Adjust estimation to <strong>{alternativeSuggestions.estimation}h</strong>
                      {alternativeSuggestions.note && (
                        <div className="text-xs text-gray-600 mt-1">{alternativeSuggestions.note}</div>
                      )}
                    </span>
                    <button
                      onClick={() => applySuggestion({ estimation: alternativeSuggestions.estimation })}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                )}

                {alternativeSuggestions.markAsOneSitting && (
                  <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded p-2">
                    <span className="text-sm">
                      Mark as <strong>"Complete in one sitting"</strong> to fit in today
                    </span>
                    <button
                      onClick={() => applySuggestion({ markAsOneSitting: true })}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                )}

                {alternativeSuggestions.removeOneSitting && (
                  <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded p-2">
                    <span className="text-sm">
                      Remove <strong>"Complete in one sitting"</strong> - task is too long
                    </span>
                    <button
                      onClick={() => applySuggestion({ removeOneSitting: true })}
                      className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                )}

                {alternativeSuggestions.increaseDailyHours && (
                  <div className="flex items-center justify-between bg-white dark:bg-gray-800 rounded p-2">
                    <span className="text-sm">
                      Increase daily available hours to <strong>{alternativeSuggestions.increaseDailyHours}h</strong>
                    </span>
                    <button
                      onClick={() => applySuggestion({ increaseDailyHours: alternativeSuggestions.increaseDailyHours })}
                      className="px-3 py-1 bg-orange-600 text-white rounded text-xs hover:bg-orange-700 transition-colors"
                    >
                      Apply
                    </button>
                  </div>
                )}
                
                <button
                  onClick={() => applySuggestion(alternativeSuggestions)}
                  className="w-full mt-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors font-medium"
                >
                  Apply All Suggestions
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Warning Summary */}
      {visibleWarnings.length > 3 && (
        <div className="text-center">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            {criticalWarnings.length > 0 && (
              <span className="text-red-600 dark:text-red-400 font-medium">
                {criticalWarnings.length} critical
              </span>
            )}
            {criticalWarnings.length > 0 && majorWarnings.length > 0 && ', '}
            {majorWarnings.length > 0 && (
              <span className="text-orange-600 dark:text-orange-400 font-medium">
                {majorWarnings.length} major
              </span>
            )}
            {(criticalWarnings.length > 0 || majorWarnings.length > 0) && minorWarnings.length > 0 && ', '}
            {minorWarnings.length > 0 && (
              <span className="text-blue-600 dark:text-blue-400">
                {minorWarnings.length} minor
              </span>
            )}
            {' '}issue{visibleWarnings.length > 1 ? 's' : ''} detected
          </div>
        </div>
      )}
    </div>
  );
};

export default TaskFeasibilityWarnings;
