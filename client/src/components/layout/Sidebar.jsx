import { useState } from 'react';
import { Search, Plus, LogOut, MessageSquare, LayoutDashboard } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import useChatStore from '../../store/chatStore';
import { disconnectSocket } from '../../services/socket';
import api from '../../services/api';
import ConversationItem from '../chat/ConversationItem';
import NewChatModal from '../chat/NewChatModal';
import { useNavigate } from 'react-router-dom';

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const { conversations, activeConversation, setActiveConversation } = useChatStore();
  const [search, setSearch] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    disconnectSocket();
    logout();
    navigate('/login');
  };

  const filtered = conversations.filter(c => {
    const other = c.members?.find(m => m._id !== user._id);
    const name = c.isGroup ? c.name : other?.name || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="w-80 bg-slate-800 flex flex-col border-r border-slate-700 flex-shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-slate-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <MessageSquare size={16} className="text-white" />
            </div>
            <span className="font-bold text-white">WorkSpace</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowNewChat(true)}
              className="w-8 h-8 bg-slate-700 hover:bg-slate-600 rounded-lg flex items-center justify-center transition"
            >
              <Plus size={16} className="text-slate-300" />
            </button>
            <button
              onClick={handleLogout}
              className="w-8 h-8 bg-slate-700 hover:bg-red-600 rounded-lg flex items-center justify-center transition"
            >
              <LogOut size={16} className="text-slate-300" />
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-8 h-8 bg-slate-700 hover:bg-indigo-600 rounded-lg flex items-center justify-center transition"
              title="Dashboard"
            >
              <LayoutDashboard size={16} className="text-slate-300" />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="w-full bg-slate-700 text-white text-sm pl-9 pr-4 py-2 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500"
          />
        </div>
      </div>

      {/* User info */}
      <div className="px-4 py-3 border-b border-slate-700 flex items-center gap-3">
        <div className="w-8 h-8 rounded-full bg-indigo-600 flex items-center justify-center text-white text-sm font-semibold flex-shrink-0">
          {user.name?.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-white text-sm font-medium truncate">{user.name}</p>
          <p className="text-slate-400 text-xs truncate">{user.email}</p>
        </div>
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="p-4 text-center text-slate-500 text-sm mt-8">
            {search ? 'No conversations found' : 'No conversations yet. Start one!'}
          </div>
        ) : (
          filtered.map(conversation => (
            <ConversationItem
              key={conversation._id}
              conversation={conversation}
              isActive={activeConversation?._id === conversation._id}
              onClick={() => setActiveConversation(conversation)}
            />
          ))
        )}
      </div>

      {showNewChat && <NewChatModal onClose={() => setShowNewChat(false)} />}
    </div>
  );
}
