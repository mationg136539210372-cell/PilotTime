import React from 'react';
import { Play, BookOpen } from 'lucide-react';

interface TutorialButtonProps {
  onStartTutorial: () => void;
  hasCompletedTutorial: boolean;
  hasTasks: boolean;
  isTutorialActive?: boolean; // New prop to control visibility
  hasCompletedOnboarding?: boolean; // New prop to check onboarding status
}

const TutorialButton: React.FC<TutorialButtonProps> = ({
  onStartTutorial,
  hasCompletedTutorial,
  hasTasks,
  isTutorialActive = false,
  hasCompletedOnboarding = true
}) => {
  // Hide button if tutorial is running
  if (isTutorialActive) return null;

  // Don't show for users who haven't completed onboarding (they need to finish that first)
  if (!hasCompletedOnboarding) return null;

  // Only show for users who have data but haven't completed the advanced tutorial
  const shouldShow = hasTasks && !hasCompletedTutorial;

  if (!shouldShow) return null;

  return (
    <div className="fixed bottom-6 right-6 z-30">
      <button
        onClick={onStartTutorial}
        className="bg-gradient-to-r from-purple-500 to-indigo-600 text-white px-4 py-2 rounded-full shadow-lg hover:from-purple-600 hover:to-indigo-700 transition-all duration-200 flex items-center space-x-2 hover:scale-105"
        title="Learn advanced TimePilot features"
      >
        <BookOpen size={18} />
        <span className="font-medium text-sm">Advanced Tips</span>
      </button>
    </div>
  );
};

export default TutorialButton;
