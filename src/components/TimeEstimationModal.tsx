import React, { useState } from 'react';
import { X, Clock, Zap } from 'lucide-react';
import EnhancedEstimationHelper from './EnhancedEstimationHelper';

interface TimeEstimationModalProps {
  isOpen: boolean;
  onClose: () => void;
  taskType: string;
  category: string;
  initialHours: string;
  initialMinutes: string;
  deadline?: string;
  onEstimateUpdate: (hours: string, minutes: string, taskType: string) => void;
}

const TimeEstimationModal: React.FC<TimeEstimationModalProps> = ({
  isOpen,
  onClose,
  taskType,
  category,
  initialHours,
  initialMinutes,
  deadline,
  onEstimateUpdate
}) => {
  const [localTaskType, setLocalTaskType] = useState(taskType);
  const [localHours, setLocalHours] = useState(initialHours);
  const [localMinutes, setLocalMinutes] = useState(initialMinutes);
  const [showHelper, setShowHelper] = useState(false);

  if (!isOpen) return null;

  const convertToDecimalHours = (hours: string, minutes: string): number => {
    return parseInt(hours || '0') + parseInt(minutes || '0') / 60;
  };

  const convertFromDecimalHours = (decimalHours: number): { hours: string; minutes: string } => {
    const h = Math.floor(decimalHours);
    const m = Math.round((decimalHours - h) * 60);
    return { hours: h.toString(), minutes: m.toString() };
  };

  const handleApply = () => {
    onEstimateUpdate(localHours, localMinutes, localTaskType);
    onClose();
  };

  const handleHelperEstimate = (estimatedHours: number) => {
    const { hours, minutes } = convertFromDecimalHours(estimatedHours);
    setLocalHours(hours);
    setLocalMinutes(minutes);
    setShowHelper(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-2">
            <Clock className="text-blue-600 dark:text-blue-400" size={24} />
            <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Time Estimation</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Task Type Selection */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Task Type
            </label>
            <select
              value={localTaskType}
              onChange={(e) => setLocalTaskType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              <option value="">Select task type...</option>
              <option value="Writing">📝 Writing</option>
              <option value="Learning">📚 Learning</option>
              <option value="Planning">📋 Planning</option>
              <option value="Creating">🎨 Creating</option>
              <option value="Deep Focus Work">🧠 Deep Focus Work</option>
              <option value="Administrative">📄 Administrative</option>
              <option value="Communicating">💬 Communicating</option>
            </select>
          </div>

          {/* Manual Time Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-200 mb-2">
              Estimated Time
            </label>
            <div className="flex items-center space-x-2">
              <div className="flex items-center space-x-1">
                <input
                  type="number"
                  min="0"
                  max="100"
                  value={localHours}
                  onChange={(e) => setLocalHours(e.target.value)}
                  className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="0"
                />
                <span className="text-gray-600 dark:text-gray-400">hours</span>
              </div>
              <div className="flex items-center space-x-1">
                <input
                  type="number"
                  min="0"
                  max="59"
                  step="15"
                  value={localMinutes}
                  onChange={(e) => setLocalMinutes(e.target.value)}
                  className="w-20 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder="0"
                />
                <span className="text-gray-600 dark:text-gray-400">minutes</span>
              </div>
            </div>
          </div>

          {/* Smart Estimation Helper Toggle */}
          {localTaskType && (
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <button
                type="button"
                onClick={() => setShowHelper(!showHelper)}
                className="flex items-center space-x-2 text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors"
              >
                <Zap size={18} />
                <span className="text-sm font-medium">
                  {showHelper ? 'Hide' : 'Use'} Smart Estimation Assistant
                </span>
              </button>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Get AI-powered time estimates based on your work patterns
              </p>
            </div>
          )}

          {/* Enhanced Estimation Helper */}
          <EnhancedEstimationHelper
            taskType={localTaskType}
            category={category}
            initialEstimate={convertToDecimalHours(localHours, localMinutes)}
            onEstimateUpdate={handleHelperEstimate}
            onClose={() => setShowHelper(false)}
            deadline={deadline}
            isVisible={showHelper}
          />
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 dark:text-gray-300 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleApply}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Apply Estimate
          </button>
        </div>
      </div>
    </div>
  );
};

export default TimeEstimationModal;
