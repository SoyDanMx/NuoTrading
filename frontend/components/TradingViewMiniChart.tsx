'use client';

import { useEffect, useRef, useState } from 'react';

declare global {
  interface Window {
    TradingView: any;
  }
}

interface TradingViewMiniChartProps {
  symbol: string;
  width?: number;
  height?: number;
  colorTheme?: 'light' | 'dark';
  isTransparent?: boolean;
  locale?: string;
}

export default function TradingViewMiniChart({
  symbol,
  width = 350,
  height = 220,
  colorTheme = 'light',
  isTransparent = false,
  locale = 'es',
}: TradingViewMiniChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    if (!scriptLoaded || !containerRef.current || !window.TradingView) return;

    containerRef.current.innerHTML = '';

    const widget = new window.TradingView.widget({
      symbol: symbol.toUpperCase(),
      width: width,
      height: height,
      locale: locale,
      dateRange: '12M',
      colorTheme: colorTheme,
      isTransparent: isTransparent,
      autosize: false,
      largeChartUrl: '',
      container_id: containerRef.current.id,
    });

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [scriptLoaded, symbol, width, height, colorTheme, isTransparent, locale]);

  const containerId = `tradingview_mini_${symbol}_${Date.now()}`;

  useEffect(() => {
    // Cargar script de TradingView dinámicamente
    if (typeof window !== 'undefined' && !window.TradingView) {
      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/tv.js';
      script.async = true;
      script.onload = () => {
        setScriptLoaded(true);
      };
      document.head.appendChild(script);

      return () => {
        const existingScript = document.querySelector('script[src="https://s3.tradingview.com/tv.js"]');
        if (existingScript) {
          existingScript.remove();
        }
      };
    } else if (window.TradingView) {
      setScriptLoaded(true);
    }
  }, []);

  return (
    <div className="relative w-full bg-white border-2 border-black" style={{ width, height }}>
      <div
        id={containerId}
        ref={containerRef}
        className="w-full h-full"
      />
      {!scriptLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-white border-2 border-black">
          <div className="text-black text-xs font-black uppercase">
            Cargando...
          </div>
        </div>
      )}
    </div>
  );
}
