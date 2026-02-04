'use client';

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
  if (!data.length) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const padding = 2;
  const w = width - padding * 2;
  const h = height - padding * 2;
  const step = data.length > 1 ? w / (data.length - 1) : 0;
  const points = data
    .map((v, i) => {
      const x = padding + i * step;
      const y = padding + h - ((v - min) / range) * h;
      return `${x},${y}`;
    })
    .join(' ');
  const stroke = positive ? '#22c55e' : '#ef4444';

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      className={className}
      preserveAspectRatio="none"
    >
      {/* Exposed grid lines */}
      {[0, 1, 2].map((i) => (
        <line
          key={`h-${i}`}
          x1={padding}
          y1={padding + (i * h) / 2}
          x2={width - padding}
          y2={padding + (i * h) / 2}
          stroke="#e5e5e5"
          strokeWidth="1"
        />
      ))}
      {[0, 1, 2, 3].map((i) => (
        <line
          key={`v-${i}`}
          x1={padding + (i * w) / 3}
          y1={padding}
          x2={padding + (i * w) / 3}
          y2={height - padding}
          stroke="#e5e5e5"
          strokeWidth="1"
        />
      ))}
      {/* Price line */}
      <polyline
        fill="none"
        stroke={stroke}
        strokeWidth="2"
        strokeLinecap="square"
        strokeLinejoin="miter"
        points={points}
      />
    </svg>
  );
}
