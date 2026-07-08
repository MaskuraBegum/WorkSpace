import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { CheckSquare, Clock, AlertCircle, Check, LayoutDashboard, MessageSquare, LogOut } from 'lucide-react';
import api from '../services/api';
import useAuthStore from '../store/authStore';
import { disconnectSocket } from '../services/socket';
import { formatDistanceToNow, format } from 'date-fns';
import toast from 'react-hot-toast';

export default function DashboardPage() {
  const { user, logout } = useAuthStore();
  const navigate = useNavigate();
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    loadTasks();
  }, [filter]);

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
    const nextStatus = {
      PENDING: 'IN_PROGRESS',
      IN_PROGRESS: 'DONE',
      DONE: 'PENDING'
    };
    try {
      const { data } = await api.put(`/tasks/${task._id}`, {
        status: nextStatus[task.status]
      });
      setTasks(prev => prev.map(t => t._id === data._id ? { ...data, isOverdue: t.isOverdue } : t));
    } catch {
      toast.error('Failed to update task');
    }
  };

  const handleLogout = () => {
    disconnectSocket();
    logout();
    navigate('/login');
  };

  const stats = {
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'PENDING').length,
    inProgress: tasks.filter(t => t.status === 'IN_PROGRESS').length,
    done: tasks.filter(t => t.status === 'DONE').length,
    overdue: tasks.filter(t => t.isOverdue).length,
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

  const filters = ['ALL', 'PENDING', 'IN_PROGRESS', 'DONE'];

  return (
    <div className="min-h-screen bg-slate-900">
      {/* Header */}
      <div className="bg-slate-800 border-b border-slate-700 px-6 py-4">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <LayoutDashboard size={16} className="text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold">Workspace Dashboard</h1>
              <p className="text-slate-400 text-xs">All your tasks across conversations</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs font-semibold">
                {user.name?.charAt(0).toUpperCase()}
              </div>
              <span className="text-white text-sm">{user.name}</span>
            </div>
            <button
              onClick={() => navigate('/')}
              className="flex items-center gap-2 text-slate-400 hover:text-white text-sm transition px-3 py-1.5 bg-slate-700 rounded-lg"
            >
              <MessageSquare size={14} />
              Chat
            </button>
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 text-slate-400 hover:text-red-400 text-sm transition px-3 py-1.5 bg-slate-700 rounded-lg"
            >
              <LogOut size={14} />
              Logout
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
          <StatCard label="Total" value={stats.total} color="bg-slate-700" icon={<CheckSquare size={18} className="text-slate-400" />} />
          <StatCard label="Todo" value={stats.pending} color="bg-slate-700" icon={<Clock size={18} className="text-slate-400" />} />
          <StatCard label="In Progress" value={stats.inProgress} color="bg-yellow-500/10" icon={<Clock size={18} className="text-yellow-400" />} />
          <StatCard label="Done" value={stats.done} color="bg-green-500/10" icon={<Check size={18} className="text-green-400" />} />
          <StatCard label="Overdue" value={stats.overdue} color="bg-red-500/10" icon={<AlertCircle size={18} className="text-red-400" />} />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-2 mb-6">
          {filters.map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition ${
                filter === f
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:text-white border border-slate-700'
              }`}
            >
              {f === 'ALL' ? 'All' :
               f === 'IN_PROGRESS' ? 'In Progress' :
               f.charAt(0) + f.slice(1).toLowerCase()}
            </button>
          ))}
          <button
            onClick={loadTasks}
            className="ml-auto text-xs text-slate-400 hover:text-white transition"
          >
            Refresh
          </button>
        </div>

        {/* Tasks list */}
        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : tasks.length === 0 ? (
          <div className="text-center py-20">
            <CheckSquare size={48} className="text-slate-600 mx-auto mb-4" />
            <p className="text-slate-400 text-lg font-medium">No tasks found</p>
            <p className="text-slate-500 text-sm mt-1">Tasks you create in conversations will appear here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.map(task => {
              const conversationName = task.conversation?.name ||
                task.conversation?.members?.find(m => m._id !== user._id)?.name ||
                'Conversation';

              return (
                <div
                  key={task._id}
                  className={`bg-slate-800 rounded-xl p-4 border ${
                    task.isOverdue ? 'border-red-500/30' : 'border-slate-700'
                  }`}
                >
                  <div className="flex items-start gap-4">
                    <button
                      onClick={() => handleStatusUpdate(task)}
                      className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition mt-0.5 ${statusColor[task.status]}`}
                    >
                      {task.status === 'DONE' && <Check size={12} />}
                      {task.status === 'IN_PROGRESS' && <div className="w-2 h-2 rounded-full bg-yellow-400" />}
                    </button>

                    <div className="flex-1 min-w-0">
                      <p className={`font-medium ${task.status === 'DONE' ? 'line-through text-slate-500' : 'text-white'}`}>
                        {task.title}
                      </p>
                      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
                        <span className="text-xs text-slate-500 flex items-center gap-1">
                          <MessageSquare size={10} />
                          {conversationName}
                        </span>
                        {task.dueDate && (
                          <span className={`text-xs flex items-center gap-1 ${task.isOverdue ? 'text-red-400' : 'text-slate-400'}`}>
                            <Clock size={10} />
                            {task.isOverdue ? 'Overdue · ' : ''}
                            {format(new Date(task.dueDate), 'MMM d, yyyy')}
                          </span>
                        )}
                        {task.assignedTo && (
                          <span className="text-xs text-slate-400">
                            👤 {task.assignedTo.name}
                          </span>
                        )}
                        <span className="text-xs text-slate-600">
                          {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true })}
                        </span>
                      </div>
                    </div>

                    <span className={`text-xs px-2 py-0.5 rounded-full border flex-shrink-0 ${statusColor[task.status]}`}>
                      {statusLabel[task.status]}
                    </span>
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

function StatCard({ label, value, color, icon }) {
  return (
    <div className={`${color} rounded-xl p-4 border border-slate-700`}>
      <div className="flex items-center justify-between mb-2">
        {icon}
        <span className="text-2xl font-bold text-white">{value}</span>
      </div>
      <p className="text-slate-400 text-xs">{label}</p>
    </div>
  );
}