'use client';

import { useAppStore } from '@/store/app-store';
import AppShell from '@/components/AppShell';
import StocksView from '@/components/views/StocksView';
import StockDetailView from '@/components/views/StockDetailView';
import FindView from '@/components/views/FindView';
import WatchlistView from '@/components/views/WatchlistView';
import SettingsView from '@/components/views/SettingsView';

export default function Home() {
  const { activeTab, selectedSymbol, setSelectedSymbol } = useAppStore();

  if (selectedSymbol) {
    return (
      <AppShell
        showLiveToggle={false}
        onBack={() => setSelectedSymbol(null)}
      >
        <StockDetailView symbol={selectedSymbol} />
      </AppShell>
    );
  }

  const titles: Record<string, string> = {
    mkt: 'STOCKS',
    find: 'FIND',
    port: 'WATCHLIST',
    set: 'SET',
  };

  return (
    <AppShell title={titles[activeTab]}>
      {activeTab === 'mkt' && <StocksView />}
      {activeTab === 'find' && <FindView />}
      {activeTab === 'port' && <WatchlistView />}
      {activeTab === 'set' && <SettingsView />}
    </AppShell>
  );
}
