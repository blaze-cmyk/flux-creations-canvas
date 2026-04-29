import { Link } from 'react-router-dom';

export function Logo({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <Link to="/marketingstudio" className="flex items-center gap-2.5 group">
      {/* Black tile with white mark */}
      <div className="w-9 h-9 rounded-xl bg-white grid place-items-center shrink-0">
        <svg viewBox="0 0 24 24" className="w-[18px] h-[18px] text-black" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M5 18 L12 5 L19 18" />
          <path d="M8.5 13 L15.5 13" />
        </svg>
      </div>
      {!collapsed && (
        <div className="leading-[1.05]">
          <div className="text-[11px] font-extrabold tracking-[0.12em] text-foreground">KORSOLA</div>
          <div className="text-[11px] font-extrabold tracking-[0.12em] text-foreground">.AI</div>
        </div>
      )}
    </Link>
  );
}
