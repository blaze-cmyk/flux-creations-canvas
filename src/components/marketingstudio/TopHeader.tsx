import { Menu, ArrowLeft, Gem } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function TopHeader({
  onMenu,
  showBack,
  title,
  rightSlot,
}: {
  onMenu?: () => void;
  showBack?: boolean;
  title?: string;
  rightSlot?: React.ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <header className="h-14 px-3 md:px-5 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-2 min-w-0">
        <button
          onClick={onMenu}
          className="md:hidden grid place-items-center w-9 h-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-ms-surface-2"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        {showBack && (
          <button
            onClick={() => navigate('/marketingstudio')}
            className="grid place-items-center w-9 h-9 rounded-md text-muted-foreground hover:text-foreground hover:bg-ms-surface-2"
            aria-label="Back"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
        )}
        {title && (
          <div className="text-sm font-semibold text-foreground truncate max-w-[40vw]">
            {title}
          </div>
        )}
      </div>

      <div className="flex items-center gap-2 md:gap-3">
        {rightSlot}
        <button className="hidden sm:flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-semibold text-foreground bg-transparent hover:bg-ms-surface-2 relative">
          <Gem className="w-3.5 h-3.5 text-ms-cta" />
          Pricing
          <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 text-[8px] font-bold px-1.5 py-px rounded-full bg-gradient-to-r from-ms-cta to-ms-cta-2 text-white whitespace-nowrap">
            30% OFF
          </span>
        </button>
        <button className="text-xs font-semibold text-foreground hover:opacity-80 px-2">
          Login
        </button>
        <button className="px-4 h-8 rounded-full text-xs font-bold text-black bg-lime-300 hover:brightness-105 transition-all">
          Sign up
        </button>
      </div>
    </header>
  );
}
