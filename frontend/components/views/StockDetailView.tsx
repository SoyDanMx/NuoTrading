'use client';

import { useEffect, useState } from 'react';
import { useAppStore } from '@/store/app-store';
import { getCompanyName } from '@/lib/constants';
import LineChart from '../LineChart';
import CandlestickChart from '../CandlestickChart';
import TradingViewChart from '../TradingViewChart';
import BrutalistGauge from '../BrutalistGauge';
import BrutalistIndicatorBar from '../BrutalistIndicatorBar';
import EnhancedIndicatorBar from '../EnhancedIndicatorBar';
import AdvancedIndicators from '../AdvancedIndicators';
import StockIcon from '../StockIcon';
import Disclaimer from '../Disclaimer';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

type Timeframe = '1D' | '1W' | '1M' | '1Y';

const TIMEFRAMES: { id: Timeframe; resolution: string; days: number }[] = [
  { id: '1D', resolution: '60', days: 1 },
  { id: '1W', resolution: 'D', days: 7 },
  { id: '1M', resolution: 'D', days: 30 },
  { id: '1Y', resolution: 'D', days: 365 },
];

interface Quote {
  symbol: string;
  current_price: number;
  percent_change: number;
  change: number;
  high: number;
  low: number;
  open: number;
  previous_close: number;
  is_simulated?: boolean;
}

interface Analysis {
  symbol: string;
  quote: Quote;
  indicators: {
    rsi: number;
    macd: { is_positive: boolean; histogram: number };
    volume: { ratio: number };
    moving_averages: { sma_20: number; sma_50: number; trend: string };
    support_resistance?: {
      support_level: number;
      resistance_level: number;
      current_price: number;
      support_distance_pct: number;
      resistance_distance_pct: number;
      near_support: boolean;
      near_resistance: boolean;
      signal: string;
    };
    divergence?: {
      detected: boolean;
      type: string | null;
      strength: number;
    };
    fibonacci?: {
      levels: Record<string, number>;
      swing_high: number;
      swing_low: number;
      current_price: number;
      current_level: string | null;
      trend: string;
    };
  };
  vix: { value: number; risk_level: string };
  recommendation: {
    action: string;
    normalized_score?: number;
    breakdown?: Array<{ label: string; value: number; contribution: number }>;
    score: number;
    color: string;
    confidence: string;
    signals: string[];
  };
}

export default function StockDetailView({ symbol }: { symbol: string }) {
  const { setSelectedSymbol, addToWatchlist, watchlist, isBeginnerMode } = useAppStore();
  const [quote, setQuote] = useState<Quote | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [timeframe, setTimeframe] = useState<Timeframe>('1D');
  const [chartData, setChartData] = useState<{ time: number; value: number }[]>([]);
  const [candlestickData, setCandlestickData] = useState<{ time: number; open: number; high: number; low: number; close: number }[]>([]);
  const [chartType, setChartType] = useState<'line' | 'candlestick' | 'tradingview'>('line');
  const [loading, setLoading] = useState(true);
  const inWatchlist = watchlist.includes(symbol.toUpperCase());

  const REFRESH_MS = 30000;

  useEffect(() => {
    async function fetchData() {
      try {
        const [quoteRes, analysisRes] = await Promise.all([
          fetch(`${API_URL}/api/v1/stocks/quote/${symbol}`),
          fetch(`${API_URL}/api/v1/stocks/analysis/${symbol}`),
        ]);
        if (quoteRes.ok) setQuote(await quoteRes.json());
        if (analysisRes.ok) setAnalysis(await analysisRes.json());
      } catch {
        setQuote(null);
        setAnalysis(null);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
    const t = setInterval(fetchData, REFRESH_MS);
    return () => clearInterval(t);
  }, [symbol]);

  useEffect(() => {
    async function fetchChart() {
      const tf = TIMEFRAMES.find((t) => t.id === timeframe);
      if (!tf) return;
      try {
        const res = await fetch(
          `${API_URL}/api/v1/market/ohlcv/${symbol}?timeframe=${tf.resolution}&days=${tf.days}`
        );
        if (!res.ok) return;
        const { data } = await res.json();
        if (Array.isArray(data)) {
          // Line chart data
          setChartData(data.map((d: { time: number; close: number }) => ({ time: d.time, value: d.close })));
          // Candlestick data
          setCandlestickData(
            data.map((d: { time: number; open: number; high: number; low: number; close: number }) => ({
              time: d.time,
              open: d.open || d.close,
              high: d.high || d.close,
              low: d.low || d.close,
              close: d.close,
            }))
          );
        }
      } catch {
        setChartData([]);
        setCandlestickData([]);
      }
    }
    fetchChart();
  }, [symbol, timeframe]);

  const percentChange = quote?.percent_change ?? 0;
  const positive = percentChange >= 0;
  const chartColor = positive ? '#22c55e' : '#ef4444';

  const now = new Date();
  const lastUpdated = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')} EST`;

  // BEGINNER MODE VIEW
  if (isBeginnerMode) {
    // Show loading state if analysis is not ready
    if (!analysis) {
      return (
        <div className="px-4 space-y-4 pb-4">
          <div className="bg-white border-2 border-black p-4 text-black text-center">
            <div className="brutal-text text-lg mb-2">CARGANDO ANÁLISIS...</div>
            <div className="text-[10px] font-black uppercase text-black/60">
              Obteniendo datos de {symbol}
            </div>
          </div>
        </div>
      );
    }

    const rec = analysis.recommendation;
    const ind = analysis.indicators;

    return (
      <div className="px-4 space-y-4 pb-4">
        {quote?.is_simulated && (
          <div className="bg-white border-2 border-black p-3 text-black text-xs font-black uppercase">
            Datos simulados. Revisa FINNHUB_API_KEY en .env
          </div>
        )}

        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-3">
            <StockIcon symbol={symbol} size="lg" showTrend={true} trend={positive ? 'up' : 'down'} />
            <h2 className="brutal-title text-3xl text-white">{symbol}</h2>
          </div>
          <button
            type="button"
            onClick={() => addToWatchlist(symbol)}
            className="bg-white text-black text-[10px] font-black uppercase px-3 py-2 border-2 border-white hover:bg-black hover:text-white disabled:opacity-50"
            disabled={inWatchlist}
          >
            + ADD TO LIST
          </button>
        </div>
        <p className="text-[10px] font-black uppercase text-white/60 -mt-2">
          {getCompanyName(symbol)} • NASDAQ
        </p>

        {/* Price card */}
        <div className="bg-white border-2 border-black p-4 text-black">
          <div className="flex justify-between items-start mb-2">
            <span className="brutal-title text-3xl">
              {quote?.current_price?.toFixed(2) ?? '—'} USD
            </span>
            <span className="text-[10px] font-black uppercase text-black/60">TODAY</span>
          </div>
          <div
            className={`brutal-text text-base flex items-center gap-1 ${
              positive ? 'text-[#22c55e]' : 'text-[#ef4444]'
            }`}
          >
            {positive ? '▲' : '▼'} {quote?.change?.toFixed(2) ?? '—'} {percentChange.toFixed(2)}%
          </div>
        </div>

        {/* Signal Gauge - Principiante */}
        <BrutalistGauge
          score={rec.normalized_score ?? 50}
          label={symbol}
          showBreakdown={true}
          breakdown={rec.breakdown || []}
        />

        {/* Key Indicators - Principiante */}
        <div className="space-y-3">
          <h3 className="brutal-text text-sm text-white border-b-2 border-white pb-2">
            INDICADORES CLAVE
          </h3>

          <BrutalistIndicatorBar
            label="RSI"
            explanation="¿Está barato o caro? <30 = barato (comprar), >70 = caro (vender)"
            value={ind.rsi}
            min={0}
            max={100}
            positiveThreshold={30}
            negativeThreshold={70}
            higherIsBetter={false}
            unit="%"
            showTooltip={true}
          />

          <BrutalistIndicatorBar
            label="MACD"
            explanation="Tendencia: positivo = subiendo (bueno), negativo = bajando"
            value={ind.macd.histogram}
            min={-10}
            max={10}
            positiveThreshold={0}
            unit=""
            showTooltip={true}
          />

          <BrutalistIndicatorBar
            label="MEDIAS MÓVILES"
            explanation="Dirección del precio (alcista = bueno)"
            value={ind.moving_averages.trend === 'bullish' ? 1 : -1}
            min={-1}
            max={1}
            positiveThreshold={0}
            unit=""
            showTooltip={true}
          />

          <BrutalistIndicatorBar
            label="VOLUMEN"
            explanation="Interés: >1.5x = mucho interés (bueno), <0.7x = poco interés"
            value={ind.volume.ratio}
            min={0}
            max={3}
            positiveThreshold={1.5}
            negativeThreshold={0.7}
            unit="x"
            showTooltip={true}
          />

          <BrutalistIndicatorBar
            label="VIX"
            explanation="Miedo del mercado (bajo = calma, alto = riesgo)"
            value={analysis.vix.value}
            min={0}
            max={50}
            positiveThreshold={20}
            negativeThreshold={30}
            higherIsBetter={false}
            unit=""
            showTooltip={true}
          />
        </div>

        {/* Simple Chart */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h3 className="brutal-text text-sm text-white">GRÁFICO DE PRECIO</h3>
            {/* Chart type toggle */}
            <div className="flex border-2 border-white overflow-hidden">
              <button
                type="button"
                onClick={() => setChartType('line')}
                className={`px-3 py-1.5 text-[10px] font-black uppercase border-r-2 border-white ${
                  chartType === 'line' ? 'bg-white text-black' : 'bg-black text-white'
                }`}
              >
                LÍNEA
              </button>
              <button
                type="button"
                onClick={() => setChartType('candlestick')}
                className={`px-3 py-1.5 text-[10px] font-black uppercase border-r-2 border-white ${
                  chartType === 'candlestick' ? 'bg-white text-black' : 'bg-black text-white'
                }`}
              >
                VELAS
              </button>
              <button
                type="button"
                onClick={() => setChartType('tradingview')}
                className={`px-3 py-1.5 text-[10px] font-black uppercase ${
                  chartType === 'tradingview' ? 'bg-white text-black' : 'bg-black text-white'
                }`}
              >
                TRADINGVIEW
              </button>
            </div>
          </div>
          <div className="flex gap-2 mb-3 border-2 border-white p-1">
            {TIMEFRAMES.map((tf) => (
              <button
                key={tf.id}
                type="button"
                onClick={() => setTimeframe(tf.id)}
                className={`px-3 py-1.5 text-[10px] font-black uppercase border-2 ${
                  timeframe === tf.id
                    ? 'bg-white text-black border-white'
                    : 'bg-black text-white border-white hover:bg-white hover:text-black'
                }`}
              >
                {tf.id}
              </button>
            ))}
          </div>
          <div className="bg-white border-2 border-black p-3 min-h-[260px]">
          {chartType === 'tradingview' ? (
            <TradingViewChart
              symbol={symbol}
              height={260}
              theme="light"
              interval={timeframe === '1D' ? '60' : timeframe === '1W' ? '1D' : timeframe === '1M' ? '1D' : '1W'}
              hide_top_toolbar={false}
              allow_symbol_change={false}
              studies={['RSI@tv-basicstudies', 'MACD@tv-basicstudies']}
              locale="es"
            />
            ) : chartType === 'line' && chartData.length ? (
              <LineChart data={chartData} color={chartColor} height={260} />
            ) : chartType === 'candlestick' && candlestickData.length ? (
              <CandlestickChart data={candlestickData} height={260} />
            ) : (
              <div className="h-[260px] flex items-center justify-center text-black text-sm font-black uppercase border-2 border-black">
                Cargando datos…
              </div>
            )}
          </div>
        </div>

        {/* Advanced Indicators - Collapsible */}
        <AdvancedIndicators
          supportResistance={ind.support_resistance}
          divergence={ind.divergence}
          fibonacci={ind.fibonacci}
          isBeginnerMode={isBeginnerMode}
        />

        {/* Disclaimer for beginners */}
        <Disclaimer />
      </div>
    );
  }

  // Loading state for beginner mode
  if (isBeginnerMode && !analysis) {
    return (
      <div className="px-4 space-y-4 pb-4">
        <div className="bg-white border-2 border-black p-4 text-black text-center">
          <div className="brutal-text text-lg mb-2">CARGANDO ANÁLISIS...</div>
          <div className="text-[10px] font-black uppercase text-black/60">
            Obteniendo datos de {symbol}
          </div>
        </div>
      </div>
    );
  }

  // EXPERT MODE VIEW (existing design)
  return (
    <div className="px-4 space-y-4 pb-4">
      {quote?.is_simulated && (
        <div className="bg-white border-2 border-black p-3 text-black text-xs font-black uppercase">
          Datos simulados. Revisa FINNHUB_API_KEY en .env
        </div>
      )}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <StockIcon symbol={symbol} size="lg" showTrend={true} trend={positive ? 'up' : 'down'} />
          <h2 className="brutal-title text-3xl text-white">{symbol}</h2>
        </div>
        <button
          type="button"
          onClick={() => addToWatchlist(symbol)}
          className="bg-white text-black text-[10px] font-black uppercase px-3 py-2 border-2 border-white hover:bg-black hover:text-white disabled:opacity-50"
          disabled={inWatchlist}
        >
          + ADD TO LIST
        </button>
      </div>
      <p className="text-[10px] font-black uppercase text-white/60 -mt-2">
        {getCompanyName(symbol)} • NASDAQ
      </p>

      {/* Price card */}
      <div className="bg-white border-2 border-black p-4 text-black">
        <div className="flex justify-between items-start mb-2">
          <span className="brutal-title text-3xl">
            {quote?.current_price?.toFixed(2) ?? '—'} USD
          </span>
          <span className="text-[10px] font-black uppercase text-black/60">TODAY</span>
        </div>
        <div
          className={`brutal-text text-base flex items-center gap-1 ${
            positive ? 'text-[#22c55e]' : 'text-[#ef4444]'
          }`}
        >
          {positive ? '▼' : '▼'} {quote?.change?.toFixed(2) ?? '—'} {percentChange.toFixed(2)}%
        </div>
        <div className="text-[10px] font-black uppercase text-black/60 mt-3 border-t-2 border-black pt-2">
          LAST UPDATED {lastUpdated}
        </div>
      </div>

      {/* Price chart */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <h3 className="brutal-text text-sm text-white">PRICE CHART</h3>
          {/* Chart type toggle */}
          <div className="flex border-2 border-white overflow-hidden">
            <button
              type="button"
              onClick={() => setChartType('line')}
              className={`px-3 py-1.5 text-[10px] font-black uppercase border-r-2 border-white ${
                chartType === 'line' ? 'bg-white text-black' : 'bg-black text-white'
              }`}
            >
              LÍNEA
            </button>
            <button
              type="button"
              onClick={() => setChartType('candlestick')}
              className={`px-3 py-1.5 text-[10px] font-black uppercase border-r-2 border-white ${
                chartType === 'candlestick' ? 'bg-white text-black' : 'bg-black text-white'
              }`}
            >
              VELAS
            </button>
            <button
              type="button"
              onClick={() => setChartType('tradingview')}
              className={`px-3 py-1.5 text-[10px] font-black uppercase ${
                chartType === 'tradingview' ? 'bg-white text-black' : 'bg-black text-white'
              }`}
            >
              TRADINGVIEW
            </button>
          </div>
        </div>
        <div className="flex gap-2 mb-3 border-2 border-white p-1">
          {TIMEFRAMES.map((tf) => (
            <button
              key={tf.id}
              type="button"
              onClick={() => setTimeframe(tf.id)}
              className={`px-3 py-1.5 text-[10px] font-black uppercase border-2 ${
                timeframe === tf.id
                  ? 'bg-white text-black border-white'
                  : 'bg-black text-white border-white hover:bg-white hover:text-black'
              }`}
            >
              {tf.id}
            </button>
          ))}
        </div>
        <div className="bg-white border-2 border-black p-3 min-h-[260px]">
          {chartType === 'tradingview' ? (
            <TradingViewChart
              symbol={symbol}
              height={260}
              theme="light"
              interval={timeframe === '1D' ? '60' : timeframe === '1W' ? '1D' : timeframe === '1M' ? '1D' : '1D'}
              hide_top_toolbar={false}
              allow_symbol_change={false}
              studies={['RSI@tv-basicstudies', 'MACD@tv-basicstudies']}
              locale="es"
            />
          ) : chartType === 'line' && chartData.length ? (
            <LineChart data={chartData} color={chartColor} height={260} />
          ) : chartType === 'candlestick' && candlestickData.length ? (
            <CandlestickChart data={candlestickData} height={260} />
          ) : (
            <div className="h-[260px] flex items-center justify-center text-black text-sm font-black uppercase border-2 border-black">
              Cargando datos…
            </div>
          )}
        </div>
      </div>

      {/* Expert indicators - TODO: Add detailed technical view */}
      {analysis && (
        <div className="bg-white border-2 border-black p-4 text-black space-y-3">
          <div className="brutal-text text-sm border-b-2 border-black pb-2">
            ANÁLISIS TÉCNICO
          </div>
          <div className="grid grid-cols-2 gap-3 text-[10px] font-black uppercase">
            <div>
              <span className="text-black/60">RSI:</span> {analysis.indicators.rsi.toFixed(1)}
            </div>
            <div>
              <span className="text-black/60">MACD:</span>{' '}
              {analysis.indicators.macd.is_positive ? 'POSITIVO' : 'NEGATIVO'}
            </div>
            <div>
              <span className="text-black/60">VOL:</span> {analysis.indicators.volume.ratio.toFixed(2)}x
            </div>
            <div>
              <span className="text-black/60">VIX:</span> {analysis.vix.value.toFixed(1)}
            </div>
          </div>
          {analysis.recommendation && (
            <div className="border-t-2 border-black pt-3">
              <div className={`brutal-text text-base ${
                analysis.recommendation.color === 'green' ? 'text-[#22c55e]' :
                analysis.recommendation.color === 'red' ? 'text-[#ef4444]' : 'text-black'
              }`}>
                {analysis.recommendation.action}
              </div>
              <div className="text-[9px] font-black uppercase text-black/60 mt-1">
                SCORE: {analysis.recommendation.score} | CONFIANZA: {analysis.recommendation.confidence}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Disclaimer */}
      <Disclaimer />
    </div>
  );
}
