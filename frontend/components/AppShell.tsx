'use client';

import { Activity, Search, LayoutGrid, Settings } from 'lucide-react';
import { useAppStore } from '@/store/app-store';
import ModeToggle from './ModeToggle';

const tabs = [
  { id: 'mkt' as const, label: 'MKT', icon: Activity },
  { id: 'find' as const, label: 'FIND', icon: Search },
  { id: 'port' as const, label: 'PORT', icon: LayoutGrid },
  { id: 'set' as const, label: 'SET', icon: Settings },
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
    <div className="min-h-screen bg-black text-white flex flex-col pb-20 safe-bottom">
      {/* Header - Sticky */}
      <header className="sticky top-0 z-40 flex items-center justify-between px-4 py-3 border-b-2 border-white bg-black shrink-0">
        <div className="flex items-center gap-3">
          {onBack ? (
            <button
              type="button"
              onClick={onBack}
              className="p-1 -ml-1 hover:bg-white/10"
              aria-label="Volver"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                <path d="M19 12H5M12 19l-7-7 7-7" />
              </svg>
            </button>
          ) : (
            <span className="text-xs font-black uppercase tracking-[0.2em] text-white">SYSTEM.V1</span>
          )}
        </div>
        {showLiveToggle && !onBack && (
          <div className="flex items-center gap-2">
            <ModeToggle />
            <div className="flex border-2 border-white overflow-hidden">
              <button
                type="button"
                onClick={() => setIsConnected(true)}
                className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider border-r-2 border-white ${
                  isConnected ? 'bg-white text-black' : 'bg-black text-white'
                }`}
              >
                LIVE
              </button>
              <button
                type="button"
                onClick={() => setIsConnected(false)}
                className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${
                  !isConnected ? 'bg-white text-black' : 'bg-black text-white'
                }`}
              >
                OFFLINE
              </button>
            </div>
          </div>
        )}
        {rightAction}
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-auto bg-black">
        {title && (
          <h1 className="brutal-title text-3xl sm:text-4xl px-4 pt-6 pb-3 text-white">
            {title}
          </h1>
        )}
        {children}
      </main>

      {/* Bottom navigation - Sticky */}
      <nav className="fixed bottom-0 left-0 right-0 bg-black border-t-2 border-white flex justify-around items-center py-2 safe-bottom z-50">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            className={`flex flex-col items-center gap-0.5 px-4 py-1 border-2 border-transparent ${
              activeTab === id ? 'bg-white text-black border-white' : 'text-white'
            }`}
          >
            <Icon className="w-5 h-5" strokeWidth={3} />
            <span className="text-[10px] font-black uppercase tracking-wider">{label}</span>
          </button>
        ))}
      </nav>
    </div>
  );
}
