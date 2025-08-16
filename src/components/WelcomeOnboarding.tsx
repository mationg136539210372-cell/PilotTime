import React, { useState } from 'react';
import { BookOpen, Calendar, Clock, CheckCircle2, Users, Sparkles, ArrowRight, PlayCircle } from 'lucide-react';
import { Task, FixedCommitment, UserSettings } from '../types';

interface WelcomeOnboardingProps {
  onCreateSampleSchedule: () => void;
  onStartGuided: () => void;
  onSkipOnboarding: () => void;
  settings: UserSettings;
}

const WelcomeOnboarding: React.FC<WelcomeOnboardingProps> = ({
  onCreateSampleSchedule,
  onStartGuided,
  onSkipOnboarding
}) => {
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);

  const templates = [
    {
      id: 'college',
      title: 'College Student',
      icon: <BookOpen className="text-blue-600" size={24} />,
      description: 'Classes, assignments, and exam preparation',
      features: ['Multiple courses', 'Assignment deadlines', 'Study groups', 'Flexible schedule']
    },
    {
      id: 'working',
      title: 'Working Student',
      icon: <Clock className="text-green-600" size={24} />,
      description: 'Balance work, classes, and study time',
      features: ['Work schedule', 'Limited study hours', 'Weekend planning', 'Evening sessions']
    },
    {
      id: 'intensive',
      title: 'Exam Prep',
      icon: <CheckCircle2 className="text-purple-600" size={24} />,
      description: 'Intensive study planning for major exams',
      features: ['Subject breakdown', 'Review schedules', 'Practice tests', 'Progress tracking']
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-800 dark:to-gray-900 p-4">
      <div className="max-w-6xl mx-auto">
        {/* Hero Section */}
        <div className="text-center mb-12 pt-8">
          <div className="flex items-center justify-center mb-6">
            <div className="w-16 h-16 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Sparkles className="text-white" size={32} />
            </div>
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 dark:text-white mb-4">
            Welcome to <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">TimePilot</span>
          </h1>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-2">
            The smart scheduling app that automatically plans your study time
          </p>
          <p className="text-lg text-gray-500 dark:text-gray-400">
            Say goodbye to scheduling stress - let AI handle the planning! ✨
          </p>
        </div>

        {/* Value Proposition */}
        <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm rounded-3xl p-8 mb-12 shadow-xl border border-gray-200/50 dark:border-gray-700/50">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6 text-center">
            Here's what makes TimePilot special:
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="w-12 h-12 bg-blue-100 dark:bg-blue-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Calendar className="text-blue-600 dark:text-blue-400" size={24} />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Smart Auto-Scheduling</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Automatically fits study sessions around your classes and commitments
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Clock className="text-green-600 dark:text-green-400" size={24} />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Time Optimization</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Finds the best study slots and prevents schedule conflicts
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="text-purple-600 dark:text-purple-400" size={24} />
              </div>
              <h3 className="font-semibold text-gray-900 dark:text-white mb-2">Progress Tracking</h3>
              <p className="text-gray-600 dark:text-gray-300 text-sm">
                Monitor your study progress and stay motivated
              </p>
            </div>
          </div>
        </div>

        {/* Quick Start Options */}
        <div className="bg-white dark:bg-gray-800 rounded-3xl p-8 shadow-xl border border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-6 text-center">
            Let's get you started! Choose your path:
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6 mb-8">
            {/* Quick Start with Sample */}
            <div className="border-2 border-blue-200 dark:border-blue-700 rounded-2xl p-6 hover:border-blue-400 dark:hover:border-blue-500 transition-colors cursor-pointer group"
                 onClick={onCreateSampleSchedule}>
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-xl flex items-center justify-center mr-3">
                  <PlayCircle className="text-blue-600 dark:text-blue-400" size={20} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Quick Start (Recommended)</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                See TimePilot in action with sample tasks and schedule. Perfect for trying it out!
              </p>
              <div className="flex items-center text-blue-600 dark:text-blue-400 group-hover:text-blue-700 dark:group-hover:text-blue-300 transition-colors">
                <span className="text-sm font-medium">Start with examples</span>
                <ArrowRight size={16} className="ml-1" />
              </div>
            </div>

            {/* Guided Setup */}
            <div className="border-2 border-purple-200 dark:border-purple-700 rounded-2xl p-6 hover:border-purple-400 dark:hover:border-purple-500 transition-colors cursor-pointer group"
                 onClick={onStartGuided}>
              <div className="flex items-center mb-4">
                <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-xl flex items-center justify-center mr-3">
                  <Users className="text-purple-600 dark:text-purple-400" size={20} />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Guided Setup</h3>
              </div>
              <p className="text-gray-600 dark:text-gray-300 mb-4">
                Step-by-step setup with your real tasks and schedule. We'll guide you through everything!
              </p>
              <div className="flex items-center text-purple-600 dark:text-purple-400 group-hover:text-purple-700 dark:group-hover:text-purple-300 transition-colors">
                <span className="text-sm font-medium">Create your schedule</span>
                <ArrowRight size={16} className="ml-1" />
              </div>
            </div>
          </div>

          {/* Skip Option */}
          <div className="text-center">
            <button
              onClick={onSkipOnboarding}
              className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 text-sm transition-colors"
            >
              Skip and explore on my own
            </button>
          </div>
        </div>

        {/* Social Proof */}
        <div className="text-center mt-12 text-gray-500 dark:text-gray-400">
          <p className="text-sm">
            💡 <strong>Pro tip:</strong> Most students save 3+ hours per week on planning with TimePilot
          </p>
        </div>
      </div>
    </div>
  );
};

export default WelcomeOnboarding;
