'use client';

import { Home, Search, Wallet, Settings, ChevronLeft } from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import ModeToggle from './ModeToggle';

const tabs = [
  { id: 'mkt' as const, label: 'Home', icon: Home },
  { id: 'find' as const, label: 'Markets', icon: Search },
  { id: 'port' as const, label: 'Portfolio', icon: Wallet },
  { id: 'set' as const, label: 'Settings', icon: Settings },
];

export default function AppShell({
  children,
  title,
  showLiveToggle = true,
  rightAction,
  onBack,
}: {
  children: React.ReactNode;
  title?: string;
  showLiveToggle?: boolean;
  rightAction?: React.ReactNode;
  onBack?: () => void;
}) {
  const { activeTab, setActiveTab, isConnected, setIsConnected } = useAppStore();

  return (
    <div className="min-h-screen bg-black text-white flex flex-col pb-24 safe-bottom font-sans">
      {/* Header - Glassmorphism */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-6 py-4 bg-black/60 backdrop-blur-xl border-b border-white/5 shrink-0">
        <div className="flex items-center gap-3">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="p-2 -ml-2 rounded-full hover:bg-white/10 transition-colors"
              aria-label="Volver"
            >
              <ChevronLeft className="w-6 h-6" />
            </button>
          ) : (
            <span className="font-serif text-2xl font-semibold tracking-tight text-white/90">Nuo</span>
          )}
        </div>
        {showLiveToggle && !onBack && (
          <div className="flex items-center gap-4">
            <ModeToggle />
            <div className="flex items-center gap-1 bg-white/5 p-1 rounded-full border border-white/10">
              <button
                type="button"
                onClick={() => setIsConnected(true)}
                className={`px-3 py-1 text-[10px] font-bold rounded-full transition-all ${
                  isConnected ? 'bg-white text-black shadow-lg shadow-white/10' : 'text-white/40'
                }`}
              >
                LIVE
              </button>
              <button
                type="button"
                onClick={() => setIsConnected(false)}
                className={`px-3 py-1 text-[10px] font-bold rounded-full transition-all ${
                  !isConnected ? 'bg-white text-black shadow-lg shadow-white/10' : 'text-white/40'
                }`}
              >
                DEMO
              </button>
            </div>
          </div>
        )}
        {rightAction}
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-auto px-6">
        {title && (
          <div className="pt-8 pb-4 animate-slide-up">
            <h1 className="font-serif text-4xl sm:text-5xl font-medium tracking-tight text-gradient">
              {title}
            </h1>
          </div>
        )}
        {children}
      </main>

      {/* Bottom navigation - Floating Glassmorphism */}
      <nav className="fixed bottom-6 left-6 right-6 h-20 bg-black/40 backdrop-blur-2xl border border-white/10 flex justify-around items-center px-4 safe-bottom z-50 rounded-[2rem] shadow-2xl shadow-black/50">
        {tabs.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`flex flex-col items-center gap-1.5 px-4 py-2 transition-all duration-300 ${
                isActive ? 'text-white scale-110' : 'text-white/30 hover:text-white/60'
              }`}
            >
              <div className={`p-1 rounded-xl transition-colors ${isActive ? 'bg-white/10' : ''}`}>
                <Icon className="w-6 h-6" strokeWidth={isActive ? 2.5 : 2} />
              </div>
              <span className={`text-[10px] font-medium tracking-wide ${isActive ? 'opacity-100' : 'opacity-0'}`}>
                {label}
              </span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
