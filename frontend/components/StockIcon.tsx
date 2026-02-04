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
  // Get initials from symbol (first 2-3 characters)
  const initials = symbol.slice(0, 2).toUpperCase();
  
  const sizeClasses = {
    sm: 'w-6 h-6 text-[8px]',
    md: 'w-10 h-10 text-xs',
    lg: 'w-14 h-14 text-base',
    xl: 'w-20 h-20 text-xl',
  };

  const iconSize = {
    sm: 12,
    md: 16,
    lg: 20,
    xl: 24,
  };

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      {/* Icon container - Brutalist style */}
      <div
        className={`${sizeClasses[size]} bg-white border-2 border-black flex items-center justify-center font-black text-black uppercase`}
      >
        {initials}
      </div>
      
      {/* Trend indicator (optional) */}
      {showTrend && trend !== 'neutral' && (
        <div
          className={`absolute -bottom-1 -right-1 ${
            size === 'sm' ? 'w-3 h-3' : size === 'md' ? 'w-4 h-4' : size === 'lg' ? 'w-5 h-5' : 'w-6 h-6'
          } bg-black border-2 border-white flex items-center justify-center`}
        >
          {trend === 'up' ? (
            <TrendingUp
              className={`${trend === 'up' ? 'text-[#16a34a]' : 'text-[#dc2626]'}`}
              size={iconSize[size] / 2}
              strokeWidth={3}
            />
          ) : (
            <TrendingDown
              className="text-[#dc2626]"
              size={iconSize[size] / 2}
              strokeWidth={3}
            />
          )}
        </div>
      )}
    </div>
  );
}
