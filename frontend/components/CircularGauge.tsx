import React from 'react';

interface CircularGaugeProps {
  score: number; // 0 to 10
  size?: number;
  strokeWidth?: number;
  label?: string;
}

export default function CircularGauge({ score, size = 120, strokeWidth = 8, label }: CircularGaugeProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  // Convert 0-10 score to a percentage (0-100)
  const percentage = Math.min(Math.max((score / 10) * 100, 0), 100);
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  let color = '#22c55e'; // Green
  let text = 'Buy';
  
  if (score < 4) {
    color = '#ef4444'; // Red
    text = 'Sell';
  } else if (score < 7) {
    color = '#eab308'; // Yellow
    text = 'Hold';
  }

  return (
    <div className="flex flex-col items-center justify-center">
      <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
        {/* Background Circle */}
        <svg className="absolute top-0 left-0" width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke="rgba(0, 0, 0, 0.05)" // Light grey for light theme
            strokeWidth={strokeWidth}
            className="dark:stroke-white/10"
          />
        </svg>
        
        {/* Progress Circle */}
        <svg className="absolute top-0 left-0 transform -rotate-90" width={size} height={size}>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="transparent"
            stroke={color}
            strokeWidth={strokeWidth}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            style={{ transition: 'stroke-dashoffset 1s ease-in-out' }}
          />
        </svg>
        
        {/* Inner Text */}
        <div className="flex flex-col items-center justify-center absolute inset-0 text-center">
          <span className="text-4xl font-bold text-gray-900 dark:text-white" style={{ fontSize: size * 0.35 }}>
            {score.toFixed(0)}
          </span>
        </div>
      </div>
      
      {/* Label under the gauge */}
      <span className="mt-2 text-sm font-bold uppercase tracking-wider text-gray-900 dark:text-white">
        {label || text}
      </span>
    </div>
  );
}
