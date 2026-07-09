import { useState } from 'react';
import { X, Search, Loader, Users, User, Check } from 'lucide-react';
import api from '../../services/api';
import useChatStore from '../../store/chatStore';
import toast from 'react-hot-toast';

export default function NewChatModal({ onClose }) {
  const [tab, setTab] = useState('direct');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [selectedUsers, setSelectedUsers] = useState([]);
  const { setActiveConversation, setConversations, conversations } = useChatStore();

  const handleSearch = async (e) => {
    const val = e.target.value;
    setQuery(val);
    if (!val.trim()) return setResults([]);
    setLoading(true);
    try {
      const { data } = await api.get(`/conversations/search?query=${val}`);
      setResults(data);
    } catch {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const handleStartDirect = async (userId) => {
    try {
      const { data } = await api.post('/conversations', { userId });
      const exists = conversations.find(c => c._id === data._id);
      if (!exists) setConversations([data, ...conversations]);
      setActiveConversation(data);
      onClose();
    } catch {
      toast.error('Failed to start conversation');
    }
  };

  const toggleUser = (user) => {
    setSelectedUsers(prev => {
      const exists = prev.find(u => u._id === user._id);
      if (exists) return prev.filter(u => u._id !== user._id);
      return [...prev, user];
    });
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) return toast.error('Group name is required');
    if (selectedUsers.length < 2) return toast.error('Select at least 2 members');
    try {
      const { data } = await api.post('/conversations/group', {
        name: groupName,
        members: selectedUsers.map(u => u._id)
      });
      setConversations([data, ...conversations]);
      setActiveConversation(data);
      toast.success('Group created!');
      onClose();
    } catch {
      toast.error('Failed to create group');
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl border border-slate-700/60 overflow-hidden animate-[fadeIn_0.15s_ease]"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-700">
          <h2 className="text-white font-semibold text-base sm:text-lg">New Conversation</h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex px-2 pt-2 gap-1">
          <button
            onClick={() => setTab('direct')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-xl transition ${
              tab === 'direct'
                ? 'text-white bg-indigo-600'
                : 'text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            <User size={15} />
            Direct Message
          </button>
          <button
            onClick={() => setTab('group')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-xl transition ${
              tab === 'group'
                ? 'text-white bg-indigo-600'
                : 'text-slate-300 hover:text-white hover:bg-slate-700'
            }`}
          >
            <Users size={15} />
            Group Chat
          </button>
        </div>

        <div className="p-4 sm:p-5">
          {/* Group name input */}
          {tab === 'group' && (
            <input
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              placeholder="Group name..."
              className="w-full bg-slate-700/70 text-white text-sm px-4 py-2.5 rounded-xl outline-none ring-1 ring-transparent focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400 mb-3 transition"
            />
          )}

          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={handleSearch}
              placeholder="Search by name or email..."
              className="w-full bg-slate-700/70 text-white text-sm pl-10 pr-4 py-2.5 rounded-xl outline-none ring-1 ring-transparent focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-400 transition"
              autoFocus
            />
          </div>

          {/* Selected users for group */}
          {tab === 'group' && selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {selectedUsers.map(u => (
                <div
                  key={u._id}
                  className="flex items-center gap-1.5 bg-indigo-600 text-white text-xs font-medium pl-2.5 pr-1.5 py-1 rounded-full"
                >
                  {u.name}
                  <button
                    onClick={() => toggleUser(u)}
                    className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-white/20 transition"
                  >
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Results */}
          <div className="mt-3 space-y-1 max-h-56 sm:max-h-64 overflow-y-auto -mx-1 px-1">
            {loading && (
              <div className="flex justify-center py-6">
                <Loader size={20} className="text-indigo-400 animate-spin" />
              </div>
            )}

            {!loading && results.map(user => {
              const isSelected = selectedUsers.find(u => u._id === user._id);
              return (
                <div
                  key={user._id}
                  onClick={() => tab === 'direct' ? handleStartDirect(user._id) : toggleUser(user)}
                  className={`flex items-center gap-3 p-2.5 sm:p-3 rounded-xl cursor-pointer transition ${
                    isSelected ? 'bg-indigo-600' : 'hover:bg-slate-700'
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 flex items-center justify-center text-white font-semibold text-sm shrink-0">
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-white text-sm font-medium truncate">{user.name}</p>
                    <p className="text-slate-300 text-xs truncate">{user.email}</p>
                  </div>
                  {tab === 'group' && isSelected && (
                    <div className="ml-auto w-5 h-5 bg-white rounded-full flex items-center justify-center shrink-0">
                      <Check size={12} className="text-indigo-600" strokeWidth={3} />
                    </div>
                  )}
                </div>
              );
            })}

            {!loading && query && results.length === 0 && (
              <p className="text-center text-slate-400 text-sm py-6">No users found</p>
            )}

            {!loading && !query && (
              <p className="text-center text-slate-500 text-xs py-6">
                Start typing to search for people
              </p>
            )}
          </div>

          {/* Create group button */}
          {tab === 'group' && (
            <button
              onClick={handleCreateGroup}
              disabled={selectedUsers.length < 2 || !groupName.trim()}
              className="w-full mt-4 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 disabled:hover:bg-indigo-600 text-white text-sm font-semibold py-2.5 sm:py-3 rounded-xl transition"
            >
              Create Group {selectedUsers.length > 0 && `(${selectedUsers.length} members)`}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}