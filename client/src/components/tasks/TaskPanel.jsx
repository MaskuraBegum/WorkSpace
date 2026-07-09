import { useState, useEffect } from 'react';
import { Plus, Check, Clock, Trash2, User, CheckSquare, Save } from 'lucide-react';
import api from '../../services/api';
import { getSocket } from '../../services/socket';
import useChatStore from '../../store/chatStore';
import toast from 'react-hot-toast';
import { format } from 'date-fns';
import { P } from '../../theme';

export default function TaskPanel({ conversationId }) {
  const { tasks, setTasks, addTask, updateTask, removeTask } = useChatStore();
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ title: '', dueDate: '' });

  useEffect(() => {
    if (!conversationId) return;
    loadTasks();

    const socket = getSocket();
    socket?.on('task:updated', ({ task, isNew }) => {
      if (isNew) {
        addTask(task);
      } else {
        updateTask(task);
      }
    });

    return () => socket?.off('task:updated');
  }, [conversationId]);

  const loadTasks = async () => {
    try {
      setLoading(true);
      const { data } = await api.get(`/tasks/${conversationId}`);
      setTasks(data);
    } catch {
      toast.error('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!form.title.trim() || creating) return;
    setCreating(true);
    setShowForm(false);

    try {
      const { data } = await api.post('/tasks', {
        conversationId,
        title: form.title,
        dueDate: form.dueDate || null
      });

      // Add to store immediately
      addTask(data);
      setForm({ title: '', dueDate: '' });

      // Notify other user
      getSocket()?.emit('task:update', { conversationId, task: data, isNew: true });
      toast.success('Task created!');
    } catch {
      toast.error('Failed to create task');
      setShowForm(true);
    } finally {
      setCreating(false);
    }
  };

  const handleStatus = async (task) => {
    const nextStatus = {
      PENDING: 'IN_PROGRESS',
      IN_PROGRESS: 'DONE',
      DONE: 'PENDING'
    };
    try {
      const { data } = await api.put(`/tasks/${task._id}`, {
        status: nextStatus[task.status]
      });
      updateTask(data);
      getSocket()?.emit('task:update', { conversationId, task: data, isNew: false });
    } catch {
      toast.error('Failed to update task');
    }
  };

  const handleDelete = async (taskId) => {
    try {
      await api.delete(`/tasks/${taskId}`);
      removeTask(taskId);
      toast.success('Task deleted');
    } catch {
      toast.error('Failed to delete task');
    }
  };

  // Same status keys/values as before — only the color tokens now map to the P theme
  const statusColor = {
    PENDING: { text: P.textMid, border: P.textMid, dot: P.textMid },
    IN_PROGRESS: { text: P.gold, border: P.goldDim, dot: P.gold },
    DONE: { text: P.green, border: P.green, dot: P.green }
  };

  const statusLabel = {
    PENDING: 'Todo',
    IN_PROGRESS: 'In Progress',
    DONE: 'Done'
  };

  return (
    <div className="flex flex-col h-full" style={{ background: P.surface }}>
      <style>{`
        @keyframes tp-spin { to { transform: rotate(360deg); } }
        @keyframes tp-fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        .tp-input:focus { border-color: ${P.gold} !important; box-shadow: 0 0 0 3px ${P.goldGlow}; }
        .tp-save-btn:hover { background: ${P.goldDim} !important; transform: translateY(-1px); }
        .tp-cancel-btn:hover { background: ${P.borderHover} !important; }
        .tp-delete-btn:hover { color: ${P.red} !important; background: rgba(248,113,113,0.1) !important; }
        .tp-card { transition: all 0.18s ease; }
        .tp-card:hover { border-color: ${P.borderHover} !important; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(0,0,0,0.25); }
        .tp-check:hover { filter: brightness(1.15); }
      `}</style>

      {/* Header */}
      <div
        className="px-4 flex items-center justify-between shrink-0 gap-3"
        style={{ borderBottom: `1px solid ${P.border}`, paddingTop: '18px', paddingBottom: '18px' }}
      >
        <span className="text-sm font-semibold truncate" style={{ color: P.text, lineHeight: 1.4 }}>
          {tasks.length} task{tasks.length !== 1 ? 's' : ''}
        </span>
        <button
          onClick={() => setShowForm(!showForm)}
          className="tp-save-btn flex items-center gap-1.5 text-sm font-bold rounded-lg transition shrink-0"
          style={{ background: P.gold, color: '#0d0d0d', boxShadow: `0 2px 10px ${P.goldGlow}`, padding: '10px 16px', lineHeight: 1 }}
        >
          <Plus size={14} strokeWidth={2.5} />
          Add Task
        </button>
      </div>

      {/* Create form */}
      {showForm && (
        <form
          onSubmit={handleCreate}
          className="p-4 space-y-3 shrink-0"
          style={{ borderBottom: `1px solid ${P.border}`, background: 'rgba(0,0,0,0.15)', animation: 'tp-fadeUp 0.2s ease' }}
        >
          <label className="block text-xs font-semibold" style={{ color: P.textMid, marginBottom: '-4px' }}>Title</label>
          <input
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder="Task title..."
            className="tp-input w-full text-sm font-medium rounded-xl outline-none transition"
            style={{ background: P.card, color: P.text, border: `1px solid ${P.border}`, padding: '12px 14px', lineHeight: 1.4 }}
            autoFocus
          />
          <label className="block text-xs font-semibold" style={{ color: P.textMid, marginBottom: '-4px' }}>Due date</label>
          <input
            type="date"
            value={form.dueDate}
            onChange={e => setForm({ ...form, dueDate: e.target.value })}
            className="tp-input w-full text-sm font-medium rounded-xl outline-none transition"
            style={{ background: P.card, color: P.text, border: `1px solid ${P.border}`, padding: '12px 14px', lineHeight: 1.4, colorScheme: 'dark' }}
          />
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={creating}
              className="tp-save-btn flex-1 flex items-center justify-center gap-1.5 disabled:opacity-50 text-sm font-bold rounded-xl transition"
              style={{ background: P.gold, color: '#0d0d0d', padding: '12px 0', lineHeight: 1 }}
            >
              <Save size={14} />
              {creating ? 'Creating...' : 'Create'}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="tp-cancel-btn flex-1 text-sm font-semibold rounded-xl transition"
              style={{ background: P.card, color: P.text, border: `1px solid ${P.border}`, padding: '12px 0', lineHeight: 1 }}
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Task list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
        {loading ? (
          <div className="flex items-center justify-center" style={{ paddingTop: '56px' }}>
            <div style={{ width: '18px', height: '18px', border: `2px solid ${P.border}`, borderTopColor: P.gold, borderRadius: '50%', animation: 'tp-spin 0.7s linear infinite' }} />
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center" style={{ paddingTop: '56px' }}>
            <div style={{
              width: '52px', height: '52px', borderRadius: '14px', background: P.goldGlow,
              display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
            }}>
              <CheckSquare size={22} style={{ color: P.goldDim }} />
            </div>
            <p className="text-base font-semibold" style={{ color: P.text, lineHeight: 1.5 }}>No tasks yet</p>
            <p className="text-sm mt-2" style={{ color: P.textMid, lineHeight: 1.5 }}>Add a task or convert a message</p>
          </div>
        ) : (
          tasks.map((task, i) => {
            const sc = statusColor[task.status];
            return (
              <div
                key={task._id}
                className="tp-card rounded-2xl"
                style={{ background: P.card, border: `1px solid ${P.border}`, animation: `tp-fadeUp 0.25s ease ${i * 0.03}s both`, padding: '14px' }}
              >
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => handleStatus(task)}
                    className="tp-check shrink-0 transition"
                    style={{
                      width: '24px', height: '24px', borderRadius: '50%',
                      border: `2px solid ${sc.border}`, display: 'flex', alignItems: 'center',
                      justifyContent: 'center', marginTop: '1px',
                      background: task.status === 'DONE' ? P.green : 'transparent',
                    }}
                  >
                    {task.status === 'DONE' && <Check size={12} color="#0d0d0d" strokeWidth={3} />}
                    {task.status === 'IN_PROGRESS' && <div style={{ width: '9px', height: '9px', borderRadius: '50%', background: P.gold }} />}
                  </button>

                  <p
                    className="flex-1 text-sm font-semibold min-w-0"
                    style={{
                      color: task.status === 'DONE' ? P.textDim : P.text,
                      textDecoration: task.status === 'DONE' ? 'line-through' : 'none',
                      lineHeight: 1.5, paddingTop: '1px', wordBreak: 'break-word',
                    }}
                  >
                    {task.title}
                  </p>

                  <button
                    onClick={() => handleDelete(task._id)}
                    className="tp-delete-btn transition shrink-0"
                    style={{ color: P.textMid, width: '30px', height: '30px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <Trash2 size={15} />
                  </button>
                </div>

                <div className="flex items-center justify-between flex-wrap gap-2" style={{ marginTop: '10px', paddingLeft: '36px' }}>
                  <span
                    className="text-xs font-bold rounded-full"
                    style={{ color: sc.text, border: `1.5px solid ${sc.border}`, padding: '4px 12px', lineHeight: 1.4, letterSpacing: '0.02em' }}
                  >
                    {statusLabel[task.status]}
                  </span>

                  <div className="flex items-center gap-3">
                    {task.dueDate && (
                      <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: P.text, lineHeight: 1.4 }}>
                        <Clock size={12} style={{ color: P.textMid }} />
                        {format(new Date(task.dueDate), 'MMM d')}
                      </div>
                    )}
                    {task.assignedTo && (
                      <div className="flex items-center gap-1.5 text-xs font-medium" style={{ color: P.text, lineHeight: 1.4 }}>
                        <User size={12} style={{ color: P.textMid }} />
                        {task.assignedTo.name}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}