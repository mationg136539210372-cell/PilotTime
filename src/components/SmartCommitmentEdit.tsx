import React, { useState } from 'react';
import { Edit, Clock, MapPin, User, X, AlertTriangle, Calendar, Brain } from 'lucide-react';
import { SmartCommitment, UserSettings } from '../types';

// Utility function to convert hour number to HH:MM format
const formatHour = (hour: number): string => {
  return hour.toString().padStart(2, '0') + ':00';
};

interface SmartCommitmentEditProps {
  commitment: SmartCommitment;
  settings: UserSettings;
  onUpdateCommitment: (commitmentId: string, updates: Partial<SmartCommitment>) => void;
  onCancel: () => void;
}

const SmartCommitmentEdit: React.FC<SmartCommitmentEditProps> = ({ 
  commitment, 
  onUpdateCommitment, 
  onCancel 
}) => {
  const [formData, setFormData] = useState({
    title: commitment.title,
    category: commitment.category,
    location: commitment.location || '',
    description: commitment.description || '',
    totalHoursPerWeek: commitment.totalHoursPerWeek,
    preferredDays: commitment.preferredDays,
    preferredTimeRanges: commitment.preferredTimeRanges,
    sessionDurationRange: commitment.sessionDurationRange,
    allowTimeShifting: commitment.allowTimeShifting,
    priorityLevel: commitment.priorityLevel,
    countsTowardDailyHours: commitment.countsTowardDailyHours || false,
    dateRange: {
      startDate: commitment.dateRange?.startDate || '',
      endDate: commitment.dateRange?.endDate || ''
    }
  });

  const daysOfWeekOptions = [
    { value: 1, label: 'Mon' },
    { value: 2, label: 'Tue' },
    { value: 3, label: 'Wed' },
    { value: 4, label: 'Thu' },
    { value: 5, label: 'Fri' },
    { value: 6, label: 'Sat' },
    { value: 0, label: 'Sun' }
  ];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.title && 
        formData.totalHoursPerWeek > 0 && 
        formData.preferredDays.length > 0 &&
        formData.preferredTimeRanges.length > 0 &&
        formData.sessionDurationRange.min > 0 &&
        formData.sessionDurationRange.max >= formData.sessionDurationRange.min) {
      
      // Prepare commitment data
      const commitmentData: Partial<SmartCommitment> = {
        title: formData.title,
        category: formData.category,
        location: formData.location,
        description: formData.description,
        totalHoursPerWeek: formData.totalHoursPerWeek,
        preferredDays: formData.preferredDays,
        preferredTimeRanges: formData.preferredTimeRanges,
        sessionDurationRange: formData.sessionDurationRange,
        allowTimeShifting: formData.allowTimeShifting,
        priorityLevel: formData.priorityLevel,
        countsTowardDailyHours: formData.countsTowardDailyHours
      };

      // Only include dateRange if it has valid values
      if (formData.dateRange.startDate && formData.dateRange.endDate) {
        commitmentData.dateRange = formData.dateRange;
      } else {
        commitmentData.dateRange = undefined;
      }
      
      onUpdateCommitment(commitment.id, commitmentData);
      onCancel();
    }
  };

  const handleDayToggle = (day: number) => {
    setFormData(prev => ({
      ...prev,
      preferredDays: prev.preferredDays.includes(day)
        ? prev.preferredDays.filter(d => d !== day)
        : [...prev.preferredDays, day].sort()
    }));
  };

  const addTimeRange = () => {
    setFormData(prev => ({
      ...prev,
      preferredTimeRanges: [...prev.preferredTimeRanges, { start: '09:00', end: '17:00' }]
    }));
  };

  const updateTimeRange = (index: number, field: 'start' | 'end', value: string) => {
    setFormData(prev => ({
      ...prev,
      preferredTimeRanges: prev.preferredTimeRanges.map((range, i) => 
        i === index ? { ...range, [field]: value } : range
      )
    }));
  };

  const removeTimeRange = (index: number) => {
    setFormData(prev => ({
      ...prev,
      preferredTimeRanges: prev.preferredTimeRanges.filter((_, i) => i !== index)
    }));
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 dark:bg-gray-900 dark:shadow-gray-900">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Brain className="text-purple-500" size={24} />
          <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Edit Smart Commitment</h2>
        </div>
        <button
          onClick={onCancel}
          className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
        >
          <X size={20} />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-200">
              Title
            </label>
            <input
              type="text"
              required
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              placeholder="e.g., Study Sessions"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-200">
              Category
            </label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 text-gray-400" size={20} />
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              >
                <option value="Academics">Academics</option>
                <option value="Work">Work</option>
                <option value="Personal">Personal</option>
                <option value="Health">Health</option>
                <option value="Learning">Learning</option>
                <option value="Finance">Finance</option>
                <option value="Home">Home</option>
                <option value="Organization">Organization</option>
                <option value="Routine">Routine</option>
                <option value="Buffer">Buffer</option>
              </select>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-200">
              Hours Per Week
            </label>
            <input
              type="number"
              min="0.5"
              max="40"
              step="0.5"
              required
              value={formData.totalHoursPerWeek}
              onChange={(e) => setFormData({ ...formData, totalHoursPerWeek: parseFloat(e.target.value) || 0 })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              placeholder="e.g., 10"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-200">
              Priority Level
            </label>
            <select
              value={formData.priorityLevel}
              onChange={(e) => setFormData({ ...formData, priorityLevel: e.target.value as 'important' | 'standard' })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent appearance-none dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            >
              <option value="standard">Standard</option>
              <option value="important">Important</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-200">
            Preferred Days
          </label>
          <div className="flex flex-wrap gap-2">
            {daysOfWeekOptions.map((day) => (
              <button
                key={day.value}
                type="button"
                onClick={() => handleDayToggle(day.value)}
                className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 ${
                  formData.preferredDays.includes(day.value)
                    ? 'bg-purple-500 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                {day.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-200">
            Preferred Time Ranges
          </label>
          <div className="space-y-2">
            {formData.preferredTimeRanges.map((range, index) => (
              <div key={index} className="flex items-center space-x-2">
                <div className="relative flex-1">
                  <Clock className="absolute left-3 top-2.5 text-gray-400" size={16} />
                  <input
                    type="time"
                    value={range.start}
                    onChange={(e) => updateTimeRange(index, 'start', e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  />
                </div>
                <span className="text-gray-500">to</span>
                <div className="relative flex-1">
                  <Clock className="absolute left-3 top-2.5 text-gray-400" size={16} />
                  <input
                    type="time"
                    value={range.end}
                    onChange={(e) => updateTimeRange(index, 'end', e.target.value)}
                    className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                  />
                </div>
                {formData.preferredTimeRanges.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeTimeRange(index)}
                    className="p-2 text-red-500 hover:text-red-700 hover:bg-red-100 rounded-lg transition-colors dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            ))}
            <button
              type="button"
              onClick={addTimeRange}
              className="w-full py-2 border-2 border-dashed border-gray-300 rounded-lg text-gray-500 hover:border-purple-400 hover:text-purple-600 transition-colors dark:border-gray-600 dark:text-gray-400 dark:hover:border-purple-500 dark:hover:text-purple-400"
            >
              + Add Time Range
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-200">
              Min Session Duration (minutes)
            </label>
            <input
              type="number"
              min="15"
              max="180"
              step="15"
              required
              value={formData.sessionDurationRange.min}
              onChange={(e) => setFormData({ 
                ...formData, 
                sessionDurationRange: { 
                  ...formData.sessionDurationRange, 
                  min: parseInt(e.target.value) || 15 
                }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-200">
              Max Session Duration (minutes)
            </label>
            <input
              type="number"
              min="15"
              max="240"
              step="15"
              required
              value={formData.sessionDurationRange.max}
              onChange={(e) => setFormData({ 
                ...formData, 
                sessionDurationRange: { 
                  ...formData.sessionDurationRange, 
                  max: parseInt(e.target.value) || 60 
                }
              })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2 dark:text-gray-200">
            Date Range (Optional)
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-gray-500 mb-1 dark:text-gray-400">
                Start Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 text-gray-400" size={20} />
                <input
                  type="date"
                  value={formData.dateRange.startDate}
                  onChange={(e) => setFormData({
                    ...formData,
                    dateRange: {
                      ...formData.dateRange,
                      startDate: e.target.value
                    }
                  })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1 dark:text-gray-400">
                End Date
              </label>
              <div className="relative">
                <Calendar className="absolute left-3 top-2.5 text-gray-400" size={20} />
                <input
                  type="date"
                  value={formData.dateRange.endDate}
                  onChange={(e) => setFormData({
                    ...formData,
                    dateRange: {
                      ...formData.dateRange,
                      endDate: e.target.value
                    }
                  })}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-white"
                />
              </div>
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1 dark:text-gray-400">
            If no date range is specified, the commitment will be ongoing.
          </p>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-200">
            Location (Optional)
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-2.5 text-gray-400" size={20} />
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-white"
              placeholder="e.g., Library, Home Office"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1 dark:text-gray-200">
            Description (Optional)
          </label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-800 dark:border-gray-700 dark:text-white"
            rows={2}
            placeholder="Additional notes about this smart commitment..."
          />
        </div>

        <div className="space-y-3">
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700 rounded-lg p-4">
            <label className="flex items-start space-x-3">
              <input
                type="checkbox"
                checked={formData.allowTimeShifting}
                onChange={(e) => setFormData({ ...formData, allowTimeShifting: e.target.checked })}
                className="mt-1 text-purple-600 focus:ring-purple-500 rounded"
              />
              <div>
                <span className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Allow automatic time shifting
                </span>
                <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Enables the system to automatically adjust session times when conflicts arise.
                </span>
              </div>
            </label>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-4">
            <label className="flex items-start space-x-3">
              <input
                type="checkbox"
                checked={formData.countsTowardDailyHours}
                onChange={(e) => setFormData({ ...formData, countsTowardDailyHours: e.target.checked })}
                className="mt-1 text-blue-600 focus:ring-blue-500 rounded"
              />
              <div>
                <span className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  Count toward daily available hours
                </span>
                <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Check this for work/productive commitments that use your daily capacity (e.g., study sessions, work blocks).
                  Leave unchecked for personal activities (e.g., meals, exercise).
                </span>
              </div>
            </label>
          </div>
        </div>

        <div className="flex space-x-3">
          <button
            type="submit"
            className="bg-gradient-to-r from-purple-500 to-blue-600 text-white px-6 py-2 rounded-lg hover:from-purple-600 hover:to-blue-700 transition-all duration-200 flex items-center space-x-2"
          >
            <Edit size={20} />
            <span>Update Smart Commitment</span>
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="bg-gray-200 text-gray-700 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors duration-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

export default SmartCommitmentEdit;
