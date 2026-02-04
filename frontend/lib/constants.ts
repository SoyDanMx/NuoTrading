export const COMPANY_NAMES: Record<string, string> = {
  AAPL: 'APPLE INC.',
  TSLA: 'TESLA MOTORS',
  NVDA: 'NVIDIA CORP',
  GOOGL: 'ALPHABET INC.',
  META: 'META PLATFORMS',
  MSFT: 'MICROSOFT CORP',
  AMZN: 'AMAZON.COM INC.',
  NFLX: 'NETFLIX INC.',
  SPY: 'S&P 500 ETF',
  SPX: 'S&P 500 INDEX',
};

export function getCompanyName(symbol: string): string {
  return COMPANY_NAMES[symbol.toUpperCase()] || `${symbol} INC.`;
}
