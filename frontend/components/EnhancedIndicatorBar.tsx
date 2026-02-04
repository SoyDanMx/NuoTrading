'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

interface EnhancedIndicatorBarProps {
  label: string;
  explanation: string;
  value: number;
  min: number;
  max: number;
  positiveThreshold?: number;
  negativeThreshold?: number;
  higherIsBetter?: boolean;
  unit?: string;
  showTooltip?: boolean;
  tooltipId?: string;
}

export default function EnhancedIndicatorBar({
  label,
  explanation,
  value,
  min,
  max,
  positiveThreshold,
  negativeThreshold,
  higherIsBetter = true,
  unit = '',
  showTooltip = false,
  tooltipId,
}: EnhancedIndicatorBarProps) {
  const [animatedPercentage, setAnimatedPercentage] = useState(0);
  
  const percentage = ((value - min) / (max - min)) * 100;
  const clampedPercentage = Math.max(0, Math.min(100, percentage));

  // Animate percentage on mount/update
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedPercentage(clampedPercentage);
    }, 100);
    return () => clearTimeout(timer);
  }, [clampedPercentage]);

  // Determine color based on thresholds
  let barColor = 'bg-white';
  let textColor = 'text-black';
  let statusText = '';
  let arrowDirection: 'up' | 'down' | 'neutral' = 'neutral';
  let interpretation = 'Neutro';
  
  if (higherIsBetter) {
    if (positiveThreshold !== undefined && value >= positiveThreshold) {
      barColor = 'bg-[#16a34a]'; // green-700
      textColor = 'text-[#16a34a]';
      statusText = 'BUENO';
      arrowDirection = 'up';
      interpretation = 'Favorable para compra';
    } else if (negativeThreshold !== undefined && value <= negativeThreshold) {
      barColor = 'bg-[#dc2626]'; // red-700
      textColor = 'text-[#dc2626]';
      statusText = 'MALO';
      arrowDirection = 'down';
      interpretation = 'Desfavorable';
    } else {
      barColor = 'bg-white';
      textColor = 'text-black';
      statusText = 'NEUTRAL';
      arrowDirection = 'neutral';
      interpretation = 'Neutro';
    }
  } else {
    if (positiveThreshold !== undefined && value <= positiveThreshold) {
      barColor = 'bg-[#16a34a]';
      textColor = 'text-[#16a34a]';
      statusText = 'BUENO';
      arrowDirection = 'up';
      interpretation = 'Favorable para compra';
    } else if (negativeThreshold !== undefined && value >= negativeThreshold) {
      barColor = 'bg-[#dc2626]';
      textColor = 'text-[#dc2626]';
      statusText = 'MALO';
      arrowDirection = 'down';
      interpretation = 'Desfavorable';
    } else {
      barColor = 'bg-white';
      textColor = 'text-black';
      statusText = 'NEUTRAL';
      arrowDirection = 'neutral';
      interpretation = 'Neutro';
    }
  }

  const tooltipContent = `Nivel actual: ${value.toFixed(1)}${unit} (${interpretation})`;
  const uniqueId = tooltipId || `indicator-${label.toLowerCase().replace(/\s+/g, '-')}`;

  return (
    <div className="bg-white border-2 border-black p-3">
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <div className="brutal-text text-sm text-black flex items-center gap-2">
            {label}
            {/* Icon indicator */}
            {arrowDirection === 'up' && (
              <TrendingUp className="w-5 h-5 text-[#16a34a]" strokeWidth={3} />
            )}
            {arrowDirection === 'down' && (
              <TrendingDown className="w-5 h-5 text-[#dc2626]" strokeWidth={3} />
            )}
            {arrowDirection === 'neutral' && (
              <Minus className="w-5 h-5 text-black/50" strokeWidth={3} />
            )}
          </div>
          {showTooltip && (
            <div className="text-[9px] font-black uppercase text-black/60 mt-1 leading-tight">
              {explanation}
            </div>
          )}
        </div>
        <div className="text-right ml-4">
          <div className={`brutal-text text-base ${textColor} flex items-center justify-end gap-1`}>
            {value.toFixed(1)}{unit}
            {/* Value icon */}
            {arrowDirection === 'up' && (
              <TrendingUp className="w-4 h-4 text-[#16a34a]" strokeWidth={3} />
            )}
            {arrowDirection === 'down' && (
              <TrendingDown className="w-4 h-4 text-[#dc2626]" strokeWidth={3} />
            )}
          </div>
          <div className={`text-[10px] font-black uppercase ${textColor}`}>
            {statusText}
          </div>
        </div>
      </div>
      
      {/* Enhanced gradient bar with animated arrow */}
      <div 
        className="relative h-12 bg-black border-2 border-black"
        data-tooltip-id={uniqueId}
        data-tooltip-content={tooltipContent}
      >
        {/* Gradient background */}
        <div className="absolute inset-0 flex">
          <div className="flex-1 bg-gradient-to-r from-[#dc2626] via-[#dc2626] to-[#f59e0b]" />
          <div className="flex-1 bg-gradient-to-r from-[#f59e0b] via-[#eab308] to-[#eab308]" />
          <div className="flex-1 bg-gradient-to-r from-[#eab308] via-[#eab308] to-[#eab308]" />
          <div className="flex-1 bg-gradient-to-r from-[#eab308] via-[#84cc16] to-[#84cc16]" />
          <div className="flex-1 bg-gradient-to-r from-[#84cc16] via-[#16a34a] to-[#16a34a]" />
        </div>
        
        {/* Zone labels */}
        <div className="absolute inset-0 flex items-center justify-between px-2 pointer-events-none z-0">
          <span className="text-[8px] font-black uppercase text-white/70">VENTA</span>
          <span className="text-[8px] font-black uppercase text-black/70">NEUTRAL</span>
          <span className="text-[8px] font-black uppercase text-white/70">COMPRA</span>
        </div>
        
        {/* Animated arrow marker */}
        <div
          className="absolute top-0 bottom-0 flex items-center justify-center z-20 transition-all duration-500 ease-out"
          style={{ left: `${animatedPercentage}%`, transform: 'translateX(-50%)' }}
        >
          {/* Arrow pointing down - enhanced */}
          <div className="relative flex flex-col items-center">
            {/* Arrow head */}
            <div 
              className="w-0 h-0 border-l-[10px] border-r-[10px] border-t-[14px] border-t-black border-l-transparent border-r-transparent drop-shadow-lg"
            />
            {/* Arrow shaft with color */}
            <div 
              className={`w-4 h-10 border-l-2 border-r-2 border-black -mt-[2px] transition-colors duration-300`}
              style={{ 
                backgroundColor: arrowDirection === 'up' ? '#16a34a' : arrowDirection === 'down' ? '#dc2626' : '#ffffff'
              }}
            />
          </div>
        </div>
      </div>
      
      {/* Percentage indicator */}
      <div className="text-[9px] font-black uppercase text-black mt-2 text-center border-t-2 border-black pt-2">
        POSICIÓN: {Math.round(clampedPercentage)}% • {interpretation.toUpperCase()}
      </div>
    </div>
  );
}
