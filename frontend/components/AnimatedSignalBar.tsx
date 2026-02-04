'use client';

import { useEffect, useState } from 'react';
import { TrendingUp, TrendingDown, AlertCircle } from 'lucide-react';

interface AnimatedSignalBarProps {
  score: number; // 0-100
  label: string;
  showBreakdown?: boolean;
  breakdown?: Array<{ label: string; value: number; contribution: number }>;
}

export default function AnimatedSignalBar({
  score,
  label,
  showBreakdown = false,
  breakdown = [],
}: AnimatedSignalBarProps) {
  const [animatedScore, setAnimatedScore] = useState(0);
  
  useEffect(() => {
    // Animate score from 0 to actual value
    const duration = 1000; // 1 second
    const steps = 60;
    const increment = score / steps;
    let current = 0;
    
    const timer = setInterval(() => {
      current += increment;
      if (current >= score) {
        setAnimatedScore(score);
        clearInterval(timer);
      } else {
        setAnimatedScore(current);
      }
    }, duration / steps);
    
    return () => clearInterval(timer);
  }, [score]);

  const normalizedScore = Math.max(0, Math.min(100, animatedScore));
  
  // Determine signal and color
  let signal = 'MANTENER';
  let signalColor = 'bg-white text-black';
  let icon = <AlertCircle className="w-6 h-6" strokeWidth={3} />;
  
  if (normalizedScore >= 70) {
    signal = 'COMPRA FUERTE';
    signalColor = 'bg-[#16a34a] text-white';
    icon = <TrendingUp className="w-6 h-6" strokeWidth={3} />;
  } else if (normalizedScore >= 55) {
    signal = 'COMPRA';
    signalColor = 'bg-[#16a34a] text-white';
    icon = <TrendingUp className="w-6 h-6" strokeWidth={3} />;
  } else if (normalizedScore >= 45) {
    signal = 'MANTENER';
    signalColor = 'bg-white text-black';
    icon = <AlertCircle className="w-6 h-6" strokeWidth={3} />;
  } else if (normalizedScore >= 30) {
    signal = 'VENTA';
    signalColor = 'bg-[#dc2626] text-white';
    icon = <TrendingDown className="w-6 h-6" strokeWidth={3} />;
  } else {
    signal = 'VENTA FUERTE';
    signalColor = 'bg-[#dc2626] text-white';
    icon = <TrendingDown className="w-6 h-6" strokeWidth={3} />;
  }

  return (
    <div className="space-y-3">
      {/* Signal Display with Icon */}
      <div className={`${signalColor} border-2 border-black p-4 text-center flex items-center justify-center gap-3`}>
        <div>{icon}</div>
        <div>
          <div className="brutal-title text-2xl mb-1">{signal}</div>
          <div className="brutal-text text-sm">PUNTUACIÓN: {Math.round(normalizedScore)}/100</div>
        </div>
      </div>

      {/* Animated Linear Gauge */}
      <div className="bg-black border-2 border-white p-2">
        <div className="relative h-14 bg-white border-2 border-black overflow-hidden">
          {/* Gradient background */}
          <div className="absolute inset-0 flex">
            <div className="flex-1 bg-gradient-to-r from-[#dc2626] via-[#dc2626] to-[#f59e0b]" />
            <div className="flex-1 bg-gradient-to-r from-[#f59e0b] via-[#eab308] to-[#eab308]" />
            <div className="flex-1 bg-gradient-to-r from-[#eab308] via-[#eab308] to-[#eab308]" />
            <div className="flex-1 bg-gradient-to-r from-[#eab308] via-[#84cc16] to-[#84cc16]" />
            <div className="flex-1 bg-gradient-to-r from-[#84cc16] via-[#16a34a] to-[#16a34a]" />
          </div>
          
          {/* Animated fill from left */}
          <div
            className="absolute top-0 bottom-0 left-0 bg-black/20 border-r-2 border-black transition-all duration-1000 ease-out"
            style={{ width: `${normalizedScore}%` }}
          />
          
          {/* Marker */}
          <div
            className="absolute top-0 bottom-0 flex items-center justify-center z-20 transition-all duration-1000 ease-out"
            style={{ left: `${normalizedScore}%`, transform: 'translateX(-50%)' }}
          >
            <div className="relative flex flex-col items-center">
              <div className="w-0 h-0 border-l-[10px] border-r-[10px] border-t-[14px] border-t-black border-l-transparent border-r-transparent drop-shadow-lg" />
              <div 
                className={`w-4 h-12 border-l-2 border-r-2 border-black -mt-[2px] transition-colors duration-300`}
                style={{ 
                  backgroundColor: normalizedScore >= 70 ? '#16a34a' : normalizedScore <= 30 ? '#dc2626' : '#ffffff'
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Breakdown */}
      {showBreakdown && breakdown.length > 0 && (
        <div className="bg-white border-2 border-black p-3 space-y-2">
          <div className="brutal-text text-xs text-black border-b-2 border-black pb-1">
            DESGLOSE DE PUNTOS
          </div>
          {breakdown.map((item, i) => (
            <div key={i} className="flex justify-between items-center border-b border-black/20 pb-1">
              <span className="text-[10px] font-black uppercase text-black/80">{item.label}</span>
              <span className={`text-[10px] font-black ${
                item.contribution >= 0 ? 'text-[#16a34a]' : 'text-[#dc2626]'
              }`}>
                {item.contribution >= 0 ? '+' : ''}{item.contribution.toFixed(0)} pts
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
