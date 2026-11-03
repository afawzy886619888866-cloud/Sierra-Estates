export function SierraMark({ className = 'h-9 w-9' }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <rect width="64" height="64" rx="14" className="fill-primary" />
      <path d="M8 46 L22 22 L30 36 L38 16 L56 46 Z" className="fill-[--gold]" />
      <path d="M38 16 L44 27 L32 27 Z" className="fill-primary-foreground opacity-70" />
      <circle cx="49" cy="17" r="4.5" className="fill-primary-foreground" />
    </svg>
  )
}

export function BrandHeader() {
  return (
    <div className="flex items-center gap-3">
      <SierraMark className="h-10 w-10 shrink-0" />
      <div className="leading-tight">
        <div className="text-lg font-extrabold tracking-tight">
          Sierra <span className="text-primary">Estates</span>
        </div>
        <div className="text-xs text-muted-foreground font-medium">
          Easy Listing — أداة الليستينج السريعة
        </div>
      </div>
    </div>
  )
}
