import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckSquare, Clock, AlertCircle, Check,
  MessageSquare, LogOut, Search,
  TrendingUp, Lightbulb, Play, Pause, RotateCcw, X, Eye,
  LayoutGrid, List, Plus, Trash2, Coffee, Flame, ChevronRight, ChevronDown, Zap
} from 'lucide-react';
import api from '../services/api';
import useAuthStore from '../store/authStore';
import { disconnectSocket } from '../services/socket';
import { formatDistanceToNow, format } from 'date-fns';
import toast from 'react-hot-toast';

const P = {
  bg:       '#0d0d0d',
  surface:  '#141414',
  card:     '#1a1a1a',
  border:   '#2a2218',
  borderHover: '#3d3220',
  gold:     '#f5c842',
  goldDim:  '#c9a227',
  goldGlow: 'rgba(245,200,66,0.12)',
  text:     '#f0ead6',
  textMid:  '#8a7d5e',
  textDim:  '#4a4030',
  green:    '#4ade80',
  yellow:   '#facc15',
  red:      '#f87171',
  slate:    '#94a3b8',
};

export default function DashboardPage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');
  const [expandedTasks, setExpandedTasks] = useState({});
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('NEWEST');
  const [viewLayout, setViewLayout] = useState('LIST'); 
  const [subtasks, setSubtasks] = useState({}); 
  const [newSubtaskTexts, setNewSubtaskTexts] = useState({}); 

  // Focus Mode, Breaks, & Timer States
  const [activeFocusTask, setActiveFocusTask] = useState(null);
  const [isOverlayOpen, setIsOverlayOpen] = useState(false);
  const [timerMode, setTimerMode] = useState('FOCUS'); // 'FOCUS' | 'SHORT_BREAK' | 'LONG_BREAK'
  const [timerSeconds, setTimerSeconds] = useState(25 * 60);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const timerRef = useRef(null);

  useEffect(() => { loadTasks(); }, [filter]);

  // Pomodoro Timer Engine
  useEffect(() => {
    if (isTimerRunning) {
      timerRef.current = setInterval(() => {
        setTimerSeconds((prev) => {
          if (prev <= 1) {
            clearInterval(timerRef.current);
            setIsTimerRunning(false);
            try {
              const ctx = new (window.AudioContext || window.webkitAudioContext)();
              const osc = ctx.createOscillator();
              osc.type = 'sine';
              osc.frequency.setValueAtTime(587.33, ctx.currentTime);
              osc.connect(ctx.destination);
              osc.start();
              osc.stop(ctx.currentTime + 0.4);
            } catch (e) { }
            
            const message = timerMode === 'FOCUS' 
              ? "Time's up! Take a short break." 
              : "Break is over! Let's get back to focus.";
            toast.success(message, { duration: 6000 });

            return 25 * 60;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [isTimerRunning, timerMode]);

  const changeTimerMode = (mode) => {
    setTimerMode(mode);
    setIsTimerRunning(false);
    if (mode === 'FOCUS') setTimerSeconds(25 * 60);
    else if (mode === 'SHORT_BREAK') setTimerSeconds(5 * 60);
    else if (mode === 'LONG_BREAK') setTimerSeconds(15 * 60);
  };

  const loadTasks = async () => {
    try {
      setLoading(true);
      const params = filter !== 'ALL' ? `?status=${filter}` : '';
      const { data } = await api.get(`/tasks/my${params}`);
      setTasks(data);
    } catch {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (task) => {
    const next = { PENDING: 'IN_PROGRESS', IN_PROGRESS: 'DONE', DONE: 'PENDING' };
    try {
      const { data } = await api.put(`/tasks/${task._id}`, { status: next[task.status] });
      setTasks(prev => prev.map(t => t._id === data._id ? { ...data, isOverdue: t.isOverdue } : t));
      if (activeFocusTask && activeFocusTask._id === task._id) {
        setActiveFocusTask({ ...data, isOverdue: task.isOverdue });
      }
    } catch { toast.error('Failed to update task'); }
  };

  const startFocusSession = (task) => {
    if (activeFocusTask && activeFocusTask._id !== task._id) return;
    if (activeFocusTask?._id !== task._id) {
      setActiveFocusTask(task);
      changeTimerMode('FOCUS');
      setIsTimerRunning(true);
    }
    setIsOverlayOpen(true);
  };

  const resetFocusSessionState = () => {
    setActiveFocusTask(null);
    setIsTimerRunning(false);
    setTimerSeconds(25 * 60);
    setTimerMode('FOCUS');
    setIsOverlayOpen(false);
  };

  const toggleExpand = (taskId) => {
    setExpandedTasks(prev => ({ ...prev, [taskId]: !prev[taskId] }));
  };

  const addSubtask = (taskId) => {
    const text = newSubtaskTexts[taskId]?.trim();
    if (!text) return;
    const newSub = { id: Date.now().toString(), text, done: false };
    setSubtasks(prev => ({ ...prev, [taskId]: [...(prev[taskId] || []), newSub] }));
    setNewSubtaskTexts(prev => ({ ...prev, [taskId]: '' }));
  };

  const toggleSubtask = (taskId, subtaskId) => {
    setSubtasks(prev => ({
      ...prev,
      [taskId]: prev[taskId].map(s => s.id === subtaskId ? { ...s, done: !s.done } : s)
    }));
  };

  const deleteSubtask = (taskId, subtaskId) => {
    setSubtasks(prev => ({
      ...prev,
      [taskId]: prev[taskId].filter(s => s.id !== subtaskId)
    }));
  };

  const handleLogout = () => { disconnectSocket(); logout(); navigate('/login'); };

  const stats = {
    total:      tasks.length,
    pending:    tasks.filter(t => t.status === 'PENDING').length,
    inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    done:       tasks.filter(t => t.status === 'DONE').length,
    overdue:    tasks.filter(t => t.isOverdue).length,
  };

  const donePercent = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
  const circumference = 2 * Math.PI * 16;
  const dashOffset = circumference - (donePercent / 100) * circumference;

  const insight = (() => {
    if (stats.total === 0) return null;
    if (stats.overdue > 0) return { text: `You have ${stats.overdue} overdue items. Prioritize completing them first.`, color: P.red, label: "Critical Priority" };
    if (donePercent >= 75) return { text: "Exceptional performance! You maintain an excellent task completion rate.", color: P.green, label: "Peak Efficiency" };
    if (stats.inProgress > stats.pending) return { text: "Active cycle detected. Ensure you finish ongoing tasks before taking fresh ones.", color: P.yellow, label: "Active Push" };
    return null;
  })();

  const processedTasks = tasks
    .filter(task => {
      const matchQuery = searchQuery.toLowerCase();
      const titleMatch = task.title?.toLowerCase().includes(matchQuery);
      const assigneeMatch = task.assignedTo?.name?.toLowerCase().includes(matchQuery);
      const convMatch = task.conversation?.name?.toLowerCase().includes(matchQuery);
      return titleMatch || assigneeMatch || convMatch;
    })
    .sort((a, b) => {
      if (sortBy === 'NEWEST') return new Date(b.createdAt) - new Date(a.createdAt);
      if (sortBy === 'DUE_SOON') {
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      }
      return 0;
    });

  const filters = [
    { key: 'ALL',        label: 'All',         count: stats.total },
    { key: 'PENDING',    label: 'To Do',        count: stats.pending },
    { key: 'IN_PROGRESS',label: 'In Progress',  count: stats.inProgress },
    { key: 'DONE',       label: 'Done',         count: stats.done },
  ];

  const statusCfg = {
    PENDING:     { label: 'To Do',       color: P.slate,  bg: 'rgba(148,163,184,0.1)',  border: 'rgba(148,163,184,0.25)' },
    IN_PROGRESS: { label: 'In Progress', color: P.yellow, bg: 'rgba(250,204,21,0.1)',   border: 'rgba(250,204,21,0.25)' },
    DONE:        { label: 'Done',        color: P.green,  bg: 'rgba(74,222,128,0.1)',   border: 'rgba(74,222,128,0.25)' },
  };

  const formatTime = (secs) => {
    const mins = Math.floor(secs / 60);
    const remainingSecs = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${remainingSecs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen overflow-y-auto" style={{ background: P.bg, color: P.text, fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #2a2a2a; border-radius: 4px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #3d3d3d; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
      `}</style>

      {/* ── OVERLAY SPRINT VIEW ── */}
      {activeFocusTask && isOverlayOpen && (
        <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center p-4 backdrop-blur-md animate-[fadeUp_0.2s_ease]" style={{ background: 'rgba(10,10,10,0.96)' }}>
          <button onClick={() => setIsOverlayOpen(false)} className="absolute top-6 right-6 p-2 rounded-full border bg-zinc-900 border-zinc-800 text-zinc-400 hover:text-white transition-colors">
            <X size={18} />
          </button>
          
          <div className="max-w-xl w-full text-center flex flex-col items-center">
            <span className="text-[11px] font-bold uppercase tracking-widest text-[#f5c842] mb-3 px-3 py-1 rounded-full bg-zinc-900 border border-zinc-800">
              ⚡ Deep Focus Session
            </span>
            <h3 className="text-xl sm:text-2xl font-black max-w-lg mb-2 text-center leading-snug" style={{ color: P.text }}>
              {activeFocusTask.title}
            </h3>

            <div className="flex flex-wrap items-center justify-center gap-1.5 p-1 rounded-xl bg-zinc-900/90 border border-zinc-800/80 mb-6">
              <button onClick={() => changeTimerMode('FOCUS')} className="px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all" style={{ background: timerMode === 'FOCUS' ? P.gold : 'transparent', color: timerMode === 'FOCUS' ? '#0d0d0d' : P.textMid }}>
                <Flame size={12} /> Focus (25m)
              </button>
              <button onClick={() => changeTimerMode('SHORT_BREAK')} className="px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all" style={{ background: timerMode === 'SHORT_BREAK' ? P.gold : 'transparent', color: timerMode === 'SHORT_BREAK' ? '#0d0d0d' : P.textMid }}>
                <Coffee size={12} /> Short Break (5m)
              </button>
              <button onClick={() => changeTimerMode('LONG_BREAK')} className="px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all" style={{ background: timerMode === 'LONG_BREAK' ? P.gold : 'transparent', color: timerMode === 'LONG_BREAK' ? '#0d0d0d' : P.textMid }}>
                <Coffee size={12} /> Long Break (15m)
              </button>
            </div>

            <div className="relative mb-6 w-48 h-48 sm:w-56 sm:h-56 rounded-full border border-zinc-800 bg-zinc-950/40 flex flex-col items-center justify-center shadow-2xl">
              {isTimerRunning && <div className="absolute inset-0 rounded-full bg-[#f5c842]/5 animate-pulse mix-blend-screen" />}
              <span className="text-4xl sm:text-5xl font-mono tracking-tight font-black" style={{ color: isTimerRunning ? P.gold : P.textMid }}>
                {formatTime(timerSeconds)}
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider text-zinc-500 mt-1">
                {isTimerRunning ? 'Interval Running' : 'Interval Paused'}
              </span>
            </div>

            <div className="flex items-center gap-3 mb-8">
              <button onClick={() => setIsTimerRunning(!isTimerRunning)} className="px-5 py-2 rounded-xl font-bold text-xs flex items-center gap-2 transition-transform active:scale-95" style={{ background: isTimerRunning ? '#222' : P.gold, color: isTimerRunning ? '#fff' : '#0d0d0d' }}>
                {isTimerRunning ? <Pause size={14} /> : <Play size={14} />}
                {isTimerRunning ? 'Pause timer' : 'Start interval'}
              </button>
              <button onClick={() => changeTimerMode(timerMode)} className="p-2 rounded-xl border border-zinc-800 bg-zinc-900 text-zinc-400 hover:text-white transition-colors">
                <RotateCcw size={14} />
              </button>
            </div>

            <div className="flex items-center gap-4">
              <button onClick={() => handleStatusUpdate(activeFocusTask)} className="text-xs px-4 py-2 rounded-lg font-medium border transition-colors" style={{ borderColor: activeFocusTask.status === 'DONE' ? P.green : P.border, color: activeFocusTask.status === 'DONE' ? P.green : P.textMid }}>
                {activeFocusTask.status === 'DONE' ? '✓ Completed!' : 'Mark Task Done'}
              </button>
              <button onClick={resetFocusSessionState} className="text-xs px-3 py-2 text-red-400/80 hover:text-red-400 font-medium transition-colors">
                End Session entirely
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="px-4 sm:px-6 lg:px-8 h-[54px] flex items-center justify-between sticky top-0 z-50" style={{ background: P.surface, borderBottom: `1px solid ${P.border}` }}>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-7 h-7 rounded-[6px] flex items-center justify-center shrink-0" style={{ background: `linear-gradient(135deg, ${P.gold}, ${P.goldDim})`, boxShadow: `0 0 16px ${P.goldGlow}` }}>
            <Zap size={14} color="#0d0d0d" fill="#0d0d0d" />
          </div>
          <div className="font-extrabold text-[13px]" style={{ color: P.text, letterSpacing: '-0.3px' }}>WorkSpace</div>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="flex items-center gap-1.5 mr-1">
            <div className="w-[24px] h-[24px] rounded-full flex items-center justify-center text-[10px] font-extrabold" style={{ background: `linear-gradient(135deg, ${P.gold}, ${P.goldDim})`, color: '#0d0d0d' }}>
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <span className="hidden sm:block text-[11px]" style={{ color: P.textMid }}>{user.name}</span>
          </div>
          <button onClick={() => navigate('/')} className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium border border-zinc-800 text-zinc-400 hover:text-[#f5c842] transition-colors">
            <MessageSquare size={12} /> <span className="hidden sm:inline">Chat</span>
          </button>
          <button onClick={handleLogout} className="flex items-center gap-1.5 rounded-md px-2 py-1 text-[11px] font-medium border border-zinc-800 text-zinc-400 hover:text-[#f87171] transition-colors">
            <LogOut size={12} /> <span className="hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      <div className="mx-auto px-4 sm:px-6 lg:px-8 pt-4 sm:pt-6 pb-24 max-w-[1100px] w-full">
        {/* Profile Header */}
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg sm:text-[21px] font-extrabold" style={{ color: P.text }}>
              Hey, {user.name?.split(' ')[0]} 👋
            </h2>
            <p className="text-[11px]" style={{ color: P.textMid }}>
              {stats.total === 0 ? 'No tasks yet.' : `${stats.pending + stats.inProgress} tasks require attention`}
            </p>
          </div>
          {stats.total > 0 && (
            <div className="relative w-[42px] h-[42px] shrink-0">
              <svg viewBox="0 0 36 36" className="w-[42px] h-[42px]" style={{ transform: 'rotate(-90deg)' }}>
                <circle cx="18" cy="18" r="16" fill="none" stroke={P.border} strokeWidth="3" />
                <circle cx="18" cy="18" r="16" fill="none" stroke={P.gold} strokeWidth="3" strokeDasharray={circumference} strokeDashoffset={dashOffset} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center text-[10px] font-black" style={{ color: P.gold }}>{donePercent}%</div>
            </div>
          )}
        </div>

        {/* Analytics Insights */}
        {insight && (
          <div className="mb-4 p-2.5 rounded-lg flex items-start gap-2.5 border animate-[fadeUp_0.15s_ease]" style={{ background: P.surface, borderColor: P.border }}>
            <div className="w-6 h-6 rounded bg-zinc-900 flex items-center justify-center border border-zinc-800 shrink-0 text-zinc-400" style={{ color: insight.color }}>
              <Lightbulb size={13} />
            </div>
            <div>
              <span className="inline-block text-[9px] font-bold uppercase tracking-wider px-1 py-0.5 rounded mb-0.5" style={{ background: `${insight.color}15`, color: insight.color }}>
                {insight.label}
              </span>
              <p className="text-[11px] leading-normal" style={{ color: P.text }}>{insight.text}</p>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-2 min-[380px]:grid-cols-3 sm:grid-cols-5 gap-2 mb-4">
          {[
            { label:'Total Tasks',  value: stats.total,      accent: P.gold,   icon: <TrendingUp size={13}/> },
            { label:'To Do',        value: stats.pending,    accent: P.slate,  icon: <CheckSquare size={13}/> },
            { label:'In Progress',  value: stats.inProgress, accent: P.yellow, icon: <Clock size={13}/> },
            { label:'Done',         value: stats.done,       accent: P.green,  icon: <Check size={13}/> },
            { label:'Overdue',      value: stats.overdue,    accent: P.red,    icon: <AlertCircle size={13}/> },
          ].map(({ label, value, accent, icon }) => (
            <div key={label} className="p-2.5 rounded-lg flex flex-col gap-1 justify-between" style={{ background: P.card, border: `1px solid ${P.border}` }}>
              <div className="flex items-center justify-between">
                <div className="w-6 h-6 rounded flex items-center justify-center" style={{ background: `${accent}15`, color: accent }}>{icon}</div>
                <span className="text-lg font-black tracking-tight">{value}</span>
              </div>
              <p className="text-[9px] font-bold uppercase tracking-wide opacity-80 whitespace-nowrap overflow-hidden text-ellipsis" style={{ color: accent }}>{label}</p>
            </div>
          ))}
        </div>

        {/* Controls Bar */}
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 sm:pb-0 no-scrollbar">
            {filters.map(f => (
              <button key={f.key} onClick={() => setFilter(f.key)} className="px-2 py-1 rounded text-[11px] font-medium transition-all whitespace-nowrap" style={{ background: filter === f.key ? P.gold : 'transparent', border: `1px solid ${filter === f.key ? P.gold : P.border}`, color: filter === f.key ? '#0d0d0d' : P.textMid }}>
                {f.label} ({f.count})
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1.5 w-full sm:w-auto">
            <div className="flex bg-zinc-900 border border-zinc-800 rounded-md p-0.5 shrink-0">
              <button onClick={() => setViewLayout('LIST')} className="p-1 rounded transition-colors" style={{ color: viewLayout === 'LIST' ? P.gold : '#555' }}>
                <List size={13} />
              </button>
              <button onClick={() => setViewLayout('GRID')} className="p-1 rounded transition-colors" style={{ color: viewLayout === 'GRID' ? P.gold : '#555' }}>
                <LayoutGrid size={13} />
              </button>
            </div>

            {activeFocusTask && !isOverlayOpen && (
              <button onClick={() => setIsOverlayOpen(true)} className="px-2 py-1 rounded text-[11px] font-bold border border-[#f5c842]/30 bg-[#f5c842]/10 text-[#f5c842] flex items-center gap-1 animate-pulse shrink-0">
                <Eye size={12} />
                <span>{formatTime(timerSeconds)}</span>
              </button>
            )}

            <div className="relative flex-1 sm:w-36">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-zinc-500"><Search size={11} /></span>
              <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} placeholder="Search..." className="w-full bg-zinc-900/50 text-[11px] rounded-md pl-6 pr-1.5 py-1 border border-zinc-800 focus:outline-none focus:border-[#f5c842]" style={{ color: P.text }} />
            </div>

            <div className="relative shrink-0">
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="bg-zinc-900/50 text-[11px] rounded-md pl-2 pr-6 py-1 border border-zinc-800 focus:outline-none focus:border-[#f5c842] appearance-none text-zinc-300">
                <option value="NEWEST">Newest</option>
                <option value="DUE_SOON">Due Soon</option>
              </select>
            </div>
          </div>
        </div>

        <div className="mb-3 h-px" style={{ background: `linear-gradient(90deg, ${P.gold}20, transparent)` }} />

        {/* Task Grid/List Container */}
        {loading ? (
          <div className="pt-16 flex justify-center">
            <div className="w-6 h-6 rounded-full animate-spin" style={{ border: `2px solid ${P.gold}`, borderTopColor: 'transparent' }} />
          </div>
        ) : processedTasks.length === 0 ? (
          <div className="p-8 text-center rounded-lg" style={{ background: P.card, border: `1px solid ${P.border}` }}>
            <p className="text-xs text-zinc-500">No tasks found</p>
          </div>
        ) : (
          <div className={viewLayout === 'GRID' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2' : 'flex flex-col gap-1.5'}>
            {processedTasks.map((task) => {
              const cfg = statusCfg[task.status];
              const otherMember = task.conversation?.members?.find(m => (m._id?.toString?.() || m._id) !== (user._id?.toString?.() || user._id));
              const conversationName = task.conversation?.isGroup ? task.conversation?.name : otherMember?.name || 'Unknown';
              const isExpanded = !!expandedTasks[task._id];
              const isCurrentFocus = activeFocusTask?._id === task._id;
              const isAnotherTaskFocused = activeFocusTask && !isCurrentFocus;
              const taskSubtasks = subtasks[task._id] || [];
              const doneSubtasks = taskSubtasks.filter(s => s.done).length;

              return (
                <div key={task._id} className="flex flex-col p-2.5 sm:p-3 rounded-lg transition-all animate-[fadeUp_0.2s_ease] hover:bg-[#121212]" style={{ background: P.card, border: isCurrentFocus ? `1px solid ${P.gold}` : task.isOverdue ? `1px solid rgba(248,113,113,0.25)` : `1px solid ${P.border}` }}>
                  
                  {/* Main Row */}
                  <div className="flex items-center justify-between gap-2.5 w-full">
                    <div className="flex items-center gap-2 min-w-0 flex-1">
                      <button onClick={() => handleStatusUpdate(task)} className="w-4 h-4 rounded-full flex items-center justify-center shrink-0 transition-all" style={{ border: `1.5px solid ${cfg.color}`, background: task.status !== 'PENDING' ? cfg.bg : 'transparent' }}>
                        {task.status === 'DONE' && <Check size={9} color={P.green} />}
                        {task.status === 'IN_PROGRESS' && <div className="w-1 h-1 rounded-full" style={{ background: P.yellow }} />}
                      </button>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className={`text-xs font-medium transition-all ${isExpanded ? 'whitespace-normal break-words' : 'truncate max-w-[160px] sm:max-w-[340px]'}`} style={{ color: task.status === 'DONE' ? P.textDim : P.text, textDecoration: task.status === 'DONE' ? 'line-through' : 'none' }}>
                            {task.title}
                          </p>
                          {task.status !== 'DONE' && (
                            <button onClick={() => startFocusSession(task)} disabled={isAnotherTaskFocused} style={{ background: isCurrentFocus ? `${P.gold}20` : isAnotherTaskFocused ? 'transparent' : 'rgba(245,200,66,0.05)', border: `1px solid ${isCurrentFocus ? P.gold : isAnotherTaskFocused ? '#2a2a2a' : 'rgba(245,200,66,0.15)'}`, color: isAnotherTaskFocused ? '#4a4030' : P.gold, cursor: isAnotherTaskFocused ? 'not-allowed' : 'pointer' }} className="text-[8px] font-bold px-1 py-0.5 rounded shrink-0">
                              {isCurrentFocus ? '🎯 Focus' : isAnotherTaskFocused ? '🔒 Locked' : 'Focus'}
                            </button>
                          )}
                        </div>

                        {/* High-density Metadata Row */}
                        <div className="flex items-center gap-2 flex-wrap mt-0.5 text-[9px]" style={{ color: P.textMid }}>
                          <span>{conversationName}</span>
                          {task.dueDate && <span style={{ color: task.isOverdue ? P.red : P.textMid }}>• Due {format(new Date(task.dueDate), 'MMM d')}</span>}
                          {taskSubtasks.length > 0 && <span className="text-zinc-500 font-medium">• {doneSubtasks}/{taskSubtasks.length} subtasks</span>}
                          <span style={{ color: P.textDim }}>• {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <div className="px-1.5 py-0.5 rounded text-[9px] font-semibold hidden sm:block" style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}>
                        {cfg.label}
                      </div>
                      <button onClick={() => toggleExpand(task._id)} className="p-0.5 rounded hover:bg-zinc-800 transition-colors flex items-center justify-center">
                        {isExpanded ? <ChevronDown size={14} color={P.textMid} /> : <ChevronRight size={14} color={P.textDim} />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Checklist Drawer */}
                  {isExpanded && (
                    <div className="w-full mt-2 pt-2 border-t border-zinc-800/60 text-xs animate-[fadeUp_0.15s_ease]">
                      <div className="flex flex-col gap-1.5 bg-zinc-950 p-2 rounded-lg border border-zinc-900/80">
                        <span className="text-[8px] font-bold text-zinc-500 uppercase tracking-wider">Sub-Milestones</span>
                        
                        <div className="flex gap-1.5 items-center">
                          <input 
                            type="text" 
                            placeholder="Add item..."
                            value={newSubtaskTexts[task._id] || ''}
                            onChange={(e) => setNewSubtaskTexts(prev => ({ ...prev, [task._id]: e.target.value }))}
                            onKeyDown={(e) => e.key === 'Enter' && addSubtask(task._id)}
                            className="flex-1 bg-zinc-900 border border-zinc-800 rounded px-2 py-0.5 text-[11px] text-zinc-200 focus:outline-none focus:border-[#f5c842]"
                          />
                          <button onClick={() => addSubtask(task._id)} className="p-0.5 rounded bg-zinc-900 border border-zinc-800 text-zinc-300">
                            <Plus size={11} />
                          </button>
                        </div>

                        {taskSubtasks.length === 0 ? (
                          <span className="text-[9px] text-zinc-600 italic px-0.5">Empty item logs.</span>
                        ) : (
                          <div className="flex flex-col gap-1 mt-0.5 max-h-28 overflow-y-auto custom-scrollbar pr-0.5">
                            {taskSubtasks.map(sub => (
                              <div key={sub.id} className="flex items-center justify-between bg-zinc-900/20 p-1.5 rounded border border-zinc-900 group">
                                <label className="flex items-center gap-1.5 cursor-pointer flex-1 min-w-0">
                                  <input 
                                    type="checkbox" 
                                    checked={sub.done} 
                                    onChange={() => toggleSubtask(task._id, sub.id)}
                                    className="accent-[#f5c842] h-3 w-3 rounded"
                                  />
                                  <span className={`text-[11px] truncate ${sub.done ? 'line-through text-zinc-600' : 'text-zinc-300'}`}>
                                    {sub.text}
                                  </span>
                                </label>
                                <button onClick={() => deleteSubtask(task._id, sub.id)} className="text-zinc-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity p-0.5">
                                  <Trash2 size={10} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}