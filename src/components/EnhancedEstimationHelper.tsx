import React, { useState, useEffect, useRef } from 'react';
import { Clock, Brain, TrendingUp, AlertCircle, CheckCircle2, Info, Target, Zap, Calendar } from 'lucide-react';
import { enhancedEstimationTracker, TaskEstimationContext, EstimationSuggestion } from '../utils/enhanced-estimation-tracker';

interface EnhancedEstimationHelperProps {
  taskType: string;
  category: string;
  initialEstimate: number;
  onEstimateUpdate: (hours: number) => void;
  onClose: () => void;
  deadline?: string;
  isVisible: boolean;
}

const EnhancedEstimationHelper: React.FC<EnhancedEstimationHelperProps> = ({
  taskType,
  category,
  initialEstimate,
  onEstimateUpdate,
  onClose,
  deadline,
  isVisible
}) => {
  const [baseEstimate, setBaseEstimate] = useState(initialEstimate || 1);
  const [complexity, setComplexity] = useState<'simple' | 'medium' | 'complex'>('medium');
  const [context, setContext] = useState<Partial<TaskEstimationContext>>({
    timeOfDay: 'morning',
    currentWorkload: 'medium',
    energyLevel: 'medium'
  });
  const [suggestion, setSuggestion] = useState<EstimationSuggestion | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [activeTab, setActiveTab] = useState<'estimate' | 'insights' | 'history'>('estimate');
  
  const helperRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to helper when it becomes visible
  useEffect(() => {
    if (isVisible && helperRef.current) {
      helperRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [isVisible]);

  // Generate suggestion when context changes
  useEffect(() => {
    if (baseEstimate > 0 && taskType) {
      const fullContext: TaskEstimationContext = {
        taskType,
        category,
        complexity,
        timeOfDay: context.timeOfDay || 'morning',
        dayOfWeek: new Date().getDay(),
        isWeekend: [0, 6].includes(new Date().getDay()),
        currentWorkload: context.currentWorkload || 'medium',
        energyLevel: context.energyLevel || 'medium',
        hasDeadlinePressure: deadline ? new Date(deadline).getTime() - Date.now() < 7 * 24 * 60 * 60 * 1000 : false,
        isNewDomain: context.isNewDomain || false,
        requiresCreativity: context.requiresCreativity || false,
        requiresResearch: context.requiresResearch || false,
        requiresCollaboration: context.requiresCollaboration || false,
        involvesTechnology: context.involvesTechnology || false,
        similarTasksCompleted: 0, // TODO: Track this
        recentAccuracy: 0.85, // TODO: Calculate this
        availableTimeSlot: 3 // TODO: Get from user settings
      };

      const newSuggestion = enhancedEstimationTracker.generateEstimation(baseEstimate, fullContext);
      setSuggestion(newSuggestion);
    }
  }, [baseEstimate, complexity, context, taskType, category, deadline]);

  const getConfidenceColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/30';
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:text-yellow-400 dark:bg-yellow-900/30';
      case 'low': return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/30';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getConfidenceIcon = (level: string) => {
    switch (level) {
      case 'high': return <CheckCircle2 size={16} />;
      case 'medium': return <AlertCircle size={16} />;
      case 'low': return <AlertCircle size={16} />;
      default: return <Info size={16} />;
    }
  };

  const formatHours = (hours: number) => {
    const h = Math.floor(hours);
    const m = Math.round((hours - h) * 60);
    return m === 0 ? `${h}h` : `${h}h ${m}m`;
  };

  const insights = enhancedEstimationTracker.getEstimationInsights();

  if (!isVisible) return null;

  return (
    <div 
      ref={helperRef}
      className="mt-4 p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-xl border border-blue-200 dark:border-blue-700 shadow-lg"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Brain className="text-blue-600 dark:text-blue-400" size={24} />
          <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Smart Estimation Assistant</h3>
        </div>
        <button
          onClick={onClose}
          className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
        >
          ✕
        </button>
      </div>

      {/* Tabs */}
      <div className="flex mb-4 bg-white/50 dark:bg-gray-800/50 rounded-lg p-1">
        {[
          { id: 'estimate', label: 'Estimate', icon: Target },
          { id: 'insights', label: 'Insights', icon: TrendingUp },
          { id: 'history', label: 'History', icon: Clock }
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-white dark:bg-gray-700 text-blue-600 dark:text-blue-400 shadow-sm'
                : 'text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200'
            }`}
          >
            <tab.icon size={16} />
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Estimate Tab */}
      {activeTab === 'estimate' && (
        <div className="space-y-4">
          {/* Base Estimate */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Your initial estimate (if this were straightforward):
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="number"
                step="0.25"
                min="0.25"
                max="20"
                value={baseEstimate}
                onChange={(e) => setBaseEstimate(parseFloat(e.target.value) || 1)}
                className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              />
              <span className="text-gray-600 dark:text-gray-400">hours</span>
            </div>
          </div>

          {/* Complexity */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Complexity level:
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { key: 'simple', label: 'Simple', desc: 'Routine/familiar' },
                { key: 'medium', label: 'Medium', desc: 'Some unknowns' },
                { key: 'complex', label: 'Complex', desc: 'Many challenges' }
              ].map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setComplexity(opt.key as any)}
                  className={`p-3 rounded-lg border-2 transition-all text-left ${
                    complexity === opt.key
                      ? 'border-blue-500 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <div className="font-medium">{opt.label}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">{opt.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Context Factors */}
          <div>
            <div className="flex items-center space-x-2 mb-2">
              <label className="text-sm font-medium text-gray-700 dark:text-gray-200">
                Additional factors:
              </label>
              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
              >
                {showAdvanced ? 'Hide' : 'Show'} advanced options
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              {[
                { key: 'requiresResearch', label: 'Requires research' },
                { key: 'requiresCreativity', label: 'Creative work' },
                { key: 'requiresCollaboration', label: 'Involves others' },
                { key: 'isNewDomain', label: 'Unfamiliar area' }
              ].map(factor => (
                <label key={factor.key} className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={context[factor.key as keyof typeof context] || false}
                    onChange={(e) => setContext(prev => ({ ...prev, [factor.key]: e.target.checked }))}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-gray-700 dark:text-gray-300">{factor.label}</span>
                </label>
              ))}
            </div>

            {showAdvanced && (
              <div className="mt-3 space-y-3 p-3 bg-white/50 dark:bg-gray-800/50 rounded-lg">
                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    When will you work on this?
                  </label>
                  <select
                    value={context.timeOfDay}
                    onChange={(e) => setContext(prev => ({ ...prev, timeOfDay: e.target.value as any }))}
                    className="w-full text-sm px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="morning">Morning (most focused)</option>
                    <option value="afternoon">Afternoon (steady)</option>
                    <option value="evening">Evening (tired)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                    Current workload:
                  </label>
                  <select
                    value={context.currentWorkload}
                    onChange={(e) => setContext(prev => ({ ...prev, currentWorkload: e.target.value as any }))}
                    className="w-full text-sm px-2 py-1 border border-gray-300 rounded focus:ring-1 focus:ring-blue-500 dark:bg-gray-700 dark:border-gray-600"
                  >
                    <option value="light">Light (lots of time)</option>
                    <option value="medium">Medium (normal schedule)</option>
                    <option value="heavy">Heavy (very busy)</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Suggestion Display */}
          {suggestion && (
            <div className="mt-6 p-4 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-600">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center space-x-2">
                    <Zap className="text-blue-600 dark:text-blue-400" size={18} />
                    <span className="font-semibold text-gray-800 dark:text-white">
                      Suggested: {formatHours(suggestion.suggestedHours)}
                    </span>
                  </div>
                  <div className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium mt-1 ${getConfidenceColor(suggestion.confidenceLevel)}`}>
                    {getConfidenceIcon(suggestion.confidenceLevel)}
                    <span>{suggestion.confidenceLevel} confidence</span>
                  </div>
                </div>
                
                <div className="text-right">
                  <div className="text-xs text-gray-500 dark:text-gray-400 mb-1">Alternatives:</div>
                  <div className="text-xs space-y-1">
                    <div>Optimistic: {formatHours(suggestion.alternativeEstimates.optimistic)}</div>
                    <div>Conservative: {formatHours(suggestion.alternativeEstimates.conservative)}</div>
                  </div>
                </div>
              </div>

              {/* Reasoning */}
              {suggestion.reasoning.length > 0 && (
                <div className="mb-3">
                  <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">Reasoning:</div>
                  <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                    {suggestion.reasoning.map((reason, index) => (
                      <li key={index} className="flex items-center space-x-1">
                        <span className="w-1 h-1 bg-gray-400 rounded-full"></span>
                        <span>{reason}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Session Breakdown */}
              {suggestion.breakdownSuggestion && (
                <div className="mb-3 p-2 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-200 dark:border-blue-700">
                  <div className="text-xs font-medium text-blue-700 dark:text-blue-300 mb-1">Session Plan:</div>
                  <div className="text-xs text-blue-600 dark:text-blue-400">
                    {suggestion.breakdownSuggestion.sessions} sessions × {formatHours(suggestion.breakdownSuggestion.hoursPerSession)} each
                  </div>
                  <div className="text-xs text-blue-500 dark:text-blue-400 mt-1">
                    {suggestion.breakdownSuggestion.reasoning}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex space-x-2">
                <button
                  onClick={() => onEstimateUpdate(suggestion.suggestedHours)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium py-2 px-3 rounded-lg transition-colors"
                >
                  Use Suggested ({formatHours(suggestion.suggestedHours)})
                </button>
                <button
                  onClick={() => onEstimateUpdate(suggestion.alternativeEstimates.conservative)}
                  className="bg-gray-200 hover:bg-gray-300 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm font-medium py-2 px-3 rounded-lg transition-colors"
                >
                  Conservative
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Insights Tab */}
      {activeTab === 'insights' && (
        <div className="space-y-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">
              {insights.overallAccuracy}%
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">Overall Accuracy</div>
          </div>

          {insights.strengths.length > 0 && (
            <div>
              <h4 className="font-medium text-green-700 dark:text-green-400 mb-2">✓ Strengths</h4>
              <ul className="space-y-1">
                {insights.strengths.map((strength, index) => (
                  <li key={index} className="text-sm text-gray-600 dark:text-gray-400">• {strength}</li>
                ))}
              </ul>
            </div>
          )}

          {insights.weaknesses.length > 0 && (
            <div>
              <h4 className="font-medium text-orange-700 dark:text-orange-400 mb-2">⚠ Areas to Improve</h4>
              <ul className="space-y-1">
                {insights.weaknesses.map((weakness, index) => (
                  <li key={index} className="text-sm text-gray-600 dark:text-gray-400">• {weakness}</li>
                ))}
              </ul>
            </div>
          )}

          {insights.recommendations.length > 0 && (
            <div>
              <h4 className="font-medium text-blue-700 dark:text-blue-400 mb-2">💡 Recommendations</h4>
              <ul className="space-y-1">
                {insights.recommendations.map((rec, index) => (
                  <li key={index} className="text-sm text-gray-600 dark:text-gray-400">• {rec}</li>
                ))}
              </ul>
            </div>
          )}

          {insights.strengths.length === 0 && insights.weaknesses.length === 0 && (
            <div className="text-center text-gray-500 dark:text-gray-400 py-8">
              <Calendar size={48} className="mx-auto mb-3 opacity-50" />
              <p>Complete a few tasks to see your estimation patterns</p>
            </div>
          )}
        </div>
      )}

      {/* History Tab */}
      {activeTab === 'history' && (
        <div className="text-center text-gray-500 dark:text-gray-400 py-8">
          <Clock size={48} className="mx-auto mb-3 opacity-50" />
          <p>Task completion history will appear here</p>
          <p className="text-sm mt-2">Track how your estimates compare to actual time spent</p>
        </div>
      )}
    </div>
  );
};

export default EnhancedEstimationHelper;
