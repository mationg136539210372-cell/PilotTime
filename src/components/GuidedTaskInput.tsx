import React, { useState } from 'react';
import { Calendar, Clock, Star, BookOpen, CheckCircle, ArrowRight, ArrowLeft, Lightbulb } from 'lucide-react';
import { Task, UserSettings } from '../types';

interface GuidedTaskInputProps {
  onAddTask: (task: Omit<Task, 'id' | 'createdAt'>) => void;
  onBack: () => void;
  settings: UserSettings;
}

const GuidedTaskInput: React.FC<GuidedTaskInputProps> = ({ onAddTask, onBack, settings }) => {
  const [step, setStep] = useState(1);
  const [taskData, setTaskData] = useState({
    title: '',
    estimatedHours: 2,
    deadline: '',
    importance: false,
    category: ''
  });

  const totalSteps = 4;

  // Sample suggestions for each field
  const titleSuggestions = [
    'Study for Math Exam',
    'Complete History Assignment',
    'Prepare Chemistry Lab Report',
    'Write English Essay',
    'Practice Programming Problems',
    'Review Biology Notes'
  ];

  const categorySuggestions = [
    'Mathematics', 'History', 'Chemistry', 'English', 'Computer Science', 'Biology',
    'Physics', 'Psychology', 'Economics', 'Art', 'Music', 'Languages'
  ];

  const getMinDeadline = () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow.toISOString().split('T')[0];
  };

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
    } else {
      // Submit the task
      onAddTask({
        title: taskData.title,
        estimatedHours: taskData.estimatedHours,
        deadline: taskData.deadline,
        importance: taskData.importance,
        category: taskData.category || 'General',
        status: 'pending'
      });
    }
  };

  const canProceed = () => {
    switch (step) {
      case 1: return taskData.title.trim().length > 0;
      case 2: return taskData.estimatedHours > 0;
      case 3: return taskData.deadline !== '';
      case 4: return true;
      default: return false;
    }
  };

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <BookOpen className="w-12 h-12 text-blue-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                What would you like to study?
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Enter a task or assignment you need to complete
              </p>
            </div>
            
            <div>
              <input
                type="text"
                value={taskData.title}
                onChange={(e) => setTaskData({...taskData, title: e.target.value})}
                placeholder="e.g., Study for Math Exam"
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-white text-lg"
                autoFocus
              />
            </div>

            <div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">💡 Popular examples:</p>
              <div className="grid grid-cols-2 gap-2">
                {titleSuggestions.slice(0, 4).map((suggestion, idx) => (
                  <button
                    key={idx}
                    onClick={() => setTaskData({...taskData, title: suggestion})}
                    className="text-left px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-blue-100 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Clock className="w-12 h-12 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                How long will this take?
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Estimate the total hours needed for: <strong>{taskData.title}</strong>
              </p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-4">
              <div className="flex items-center mb-2">
                <Lightbulb className="w-5 h-5 text-blue-600 dark:text-blue-400 mr-2" />
                <span className="text-sm font-medium text-blue-800 dark:text-blue-300">Estimation Tips:</span>
              </div>
              <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                <li>• Break it down: Reading (2h) + Notes (1h) + Practice (2h)</li>
                <li>• Add buffer time for difficult topics</li>
                <li>• Consider your focus level and break needs</li>
              </ul>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Estimated Hours
              </label>
              <div className="flex items-center space-x-4">
                <input
                  type="range"
                  min="0.5"
                  max="20"
                  step="0.5"
                  value={taskData.estimatedHours}
                  onChange={(e) => setTaskData({...taskData, estimatedHours: parseFloat(e.target.value)})}
                  className="flex-1"
                />
                <div className="bg-gray-100 dark:bg-gray-700 px-4 py-2 rounded-lg min-w-[80px] text-center">
                  <span className="text-lg font-semibold text-gray-900 dark:text-white">
                    {taskData.estimatedHours}h
                  </span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 4, 8].map((hours) => (
                <button
                  key={hours}
                  onClick={() => setTaskData({...taskData, estimatedHours: hours})}
                  className={`px-3 py-2 text-sm rounded-lg transition-colors ${
                    taskData.estimatedHours === hours
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {hours}h
                </button>
              ))}
            </div>
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Calendar className="w-12 h-12 text-purple-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                When is this due?
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Set a deadline so TimePilot can schedule it optimally
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Deadline
              </label>
              <input
                type="date"
                value={taskData.deadline}
                onChange={(e) => setTaskData({...taskData, deadline: e.target.value})}
                min={getMinDeadline()}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-purple-500 dark:bg-gray-700 dark:text-white"
              />
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[
                { label: 'Tomorrow', days: 1 },
                { label: 'This Week', days: 7 },
                { label: 'Next Week', days: 14 }
              ].map((option) => {
                const date = new Date();
                date.setDate(date.getDate() + option.days);
                const dateStr = date.toISOString().split('T')[0];
                
                return (
                  <button
                    key={option.label}
                    onClick={() => setTaskData({...taskData, deadline: dateStr})}
                    className="px-3 py-2 text-sm bg-gray-100 dark:bg-gray-700 hover:bg-purple-100 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        );

      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <Star className="w-12 h-12 text-yellow-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Final touches
              </h2>
              <p className="text-gray-600 dark:text-gray-300">
                Add some details to help with scheduling
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Category (optional)
              </label>
              <input
                type="text"
                value={taskData.category}
                onChange={(e) => setTaskData({...taskData, category: e.target.value})}
                placeholder="e.g., Mathematics, History, etc."
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-yellow-500 focus:border-yellow-500 dark:bg-gray-700 dark:text-white"
              />
              <div className="flex flex-wrap gap-2 mt-3">
                {categorySuggestions.slice(0, 6).map((category) => (
                  <button
                    key={category}
                    onClick={() => setTaskData({...taskData, category})}
                    className="px-3 py-1 text-xs bg-gray-100 dark:bg-gray-700 hover:bg-yellow-100 dark:hover:bg-yellow-900/30 rounded-full transition-colors"
                  >
                    {category}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="flex items-center space-x-3">
                <input
                  type="checkbox"
                  checked={taskData.importance}
                  onChange={(e) => setTaskData({...taskData, importance: e.target.checked})}
                  className="w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500"
                />
                <span className="text-gray-700 dark:text-gray-300">
                  This is a high priority task
                </span>
              </label>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 ml-8">
                High priority tasks get scheduled first
              </p>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <div className="max-w-2xl mx-auto pt-8">
        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Step {step} of {totalSteps}
            </span>
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {Math.round((step / totalSteps) * 100)}% Complete
            </span>
          </div>
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-blue-600 to-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(step / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-xl border border-gray-200 dark:border-gray-700">
          {renderStep()}
        </div>

        {/* Navigation */}
        <div className="flex justify-between mt-8">
          <button
            onClick={() => step === 1 ? onBack() : setStep(step - 1)}
            className="flex items-center px-6 py-3 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            <ArrowLeft size={20} className="mr-2" />
            {step === 1 ? 'Back to Welcome' : 'Previous'}
          </button>

          <button
            onClick={handleNext}
            disabled={!canProceed()}
            className={`flex items-center px-8 py-3 rounded-xl font-medium transition-all ${
              canProceed()
                ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700 shadow-lg'
                : 'bg-gray-200 dark:bg-gray-700 text-gray-400 cursor-not-allowed'
            }`}
          >
            {step === totalSteps ? 'Create Task' : 'Next'}
            {step < totalSteps && <ArrowRight size={20} className="ml-2" />}
            {step === totalSteps && <CheckCircle size={20} className="ml-2" />}
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuidedTaskInput;
