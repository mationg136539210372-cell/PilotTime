import React, { useState, useEffect } from 'react';
import { Clock, Eye, EyeOff } from 'lucide-react';

interface TimerTestHelperProps {
  isVisible?: boolean;
}

/**
 * Helper component to test timer behavior in different visibility states
 * Only shown in development mode
 */
const TimerTestHelper: React.FC<TimerTestHelperProps> = ({ isVisible = false }) => {
  const [visibilityState, setVisibilityState] = useState(document.visibilityState);
  const [tabSwitchCount, setTabSwitchCount] = useState(0);
  const [lastSwitchTime, setLastSwitchTime] = useState<Date | null>(null);
  const [performanceStart] = useState(performance.now());

  useEffect(() => {
    const handleVisibilityChange = () => {
      setVisibilityState(document.visibilityState);
      setTabSwitchCount(prev => prev + 1);
      setLastSwitchTime(new Date());
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  const getElapsedTime = () => {
    const elapsed = (performance.now() - performanceStart) / 1000;
    return elapsed.toFixed(2);
  };

  // Only show in development
  if (process.env.NODE_ENV !== 'development' || !isVisible) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 bg-black bg-opacity-80 text-white text-xs p-3 rounded-lg max-w-xs z-50">
      <div className="flex items-center space-x-2 mb-2">
        <Clock className="w-4 h-4" />
        <span className="font-semibold">Timer Debug Info</span>
      </div>
      
      <div className="space-y-1">
        <div className="flex items-center space-x-2">
          {visibilityState === 'visible' ? (
            <Eye className="w-3 h-3 text-green-400" />
          ) : (
            <EyeOff className="w-3 h-3 text-red-400" />
          )}
          <span>Tab: {visibilityState}</span>
        </div>
        
        <div>Performance Timer: {getElapsedTime()}s</div>
        <div>Tab Switches: {tabSwitchCount}</div>
        
        {lastSwitchTime && (
          <div>Last Switch: {lastSwitchTime.toLocaleTimeString()}</div>
        )}
        
        <div className="mt-2 text-gray-300">
          <div>Switch tabs to test timer accuracy</div>
        </div>
      </div>
    </div>
  );
};

export default TimerTestHelper;
