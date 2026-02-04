/**
 * TradingView Custom Datafeed
 * 
 * Este es un ejemplo de cómo implementar un datafeed personalizado
 * para la TradingView Charting Library completa.
 * 
 * NOTA: Requiere descargar la Charting Library de TradingView
 * y tener una licencia comercial.
 * 
 * Referencia: https://www.tradingview.com/charting-library-docs/latest/api/
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface LibrarySymbolInfo {
  ticker: string;
  name: string;
  exchange: string;
  description: string;
  type: string;
  session: string;
  timezone: string;
  minmov: number;
  pricescale: number;
  has_intraday: boolean;
  has_weekly_and_monthly: boolean;
  supported_resolutions?: string[];
  volume_precision?: number;
  data_status?: string;
}

export interface Bar {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface DatafeedConfiguration {
  supported_resolutions: string[];
  supports_group_request: boolean;
  supports_marks: boolean;
  supports_search: boolean;
  supports_timescale_marks: boolean;
  supports_time: boolean;
}

/**
 * Custom Datafeed para TradingView Charting Library
 * 
 * Implementa IExternalDatafeed según la documentación:
 * https://www.tradingview.com/charting-library-docs/latest/api/interfaces/Datafeed.IExternalDatafeed/
 */
export class CustomDatafeed {
  private apiUrl: string;
  private configuration: DatafeedConfiguration;

  constructor(apiUrl: string = API_URL) {
    this.apiUrl = apiUrl;
    this.configuration = {
      supported_resolutions: ['1', '5', '15', '30', '60', '240', '1D', '1W', '1M'],
      supports_group_request: false,
      supports_marks: true,
      supports_search: true,
      supports_timescale_marks: false,
      supports_time: true,
    };
  }

  /**
   * onReady - Configurar datafeed cuando está listo
   */
  onReady(callback: (configuration: DatafeedConfiguration) => void): void {
    setTimeout(() => {
      callback(this.configuration);
    }, 0);
  }

  /**
   * searchSymbols - Buscar símbolos
   */
  async searchSymbols(
    userInput: string,
    exchange: string,
    symbolType: string,
    onResult: (symbols: LibrarySymbolInfo[]) => void
  ): Promise<void> {
    try {
      const response = await fetch(
        `${this.apiUrl}/api/v1/stocks/search?q=${encodeURIComponent(userInput)}`
      );
      
      if (!response.ok) {
        onResult([]);
        return;
      }

      const data = await response.json();
      const symbols: LibrarySymbolInfo[] = (data.symbols || []).map((s: any) => ({
        ticker: s.symbol,
        name: s.name || s.symbol,
        exchange: exchange || 'NASDAQ',
        description: `${s.name || s.symbol} - ${exchange || 'NASDAQ'}`,
        type: symbolType || 'stock',
        session: '0930-1600',
        timezone: 'America/New_York',
        minmov: 1,
        pricescale: 100,
        has_intraday: true,
        has_weekly_and_monthly: true,
        supported_resolutions: this.configuration.supported_resolutions,
        volume_precision: 0,
        data_status: 'streaming',
      }));

      onResult(symbols);
    } catch (error) {
      console.error('Error searching symbols:', error);
      onResult([]);
    }
  }

  /**
   * resolveSymbol - Resolver información de símbolo
   */
  async resolveSymbol(
    symbolName: string,
    onResolve: (symbolInfo: LibrarySymbolInfo) => void,
    onError: (reason: string) => void
  ): Promise<void> {
    try {
      // Obtener información del símbolo desde tu backend
      const response = await fetch(`${this.apiUrl}/api/v1/stocks/quote/${symbolName}`);
      
      if (!response.ok) {
        onError('Symbol not found');
        return;
      }

      const quote = await response.json();
      
      const symbolInfo: LibrarySymbolInfo = {
        ticker: symbolName.toUpperCase(),
        name: symbolName.toUpperCase(),
        exchange: 'NASDAQ',
        description: `${symbolName.toUpperCase()} - NASDAQ`,
        type: 'stock',
        session: '0930-1600',
        timezone: 'America/New_York',
        minmov: 1,
        pricescale: 100,
        has_intraday: true,
        has_weekly_and_monthly: true,
        supported_resolutions: this.configuration.supported_resolutions,
        volume_precision: 0,
        data_status: 'streaming',
      };

      onResolve(symbolInfo);
    } catch (error) {
      console.error('Error resolving symbol:', error);
      onError('Failed to resolve symbol');
    }
  }

  /**
   * getBars - Obtener barras históricas
   */
  async getBars(
    symbolInfo: LibrarySymbolInfo,
    resolution: string,
    periodParams: {
      from: number;
      to: number;
      firstDataRequest: boolean;
    },
    onResult: (bars: Bar[], meta: { noData: boolean }) => void,
    onError: (reason: string) => void
  ): Promise<void> {
    try {
      // Convertir resolución de TradingView a formato del backend
      const timeframeMap: Record<string, string> = {
        '1': '60',
        '5': '60',
        '15': '60',
        '30': '60',
        '60': '60',
        '240': 'D',
        '1D': 'D',
        '1W': 'D',
        '1M': 'D',
      };

      const backendTimeframe = timeframeMap[resolution] || 'D';
      const days = Math.ceil((periodParams.to - periodParams.from) / (24 * 60 * 60));

      const response = await fetch(
        `${this.apiUrl}/api/v1/market/ohlcv/${symbolInfo.ticker}?timeframe=${backendTimeframe}&days=${days}`
      );

      if (!response.ok) {
        onError('Failed to fetch bars');
        return;
      }

      const data = await response.json();
      const bars: Bar[] = (data.data || []).map((d: any) => ({
        time: d.time * 1000, // TradingView espera milisegundos
        open: d.open,
        high: d.high,
        low: d.low,
        close: d.close,
        volume: d.volume || 0,
      }));

      onResult(bars, { noData: bars.length === 0 });
    } catch (error) {
      console.error('Error fetching bars:', error);
      onError('Failed to fetch bars');
    }
  }

  /**
   * subscribeBars - Suscribirse a actualizaciones en tiempo real
   */
  subscribeBars(
    symbolInfo: LibrarySymbolInfo,
    resolution: string,
    onTick: (bar: Bar) => void,
    subscriberUID: string,
    onResetCacheNeededCallback: () => void
  ): void {
    // Implementar suscripción WebSocket aquí
    // Por ahora, usar polling como fallback
    const interval = setInterval(async () => {
      try {
        const response = await fetch(`${this.apiUrl}/api/v1/stocks/quote/${symbolInfo.ticker}`);
        if (response.ok) {
          const quote = await response.json();
          const now = Math.floor(Date.now() / 1000);
          const bar: Bar = {
            time: now * 1000,
            open: quote.current_price,
            high: quote.high || quote.current_price,
            low: quote.low || quote.current_price,
            close: quote.current_price,
            volume: 0,
          };
          onTick(bar);
        }
      } catch (error) {
        console.error('Error in subscribeBars:', error);
      }
    }, 5000); // Actualizar cada 5 segundos

    // Guardar intervalo para poder cancelarlo
    (this as any)[`interval_${subscriberUID}`] = interval;
  }

  /**
   * unsubscribeBars - Desuscribirse de actualizaciones
   */
  unsubscribeBars(subscriberUID: string): void {
    const interval = (this as any)[`interval_${subscriberUID}`];
    if (interval) {
      clearInterval(interval);
      delete (this as any)[`interval_${subscriberUID}`];
    }
  }
}
