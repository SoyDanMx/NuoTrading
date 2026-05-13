'use client';

import { TrendingUp, TrendingDown } from 'lucide-react';

interface StockIconProps {
  symbol: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
  showTrend?: boolean;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}

export default function StockIcon({
  symbol,
  size = 'md',
  showTrend = false,
  trend = 'neutral',
  className = '',
}: StockIconProps) {
  const initials = symbol.slice(0, 2).toUpperCase();
  
  const sizeClasses = {
    sm: 'w-8 h-8 text-[10px]',
    md: 'w-12 h-12 text-xs',
    lg: 'w-16 h-16 text-base',
    xl: 'w-24 h-24 text-xl',
  };

  const trendColors = {
    up: 'text-blue-400',
    down: 'text-red-400',
    neutral: 'text-gray-400',
  };

  return (
    <div className={`relative flex items-center justify-center shrink-0 ${className}`}>
      {/* Icon container - Premium Glass style */}
      <div
        className={`${sizeClasses[size]} bg-white/10 backdrop-blur-md border border-white/20 flex items-center justify-center font-bold text-white uppercase rounded-2xl shadow-xl shadow-black/20`}
      >
        {initials}
      </div>
      
      {/* Trend indicator (optional) */}
      {showTrend && trend !== 'neutral' && (
        <div
          className={`absolute -bottom-1 -right-1 p-1 rounded-full bg-black border border-white/10 shadow-lg`}
        >
          {trend === 'up' ? (
            <TrendingUp
              className={trendColors.up}
              size={12}
              strokeWidth={3}
            />
          ) : (
            <TrendingDown
              className={trendColors.down}
              size={12}
              strokeWidth={3}
            />
          )}
        </div>
      )}
    </div>
  );
}
