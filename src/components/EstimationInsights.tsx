import React from 'react';
import { TrendingUp, Target, Clock, Brain, CheckCircle2, AlertCircle, Info } from 'lucide-react';
import { enhancedEstimationTracker } from '../utils/enhanced-estimation-tracker';

interface EstimationInsightsProps {
  className?: string;
}

const EstimationInsights: React.FC<EstimationInsightsProps> = ({ className = '' }) => {
  const insights = enhancedEstimationTracker.getEstimationInsights();

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 85) return 'text-green-600 dark:text-green-400';
    if (accuracy >= 70) return 'text-yellow-600 dark:text-yellow-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getAccuracyIcon = (accuracy: number) => {
    if (accuracy >= 85) return <CheckCircle2 size={20} />;
    if (accuracy >= 70) return <AlertCircle size={20} />;
    return <AlertCircle size={20} />;
  };

  return (
    <div className={`bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-6 ${className}`}>
      <div className="flex items-center space-x-2 mb-4">
        <Brain className="text-purple-600 dark:text-purple-400" size={24} />
        <h3 className="text-lg font-semibold text-gray-800 dark:text-white">Estimation Insights</h3>
      </div>

      {insights.overallAccuracy > 0 ? (
        <div className="space-y-4">
          {/* Overall Accuracy */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {getAccuracyIcon(insights.overallAccuracy)}
              <span className="text-sm text-gray-600 dark:text-gray-400">Overall Accuracy</span>
            </div>
            <div className={`text-2xl font-bold ${getAccuracyColor(insights.overallAccuracy)}`}>
              {insights.overallAccuracy}%
            </div>
          </div>

          {/* Strengths */}
          {insights.strengths.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-green-700 dark:text-green-400 mb-2 flex items-center space-x-1">
                <CheckCircle2 size={16} />
                <span>Strengths</span>
              </h4>
              <ul className="space-y-1">
                {insights.strengths.slice(0, 2).map((strength, index) => (
                  <li key={index} className="text-sm text-gray-600 dark:text-gray-400 flex items-start space-x-2">
                    <span className="text-green-500 mt-1">•</span>
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Areas to Improve */}
          {insights.weaknesses.length > 0 && (
            <div>
              <h4 className="text-sm font-medium text-orange-700 dark:text-orange-400 mb-2 flex items-center space-x-1">
                <AlertCircle size={16} />
                <span>Areas to Improve</span>
              </h4>
              <ul className="space-y-1">
                {insights.weaknesses.slice(0, 2).map((weakness, index) => (
                  <li key={index} className="text-sm text-gray-600 dark:text-gray-400 flex items-start space-x-2">
                    <span className="text-orange-500 mt-1">•</span>
                    <span>{weakness}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Quick Recommendations */}
          {insights.recommendations.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 border border-blue-200 dark:border-blue-700">
              <h4 className="text-sm font-medium text-blue-700 dark:text-blue-300 mb-2 flex items-center space-x-1">
                <Target size={16} />
                <span>Quick Tip</span>
              </h4>
              <p className="text-sm text-blue-600 dark:text-blue-400">
                {insights.recommendations[0]}
              </p>
            </div>
          )}
        </div>
      ) : (
        <div className="text-center py-6">
          <Clock size={48} className="mx-auto mb-3 text-gray-400 dark:text-gray-600" />
          <p className="text-gray-500 dark:text-gray-400 text-sm">
            Complete a few tasks to see your estimation patterns
          </p>
          <p className="text-gray-400 dark:text-gray-500 text-xs mt-1">
            Use the timer to track actual vs estimated time
          </p>
        </div>
      )}
    </div>
  );
};

export default EstimationInsights;
