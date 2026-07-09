import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  CheckSquare, Clock, AlertCircle, Check,
  LayoutDashboard, MessageSquare, LogOut,
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

  const s = (style) => style;

  return (
    <div style={s({ minHeight:'100vh', background: P.bg, color: P.text, fontFamily: "'Inter', sans-serif" })}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        .task-row:hover { background: #1f1f1f !important; border-color: ${P.borderHover} !important; }
        .filter-btn:hover { border-color: ${P.goldDim} !important; color: ${P.gold} !important; }
        .nav-btn:hover { background: ${P.goldGlow} !important; color: ${P.gold} !important; border-color: ${P.border} !important; }
        .logout-btn:hover { background: rgba(248,113,113,0.08) !important; color: ${P.red} !important; }
        .status-btn:hover { opacity: 0.8; transform: scale(1.1); }
        .go-chat:hover { background: ${P.goldDim} !important; }
      `}</style>

      {/* ── Header ── */}
      <header style={s({
        background: P.surface,
        borderBottom: `1px solid ${P.border}`,
        padding: '0 32px', height: '60px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        position: 'sticky', top: 0, zIndex: 50,
      })}>
        <div style={s({ display:'flex', alignItems:'center', gap:'12px' })}>
          <div style={s({
            width:'36px', height:'36px', borderRadius:'10px',
            background: `linear-gradient(135deg, ${P.gold}, ${P.goldDim})`,
            display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
            boxShadow: `0 0 16px ${P.goldGlow}`
          })}>
            <Zap size={17} color="#0d0d0d" fill="#0d0d0d" />
          </div>
          <div>
            <div style={s({ fontWeight:800, fontSize:'15px', color: P.text, letterSpacing:'-0.3px' })}>WorkSpace</div>
            <div style={s({ fontSize:'11px', color: P.textMid })}>Task Dashboard</div>
          </div>
        </div>

        <div style={s({ display:'flex', alignItems:'center', gap:'8px' })}>
          <div style={s({ display:'flex', alignItems:'center', gap:'8px', marginRight:'12px' })}>
            <div style={s({
              width:'30px', height:'30px', borderRadius:'50%',
              background: `linear-gradient(135deg, ${P.gold}, ${P.goldDim})`,
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:'12px', fontWeight:800, color:'#0d0d0d', flexShrink:0
            })}>
              {user.name?.charAt(0).toUpperCase()}
            </div>
            <span style={s({ fontSize:'13px', color: P.textMid })}>{user.name}</span>
          </div>

          <button className="nav-btn" onClick={() => navigate('/')} style={s({
            display:'flex', alignItems:'center', gap:'6px', padding:'6px 12px',
            borderRadius:'8px', background:'transparent', border:`1px solid ${P.border}`,
            color: P.textMid, fontSize:'12px', fontWeight:500, cursor:'pointer', transition:'all 0.15s'
          })}>
            <MessageSquare size={13} /> Chat
          </button>

          <button className="logout-btn" onClick={handleLogout} style={s({
            display:'flex', alignItems:'center', gap:'6px', padding:'6px 12px',
            borderRadius:'8px', background:'transparent', border:`1px solid ${P.border}`,
            color: P.textMid, fontSize:'12px', fontWeight:500, cursor:'pointer', transition:'all 0.15s'
          })}>
            <LogOut size={13} /> Logout
          </button>
        </div>
      </header>

      {/* ── Body ── */}
      <div style={s({ maxWidth:'1100px', margin:'0 auto', padding:'36px 32px 80px', width:'100%', boxSizing:'border-box' })}>

        {/* Greeting + ring */}
        <div style={s({ display:'flex', alignItems:'flex-end', justifyContent:'space-between', marginBottom:'36px', flexWrap:'wrap', gap:'16px' })}>
          <div>
            <h2 style={s({ fontSize:'26px', fontWeight:800, color: P.text, letterSpacing:'-0.5px', marginBottom:'6px' })}>
              Hey, {user.name?.split(' ')[0]} 👋
            </h2>
            <p style={s({ fontSize:'14px', color: P.textMid })}>
              {stats.total === 0
                ? 'No tasks yet — create one inside a conversation.'
                : stats.pending + stats.inProgress === 0
                  ? '🎉 All tasks complete! Excellent work.'
                  : `${stats.pending + stats.inProgress} task${stats.pending + stats.inProgress !== 1 ? 's' : ''} still in progress`}
            </p>
          </div>

          {stats.total > 0 && (
            <div style={s({ display:'flex', flexDirection:'column', alignItems:'center', gap:'4px' })}>
              <div style={s({ position:'relative', width:'60px', height:'60px' })}>
                <svg viewBox="0 0 36 36" style={s({ width:'60px', height:'60px', transform:'rotate(-90deg)' })}>
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
                <div style={s({
                  position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
                  fontSize:'12px', fontWeight:800, color: P.gold
                })}>
                  {donePercent}%
                </div>
              </div>
              <span style={s({ fontSize:'10px', color: P.textMid, fontWeight:500 })}>Complete</span>
            </div>
          )}
        </div>

        {/* ── Stat cards ── */}
        <div style={s({ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:'12px', marginBottom:'28px' })}>
          {[
            { label:'Total Tasks',  value: stats.total,      accent: P.gold,   icon: <TrendingUp size={15}/> },
            { label:'To Do',        value: stats.pending,    accent: P.slate,  icon: <CheckSquare size={15}/> },
            { label:'In Progress',  value: stats.inProgress, accent: P.yellow, icon: <Clock size={15}/> },
            { label:'Done',         value: stats.done,       accent: P.green,  icon: <Check size={15}/> },
            { label:'Overdue',      value: stats.overdue,    accent: P.red,    icon: <AlertCircle size={15}/> },
          ].map(({ label, value, accent, icon }) => (
            <div key={label} style={s({
              background: P.card,
              border: `1px solid ${P.border}`,
              borderRadius:'14px', padding:'18px 16px',
              display:'flex', flexDirection:'column', gap:'14px',
              boxShadow: value > 0 ? `0 0 0 1px ${accent}15` : 'none',
            })}>
              <div style={s({ display:'flex', alignItems:'center', justifyContent:'space-between' })}>
                <div style={s({
                  width:'32px', height:'32px', borderRadius:'8px',
                  background:`${accent}15`, display:'flex', alignItems:'center',
                  justifyContent:'center', color: accent
                })}>
                  {icon}
                </div>
                <span style={s({ fontSize:'30px', fontWeight:900, color: value > 0 ? P.text : P.textDim, lineHeight:1 })}>{value}</span>
              </div>
              <p style={s({ fontSize:'11px', fontWeight:600, color: accent, opacity: 0.75, textTransform:'uppercase', letterSpacing:'0.5px' })}>{label}</p>
            </div>
          ))}
        </div>

        {/* ── Filter bar ── */}
        <div style={s({ display:'flex', alignItems:'center', gap:'8px', marginBottom:'20px', flexWrap:'wrap' })}>
          {filters.map(f => (
            <button
              key={f.key}
              className={filter === f.key ? '' : 'filter-btn'}
              onClick={() => setFilter(f.key)}
              style={s({
                padding:'6px 14px', borderRadius:'8px', fontSize:'12px', fontWeight:500,
                cursor:'pointer', transition:'all 0.15s',
                background: filter === f.key ? P.gold : 'transparent',
                border: `1px solid ${filter === f.key ? P.gold : P.border}`,
                color: filter === f.key ? '#0d0d0d' : P.textMid,
              })}
            >
              {f.label} <span style={{ opacity:0.6 }}>({f.count})</span>
            </button>
          ))}
          <button
            className="filter-btn"
            onClick={loadTasks}
            style={s({
              marginLeft:'auto', padding:'6px 14px', borderRadius:'8px',
              fontSize:'12px', fontWeight:500, cursor:'pointer', transition:'all 0.15s',
              background:'transparent', border:`1px solid ${P.border}`, color: P.textMid,
            })}
          >
            ↻ Refresh
          </button>
        </div>

        {/* ── Divider ── */}
        <div style={s({ height:'1px', background:`linear-gradient(90deg, ${P.gold}40, transparent)`, marginBottom:'20px' })} />

        {/* ── Task list ── */}
        {loading ? (
          <div style={s({ display:'flex', justifyContent:'center', paddingTop:'80px' })}>
            <div style={s({
              width:'36px', height:'36px', borderRadius:'50%',
              border:`3px solid ${P.gold}`, borderTopColor:'transparent',
              animation:'spin 0.7s linear infinite'
            })} />
          </div>
        ) : tasks.length === 0 ? (
          <div style={s({
            textAlign:'center', padding:'72px 24px',
            background: P.card, borderRadius:'18px', border:`1px solid ${P.border}`,
            animation:'fadeUp 0.4s ease'
          })}>
            <div style={s({
              width:'60px', height:'60px', borderRadius:'16px',
              background:`${P.gold}15`, display:'flex', alignItems:'center',
              justifyContent:'center', margin:'0 auto 16px'
            })}>
              <CheckSquare size={26} color={P.goldDim} />
            </div>
            <p style={s({ fontSize:'16px', fontWeight:700, color: P.text, marginBottom:'6px' })}>No tasks here</p>
            <p style={s({ fontSize:'13px', color: P.textMid, marginBottom:'24px' })}>
              Head to a conversation and create your first task.
            </p>
            <button
              className="go-chat"
              onClick={() => navigate('/')}
              style={s({
                padding:'9px 22px', borderRadius:'10px',
                background: P.gold, color:'#0d0d0d', border:'none',
                fontSize:'13px', fontWeight:700, cursor:'pointer', transition:'background 0.15s'
              })}
            >
              Open Chat →
            </button>
          </div>
        ) : (
          <div style={s({ display:'flex', flexDirection:'column', gap:'8px', animation:'fadeUp 0.3s ease' })}>
            {tasks.map((task, i) => {
              const cfg = statusCfg[task.status];
              const conversationName = task.conversation?.name ||
                task.conversation?.members?.find(m => m._id !== user._id)?.name ||
                'Conversation';

              return (
                <div
                  key={task._id}
                  className="task-row"
                  style={s({
                    background: P.card,
                    borderRadius:'14px', padding:'16px 20px',
                    border: task.isOverdue ? `1px solid rgba(248,113,113,0.25)` : `1px solid ${P.border}`,
                    display:'flex', alignItems:'center', gap:'16px',
                    transition:'all 0.15s', cursor:'default',
                    animation:`fadeUp 0.3s ease ${i * 0.04}s both`
                  })}
                >
                  {/* Status toggle */}
                  <button
                    className="status-btn"
                    onClick={() => handleStatusUpdate(task)}
                    title="Click to change status"
                    style={s({
                      width:'22px', height:'22px', borderRadius:'50%',
                      border:`2px solid ${cfg.color}`,
                      background: task.status !== 'PENDING' ? cfg.bg : 'transparent',
                      display:'flex', alignItems:'center', justifyContent:'center',
                      cursor:'pointer', flexShrink:0, transition:'all 0.15s'
                    })}
                  >
                    {task.status === 'DONE' && <Check size={11} color={P.green} />}
                    {task.status === 'IN_PROGRESS' && (
                      <div style={s({ width:'8px', height:'8px', borderRadius:'50%', background: P.yellow })} />
                    )}
                  </button>

                  {/* Title + meta */}
                  <div style={s({ flex:1, minWidth:0 })}>
                    <p style={s({
                      fontSize:'14px', fontWeight:500, lineHeight:1.4,
                      color: task.status === 'DONE' ? P.textDim : P.text,
                      textDecoration: task.status === 'DONE' ? 'line-through' : 'none',
                      marginBottom:'5px'
                    })}>
                      {task.title}
                    </p>
                    <div style={s({ display:'flex', alignItems:'center', gap:'14px', flexWrap:'wrap' })}>
                      <span style={s({ fontSize:'11px', color: P.textMid, display:'flex', alignItems:'center', gap:'4px' })}>
                        <MessageSquare size={10} /> {conversationName}
                      </span>
                      {task.dueDate && (
                        <span style={s({
                          fontSize:'11px', display:'flex', alignItems:'center', gap:'4px',
                          color: task.isOverdue ? P.red : P.textMid, fontWeight: task.isOverdue ? 600 : 400
                        })}>
                          <Calendar size={10} />
                          {task.isOverdue ? '⚠ ' : ''}{format(new Date(task.dueDate), 'MMM d, yyyy')}
                        </span>
                      )}
                      {task.assignedTo && (
                        <span style={s({ fontSize:'11px', color: P.textMid })}>👤 {task.assignedTo.name}</span>
                      )}
                      <span style={s({ fontSize:'11px', color: P.textDim })}>
                        {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>

                  {/* Status badge */}
                  <div style={s({
                    display:'flex', alignItems:'center', gap:'6px',
                    padding:'4px 10px', borderRadius:'20px', flexShrink:0,
                    fontSize:'11px', fontWeight:600,
                    background: cfg.bg, color: cfg.color, border:`1px solid ${cfg.border}`
                  })}>
                    <div style={s({ width:'6px', height:'6px', borderRadius:'50%', background: cfg.color })} />
                    {cfg.label}
                  </div>

                  <ChevronRight size={14} color={P.textDim} style={{ flexShrink:0 }} />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}