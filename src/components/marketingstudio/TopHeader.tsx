import { Bell, Folder, Rocket, Menu, ArrowLeft } from 'lucide-react';
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
        <button className="hidden sm:flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-semibold text-foreground bg-ms-surface-2 hover:bg-ms-border border border-ms-border relative">
          <Rocket className="w-3.5 h-3.5" />
          Upgrade
          <span className="absolute -bottom-1 -right-1 text-[9px] font-bold px-1.5 py-px rounded-full bg-gradient-to-r from-ms-cta to-ms-cta-2 text-white">
            30% OFF
          </span>
        </button>
        <button className="grid place-items-center w-8 h-8 rounded-full bg-ms-surface-2 hover:bg-ms-border text-muted-foreground border border-ms-border">
          <Bell className="w-4 h-4" />
        </button>
        <button className="hidden sm:flex items-center gap-1.5 px-3 h-8 rounded-full text-xs font-semibold text-foreground bg-ms-surface-2 hover:bg-ms-border border border-ms-border">
          <span className="w-4 h-4 rounded-sm bg-emerald-500/30 border border-emerald-500/60" />
          Assets
        </button>
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-yellow-300 to-lime-300" />
      </div>
    </header>
  );
}
