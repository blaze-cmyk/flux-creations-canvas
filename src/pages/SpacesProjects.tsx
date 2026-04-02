import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Plus, MoreHorizontal, Pencil, Copy, Trash2, Search, Play } from 'lucide-react';
import spacesHeroImage from '@/assets/spaces-hero-image.png';

type SpaceProject = {
  id: string;
  name: string;
  cover_image_url: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
};

export default function SpacesProjects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState<SpaceProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [contextMenu, setContextMenu] = useState<{ id: string; x: number; y: number } | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [activeTab, setActiveTab] = useState<'my' | 'shared' | 'templates'>('my');

  const fetchProjects = async () => {
    const { data } = await supabase
      .from('spaces_projects')
      .select('*')
      .order('updated_at', { ascending: false });
    setProjects((data as SpaceProject[]) || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    const handleClick = () => setContextMenu(null);
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, []);

  const createProject = async () => {
    const { data } = await supabase
      .from('spaces_projects')
      .insert({ name: 'Untitled Space' })
      .select()
      .single();
    if (data) {
      navigate(`/spaces?project=${data.id}`);
    }
  };

  const deleteProject = async (id: string) => {
    await supabase.from('spaces_projects').delete().eq('id', id);
    setProjects((prev) => prev.filter((p) => p.id !== id));
    setContextMenu(null);
  };

  const duplicateProject = async (id: string) => {
    const project = projects.find((p) => p.id === id);
    if (!project) return;
    const { data } = await supabase
      .from('spaces_projects')
      .insert({ name: `${project.name} (Copy)`, cover_image_url: project.cover_image_url, description: project.description })
      .select()
      .single();
    if (data) fetchProjects();
    setContextMenu(null);
  };

  const renameProject = async (id: string) => {
    await supabase.from('spaces_projects').update({ name: editName }).eq('id', id);
    setProjects((prev) => prev.map((p) => (p.id === id ? { ...p, name: editName } : p)));
    setEditingId(null);
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins} minutes ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours} hours ago`;
    const days = Math.floor(hours / 24);
    return `${days} days ago`;
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Top nav */}
      <div className="flex items-center gap-1.5 px-6 py-3 text-xs text-muted-foreground border-b border-border">
        <span>Personal project</span>
        <span>/</span>
        <span className="text-foreground">Spaces</span>
      </div>

      {/* Hero section */}
      <div className="relative mx-6 mt-4 rounded-2xl overflow-hidden" style={{ height: 400 }}>
        {/* Dark gradient background with colored glows */}
        <div className="absolute inset-0 bg-[#0a0a0f]" />
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-900/20 via-transparent to-indigo-900/15" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[300px] bg-gradient-to-tr from-emerald-500/8 via-teal-500/5 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-0 right-1/3 w-[400px] h-[250px] bg-gradient-to-b from-violet-500/6 via-purple-500/4 to-transparent rounded-full blur-3xl" />

        {/* Content */}
        <div className="relative z-10 h-full flex">
          {/* Left side text */}
          <div className="flex flex-col justify-end p-10 max-w-md">
            <h1 className="text-5xl font-bold text-foreground mb-3 leading-tight tracking-tight">Spaces</h1>
            <p className="text-base font-semibold text-foreground mb-0.5">Start from scratch</p>
            <p className="text-sm text-muted-foreground mb-5">Create a new space and start collaborating.</p>
            <button
              onClick={createProject}
              className="flex items-center gap-2 bg-foreground text-background px-5 py-2.5 rounded-full text-sm font-medium hover:opacity-90 transition-opacity w-fit"
            >
              <Plus className="w-4 h-4" />
              New space
            </button>
          </div>

          {/* Right side — floating nodes with connection lines */}
          <div className="flex-1 relative hidden lg:block">
            {/* SVG connection lines */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" xmlns="http://www.w3.org/2000/svg">
              {/* Green line: from left edge through prompt card to top-right image */}
              <path d="M 0 200 C 60 180, 120 120, 200 130 C 280 140, 300 100, 360 80 C 420 60, 480 50, 530 70 C 560 80, 580 60, 600 50" 
                stroke="#34d399" strokeWidth="2" fill="none" opacity="0.5" />
              {/* Green dots */}
              <circle cx="0" cy="200" r="5" fill="#34d399" opacity="0.7" />
              <circle cx="200" cy="130" r="5" fill="#34d399" opacity="0.7" />
              <circle cx="360" cy="80" r="5" fill="#34d399" opacity="0.7" />
              <circle cx="530" cy="70" r="5" fill="#34d399" opacity="0.7" />
              <circle cx="600" cy="50" r="5" fill="#34d399" opacity="0.7" />

              {/* Purple/blue line: connecting bottom images */}
              <path d="M 160 340 C 200 300, 240 280, 280 290 C 320 300, 350 280, 390 260 C 430 240, 460 250, 500 230 C 530 215, 560 200, 590 180" 
                stroke="#8b5cf6" strokeWidth="2" fill="none" opacity="0.4" />
              {/* Purple dots */}
              <circle cx="160" cy="340" r="5" fill="#8b5cf6" opacity="0.6" />
              <circle cx="280" cy="290" r="5" fill="#8b5cf6" opacity="0.6" />
              <circle cx="390" cy="260" r="5" fill="#8b5cf6" opacity="0.6" />
              <circle cx="500" cy="230" r="5" fill="#8b5cf6" opacity="0.6" />
              <circle cx="590" cy="180" r="5" fill="#8b5cf6" opacity="0.6" />
            </svg>

            {/* Prompt card — top center */}
            <div className="absolute top-12 left-24 bg-[#1a1a24]/90 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3 max-w-[210px] shadow-2xl">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Slowly and cinematically zoom out of the scene, focusing on the subject and the background
              </p>
              <circle className="hidden" />
            </div>

            {/* Top-right image card (small) */}
            <div className="absolute top-4 right-12 w-[100px] h-[100px] rounded-2xl overflow-hidden border-2 border-emerald-500/30 shadow-2xl">
              <img src={spacesHeroImage} alt="" className="w-full h-full object-cover" />
            </div>

            {/* Center-right image (main hero image, larger) */}
            <div className="absolute top-[110px] right-[60px] w-[120px] h-[120px] rounded-2xl overflow-hidden border-2 border-cyan-400/25 shadow-2xl">
              <img src={spacesHeroImage} alt="" className="w-full h-full object-cover" />
            </div>

            {/* Bottom-left image card */}
            <div className="absolute bottom-10 left-20 w-[110px] h-[110px] rounded-2xl overflow-hidden border-2 border-violet-400/25 shadow-2xl">
              <img src={spacesHeroImage} alt="" className="w-full h-full object-cover" />
            </div>

            {/* Bottom-center image card */}
            <div className="absolute bottom-8 left-52 w-[110px] h-[110px] rounded-2xl overflow-hidden border-2 border-blue-400/25 shadow-2xl">
              <img src={spacesHeroImage} alt="" className="w-full h-full object-cover" />
            </div>

            {/* Run button floating */}
            <div className="absolute bottom-16 left-[340px] bg-[#1a1a24]/90 backdrop-blur-sm border border-white/10 rounded-lg px-4 py-2 flex items-center gap-2 shadow-xl">
              <Play className="w-3 h-3 text-foreground" fill="currentColor" />
              <span className="text-sm font-medium text-foreground">Run</span>
            </div>

            {/* Prompt card — center-left */}
            <div className="absolute top-[90px] left-0 bg-[#1a1a24]/90 backdrop-blur-sm border border-white/10 rounded-xl px-4 py-3 max-w-[210px] shadow-2xl">
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                Dreamy full-body portrait of a silhouetted figure in motion against a soft, cool blue backdrop—long exposure double-exposure style.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs and search */}
      <div className="flex items-center justify-between px-6 mt-6 mb-4">
        <div className="flex items-center gap-1">
          {(['my', 'shared', 'templates'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm transition-colors ${
                activeTab === tab
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab === 'my' ? '👤 My spaces' : tab === 'shared' ? '👥 Shared' : '📋 Templates'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2 bg-muted rounded-lg px-3 py-2">
          <Search className="w-4 h-4 text-muted-foreground" />
          <input
            placeholder="Search spaces..."
            className="bg-transparent text-sm text-foreground placeholder:text-muted-foreground/50 border-0 focus:outline-none w-48"
          />
        </div>
      </div>

      {/* Projects grid */}
      <div className="px-6 pb-10">
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {[1, 2, 3].map((i) => (
              <div key={i} className="rounded-xl bg-card border border-border animate-pulse h-56" />
            ))}
          </div>
        ) : projects.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg mb-2">No spaces yet</p>
            <p className="text-sm">Click "New space" to create your first project.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {projects.map((project) => (
              <div key={project.id} className="group relative">
                <button
                  onClick={() => navigate(`/spaces?project=${project.id}`)}
                  className="w-full rounded-xl bg-card border border-border overflow-hidden hover:border-muted-foreground/30 transition-colors text-left"
                >
                  {/* Thumbnail */}
                  <div className="h-40 bg-muted/30 flex items-center justify-center overflow-hidden">
                    {project.cover_image_url ? (
                      <img src={project.cover_image_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-muted/20 to-muted/5 flex items-center justify-center">
                        <div className="text-muted-foreground/30 text-4xl">🎨</div>
                      </div>
                    )}
                  </div>
                  {/* Info */}
                  <div className="p-3">
                    {editingId === project.id ? (
                      <input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        onBlur={() => renameProject(project.id)}
                        onKeyDown={(e) => e.key === 'Enter' && renameProject(project.id)}
                        className="text-sm font-medium text-foreground bg-transparent border-b border-primary focus:outline-none w-full"
                        autoFocus
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <p className="text-sm font-medium text-foreground truncate">{project.name}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-0.5">{timeAgo(project.updated_at)}</p>
                  </div>
                </button>

                {/* Context menu button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setContextMenu({ id: project.id, x: e.clientX, y: e.clientY });
                  }}
                  className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 bg-background/80 backdrop-blur rounded-lg p-1.5 transition-opacity"
                >
                  <MoreHorizontal className="w-4 h-4 text-foreground" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Context menu */}
      {contextMenu && (
        <div
          className="fixed bg-popover border border-border rounded-xl shadow-2xl py-1 z-50 min-w-[160px]"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              const p = projects.find((p) => p.id === contextMenu.id);
              setEditName(p?.name || '');
              setEditingId(contextMenu.id);
              setContextMenu(null);
            }}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-muted/50 transition-colors"
          >
            <Pencil className="w-3.5 h-3.5" /> Rename
          </button>
          <button
            onClick={() => duplicateProject(contextMenu.id)}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-foreground hover:bg-muted/50 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" /> Duplicate
          </button>
          <button
            onClick={() => deleteProject(contextMenu.id)}
            className="flex items-center gap-2 w-full px-3 py-2 text-sm text-destructive hover:bg-muted/50 transition-colors"
          >
            <Trash2 className="w-3.5 h-3.5" /> Delete
          </button>
        </div>
      )}
    </div>
  );
}
