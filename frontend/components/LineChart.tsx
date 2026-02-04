'use client';

import { createChart, ColorType, LineSeries } from 'lightweight-charts';
import { useEffect, useRef } from 'react';

interface LineChartProps {
  data: { time: number; value: number }[];
  color?: string;
  height?: number;
}

export default function LineChart({ data, color = '#ef4444', height = 280 }: LineChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    if (!data.length) return;

    const chart = createChart(chartRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#ffffff' },
        textColor: '#000000',
        fontSize: 10,
        fontFamily: 'Arial Black, sans-serif',
      },
      grid: {
        vertLines: { color: '#e5e5e5', style: 0, visible: true },
        horzLines: { color: '#e5e5e5', style: 0, visible: true },
      },
      width: chartRef.current.clientWidth,
      height,
      timeScale: {
        borderColor: '#000000',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#000000',
        textColor: '#000000',
      },
    });

    const lineSeries = chart.addSeries(LineSeries, {
      color,
      lineWidth: 3,
      crosshairMarkerVisible: true,
      crosshairMarkerBorderColor: color,
      crosshairMarkerBackgroundColor: color,
    });

    const formatted = [...data]
      .sort((a, b) => a.time - b.time)
      .map((d) => ({ time: d.time as any, value: d.value }));

    lineSeries.setData(formatted);
    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartRef.current) chart.applyOptions({ width: chartRef.current.clientWidth });
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, color, height]);

  return <div ref={chartRef} className="w-full bg-white" />;
}
