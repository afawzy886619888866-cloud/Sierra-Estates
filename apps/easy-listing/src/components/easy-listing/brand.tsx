export function SierraMark({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <div className={`relative flex items-center justify-center rounded-xl bg-gradient-to-br from-[#0c1322] to-[#002b4b] border border-[rgba(212,175,55,0.4)] p-1.5 shadow-[0_4px_16px_rgba(200,150,26,0.2)] ${className}`}>
      <svg viewBox="0 0 64 64" className="w-full h-full" aria-hidden="true">
        <path d="M32 4 L56 14 L56 34 C56 48 32 60 32 60 C32 60 8 48 8 34 L8 14 Z" fill="none" stroke="#e9c176" strokeWidth="2.5" />
        <path d="M16 44 L26 24 L32 34 L38 18 L48 44 Z" fill="#c8961a" opacity="0.95" />
        <circle cx="38" cy="18" r="3" fill="#ffffff" />
      </svg>
    </div>
  )
}

export function BrandHeader() {
  return (
    <div className="flex items-center gap-3">
      <SierraMark className="h-10 w-10 shrink-0" />
      <div className="leading-tight">
        <div className="flex items-center gap-2">
          <span className="text-lg font-black tracking-wide text-white">
            Sierra <span className="text-[#e9c176]">Estates</span>
          </span>
          <span className="rounded-full bg-[rgba(200,150,26,0.18)] border border-[rgba(212,175,55,0.4)] px-2 py-0.5 text-[10px] font-bold text-[#e9c176]">
            HYOUZ STUDIO
          </span>
        </div>
        <div className="text-[11px] text-[#94a3b8] font-medium flex items-center gap-1.5">
          <span>بوابة الليستينج وتوثيق الأونرز الفاخرة</span>
          <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-emerald-400/90 text-[10px]">مربوط مع Supabase والشيت والخريطة</span>
        </div>
      </div>
    </div>
  )
}
