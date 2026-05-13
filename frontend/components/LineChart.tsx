'use client';

import { createChart, ColorType, AreaSeries, IChartApi } from 'lightweight-charts';
import { useEffect, useRef } from 'react';

interface LineChartProps {
  data: { time: number; value: number }[];
  color?: string;
  height?: number;
}

export default function LineChart({ data, color = '#3B82F6', height = 280 }: LineChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);
  const chartInstance = useRef<IChartApi | null>(null);

  useEffect(() => {
    if (!chartRef.current) return;
    if (!data.length) return;

    const chart = createChart(chartRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: 'transparent' },
        textColor: 'rgba(255, 255, 255, 0.4)',
        fontSize: 10,
        fontFamily: 'Inter, sans-serif',
      },
      grid: {
        vertLines: { color: 'rgba(255, 255, 255, 0.03)', style: 0, visible: true },
        horzLines: { color: 'rgba(255, 255, 255, 0.03)', style: 0, visible: true },
      },
      width: chartRef.current.clientWidth,
      height,
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.05)',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.05)',
        textColor: 'rgba(255, 255, 255, 0.4)',
      },
      crosshair: {
        vertLine: { color: 'rgba(255, 255, 255, 0.2)', labelBackgroundColor: '#1A1A1A' },
        horzLine: { color: 'rgba(255, 255, 255, 0.2)', labelBackgroundColor: '#1A1A1A' },
      }
    });

    chartInstance.current = chart;

    const areaSeries = chart.addSeries(AreaSeries, {
      lineColor: color,
      topColor: `${color}33`, // 20% opacity
      bottomColor: `${color}00`, // 0% opacity
      lineWidth: 2,
      crosshairMarkerVisible: true,
      crosshairMarkerBorderColor: '#FFFFFF',
      crosshairMarkerBackgroundColor: color,
      priceLineVisible: false,
    });

    const formatted = [...data]
      .sort((a, b) => a.time - b.time)
      .map((d) => ({ time: d.time as any, value: d.value }));

    areaSeries.setData(formatted);
    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartRef.current && chartInstance.current) {
        chartInstance.current.applyOptions({ width: chartRef.current.clientWidth });
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, color, height]);

  return <div ref={chartRef} className="w-full" />;
}
