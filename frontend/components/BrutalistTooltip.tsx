'use client';

import { useState } from 'react';

interface BrutalistTooltipProps {
  children: React.ReactNode;
  content: string;
}

export default function BrutalistTooltip({ children, content }: BrutalistTooltipProps) {
  const [show, setShow] = useState(false);

  return (
    <div className="relative inline-block" onMouseEnter={() => setShow(true)} onMouseLeave={() => setShow(false)}>
      {children}
      {show && (
        <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 bg-white border-2 border-black p-2 max-w-[200px]">
          <div className="text-[9px] font-black uppercase text-black leading-tight">
            {content}
          </div>
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[8px] border-t-black border-l-transparent border-r-transparent" />
        </div>
      )}
    </div>
  );
}
