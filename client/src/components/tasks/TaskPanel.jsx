import { useState, useEffect } from 'react';
import { Plus, Check, Clock, Trash2, User } from 'lucide-react';
import api from '../../services/api';
import useAuthStore from '../../store/authStore';
import { getSocket } from '../../services/socket';
import toast from 'react-hot-toast';
import { format } from 'date-fns';

export default function TaskPanel({ conversationId }) {
  const { user } = useAuthStore();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', dueDate: '' });

  useEffect(() => {
    if (!conversationId) return;
    loadTasks();

    const socket = getSocket();
    socket?.on('task:updated', ({ task }) => {
      setTasks(prev => prev.map(t => t._id === task._id ? task : t));
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
    if (!form.title.trim()) return;
    try {
      const { data } = await api.post('/tasks', {
        conversationId,
        title: form.title,
        dueDate: form.dueDate || null
      });
      setTasks(prev => [data, ...prev]);
      setForm({ title: '', dueDate: '' });
      setShowForm(false);

      // Notify other user via socket
      getSocket()?.emit('task:update', { conversationId, task: data });
      toast.success('Task created!');
    } catch {
      toast.error('Failed to create task');
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
      setTasks(prev => prev.map(t => t._id === data._id ? data : t));
      getSocket()?.emit('task:update', { conversationId, task: data });
    } catch {
      toast.error('Failed to update task');
    }
  };

  const handleDelete = async (taskId) => {
    try {
      await api.delete(`/tasks/${taskId}`);
      setTasks(prev => prev.filter(t => t._id !== taskId));
      toast.success('Task deleted');
    } catch {
      toast.error('Failed to delete task');
    }
  };

  const statusColor = {
    PENDING: 'text-slate-400 border-slate-600',
    IN_PROGRESS: 'text-yellow-400 border-yellow-600',
    DONE: 'text-green-400 border-green-600'
  };

  const statusLabel = {
    PENDING: 'Todo',
    IN_PROGRESS: 'In Progress',
    DONE: 'Done'
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <span className="text-white text-sm font-medium">
          {tasks.length} task{tasks.length !== 1 ? 's' : ''}
        </span>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-3 py-1.5 rounded-lg transition"
        >
          <Plus size={12} />
          Add Task
        </button>
      </div>

      {/* Add task form */}
      {showForm && (
        <form onSubmit={handleCreate} className="p-4 border-b border-slate-700 space-y-2">
          <input
            value={form.title}
            onChange={e => setForm({ ...form, title: e.target.value })}
            placeholder="Task title..."
            className="w-full bg-slate-700 text-white text-sm px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500"
            autoFocus
          />
          <input
            type="date"
            value={form.dueDate}
            onChange={e => setForm({ ...form, dueDate: e.target.value })}
            className="w-full bg-slate-700 text-white text-sm px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white text-sm py-1.5 rounded-lg transition"
            >
              Create
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-sm py-1.5 rounded-lg transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      {/* Tasks list */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2">
        {loading ? (
          <p className="text-slate-500 text-sm text-center mt-8">Loading...</p>
        ) : tasks.length === 0 ? (
          <div className="text-center mt-8">
            <CheckSquare size={32} className="text-slate-600 mx-auto mb-2" />
            <p className="text-slate-500 text-sm">No tasks yet</p>
            <p className="text-slate-600 text-xs mt-1">Add a task or convert a message</p>
          </div>
        ) : (
          tasks.map(task => (
            <div
              key={task._id}
              className="bg-slate-700 rounded-xl p-3 space-y-2"
            >
              <div className="flex items-start justify-between gap-2">
                <button
                  onClick={() => handleStatus(task)}
                  className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition ${statusColor[task.status]}`}
                >
                  {task.status === 'DONE' && <Check size={10} />}
                  {task.status === 'IN_PROGRESS' && <div className="w-2 h-2 rounded-full bg-yellow-400" />}
                </button>
                <p className={`flex-1 text-sm ${task.status === 'DONE' ? 'line-through text-slate-500' : 'text-white'}`}>
                  {task.title}
                </p>
                <button
                  onClick={() => handleDelete(task._id)}
                  className="text-slate-500 hover:text-red-400 transition flex-shrink-0"
                >
                  <Trash2 size={14} />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <span className={`text-xs px-2 py-0.5 rounded-full border ${statusColor[task.status]}`}>
                  {statusLabel[task.status]}
                </span>
                {task.dueDate && (
                  <div className="flex items-center gap-1 text-xs text-slate-400">
                    <Clock size={10} />
                    {format(new Date(task.dueDate), 'MMM d')}
                  </div>
                )}
              </div>

              {task.assignedTo && (
                <div className="flex items-center gap-1 text-xs text-slate-400">
                  <User size={10} />
                  {task.assignedTo.name}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
