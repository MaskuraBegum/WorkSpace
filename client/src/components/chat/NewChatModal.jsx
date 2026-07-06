import { useState } from 'react';
import { X, Search, Loader } from 'lucide-react';
import api from '../../services/api';
import useChatStore from '../../store/chatStore';
import toast from 'react-hot-toast';

export default function NewChatModal({ onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
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

  const handleStart = async (userId) => {
    try {
      const { data } = await api.post('/conversations', { userId });
      const exists = conversations.find(c => c._id === data._id);
      if (!exists) {
        setConversations([data, ...conversations]);
      }
      setActiveConversation(data);
      onClose();
    } catch {
      toast.error('Failed to start conversation');
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-2xl w-full max-w-md mx-4 shadow-xl">
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <h2 className="text-white font-semibold">New Conversation</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X size={20} />
          </button>
        </div>

        <div className="p-4">
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

          <div className="mt-3 space-y-1 max-h-60 overflow-y-auto">
            {loading && (
              <div className="flex justify-center py-4">
                <Loader size={20} className="text-indigo-400 animate-spin" />
              </div>
            )}
            {results.map(user => (
              <div
                key={user._id}
                onClick={() => handleStart(user._id)}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-700 cursor-pointer transition"
              >
                <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold text-sm">
                  {user.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-white text-sm font-medium">{user.name}</p>
                  <p className="text-slate-400 text-xs">{user.email}</p>
                </div>
              </div>
            ))}
            {!loading && query && results.length === 0 && (
              <p className="text-center text-slate-500 text-sm py-4">No users found</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
