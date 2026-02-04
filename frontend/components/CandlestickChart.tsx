'use client';

import { createChart, ColorType, CandlestickSeries } from 'lightweight-charts';
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
        vertLines: { color: '#000000', style: 1, visible: true },
        horzLines: { color: '#000000', style: 1, visible: true },
      },
      width: chartRef.current.clientWidth,
      height: showVolume ? height - 80 : height,
      timeScale: {
        borderColor: '#000000',
        timeVisible: true,
        secondsVisible: false,
      },
      rightPriceScale: {
        borderColor: '#000000',
        textColor: '#000000',
        scaleMargins: {
          top: 0.1,
          bottom: 0.1,
        },
      },
    });

    const candlestickSeries = chart.addSeries(CandlestickSeries, {
      upColor: '#22c55e',
      downColor: '#ef4444',
      borderVisible: true,
      wickUpColor: '#22c55e',
      wickDownColor: '#ef4444',
      borderUpColor: '#000000',
      borderDownColor: '#000000',
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
      if (chartRef.current) chart.applyOptions({ width: chartRef.current.clientWidth });
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [data, height, showVolume]);

  return <div ref={chartRef} className="w-full bg-white border-2 border-black" style={{ height }} />;
}
