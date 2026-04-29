import { Link } from 'react-router-dom';

export function Logo({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <Link to="/marketingstudio" className="flex items-center gap-2 group">
      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-ms-cta to-ms-cta-2 grid place-items-center shadow-[0_4px_14px_-4px_hsl(var(--ms-cta)/0.6)]">
        <svg viewBox="0 0 24 24" className="w-4 h-4 text-white" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 18 L12 4 L20 18" />
          <path d="M8 14 L16 14" />
        </svg>
      </div>
      {!collapsed && (
        <div className="leading-tight">
          <div className="text-[11px] font-bold tracking-[0.14em] text-foreground">KORSOLA</div>
          <div className="text-[10px] font-semibold tracking-[0.18em] text-muted-foreground">.AI</div>
        </div>
      )}
    </Link>
  );
}
