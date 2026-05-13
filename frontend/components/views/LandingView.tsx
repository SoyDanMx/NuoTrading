'use client';

import { ArrowRight } from 'lucide-react';

export default function LandingView({ onStart }: { onStart: () => void }) {
  return (
    <div className="min-h-[80vh] flex flex-col justify-between py-12 animate-slide-up">
      <div className="space-y-12">
        {/* Abstract Logo / Icon */}
        <div className="w-24 h-24 mx-auto relative group">
          <div className="absolute inset-0 bg-white/10 blur-2xl rounded-full group-hover:bg-blue-500/20 transition-colors duration-1000" />
          <div className="relative w-full h-full bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center backdrop-blur-xl">
            <div className="grid grid-cols-3 gap-1">
              {[...Array(9)].map((_, i) => (
                <div key={i} className={`w-2 h-2 rounded-full ${i === 4 ? 'bg-white' : 'bg-white/20'}`} />
              ))}
            </div>
          </div>
        </div>

        {/* Hero Text */}
        <div className="space-y-6">
          <h1 className="font-serif text-7xl sm:text-8xl font-medium leading-[0.9] tracking-tighter">
            Smart <br />
            Finance <br />
            Starts Here
          </h1>
          <p className="text-white/40 text-lg leading-relaxed max-w-[280px]">
            No jargon. No guesswork. Just easy, reliable tools to grow your money — one step at a time.
          </p>
        </div>
      </div>

      {/* Buttons */}
      <div className="space-y-4">
        <button 
          onClick={onStart}
          className="w-full h-16 bg-white text-black font-bold rounded-3xl shadow-2xl shadow-white/10 hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2"
        >
          Get Started <ArrowRight className="w-5 h-5" />
        </button>
        <button className="w-full h-16 bg-white/5 text-white font-bold rounded-3xl border border-white/10 hover:bg-white/10 transition-all">
          Log In
        </button>
      </div>
    </div>
  );
}
