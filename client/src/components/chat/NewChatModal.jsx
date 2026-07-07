import { useState } from 'react';
import { X, Search, Loader, Users, User } from 'lucide-react';
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
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-2xl w-full max-w-md mx-4 shadow-xl">

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-white font-semibold">New Conversation</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-700">
          <button
            onClick={() => setTab('direct')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition ${
              tab === 'direct'
                ? 'text-indigo-400 border-b-2 border-indigo-500'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <User size={14} />
            Direct Message
          </button>
          <button
            onClick={() => setTab('group')}
            className={`flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition ${
              tab === 'group'
                ? 'text-indigo-400 border-b-2 border-indigo-500'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Users size={14} />
            Group Chat
          </button>
        </div>

        <div className="p-4">
          {/* Search */}
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={handleSearch}
              placeholder="Search by name or email..."
              className="w-full bg-slate-700 text-white text-sm pl-9 pr-4 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500"
              autoFocus
            />
          </div>

          {/* Group name input */}
          {tab === 'group' && (
            <input
              value={groupName}
              onChange={e => setGroupName(e.target.value)}
              placeholder="Group name..."
              className="w-full bg-slate-700 text-white text-sm px-4 py-2.5 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500 mt-2"
            />
          )}

          {/* Selected users for group */}
          {tab === 'group' && selectedUsers.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {selectedUsers.map(u => (
                <div
                  key={u._id}
                  className="flex items-center gap-1 bg-indigo-600 text-white text-xs px-2 py-1 rounded-full"
                >
                  {u.name}
                  <button onClick={() => toggleUser(u)}>
                    <X size={10} />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Results */}
          <div className="mt-3 space-y-1 max-h-48 overflow-y-auto">
            {loading && (
              <div className="flex justify-center py-4">
                <Loader size={20} className="text-indigo-400 animate-spin" />
              </div>
            )}
            {results.map(user => {
              const isSelected = selectedUsers.find(u => u._id === user._id);
              return (
                <div
                  key={user._id}
                  onClick={() => tab === 'direct' ? handleStartDirect(user._id) : toggleUser(user)}
                  className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition ${
                    isSelected ? 'bg-indigo-600' : 'hover:bg-slate-700'
                  }`}
                >
                  <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold text-sm flex-shrink-0">
                    {user.name?.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-white text-sm font-medium">{user.name}</p>
                    <p className="text-slate-400 text-xs">{user.email}</p>
                  </div>
                  {tab === 'group' && isSelected && (
                    <div className="ml-auto w-5 h-5 bg-white rounded-full flex items-center justify-center">
                      <X size={10} className="text-indigo-600" />
                    </div>
                  )}
                </div>
              );
            })}
            {!loading && query && results.length === 0 && (
              <p className="text-center text-slate-500 text-sm py-4">No users found</p>
            )}
          </div>

          {/* Create group button */}
          {tab === 'group' && (
            <button
              onClick={handleCreateGroup}
              disabled={selectedUsers.length < 2 || !groupName.trim()}
              className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white text-sm font-medium py-2.5 rounded-xl transition"
            >
              Create Group ({selectedUsers.length} members)
            </button>
          )}
        </div>
      </div>
    </div>
  );
}