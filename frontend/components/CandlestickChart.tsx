'use client';

import { createChart, ColorType, CandlestickSeries, IChartApi } from 'lightweight-charts';
import { useEffect, useRef } from 'react';

interface CandlestickData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
}

interface CandlestickChartProps {
  data: CandlestickData[];
  height?: number;
  showVolume?: boolean;
}

export default function CandlestickChart({ data, height = 400, showVolume = false }: CandlestickChartProps) {
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
        vertLines: { color: 'rgba(255, 255, 255, 0.03)', style: 1, visible: true },
        horzLines: { color: 'rgba(255, 255, 255, 0.03)', style: 1, visible: true },
      },
      width: chartRef.current.clientWidth,
      height: showVolume ? height - 80 : height,
      timeScale: {
        borderColor: 'rgba(255, 255, 255, 0.05)',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: 'rgba(255, 255, 255, 0.05)',
        textColor: 'rgba(255, 255, 255, 0.4)',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
      crosshair: {
        vertLine: { color: 'rgba(255, 255, 255, 0.2)', labelBackgroundColor: '#1A1A1A' },
        horzLine: { color: 'rgba(255, 255, 255, 0.2)', labelBackgroundColor: '#1A1A1A' },
      }
    });

    chartInstance.current = chart;

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#3B82F6',
      downColor: '#EF4444',
      borderVisible: false,
      wickUpColor: '#3B82F6',
      wickDownColor: '#EF4444',
    });

    const formatted = [...data]
      .sort((a, b) => a.time - b.time)
      .map((d) => ({
        time: d.time as any,
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
      }));

    candlestickSeries.setData(formatted);
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
  }, [data, height, showVolume]);

  return <div ref={chartRef} className="w-full" style={{ height }} />;
}
