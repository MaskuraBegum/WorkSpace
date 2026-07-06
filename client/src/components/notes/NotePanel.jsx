import { useState, useEffect, useRef } from 'react';
import api from '../../services/api';
import { getSocket } from '../../services/socket';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

export default function NotePanel({ conversationId }) {
  const { user } = useAuthStore();
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const saveTimeout = useRef(null);

  useEffect(() => {
    if (!conversationId) return;
    loadNote();

    const socket = getSocket();
    socket?.on('note:updated', ({ content: newContent, updatedBy }) => {
      if (updatedBy !== user._id) {
        setContent(newContent);
      }
    });

    return () => socket?.off('note:updated');
  }, [conversationId]);

  const loadNote = async () => {
    try {
      const { data } = await api.get(`/notes/${conversationId}`);
      setContent(data.content || '');
      setLastUpdated(data.updatedAt);
    } catch {
      toast.error('Failed to load note');
    }
  };

  const handleChange = (e) => {
    const val = e.target.value;
    setContent(val);

    // Emit to other user in real-time
    getSocket()?.emit('note:update', {
      conversationId,
      content: val,
      userId: user._id
    });

    // Auto save after 1 second of no typing
    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      try {
        setSaving(true);
        await api.put(`/notes/${conversationId}`, { content: val });
        setLastUpdated(new Date().toISOString());
      } catch {
        toast.error('Failed to save note');
      } finally {
        setSaving(false);
      }
    }, 1000);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="p-4 border-b border-slate-700 flex items-center justify-between">
        <span className="text-white text-sm font-medium">Shared Notes</span>
        <span className="text-xs text-slate-500">
          {saving ? 'Saving...' : 'Auto-saved'}
        </span>
      </div>

      {/* Note editor */}
      <div className="flex-1 p-4">
        <textarea
          value={content}
          onChange={handleChange}
          placeholder="Start typing your shared notes here... Both users can edit this in real-time!"
          className="w-full h-full bg-slate-700 text-white text-sm p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500 resize-none leading-relaxed"
        />
      </div>
    </div>
  );
}
