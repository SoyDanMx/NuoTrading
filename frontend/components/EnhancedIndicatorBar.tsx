'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface EnhancedIndicatorBarProps {
  label: string;
  explanation?: string;
  value: number;
  min: number;
  max: number;
  positiveThreshold?: number;
  negativeThreshold?: number;
  higherIsBetter?: boolean;
  unit?: string;
}

export default function EnhancedIndicatorBar({
  label,
  value,
  min,
  max,
  positiveThreshold,
  negativeThreshold,
  higherIsBetter = true,
  unit = '',
}: EnhancedIndicatorBarProps) {
  const [animatedPercentage, setAnimatedPercentage] = useState(0);
  
  const percentage = ((value - min) / (max - min)) * 100;
  const clampedPercentage = Math.max(0, Math.min(100, percentage));

  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedPercentage(clampedPercentage);
    }, 100);
    return () => clearTimeout(timer);
  }, [clampedPercentage]);

  let statusColor = 'text-white/40';
  let arrowColor = 'text-white/20';
  
  if (higherIsBetter) {
    if (positiveThreshold !== undefined && value >= positiveThreshold) {
      statusColor = 'text-blue-400';
      arrowColor = 'text-blue-400';
    } else if (negativeThreshold !== undefined && value <= negativeThreshold) {
      statusColor = 'text-red-400';
      arrowColor = 'text-red-400';
    }
  } else {
    if (positiveThreshold !== undefined && value <= positiveThreshold) {
      statusColor = 'text-blue-400';
      arrowColor = 'text-blue-400';
    } else if (negativeThreshold !== undefined && value >= negativeThreshold) {
      statusColor = 'text-red-400';
      arrowColor = 'text-red-400';
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex justify-between items-end">
        <span className="text-xs font-bold text-white/40 tracking-widest uppercase">{label}</span>
        <span className={`text-sm font-semibold ${statusColor}`}>
          {value.toFixed(1)}{unit}
        </span>
      </div>
      
      <div className="relative h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
        {/* Threshold Markers */}
        {positiveThreshold !== undefined && (
          <div 
            className="absolute top-0 bottom-0 w-px bg-white/10 z-10" 
            style={{ left: `${((positiveThreshold - min) / (max - min)) * 100}%` }} 
          />
        )}
        {negativeThreshold !== undefined && (
          <div 
            className="absolute top-0 bottom-0 w-px bg-white/10 z-10" 
            style={{ left: `${((negativeThreshold - min) / (max - min)) * 100}%` }} 
          />
        )}
        
        {/* Progress Fill */}
        <div 
          className={`absolute inset-y-0 left-0 transition-all duration-1000 ease-out rounded-full ${
            statusColor.replace('text-', 'bg-')
          } opacity-40`}
          style={{ width: `${animatedPercentage}%` }}
        />
        
        {/* Value Marker */}
        <div 
          className="absolute inset-y-0 w-1 bg-white shadow-[0_0_8px_rgba(255,255,255,0.5)] z-20 transition-all duration-1000 ease-out rounded-full"
          style={{ left: `${animatedPercentage}%`, transform: 'translateX(-50%)' }}
        />
      </div>
    </div>
  );
}
