import React from 'react';

interface TimePilotIconProps {
  size?: number;
  className?: string;
}

const TimePilotIcon: React.FC<TimePilotIconProps> = ({ size = 24, className = '' }) => {
  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 32 32" 
      fill="none" 
      className={className}
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id="iconGradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" style={{stopColor: '#8b5cf6', stopOpacity: 1}} />
          <stop offset="100%" style={{stopColor: '#6366f1', stopOpacity: 1}} />
        </linearGradient>
      </defs>
      <rect width="32" height="32" rx="6" fill="url(#iconGradient)"/>
      <circle cx="16" cy="16" r="10" fill="none" stroke="white" strokeWidth="1.5"/>
      <path d="M16 8v8l5 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      <circle cx="16" cy="16" r="1.5" fill="white"/>
      <path d="M8 6l2 2M24 6l-2 2M6 16h2M24 16h2M8 26l2-2M24 26l-2-2" stroke="white" strokeWidth="1" strokeLinecap="round"/>
    </svg>
  );
};

export default TimePilotIcon;

