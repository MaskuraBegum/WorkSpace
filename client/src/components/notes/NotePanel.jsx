import { useState, useEffect, useRef } from 'react';
import { Link, Plus, X, ExternalLink, FileText, Save, Upload, Download, File } from 'lucide-react';
import api from '../../services/api';
import { getSocket } from '../../services/socket';
import useAuthStore from '../../store/authStore';
import useChatStore from '../../store/chatStore';
import { uploadToCloudinary } from '../../services/upload';
import toast from 'react-hot-toast';
import { P } from '../../theme';

export default function NotePanel({ conversationId }) {
  const { user } = useAuthStore();
  const { addMessage } = useChatStore();
  const [tab, setTab] = useState('notes');
  const [content, setContent] = useState('');
  const [saving, setSaving] = useState(false);
  const [links, setLinks] = useState([]);
  const [docs, setDocs] = useState([]);
  const [showLinkForm, setShowLinkForm] = useState(false);
  const [linkForm, setLinkForm] = useState({ url: '', name: '' });
  const [addingLink, setAddingLink] = useState(false);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const saveTimeout = useRef(null);
  const docInputRef = useRef(null);

  useEffect(() => {
    if (!conversationId) return;
    loadNote();

    const socket = getSocket();

    socket?.on('note:updated', ({ content: newContent, updatedBy }) => {
      if (updatedBy !== user._id) setContent(newContent);
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

    socket?.on('note:doc_added', ({ doc }) => {
      setDocs(prev => {
        const exists = prev.find(d => d._id === doc._id);
        if (exists) return prev;
        return [doc, ...prev];
      });
    });

    socket?.on('note:doc_removed', ({ docId }) => {
      setDocs(prev => prev.filter(d => d._id !== docId));
    });

    return () => {
      socket?.off('note:updated');
      socket?.off('note:link_added');
      socket?.off('note:link_removed');
      socket?.off('note:doc_added');
      socket?.off('note:doc_removed');
    };
  }, [conversationId]);

  const loadNote = async () => {
    try {
      const { data } = await api.get(`/notes/${conversationId}`);
      setContent(data.content || '');
      setLinks(data.links || []);
      setDocs(data.docs || []);
    } catch {
      toast.error('Failed to load note');
    }
  };

  const handleChange = (e) => {
    const val = e.target.value;
    setContent(val);
    getSocket()?.emit('note:update', { conversationId, content: val, userId: user._id });
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

      getSocket()?.emit('note:link_add', { conversationId, link: newLink });

      if (data.message) {
        addMessage(data.message);
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
      getSocket()?.emit('note:link_remove', { conversationId, linkId });
      toast.success('Link removed');
    } catch {
      toast.error('Failed to remove link');
    }
  };

  const handleDocUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      return toast.error('File must be under 10MB');
    }

    setUploadingDoc(true);
    try {
      // Upload to Cloudinary from browser
      const fileData = await uploadToCloudinary(file);

      // Save to backend
      const { data } = await api.put(`/notes/${conversationId}/docs`, {
        url: fileData.url,
        name: fileData.name,
        type: fileData.type,
        size: fileData.size
      });

      setDocs(data.note.docs);

      getSocket()?.emit('note:doc_add', {
        conversationId,
        doc: data.doc
      });

      if (data.message) {
        addMessage(data.message);
        getSocket()?.emit('message:broadcast', {
          conversationId,
          message: data.message
        });
      }

      toast.success('Document saved!');
    } catch {
      toast.error('Failed to upload document');
    } finally {
      setUploadingDoc(false);
      if (docInputRef.current) docInputRef.current.value = '';
    }
  };

  const handleDeleteDoc = async (docId) => {
    try {
      await api.delete(`/notes/${conversationId}/docs/${docId}`);
      setDocs(prev => prev.filter(d => d._id !== docId));
      getSocket()?.emit('note:doc_remove', { conversationId, docId });
      toast.success('Document removed');
    } catch {
      toast.error('Failed to remove document');
    }
  };

  const formatSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const tabStyle = (active) => ({
    background: active ? P.goldGlow : 'transparent',
    color: active ? P.gold : P.textMid,
    borderBottom: active ? `2px solid ${P.gold}` : '2px solid transparent',
  });

  return (
    <div className="flex flex-col h-full" style={{ background: P.surface }}>
      <style>{`
        @keyframes np-spin { to { transform: rotate(360deg); } }
        @keyframes np-fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes np-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        .np-tab:hover { color: ${P.gold} !important; }
        .np-input:focus { border-color: ${P.gold} !important; box-shadow: 0 0 0 3px ${P.goldGlow}; }
        .np-save-btn:hover { background: ${P.goldDim} !important; transform: translateY(-1px); }
        .np-cancel-btn:hover { background: ${P.borderHover} !important; }
        .np-delete-btn:hover { color: ${P.red} !important; background: rgba(248,113,113,0.1) !important; }
        .np-download-btn:hover { color: ${P.gold} !important; background: ${P.goldGlow} !important; }
        .np-link-text:hover { color: ${P.gold} !important; text-decoration: underline; }
        .np-card { transition: all 0.18s ease; }
        .np-card:hover { border-color: ${P.borderHover} !important; transform: translateY(-1px); box-shadow: 0 4px 16px rgba(0,0,0,0.25); }
        .np-saving-dot { animation: np-pulse 1.2s ease infinite; }
      `}</style>

      {/* Tabs */}
      <div className="flex px-3 pt-3 pb-0 gap-1.5 shrink-0" style={{ borderBottom: `1px solid ${P.border}` }}>
        {['notes', 'links', 'docs'].map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className="np-tab flex-1 text-xs font-semibold rounded-t-lg transition capitalize truncate"
            style={{ ...tabStyle(tab === t), padding: '10px 8px 12px', lineHeight: 1.2 }}
          >
            {t === 'links' ? `Links${links.length > 0 ? ` (${links.length})` : ''}` :
             t === 'docs' ? `Docs${docs.length > 0 ? ` (${docs.length})` : ''}` :
             'Notes'}
          </button>
        ))}
      </div>

      {/* Notes tab */}
      {tab === 'notes' && (
        <div className="flex flex-col h-full min-h-0">
          <div className="px-4 py-3 flex items-center justify-between shrink-0" style={{ borderBottom: `1px solid ${P.border}` }}>
            <span className="text-xs font-medium" style={{ color: P.textMid, lineHeight: 1.4 }}>Shared notes</span>
            <span className="text-xs font-medium flex items-center gap-2" style={{ color: saving ? P.goldDim : P.green, lineHeight: 1.4 }}>
              <span
                className={saving ? 'np-saving-dot' : ''}
                style={{ width: '6px', height: '6px', borderRadius: '50%', background: saving ? P.goldDim : P.green, display: 'inline-block', flexShrink: 0 }}
              />
              {saving ? 'Saving...' : 'Saved'}
            </span>
          </div>
          <div className="flex-1 p-4 min-h-0">
            <textarea
              value={content}
              onChange={handleChange}
              placeholder="Start typing shared notes here..."
              className="np-input w-full h-full text-sm rounded-2xl outline-none resize-none transition"
              style={{
                background: P.card, color: P.text,
                border: `1px solid ${P.border}`,
                padding: '16px', lineHeight: 1.7,
              }}
            />
          </div>
        </div>
      )}

      {/* Links tab */}
      {tab === 'links' && (
        <div className="flex flex-col h-full min-h-0">
          <div
            className="px-4 flex items-center justify-between shrink-0 gap-3"
            style={{ borderBottom: `1px solid ${P.border}`, paddingTop: '18px', paddingBottom: '18px' }}
          >
            <span className="text-xs font-medium truncate" style={{ color: P.textMid, lineHeight: 1.4 }}>
              {links.length} saved link{links.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={() => setShowLinkForm(!showLinkForm)}
              className="np-save-btn flex items-center gap-1.5 text-xs font-bold rounded-lg transition shrink-0"
              style={{ background: P.gold, color: '#0d0d0d', boxShadow: `0 2px 10px ${P.goldGlow}`, padding: '10px 14px', lineHeight: 1 }}
            >
              <Plus size={12} strokeWidth={2.5} />
              Save Link
            </button>
          </div>

          {showLinkForm && (
            <form
              onSubmit={handleAddLink}
              className="p-4 space-y-3 shrink-0"
              style={{ borderBottom: `1px solid ${P.border}`, background: 'rgba(0,0,0,0.15)', animation: 'np-fadeUp 0.2s ease' }}
            >
              <input
                value={linkForm.name}
                onChange={e => setLinkForm({ ...linkForm, name: e.target.value })}
                placeholder="Link name (e.g. Design Figma File)"
                className="np-input w-full text-sm rounded-xl outline-none transition"
                style={{ background: P.card, color: P.text, border: `1px solid ${P.border}`, padding: '11px 14px', lineHeight: 1.4 }}
                autoFocus
              />
              <input
                value={linkForm.url}
                onChange={e => setLinkForm({ ...linkForm, url: e.target.value })}
                placeholder="URL (e.g. https://figma.com/...)"
                className="np-input w-full text-sm rounded-xl outline-none transition"
                style={{ background: P.card, color: P.text, border: `1px solid ${P.border}`, padding: '11px 14px', lineHeight: 1.4 }}
              />
              <div className="flex gap-2 pt-1">
                <button
                  type="submit"
                  disabled={addingLink}
                  className="np-save-btn flex-1 flex items-center justify-center gap-1.5 disabled:opacity-50 text-sm font-bold rounded-xl transition"
                  style={{ background: P.gold, color: '#0d0d0d', padding: '11px 0', lineHeight: 1 }}
                >
                  <Save size={13} />
                  {addingLink ? 'Saving...' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowLinkForm(false); setLinkForm({ url: '', name: '' }); }}
                  className="np-cancel-btn flex-1 text-sm font-medium rounded-xl transition"
                  style={{ background: P.card, color: P.text, border: `1px solid ${P.border}`, padding: '11px 0', lineHeight: 1 }}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
            {links.length === 0 ? (
              <div className="text-center" style={{ paddingTop: '56px' }}>
                <div style={{
                  width: '52px', height: '52px', borderRadius: '14px', background: P.goldGlow,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
                }}>
                  <Link size={22} style={{ color: P.goldDim }} />
                </div>
                <p className="text-sm font-medium" style={{ color: P.text, lineHeight: 1.5 }}>No links saved yet</p>
                <p className="text-xs mt-2" style={{ color: P.textMid, lineHeight: 1.5 }}>Save Figma files, docs, or any shared URL</p>
              </div>
            ) : (
              links.map((link, i) => (
                <div
                  key={link._id}
                  className="np-card rounded-2xl flex items-start gap-3"
                  style={{ background: P.card, border: `1px solid ${P.border}`, animation: `np-fadeUp 0.25s ease ${i * 0.03}s both`, padding: '14px' }}
                >
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0" style={{ background: P.goldGlow }}>
                    <Link size={15} style={{ color: P.gold }} />
                  </div>
                  <div className="flex-1 min-w-0" style={{ paddingTop: '1px' }}>
                    <p className="text-sm font-semibold truncate" style={{ color: P.text, lineHeight: 1.5 }}>{link.name}</p>
                    
                    <a  href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="np-link-text text-xs truncate flex items-center gap-1.5 transition"
                      style={{ color: P.goldDim, lineHeight: 1.6, marginTop: '4px' }}
                    >
                      <ExternalLink size={10} className="shrink-0" />
                      <span className="truncate">{link.url}</span>
                    </a>
                    {link.savedBy && (
                      <p className="text-xs truncate" style={{ color: P.textDim, lineHeight: 1.6, marginTop: '6px' }}>Saved by {link.savedBy.name}</p>
                    )}
                  </div>
                  <button
                    onClick={() => handleDeleteLink(link._id)}
                    className="np-delete-btn transition shrink-0"
                    style={{ color: P.textMid, width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    <X size={14} />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Docs tab */}
      {tab === 'docs' && (
        <div className="flex flex-col h-full min-h-0">
          <input
            type="file"
            ref={docInputRef}
            onChange={handleDocUpload}
            className="hidden"
            accept=".pdf,.docx,.xlsx,.txt,.png,.jpg,.jpeg"
          />

          <div
            className="px-4 flex items-center justify-between shrink-0 gap-3"
            style={{ borderBottom: `1px solid ${P.border}`, paddingTop: '18px', paddingBottom: '18px' }}
          >
            <span className="text-xs font-medium truncate" style={{ color: P.textMid, lineHeight: 1.4 }}>
              {docs.length} saved doc{docs.length !== 1 ? 's' : ''}
            </span>
            <button
              onClick={() => docInputRef.current?.click()}
              disabled={uploadingDoc}
              className="np-save-btn flex items-center gap-1.5 text-xs font-bold disabled:opacity-50 rounded-lg transition shrink-0"
              style={{ background: P.gold, color: '#0d0d0d', boxShadow: `0 2px 10px ${P.goldGlow}`, padding: '10px 14px', lineHeight: 1 }}
            >
              {uploadingDoc
                ? <div style={{ width: '12px', height: '12px', border: '2px solid #0d0d0d', borderTopColor: 'transparent', borderRadius: '50%', animation: 'np-spin 0.7s linear infinite' }} />
                : <Upload size={12} strokeWidth={2.5} />
              }
              {uploadingDoc ? 'Uploading...' : 'Upload Doc'}
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-0">
            {docs.length === 0 ? (
              <div className="text-center" style={{ paddingTop: '56px' }}>
                <div style={{
                  width: '52px', height: '52px', borderRadius: '14px', background: P.goldGlow,
                  display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px',
                }}>
                  <FileText size={22} style={{ color: P.goldDim }} />
                </div>
                <p className="text-sm font-medium" style={{ color: P.text, lineHeight: 1.5 }}>No documents saved yet</p>
                <p className="text-xs mt-2" style={{ color: P.textMid, lineHeight: 1.5 }}>Upload PDFs, Word docs, spreadsheets</p>
              </div>
            ) : (
              docs.map((doc, i) => (
                <div
                  key={doc._id}
                  className="np-card rounded-2xl flex items-start gap-3"
                  style={{ background: P.card, border: `1px solid ${P.border}`, animation: `np-fadeUp 0.25s ease ${i * 0.03}s both`, padding: '14px' }}
                >
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: P.goldGlow }}>
                    <File size={18} style={{ color: P.gold }} />
                  </div>
                  <div className="flex-1 min-w-0" style={{ paddingTop: '1px' }}>
                    <p className="text-sm font-semibold truncate" style={{ color: P.text, lineHeight: 1.5 }}>{doc.name}</p>
                    <p className="text-xs" style={{ color: P.textMid, lineHeight: 1.6, marginTop: '4px' }}>{formatSize(doc.size)}</p>
                    {doc.savedBy && (
                      <p className="text-xs truncate" style={{ color: P.textDim, lineHeight: 1.6, marginTop: '4px' }}>Saved by {doc.savedBy.name}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    
                     <a href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="np-download-btn transition"
                      style={{ color: P.textMid, width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                      title="Download"
                    >
                      <Download size={14} />
                    </a>
                    <button
                      onClick={() => handleDeleteDoc(doc._id)}
                      className="np-delete-btn transition"
                      style={{ color: P.textMid, width: '28px', height: '28px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                    >
                      <X size={14} />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}