'use client';

import { useId } from 'react';

interface MiniSparklineProps {
  data: number[];
  positive: boolean;
  width?: number;
  height?: number;
  className?: string;
}

export default function MiniSparkline({
  data,
  positive,
  width = 80,
  height = 28,
  className = '',
}: MiniSparklineProps) {
  const id = useId().replace(/:/g, '');
  if (!data.length) return null;
  
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 2;
  const w = width - padding * 2;
  const h = height - padding * 2;
  const step = data.length > 1 ? w / (data.length - 1) : 0;
  
  const points = data.map((v, i) => {
    const x = padding + i * step;
    const y = padding + h - ((v - min) / range) * h;
    return `${x},${y}`;
  }).join(' ');

  const fillPoints = `${padding},${height - padding} ${points} ${width - padding},${height - padding}`;
  const stroke = positive ? '#3B82F6' : '#EF4444'; // Vibrant Blue or Red

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      preserveAspectRatio="none"
    >
      <defs>
        <linearGradient id={`gradient-${id}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.2" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      
      {/* Area Fill */}
      <polygon
        points={fillPoints}
        fill={`url(#gradient-${id})`}
        className="transition-all duration-700"
      />
      
      {/* Price line */}
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
        className="transition-all duration-700"
      />
    </svg>
  );
}
