import React from 'react';

interface CircularGaugeProps {
  score: number; // 1 to 10 (Danelfin Style)
  size?: number;
  strokeWidth?: number;
  label?: string;
}

export default function CircularGauge({ score, size = 120, strokeWidth = 10, label }: CircularGaugeProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  
  // Danelfin mapping: 1-3 (Red), 4-6 (Yellow), 7-10 (Green)
  const percentage = Math.min(Math.max((score / 10) * 100, 0), 100);
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  let color = '#22c55e'; // Green (Strong Buy)
  let text = 'Strong Buy';
  let gradientId = 'gaugeGradientGreen';

  if (score <= 3) {
    color = '#ef4444'; // Red (Sell)
    text = 'Sell';
    gradientId = 'gaugeGradientRed';
  } else if (score <= 6) {
    color = '#eab308'; // Yellow (Hold)
    text = 'Hold';
    gradientId = 'gaugeGradientYellow';
  } else if (score < 9) {
    color = '#22c55e';
    text = 'Buy';
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        <svg className="absolute top-0 left-0" width={size} height={size}>
          <defs>
            <linearGradient id="gaugeGradientGreen" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#4ade80" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>
            <linearGradient id="gaugeGradientYellow" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fde047" />
              <stop offset="100%" stopColor="#eab308" />
            </linearGradient>
            <linearGradient id="gaugeGradientRed" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f87171" />
              <stop offset="100%" stopColor="#ef4444" />
            </linearGradient>
          </defs>
          
          {/* Background Path */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="currentColor"
            strokeWidth={strokeWidth}
            className="text-gray-100 dark:text-white/5"
          />
          
          {/* Progress Path */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={`url(#${gradientId})`}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            className="transition-all duration-1000 ease-out"
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </svg>
        
        {/* Score Display */}
        <div className="flex flex-col items-center justify-center absolute inset-0">
          <span className="text-5xl font-black tracking-tight text-gray-900 dark:text-white" style={{ fontSize: size * 0.38 }}>
            {score}
          </span>
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-[-4px]">
            / 10
          </span>
        </div>
      </div>
      
      <div className="mt-4 flex flex-col items-center">
        <span className="px-3 py-1 bg-gray-50 dark:bg-white/5 rounded-full text-xs font-black uppercase tracking-tighter text-gray-900 dark:text-white border border-gray-100 dark:border-white/10 shadow-sm">
          {label || text}
        </span>
      </div>
    </div>
  );
}
