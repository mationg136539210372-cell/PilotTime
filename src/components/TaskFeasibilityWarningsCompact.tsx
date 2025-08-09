import React, { useState } from 'react';
import { AlertTriangle, AlertCircle, Info, ChevronDown, ChevronUp, X, Lightbulb } from 'lucide-react';
import { FeasibilityWarning, TaskFeasibilityResult } from '../utils/task-feasibility';

interface TaskFeasibilityWarningsCompactProps {
  feasibilityResult: TaskFeasibilityResult;
  onSuggestionApply?: (suggestions: any) => void;
  className?: string;
}

const TaskFeasibilityWarningsCompact: React.FC<TaskFeasibilityWarningsCompactProps> = ({
  feasibilityResult,
  onSuggestionApply,
  className = ''
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [dismissedWarnings, setDismissedWarnings] = useState<Set<number>>(new Set());
  
  const { warnings, alternativeSuggestions } = feasibilityResult;
  
  // Filter out dismissed warnings
  const visibleWarnings = warnings.filter((_, index) => !dismissedWarnings.has(index));
  
  if (visibleWarnings.length === 0) return null;
  
  const criticalWarnings = visibleWarnings.filter(w => w.severity === 'critical');
  const majorWarnings = visibleWarnings.filter(w => w.severity === 'major');
  const minorWarnings = visibleWarnings.filter(w => w.severity === 'minor');
  
  const applySuggestion = (suggestions: any) => {
    if (onSuggestionApply) {
      onSuggestionApply(suggestions);
    }
  };
  
  const dismissWarning = (index: number, e: React.MouseEvent) => {
    e.stopPropagation();
    const newDismissed = new Set(dismissedWarnings);
    newDismissed.add(index);
    setDismissedWarnings(newDismissed);
  };

  const getCompactSummary = () => {
    if (criticalWarnings.length > 0) {
      const firstCritical = criticalWarnings[0];
      return {
        icon: <AlertTriangle className="w-4 h-4" />,
        color: 'text-red-600 dark:text-red-400',
        bgColor: 'bg-red-50 dark:bg-red-900/20 border-red-500',
        text: criticalWarnings.length === 1 
          ? firstCritical.title 
          : `${criticalWarnings.length} critical issues detected`,
        count: criticalWarnings.length
      };
    } else if (majorWarnings.length > 0) {
      const firstMajor = majorWarnings[0];
      return {
        icon: <AlertCircle className="w-4 h-4" />,
        color: 'text-orange-600 dark:text-orange-400',
        bgColor: 'bg-orange-50 dark:bg-orange-900/20 border-orange-500',
        text: majorWarnings.length === 1 
          ? firstMajor.title 
          : `${majorWarnings.length} warnings detected`,
        count: majorWarnings.length
      };
    } else {
      return {
        icon: <Info className="w-4 h-4" />,
        color: 'text-blue-600 dark:text-blue-400',
        bgColor: 'bg-blue-50 dark:bg-blue-900/20 border-blue-500',
        text: `${minorWarnings.length} suggestion${minorWarnings.length > 1 ? 's' : ''} available`,
        count: minorWarnings.length
      };
    }
  };

  const summary = getCompactSummary();

  return (
    <div className={className}>
      {/* Compact Summary Bar */}
      <div className={`border-l-4 rounded-r-lg p-3 ${summary.bgColor}`}>
        <div 
          className="flex items-center justify-between cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div className="flex items-center space-x-2">
            <span className={summary.color}>{summary.icon}</span>
            <span className={`font-medium text-sm ${summary.color.replace('text-', 'text-').replace('-400', '-800').replace('-600', '-800')} dark:${summary.color.replace('dark:', '').replace('-400', '-200')}`}>
              {summary.text}
            </span>
            {summary.count > 1 && (
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                criticalWarnings.length > 0 ? 'bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200' :
                majorWarnings.length > 0 ? 'bg-orange-200 text-orange-800 dark:bg-orange-800 dark:text-orange-200' :
                'bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200'
              }`}>
                {summary.count}
              </span>
            )}
          </div>
          <div className="flex items-center space-x-2">
            {isExpanded ? (
              <ChevronUp className={`w-4 h-4 ${summary.color}`} />
            ) : (
              <ChevronDown className={`w-4 h-4 ${summary.color}`} />
            )}
          </div>
        </div>
      </div>

      {/* Expanded Details */}
      {isExpanded && (
        <div className="mt-2 space-y-1">
          {/* Warning Details */}
          {visibleWarnings.map((warning, index) => (
            <div key={index} className="bg-gray-50 dark:bg-gray-800/50 rounded p-2 text-sm">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-1">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                      warning.severity === 'critical' ? 'bg-red-200 text-red-800 dark:bg-red-800 dark:text-red-200' :
                      warning.severity === 'major' ? 'bg-orange-200 text-orange-800 dark:bg-orange-800 dark:text-orange-200' :
                      'bg-blue-200 text-blue-800 dark:bg-blue-800 dark:text-blue-200'
                    }`}>
                      {warning.severity}
                    </span>
                    <h4 className="font-medium text-gray-900 dark:text-gray-100 text-sm">
                      {warning.title}
                    </h4>
                  </div>
                  <p className="text-gray-700 dark:text-gray-300 text-xs">
                    {warning.message}
                  </p>
                  {warning.suggestion && (
                    <p className="text-gray-600 dark:text-gray-400 text-xs mt-1 italic">
                      💡 {warning.suggestion}
                    </p>
                  )}
                </div>
                <button
                  onClick={(e) => dismissWarning(index, e)}
                  className="p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-700 ml-2"
                  title="Dismiss warning"
                >
                  <X className="w-3 h-3 text-gray-500" />
                </button>
              </div>
            </div>
          ))}

          {/* Smart Suggestions */}
          {alternativeSuggestions && Object.keys(alternativeSuggestions).length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded p-3 mt-2">
              <div className="flex items-start space-x-2">
                <Lightbulb className="w-4 h-4 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="font-medium text-blue-900 dark:text-blue-100 text-sm mb-2">
                    Smart Fixes
                  </h4>
                  
                  <div className="space-y-1">
                    {alternativeSuggestions.frequency && (
                      <div className="text-xs text-blue-800 dark:text-blue-200">
                        • Change frequency to <strong>{alternativeSuggestions.frequency}</strong>
                      </div>
                    )}

                    {alternativeSuggestions.deadline && (
                      <div className="text-xs text-blue-800 dark:text-blue-200">
                        • Extend deadline to <strong>{new Date(alternativeSuggestions.deadline).toLocaleDateString()}</strong>
                      </div>
                    )}

                    {alternativeSuggestions.markAsOneSitting && (
                      <div className="text-xs text-blue-800 dark:text-blue-200">
                        • Mark as <strong>"Complete in one sitting"</strong>
                      </div>
                    )}

                    <button
                      onClick={() => applySuggestion(alternativeSuggestions)}
                      className="w-full mt-2 px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors font-medium"
                    >
                      Apply Fixes
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TaskFeasibilityWarningsCompact;
