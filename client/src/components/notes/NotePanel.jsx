import { useState, useEffect, useRef } from 'react';
import { Link, Plus, X, ExternalLink, FileText, Save } from 'lucide-react';
import api from '../../services/api';
import { getSocket } from '../../services/socket';
import useAuthStore from '../../store/authStore';
import toast from 'react-hot-toast';

export default function NotePanel({ conversationId }) {
  const { user } = useAuthStore();
  const [tab, setTab] = useState('notes');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [links, setLinks] = useState([]);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkForm, setLinkForm] = useState({ url: '', name: '' });
  const [addingLink, setAddingLink] = useState(false);
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

    socket?.on('note:link_added', ({ link }) => {
      setLinks(prev => {
        const exists = prev.find(l => l._id === link._id);
        if (exists) return prev;
        return [link, ...prev];
      });
    });

    socket?.on('note:link_removed', ({ linkId }) => {
      setLinks(prev => prev.filter(l => l._id !== linkId));
    });

    return () => {
      socket?.off('note:updated');
      socket?.off('note:link_added');
      socket?.off('note:link_removed');
    };
  }, [conversationId]);

  const loadNote = async () => {
    try {
      const { data } = await api.get(`/notes/${conversationId}`);
      setContent(data.content || '');
      setLinks(data.links || []);
    } catch {
      toast.error('Failed to load note');
    }
  };

  const handleChange = (e) => {
    const val = e.target.value;
    setContent(val);

    getSocket()?.emit('note:update', {
      conversationId,
      content: val,
      userId: user._id
    });

    clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(async () => {
      try {
        setSaving(true);
        await api.put(`/notes/${conversationId}`, { content: val });
      } catch {
        toast.error('Failed to save note');
      } finally {
        setSaving(false);
      }
    }, 1000);
  };

  const handleAddLink = async (e) => {
    e.preventDefault();
    if (!linkForm.url.trim()) return toast.error('URL is required');
    if (!linkForm.name.trim()) return toast.error('Link name is required');
    if (addingLink) return;
  
    let url = linkForm.url.trim();
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
  
    setAddingLink(true);
    try {
      const { data } = await api.put(`/notes/${conversationId}/links`, {
        url,
        name: linkForm.name.trim()
      });
  
      const newLink = data.note.links[data.note.links.length - 1];
      setLinks(data.note.links);
      setLinkForm({ url: '', name: '' });
      setShowLinkForm(false);
  
      // Emit link added to other user
      getSocket()?.emit('note:link_add', {
        conversationId,
        link: newLink
      });
  
      // Emit auto message to conversation room
      if (data.message) {
        getSocket()?.emit('message:broadcast', {
          conversationId,
          message: data.message
        });
      }
  
      toast.success('Link saved!');
    } catch {
      toast.error('Failed to save link');
    } finally {
      setAddingLink(false);
    }
  };

  const handleDeleteLink = async (linkId) => {
    try {
      await api.delete(`/notes/${conversationId}/links/${linkId}`);
      setLinks(prev => prev.filter(l => l._id !== linkId));
      getSocket()?.emit('note:link_remove', {
        conversationId,
        linkId
      });
      toast.success('Link removed');
    } catch {
      toast.error('Failed to remove link');
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Tabs */}
      <div className="flex border-b border-slate-700">
        <button
          onClick={() => setTab('notes')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-medium transition ${
            tab === 'notes'
              ? 'text-indigo-400 border-b-2 border-indigo-500'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileText size={13} />
          Notes
        </button>
        <button
          onClick={() => setTab('links')}
          className={`flex-1 flex items-center justify-center gap-2 py-3 text-xs font-medium transition ${
            tab === 'links'
              ? 'text-indigo-400 border-b-2 border-indigo-500'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Link size={13} />
          Links {links.length > 0 && `(${links.length})`}
        </button>
      </div>

      {tab === 'notes' ? (
        <div className="flex flex-col h-full">
          {/* Note header */}
          <div className="px-4 py-2 flex items-center justify-between border-b border-slate-700">
            <span className="text-xs text-slate-500">Shared notes</span>
            <span className="text-xs text-slate-500">
              {saving ? '💾 Saving...' : '✓ Saved'}
            </span>
          </div>
          <div className="flex-1 p-4">
            <textarea
              value={content}
              onChange={handleChange}
              placeholder="Start typing shared notes here... Both users can edit in real-time!"
              className="w-full h-full bg-slate-700 text-white text-sm p-3 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500 resize-none leading-relaxed"
            />
          </div>
        </div>
      ) : (
        <div className="flex flex-col h-full">
          {/* Links header */}
          <div className="px-4 py-3 flex items-center justify-between border-b border-slate-700">
            <span className="text-xs text-slate-500">{links.length} saved link{links.length !== 1 ? 's' : ''}</span>
            <button
              onClick={() => setShowLinkForm(!showLinkForm)}
              className="flex items-center gap-1 text-xs bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1.5 rounded-lg transition"
            >
              <Plus size={11} />
              Save Link
            </button>
          </div>

          {/* Add link form */}
          {showLinkForm && (
            <form onSubmit={handleAddLink} className="p-4 border-b border-slate-700 space-y-2">
              <input
                value={linkForm.name}
                onChange={e => setLinkForm({ ...linkForm, name: e.target.value })}
                placeholder="Link name (e.g. Design Figma File)"
                className="w-full bg-slate-700 text-white text-sm px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500"
                autoFocus
              />
              <input
                value={linkForm.url}
                onChange={e => setLinkForm({ ...linkForm, url: e.target.value })}
                placeholder="URL (e.g. https://figma.com/...)"
                className="w-full bg-slate-700 text-white text-sm px-3 py-2 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500"
              />
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={addingLink}
                  className="flex-1 flex items-center justify-center gap-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-sm py-1.5 rounded-lg transition"
                >
                  <Save size={12} />
                  {addingLink ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowLinkForm(false); setLinkForm({ url: '', name: '' }); }}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white text-sm py-1.5 rounded-lg transition"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {/* Links list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            {links.length === 0 ? (
              <div className="text-center mt-8">
                <Link size={32} className="text-slate-600 mx-auto mb-2" />
                <p className="text-slate-500 text-sm">No links saved yet</p>
                <p className="text-slate-600 text-xs mt-1">Save important links shared in chat</p>
              </div>
            ) : (
              links.map(link => (
                <div
                  key={link._id}
                  className="bg-slate-700 rounded-xl p-3 flex items-start gap-3"
                >
                  <div className="w-8 h-8 bg-indigo-600/20 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5">
                    <Link size={14} className="text-indigo-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white text-sm font-medium truncate">{link.name}</p>
                    <a
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-indigo-400 text-xs truncate hover:underline flex items-center gap-1 mt-0.5"
                    >
                      <ExternalLink size={10} />
                      {link.url}
                    </a>
                    {link.savedBy && (
                      <p className="text-slate-500 text-xs mt-1">
                        Saved by {link.savedBy.name}
                      </p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteLink(link._id)}
                    className="text-slate-500 hover:text-red-400 transition flex-shrink-0"
                  >
                    <X size={14} />
                  </button>
                  </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}