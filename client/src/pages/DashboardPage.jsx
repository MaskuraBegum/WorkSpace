import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckSquare, Clock, AlertCircle, Check,
  MessageSquare, LogOut,
  TrendingUp, Calendar, ChevronRight, Zap
} from 'lucide-react';
import api from '../services/api';
import useAuthStore from '../store/authStore';
import { disconnectSocket } from '../services/socket';
import { formatDistanceToNow, format } from 'date-fns';
import toast from 'react-hot-toast';

// ── Palette ──────────────────────────────────────────────
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

  useEffect(() => { loadTasks(); }, [filter]);

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
    } catch { toast.error('Failed to update task'); }
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

  return (
    <div
      className="min-h-screen font-sans"
      style={{ background: P.bg, color: P.text, fontFamily: "'Inter', sans-serif" }}
    >
      <style>{`
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      {/* ── Header ── */}
      <header
        className="px-4 sm:px-6 lg:px-8 h-[60px] flex items-center justify-between sticky top-0 z-50"
        style={{ background: P.surface, borderBottom: `1px solid ${P.border}` }}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-9 h-9 rounded-[10px] flex items-center justify-center flex-shrink-0"
            style={{ background: `linear-gradient(135deg, ${P.gold}, ${P.goldDim})`, boxShadow: `0 0 16px ${P.goldGlow}` }}
          >
            <Zap size={17} color="#0d0d0d" fill="#0d0d0d" />
          </div>
          <div className="min-w-0">
            <div className="font-extrabold text-[15px] whitespace-nowrap" style={{ color: P.text, letterSpacing: '-0.3px' }}>
              WorkSpace
            </div>
            <div className="hidden sm:block text-[11px] whitespace-nowrap" style={{ color: P.textMid }}>
              Task Dashboard
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 mr-1 sm:mr-3">
            <div
              className="w-[30px] h-[30px] rounded-full flex items-center justify-center text-[12px] font-extrabold flex-shrink-0"
              style={{ background: `linear-gradient(135deg, ${P.gold}, ${P.goldDim})`, color: '#0d0d0d' }}
            >
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <span className="hidden sm:block text-[13px]" style={{ color: P.textMid }}>{user.name}</span>
          </div>

          <button
            onClick={() => navigate('/')}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 sm:px-3 text-[12px] font-medium cursor-pointer transition-all hover:bg-[rgba(245,200,66,0.12)] hover:text-[#f5c842] hover:border-[#2a2218]"
            style={{ background: 'transparent', border: `1px solid ${P.border}`, color: P.textMid }}
          >
            <MessageSquare size={13} /> <span className="hidden max-[380px]:hidden sm:inline">Chat</span>
          </button>

          <button
            onClick={handleLogout}
            className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 sm:px-3 text-[12px] font-medium cursor-pointer transition-all hover:bg-[rgba(248,113,113,0.08)] hover:text-[#f87171]"
            style={{ background: 'transparent', border: `1px solid ${P.border}`, color: P.textMid }}
          >
            <LogOut size={13} /> <span className="hidden max-[380px]:hidden sm:inline">Logout</span>
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div className="mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-9 pb-16 sm:pb-20 max-w-[1100px] w-full box-border">

        {/* Greeting + ring */}
        <div className="mb-6 sm:mb-9 flex items-end justify-between flex-wrap gap-4">
          <div>
            <h2 className="mb-1.5 text-2xl sm:text-[26px] font-extrabold" style={{ color: P.text, letterSpacing: '-0.5px' }}>
              Hey, {user.name?.split(' ')[0]} 👋
            </h2>
            <p className="text-sm" style={{ color: P.textMid }}>
              {stats.total === 0
                ? 'No tasks yet — create one inside a conversation.'
                : stats.pending + stats.inProgress === 0
                  ? '🎉 All tasks complete! Excellent work.'
                  : `${stats.pending + stats.inProgress} task${stats.pending + stats.inProgress !== 1 ? 's' : ''} still in progress`}
            </p>
          </div>

          {stats.total > 0 && (
            <div className="flex flex-col items-center gap-1">
              <div className="relative w-[60px] h-[60px]">
                <svg viewBox="0 0 36 36" className="w-[60px] h-[60px]" style={{ transform: 'rotate(-90deg)' }}>
                  <circle cx="18" cy="18" r="16" fill="none" stroke={P.border} strokeWidth="3" />
                  <circle
                    cx="18" cy="18" r="16" fill="none"
                    stroke={P.gold} strokeWidth="3"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    strokeLinecap="round"
                    style={{ transition: 'stroke-dashoffset 0.6s ease' }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-xs font-extrabold" style={{ color: P.gold }}>
                  {donePercent}%
                </div>
              </div>
              <span className="text-[10px] font-medium" style={{ color: P.textMid }}>Complete</span>
            </div>
          )}
        </div>

        {/* ── Stat cards ── */}
        <div className="grid grid-cols-2 min-[480px]:grid-cols-3 lg:grid-cols-5 gap-2.5 lg:gap-3 mb-5 sm:mb-7">
          {[
            { label:'Total Tasks',  value: stats.total,      accent: P.gold,   icon: <TrendingUp size={15}/> },
            { label:'To Do',        value: stats.pending,    accent: P.slate,  icon: <CheckSquare size={15}/> },
            { label:'In Progress',  value: stats.inProgress, accent: P.yellow, icon: <Clock size={15}/> },
            { label:'Done',         value: stats.done,       accent: P.green,  icon: <Check size={15}/> },
            { label:'Overdue',      value: stats.overdue,    accent: P.red,    icon: <AlertCircle size={15}/> },
          ].map(({ label, value, accent, icon }) => (
            <div
              key={label}
              className="px-3.5 py-4 sm:px-4 rounded-2xl flex flex-col gap-3.5"
              style={{
                background: P.card,
                border: `1px solid ${P.border}`,
                boxShadow: value > 0 ? `0 0 0 1px ${accent}15` : 'none',
              }}
            >
              <div className="flex items-center justify-between">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: `${accent}15`, color: accent }}
                >
                  {icon}
                </div>
                <span className="text-[30px] font-black leading-none" style={{ color: value > 0 ? P.text : P.textDim }}>
                  {value}
                </span>
              </div>
              <p className="text-[11px] font-semibold uppercase tracking-wide opacity-75" style={{ color: accent }}>
                {label}
              </p>
            </div>
          ))}
        </div>

        {/* ── Filter bar ── */}
        <div className="mb-4 sm:mb-5 flex items-center gap-2 flex-wrap">
          {filters.map(f => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={`px-3 py-1.5 sm:px-3.5 rounded-lg text-xs font-medium cursor-pointer transition-all ${
                filter === f.key ? '' : 'hover:border-[#c9a227] hover:text-[#f5c842]'
              }`}
              style={{
                background: filter === f.key ? P.gold : 'transparent',
                border: `1px solid ${filter === f.key ? P.gold : P.border}`,
                color: filter === f.key ? '#0d0d0d' : P.textMid,
              }}
            >
              {f.label} <span className="opacity-60">({f.count})</span>
            </button>
          ))}
          <button
            onClick={loadTasks}
            className="ml-auto px-3 py-1.5 sm:px-3.5 rounded-lg text-xs font-medium cursor-pointer transition-all hover:border-[#c9a227] hover:text-[#f5c842]"
            style={{ background: 'transparent', border: `1px solid ${P.border}`, color: P.textMid }}
          >
            ↻ Refresh
          </button>
        </div>

        {/* ── Divider ── */}
        <div className="mb-4 sm:mb-5 h-px" style={{ background: `linear-gradient(90deg, ${P.gold}40, transparent)` }} />

        {/* ── Task list ── */}
        {loading ? (
          <div className="pt-16 sm:pt-20 flex justify-center">
            <div
              className="w-9 h-9 rounded-full animate-spin"
              style={{ border: `3px solid ${P.gold}`, borderTopColor: 'transparent' }}
            />
          </div>
        ) : tasks.length === 0 ? (
          <div
            className="px-4 sm:px-6 py-14 sm:py-16 text-center rounded-[18px] animate-[fadeUp_0.4s_ease]"
            style={{ background: P.card, border: `1px solid ${P.border}` }}
          >
            <div
              className="mx-auto mb-4 w-[60px] h-[60px] rounded-2xl flex items-center justify-center"
              style={{ background: `${P.gold}15` }}
            >
              <CheckSquare size={26} color={P.goldDim} />
            </div>
            <p className="mb-1.5 text-base font-bold" style={{ color: P.text }}>No tasks here</p>
            <p className="mb-6 text-[13px]" style={{ color: P.textMid }}>
              Head to a conversation and create your first task.
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-5 py-2.5 rounded-[10px] text-[13px] font-bold cursor-pointer transition-colors hover:bg-[#c9a227]"
              style={{ background: P.gold, color: '#0d0d0d', border: 'none' }}
            >
              Open Chat →
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {tasks.map((task, i) => {
              const cfg = statusCfg[task.status];
              const conversationName = task.conversation?.name ||
                task.conversation?.members?.find(m => m._id !== user._id)?.name ||
                'Conversation';

              return (
                <div
                  key={task._id}
                  className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-4 py-3 sm:px-5 sm:py-4 rounded-2xl transition-all animate-[fadeUp_0.3s_ease] hover:bg-[#1f1f1f]"
                  style={{
                    background: P.card,
                    border: task.isOverdue ? `1px solid rgba(248,113,113,0.25)` : `1px solid ${P.border}`,
                    animationDelay: `${i * 0.04}s`,
                    animationFillMode: 'both',
                  }}
                >
                  {/* Row 1 on mobile: status toggle + title/meta */}
                  <div className="flex items-center gap-3 min-w-0 sm:contents">
                    <button
                      onClick={() => handleStatusUpdate(task)}
                      title="Click to change status"
                      className="w-[22px] h-[22px] rounded-full flex items-center justify-center flex-shrink-0 cursor-pointer transition-all hover:opacity-80 hover:scale-110"
                      style={{
                        border: `2px solid ${cfg.color}`,
                        background: task.status !== 'PENDING' ? cfg.bg : 'transparent',
                      }}
                    >
                      {task.status === 'DONE' && <Check size={11} color={P.green} />}
                      {task.status === 'IN_PROGRESS' && (
                        <div className="w-2 h-2 rounded-full" style={{ background: P.yellow }} />
                      )}
                    </button>

                    <div className="flex-1 min-w-0">
                      <p
                        className="mb-1 text-sm font-medium leading-snug truncate"
                        style={{
                          color: task.status === 'DONE' ? P.textDim : P.text,
                          textDecoration: task.status === 'DONE' ? 'line-through' : 'none',
                        }}
                      >
                        {task.title}
                      </p>
                      <div className="flex items-center gap-3.5 flex-wrap">
                        <span className="text-[11px] flex items-center gap-1" style={{ color: P.textMid }}>
                          <MessageSquare size={10} /> {conversationName}
                        </span>
                        {task.dueDate && (
                          <span
                            className="text-[11px] flex items-center gap-1"
                            style={{ color: task.isOverdue ? P.red : P.textMid, fontWeight: task.isOverdue ? 600 : 400 }}
                          >
                            <Calendar size={10} />
                            {task.isOverdue ? '⚠ ' : ''}{format(new Date(task.dueDate), 'MMM d, yyyy')}
                          </span>
                        )}
                        {task.assignedTo && (
                          <span className="text-[11px]" style={{ color: P.textMid }}>👤 {task.assignedTo.name}</span>
                        )}
                        <span className="text-[11px]" style={{ color: P.textDim }}>
                          {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Row 2 on mobile: status badge + chevron, own line so it never overlaps the title */}
                  <div className="flex items-center justify-between sm:justify-end gap-2 sm:gap-3 sm:contents">
                    <div
                      className="px-2.5 py-1 flex items-center gap-1.5 rounded-full flex-shrink-0 text-[11px] font-semibold"
                      style={{ background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.border}` }}
                    >
                      <div className="w-1.5 h-1.5 rounded-full" style={{ background: cfg.color }} />
                      {cfg.label}
                    </div>

                    <ChevronRight size={14} color={P.textDim} className="flex-shrink-0" />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}