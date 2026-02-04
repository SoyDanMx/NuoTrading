'use client';

import { useEffect, useRef, useState } from 'react';

// Declarar tipo para window.TradingView
declare global {
  interface Window {
    TradingView: any;
  }
}

interface TradingViewChartProps {
  symbol: string;
  height?: number;
  theme?: 'light' | 'dark';
  interval?: string; // '1', '5', '15', '30', '60', '240', '1D', '1W', '1M'
  hide_top_toolbar?: boolean;
  hide_legend?: boolean;
  allow_symbol_change?: boolean;
  save_image?: boolean;
  studies?: string[]; // ['RSI@tv-basicstudies', 'MACD@tv-basicstudies']
  show_popup_button?: boolean;
  popup_width?: string;
  popup_height?: string;
  locale?: string;
}

export default function TradingViewChart({
  symbol,
  height = 400,
  theme = 'light',
  interval = '1D',
  hide_top_toolbar = false,
  hide_legend = false,
  allow_symbol_change = false,
  save_image = false,
  studies = [],
  show_popup_button = false,
  popup_width = '1000',
  popup_height = '650',
  locale = 'es',
}: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scriptLoaded, setScriptLoaded] = useState(false);

  useEffect(() => {
    if (!scriptLoaded || !containerRef.current || !window.TradingView) return;

    // Limpiar contenedor anterior
    containerRef.current.innerHTML = '';

    // Crear widget de TradingView
    const widget = new window.TradingView.widget({
      autosize: true,
      symbol: symbol.toUpperCase(),
      interval: interval,
      timezone: 'America/New_York',
      theme: theme,
      style: '1', // 1 = candlesticks, 2 = hollow candles, etc.
      locale: locale,
      toolbar_bg: theme === 'dark' ? '#1a1a1a' : '#ffffff',
      enable_publishing: false,
      allow_symbol_change: allow_symbol_change,
      hide_top_toolbar: hide_top_toolbar,
      hide_legend: hide_legend,
      save_image: save_image,
      container_id: containerRef.current.id,
      studies: studies,
      show_popup_button: show_popup_button,
      popup_width: popup_width,
      popup_height: popup_height,
      // Brutalist styling
      gridColor: theme === 'dark' ? '#333333' : '#000000',
      scalePosition: 'right',
      scaleMode: 'Normal',
      fontFamily: 'Arial Black, sans-serif',
      fontSize: 10,
      // Override colors for brutalist theme
      overrides: {
        'paneProperties.background': theme === 'dark' ? '#000000' : '#ffffff',
        'paneProperties.backgroundType': 'solid',
        'paneProperties.vertGridProperties.color': theme === 'dark' ? '#333333' : '#000000',
        'paneProperties.horzGridProperties.color': theme === 'dark' ? '#333333' : '#000000',
        'symbolWatermarkProperties.transparency': 90,
        'scalesProperties.textColor': theme === 'dark' ? '#ffffff' : '#000000',
        // Candle colors - brutalist
        'mainSeriesProperties.candleStyle.upColor': '#16a34a',
        'mainSeriesProperties.candleStyle.downColor': '#dc2626',
        'mainSeriesProperties.candleStyle.borderUpColor': '#000000',
        'mainSeriesProperties.candleStyle.borderDownColor': '#000000',
        'mainSeriesProperties.candleStyle.wickUpColor': '#16a34a',
        'mainSeriesProperties.candleStyle.wickDownColor': '#dc2626',
        // Volume colors
        'volumePaneSize': 'medium',
        'paneProperties.legendProperties.showLegend': !hide_legend,
        'paneProperties.legendProperties.showStudyArguments': true,
        'paneProperties.legendProperties.showStudyTitles': true,
        'paneProperties.legendProperties.showStudyValues': true,
        'paneProperties.legendProperties.showSeriesTitle': true,
        'paneProperties.legendProperties.showSeriesOHLC': true,
      },
    });

    return () => {
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [scriptLoaded, symbol, interval, theme, studies, containerRef]);

  const containerId = `tradingview_${symbol}_${Date.now()}`;

  useEffect(() => {
    // Cargar script de TradingView dinámicamente
    if (typeof window !== 'undefined' && !window.TradingView) {
      const script = document.createElement('script');
      script.src = 'https://s3.tradingview.com/tv.js';
      script.async = true;
      script.onload = () => {
        setScriptLoaded(true);
      };
      script.onerror = () => {
        console.error('Failed to load TradingView script');
      };
      document.head.appendChild(script);

      return () => {
        // Cleanup: remover script si componente se desmonta
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
    <div className="relative w-full bg-white border-2 border-black" style={{ height }}>
      <div
        id={containerId}
        ref={containerRef}
        className="w-full h-full"
        style={{ minHeight: `${height}px` }}
      />
      {!scriptLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-white border-2 border-black">
          <div className="text-black text-sm font-black uppercase">
            Cargando gráfico TradingView...
          </div>
        </div>
      )}
    </div>
  );
}
