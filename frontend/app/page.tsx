'use client';

import { useState, useEffect } from 'react';

import { useAppStore } from '@/store/app-store';
import AppShell from '@/components/AppShell';
import StocksView from '@/components/views/StocksView';
import StockDetailView from '@/components/views/StockDetailView';
import FindView from '@/components/views/FindView';
import PortfolioView from '@/components/views/PortfolioView';
import SettingsView from '@/components/views/SettingsView';
import LandingView from '@/components/views/LandingView';

export default function Home() {
  const { activeTab, selectedSymbol, setSelectedSymbol, hasStarted, setHasStarted } = useAppStore();
  const [hasMounted, setHasMounted] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

  if (!hasMounted) {
    return <div className="bg-black min-h-screen" />; // Blank screen during hydration
  }

  if (!hasStarted) {
    return (
      <div className="bg-black min-h-screen px-6">
        <LandingView onStart={() => setHasStarted(true)} />
      </div>
    );
  }

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
    mkt: '', // No title for Home/Dashboard as it has a custom greeting
    find: 'Markets',
    port: 'Portfolio',
    set: 'Settings',
  };

  return (
    <AppShell title={titles[activeTab]}>
      {activeTab === 'mkt' && <StocksView />}
      {activeTab === 'find' && <FindView />}
      {activeTab === 'port' && <PortfolioView />}
      {activeTab === 'set' && <SettingsView />}
    </AppShell>
  );
}
