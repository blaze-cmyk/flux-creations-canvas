import { useLocation, useNavigate } from 'react-router-dom';
import { Image as ImageIcon, Film, Megaphone, Move3d } from 'lucide-react';
import { usePromptModeStore } from '@/store/promptModeStore';

function SeedanceIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <g clipPath="url(#clip0_seedance_nav)">
        <path d="M3.1544 12.1539L0.533203 12.8092V1.19824L3.1544 1.85354V12.1539Z" fill="currentColor" />
        <path d="M15.8225 12.8333L13.1963 13.4886V0.518555L15.8225 1.169V12.8333Z" fill="currentColor" />
        <path d="M7.31261 12.5083L4.69141 13.1636V6.32422L7.31261 6.97947V12.5083Z" fill="currentColor" />
        <path d="M9.02539 5.3096L11.6516 4.6543V11.4937L9.02539 10.8384V5.3096Z" fill="currentColor" />
      </g>
      <defs>
        <clipPath id="clip0_seedance_nav">
          <rect width="16" height="14" fill="currentColor" />
        </clipPath>
      </defs>
    </svg>
  );
}

export function PromptNavBar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { mode, setMode, videoSubMode, setVideoSubMode } = usePromptModeStore();

  const onImageRoute =
    pathname.startsWith('/create') ||
    pathname.startsWith('/image') ||
    pathname.startsWith('/generator');

  const items = [
    {
      key: 'image',
      label: 'Image',
      Icon: ImageIcon,
      active: onImageRoute && mode === 'image',
      onClick: () => { setMode('image'); if (!onImageRoute) navigate('/create'); },
    },
    {
      key: 'video',
      label: 'Video',
      Icon: Film,
      active: ((onImageRoute && mode === 'video') || pathname.startsWith('/video')) && videoSubMode !== 'motion-control' && videoSubMode !== 'seedance-2',
      onClick: () => {
        setMode('video');
        if (videoSubMode === 'motion-control' || videoSubMode === 'seedance-2') setVideoSubMode('text-to-video');
        if (!onImageRoute && !pathname.startsWith('/video')) navigate('/create');
      },
    },
    {
      key: 'motion',
      label: 'Motion Control',
      Icon: Move3d,
      active: ((onImageRoute && mode === 'video') || pathname.startsWith('/video')) && videoSubMode === 'motion-control',
      onClick: () => {
        setVideoSubMode('motion-control');
        if (!onImageRoute && !pathname.startsWith('/video')) navigate('/create');
      },
    },
    {
      key: 'seedance',
      label: 'Seedance 2.0',
      Icon: SeedanceIcon,
      active: ((onImageRoute && mode === 'video') || pathname.startsWith('/video')) && videoSubMode === 'seedance-2',
      onClick: () => {
        setVideoSubMode('seedance-2' as any);
        if (!onImageRoute && !pathname.startsWith('/video')) navigate('/create');
      },
    },
    {
      key: 'marketing',
      label: 'Marketing Studio',
      Icon: Megaphone,
      active: onImageRoute && mode === 'marketing',
      onClick: () => { setMode('marketing'); if (!onImageRoute) navigate('/create'); },
    },
  ];

  return (
    <div
      className="w-full max-w-[1100px] mx-auto mb-2 flex justify-center"
      style={{ fontFamily: 'Montserrat, system-ui, sans-serif' }}
    >
      <div className="ms-glass rounded-full p-1 flex items-center gap-1">
        {items.map(({ key, label, Icon, active, onClick }) => {
          const cls = `group inline-flex items-center gap-2 px-3 sm:px-4 h-9 rounded-full text-[13px] font-semibold transition-all whitespace-nowrap ${
            active
              ? 'bg-white text-black shadow-[0_4px_14px_-4px_rgba(0,0,0,0.6)]'
              : 'text-white/75 hover:text-white hover:bg-white/5'
          }`;
          return (
            <button key={key} onClick={onClick} className={cls}>
              <Icon className="w-4 h-4" strokeWidth={1.75} />
              <span className="hidden sm:inline">{label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
