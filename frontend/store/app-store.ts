import { create } from 'zustand';

interface AppState {
  isConnected: boolean;
  setIsConnected: (connected: boolean) => void;
  activeTab: 'mkt' | 'find' | 'port' | 'set';
  setActiveTab: (tab: 'mkt' | 'find' | 'port' | 'set') => void;
  selectedSymbol: string | null;
  setSelectedSymbol: (symbol: string | null) => void;
  watchlist: string[];
  setWatchlist: (symbols: string[]) => void;
  addToWatchlist: (symbol: string) => void;
  removeFromWatchlist: (symbol: string) => void;
  isBeginnerMode: boolean;
  setIsBeginnerMode: (beginner: boolean) => void;
}

const DEFAULT_WATCHLIST = ['AAPL', 'TSLA', 'NVDA', 'GOOGL', 'META', 'MSFT', 'AMZN', 'NFLX'];

// Load from localStorage on init
const loadBeginnerMode = (): boolean => {
  if (typeof window === 'undefined') return true;
  const saved = localStorage.getItem('nuotrade-beginner-mode');
  return saved !== null ? saved === 'true' : true; // Default: true
};

const loadWatchlist = (): string[] => {
  if (typeof window === 'undefined') return DEFAULT_WATCHLIST;
  const saved = localStorage.getItem('nuotrade-watchlist');
  return saved ? JSON.parse(saved) : DEFAULT_WATCHLIST;
};

export const useAppStore = create<AppState>((set) => ({
  isConnected: false,
  setIsConnected: (connected) => set({ isConnected: connected }),
  activeTab: 'mkt',
  setActiveTab: (tab) => set({ activeTab: tab }),
  selectedSymbol: null,
  setSelectedSymbol: (symbol) => set({ selectedSymbol: symbol }),
  watchlist: loadWatchlist(),
  setWatchlist: (symbols) => {
    set({ watchlist: symbols });
    if (typeof window !== 'undefined') {
      localStorage.setItem('nuotrade-watchlist', JSON.stringify(symbols));
    }
  },
  addToWatchlist: (symbol) =>
    set((s) => {
      const updated = s.watchlist.includes(symbol) ? s.watchlist : [...s.watchlist, symbol.toUpperCase()];
      if (typeof window !== 'undefined') {
        localStorage.setItem('nuotrade-watchlist', JSON.stringify(updated));
      }
      return { watchlist: updated };
    }),
  removeFromWatchlist: (symbol) =>
    set((s) => {
      const updated = s.watchlist.filter((t) => t !== symbol);
      if (typeof window !== 'undefined') {
        localStorage.setItem('nuotrade-watchlist', JSON.stringify(updated));
      }
      return { watchlist: updated };
    }),
  isBeginnerMode: loadBeginnerMode(),
  setIsBeginnerMode: (beginner) => {
    set({ isBeginnerMode: beginner });
    if (typeof window !== 'undefined') {
      localStorage.setItem('nuotrade-beginner-mode', String(beginner));
    }
  },
}));
