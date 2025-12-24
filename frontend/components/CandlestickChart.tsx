'use client';

import { createChart, ColorType, CandlestickSeries } from 'lightweight-charts';
import React, { useEffect, useRef } from 'react';

interface CandlestickData {
    time: number;
    open: number;
    high: number;
    low: number;
    close: number;
}

interface CandlestickChartProps {
    data: CandlestickData[];
}

export default function CandlestickChart({ data }: CandlestickChartProps) {
    const chartContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!chartContainerRef.current || !data.length) return;

        const handleResize = () => {
            if (chartContainerRef.current) {
                chart.applyOptions({ width: chartContainerRef.current.clientWidth });
            }
        };

        const chart = createChart(chartContainerRef.current, {
            layout: {
                background: { type: ColorType.Solid, color: 'transparent' },
                textColor: '#9ca3af',
                fontSize: 10,
            },
            grid: {
                vertLines: { color: 'rgba(255, 255, 255, 0.05)' },
                horzLines: { color: 'rgba(255, 255, 255, 0.05)' },
            },
            width: chartContainerRef.current.clientWidth,
            height: 320,
            timeScale: {
                borderColor: 'rgba(255, 255, 255, 0.1)',
                timeVisible: true,
                secondsVisible: false,
            },
            rightPriceScale: {
                borderColor: 'rgba(255, 255, 255, 0.1)',
            },
        });

        const candlestickSeries = chart.addSeries(CandlestickSeries, {
            upColor: '#10b981',
            downColor: '#ef4444',
            borderVisible: false,
            wickUpColor: '#10b981',
            wickDownColor: '#ef4444',
        });

        // Ensure data is sorted by time and format it correctly for the library
        // Lightweight charts expects time in "seconds" for UTCTimestamp
        const formattedData = [...data]
            .sort((a, b) => a.time - b.time)
            .map(item => ({
                ...item,
                time: item.time as any // Lightweight charts handles numbers as timestamps
            }));

        candlestickSeries.setData(formattedData);
        chart.timeScale().fitContent();

        window.addEventListener('resize', handleResize);

        return () => {
            window.removeEventListener('resize', handleResize);
            chart.remove();
        };
    }, [data]);

    return (
        <div className="relative w-full bg-black/20 rounded-lg p-2 border border-white/5 overflow-hidden">
            <div className="absolute top-2 left-3 z-10">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Price History (30D)</span>
            </div>
            <div ref={chartContainerRef} className="w-full" />
        </div>
    );
}
