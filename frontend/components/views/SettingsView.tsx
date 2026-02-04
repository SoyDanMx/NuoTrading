'use client';

export default function SettingsView() {
  return (
    <div className="px-4 space-y-6 pb-4">
      <h2 className="brutal-text text-sm text-white">CONFIGURACIÓN</h2>
      <div className="bg-white border-2 border-black p-4 space-y-3">
        <div className="flex justify-between items-center border-b-2 border-black pb-2">
          <span className="text-sm font-black uppercase text-black">NOTIFICACIONES</span>
          <span className="text-[10px] font-black uppercase text-black/60">PRÓXIMAMENTE</span>
        </div>
        <div className="flex justify-between items-center border-b-2 border-black pb-2">
          <span className="text-sm font-black uppercase text-black">TEMA</span>
          <span className="text-[10px] font-black uppercase text-black/60">OSCURO</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-sm font-black uppercase text-black">API FINNHUB</span>
          <span className="text-[10px] font-black uppercase text-[#22c55e]">CONECTADO</span>
        </div>
      </div>
      <div className="border-t-2 border-white pt-4">
        <p className="text-[10px] font-black uppercase text-white/60 tracking-wider text-center">
          SYSTEM.V1 • NUO TRADE • {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}
