'use client';

import { useAppStore } from '@/store/app-store';

export default function ModeToggle() {
  const { isBeginnerMode, setIsBeginnerMode } = useAppStore();

  return (
    <div className="flex border-2 border-white overflow-hidden">
      <button
        type="button"
        onClick={() => setIsBeginnerMode(true)}
        className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider border-r-2 border-white ${
          isBeginnerMode ? 'bg-white text-black' : 'bg-black text-white'
        }`}
      >
        PRINCIPIANTE
      </button>
      <button
        type="button"
        onClick={() => setIsBeginnerMode(false)}
        className={`px-3 py-1.5 text-[10px] font-black uppercase tracking-wider ${
          !isBeginnerMode ? 'bg-white text-black' : 'bg-black text-white'
        }`}
      >
        EXPERTO
      </button>
    </div>
  );
}
