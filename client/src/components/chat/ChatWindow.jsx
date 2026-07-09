import { useEffect, useRef, useState } from 'react';
import { Send, CornerUpLeft, X, CheckSquare, Paperclip, FileText, Download } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import useChatStore from '../../store/chatStore';
import { getSocket } from '../../services/socket';
import api from '../../services/api';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';
import { P } from '../../theme';

export default function ChatWindow() {
  const { user } = useAuthStore();
  const [input, setInput] = useState('');
  const [replyTo, setReplyTo] = useState(null);
  const [uploading, setUploading] = useState(false);
  const bottomRef = useRef(null);
  const typingTimeout = useRef(null);
  const fileInputRef = useRef(null);
  const { activeConversation, messages, setMessages, typingUsers, addMessage, addTask } = useChatStore();

  const other = activeConversation?.members?.find(m => m._id !== user._id);
  const name = activeConversation?.isGroup ? activeConversation.name : other?.name;
  const typing = typingUsers[activeConversation?._id];

  useEffect(() => {
    if (!activeConversation) return;
    const socket = getSocket();

    socket?.emit('conversation:join', activeConversation._id);

    const load = async () => {
      try {
        const { data } = await api.get(`/messages/${activeConversation._id}`);
        setMessages(data);
        socket?.emit('messages:read', {
          conversationId: activeConversation._id,
          userId: user._id
        });
      } catch {
        toast.error('Failed to load messages');
      }
    };

    load();

    return () => {
      socket?.emit('conversation:leave', activeConversation._id);
    };
  }, [activeConversation?._id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleTyping = () => {
    const socket = getSocket();
    socket?.emit('typing:start', {
      conversationId: activeConversation._id,
      userId: user._id,
      userName: user.name
    });
    clearTimeout(typingTimeout.current);
    typingTimeout.current = setTimeout(() => {
      socket?.emit('typing:stop', {
        conversationId: activeConversation._id,
        userId: user._id
      });
    }, 1500);
  };

  const handleSend = () => {
    if (!input.trim()) return;
    const socket = getSocket();

    if (!socket?.connected) {
      toast.error('Not connected. Please refresh.');
      return;
    }

    const tempMessage = {
      _id: Date.now().toString(),
      conversation: activeConversation._id,
      sender: { _id: user._id, name: user.name, avatarUrl: user.avatarUrl },
      content: input.trim(),
      replyTo: replyTo || null,
      createdAt: new Date().toISOString(),
      isRead: false
    };

    addMessage(tempMessage);

    socket.emit('message:send', {
      conversationId: activeConversation._id,
      content: input.trim(),
      senderId: user._id,
      replyToId: replyTo?._id || null
    });

    setInput('');
    setReplyTo(null);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
  
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be under 10MB');
      return;
    }
  
    setUploading(true);
    try {
      // Upload directly to Cloudinary from browser
      const { uploadToCloudinary } = await import('../../services/upload.js');
      const fileData = await uploadToCloudinary(file);
  
      // Save message to backend with file info
      const { data } = await api.post('/upload', {
        conversationId: activeConversation._id,
        ...fileData
      });
  
      addMessage(data);
  
      getSocket()?.emit('message:broadcast', {
        conversationId: activeConversation._id,
        message: data
      });
  
      toast.success('File uploaded!');
    } catch {
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConvertToTask = async (message) => {
    try {
      const { data } = await api.post(`/messages/convert/${message._id}`, {});
      addTask(data);
      toast.success('Converted to task!');
      getSocket()?.emit('task:update', {
        conversationId: activeConversation._id,
        task: data,
        isNew: true
      });
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to convert to task');
    }
  };

  return (
    <div className="flex flex-col h-full" style={{ background: P.surface }}>
      <style>{`
        @keyframes cw-spin { to { transform: rotate(360deg); } }
        @keyframes cw-fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes cw-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        .cw-attach-btn:hover { color: ${P.gold} !important; }
        .cw-send-btn:hover:not(:disabled) { background: ${P.goldDim} !important; transform: translateY(-1px); }
        .cw-input-bar:focus-within { border-color: ${P.goldDim} !important; box-shadow: 0 0 0 3px ${P.goldGlow}; }
        .cw-action-btn { transition: all 0.15s ease; }
        .cw-action-btn:hover { background: ${P.goldGlow} !important; }
        .cw-action-btn:hover svg { color: ${P.gold} !important; }
        .cw-bubble-file:hover { opacity: 0.85; }
        .cw-bubble-img:hover { opacity: 0.92; }
        .cw-typing-dot { animation: cw-pulse 1.2s ease infinite; }

        @media (max-width: 767px) {
          .cw-header { padding-left: 66px !important; padding-right: 62px !important; }
        }
      `}</style>

      {/* Header */}
      <div
        className="cw-header flex items-center gap-4 shrink-0"
        style={{ background: P.card, borderBottom: `1px solid ${P.border}`, padding: '24px 28px' }}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0"
          style={{ background: P.goldGlow, color: P.gold, border: `1px solid ${P.goldDim}` }}
        >
          {name?.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0" style={{ paddingLeft: '2px' }}>
          <p className="font-semibold text-sm truncate" style={{ color: P.text, lineHeight: 1.4 }}>{name}</p>
          {typing ? (
            <p className="text-xs flex items-center gap-1.5" style={{ color: P.green, lineHeight: 1.4, marginTop: '4px' }}>
              <span className="cw-typing-dot" style={{ width: '5px', height: '5px', borderRadius: '50%', background: P.green, display: 'inline-block' }} />
              {typing.userName} is typing...
            </p>
          ) : (
            <p className="text-xs truncate" style={{ color: P.textMid, lineHeight: 1.4, marginTop: '4px' }}>
              {activeConversation?.isGroup
                ? `${activeConversation.members?.length} members`
                : other?.email}
            </p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-6" style={{ padding: '20px 24px', overflowX: 'hidden' }}>
        {messages.map(msg => (
          <MessageBubble
            key={msg._id}
            message={msg}
            isOwn={msg.sender?._id === user._id}
            onReply={() => setReplyTo(msg)}
            onConvertToTask={handleConvertToTask}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Reply preview */}
      {replyTo && (
        <div
          className="mx-6 px-4 py-2.5 flex items-center justify-between rounded-t-xl shrink-0"
          style={{ background: P.card, border: `1px solid ${P.border}`, borderBottom: 'none', marginTop: '4px', animation: 'cw-fadeUp 0.15s ease' }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <CornerUpLeft size={14} style={{ color: P.gold }} className="shrink-0" />
            <p className="text-sm truncate" style={{ color: P.textMid, lineHeight: 1.4 }}>{replyTo.content}</p>
          </div>
          <button onClick={() => setReplyTo(null)} className="shrink-0" style={{ color: P.textMid }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="px-6 py-5 shrink-0" style={{ background: P.card, borderTop: `1px solid ${P.border}` }}>
        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="hidden"
          accept="image/*,.pdf,.docx,.xlsx,.txt"
        />

        <div
          className="cw-input-bar flex items-center gap-3 rounded-2xl transition"
          style={{ background: P.surface, border: `1px solid ${P.border}`, padding: '10px 14px' }}
        >
          {/* File upload button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="cw-attach-btn transition disabled:opacity-40 shrink-0"
            style={{ color: P.textMid }}
            title="Attach file"
          >
            {uploading
              ? <div style={{ width: '16px', height: '16px', border: `2px solid ${P.goldDim}`, borderTopColor: 'transparent', borderRadius: '50%', animation: 'cw-spin 0.7s linear infinite' }} />
              : <Paperclip size={18} />
            }
          </button>

          <input
            value={input}
            onChange={e => { setInput(e.target.value); handleTyping(); }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 bg-transparent outline-none text-sm"
            style={{ color: P.text }}
          />

          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="cw-send-btn w-9 h-9 rounded-xl flex items-center justify-center transition disabled:opacity-40 shrink-0"
            style={{ background: P.gold }}
          >
            <Send size={14} style={{ color: '#0d0d0d' }} />
          </button>
        </div>

        {uploading && (
          <p className="text-xs mt-2 text-center" style={{ color: P.textMid }}>Uploading file...</p>
        )}
      </div>
    </div>
  );
}

function MessageBubble({ message, isOwn, onReply, onConvertToTask }) {
  const [showActions, setShowActions] = useState(false);
  const [converting, setConverting] = useState(false);

  const handleConvert = async () => {
    if (converting) return;
    setConverting(true);
    await onConvertToTask(message);
    setConverting(false);
  };

  const isImage = message.file?.type?.startsWith('image/');
  const isFile = message.file && !isImage;

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
      style={{ animation: 'cw-fadeUp 0.2s ease', paddingRight: isOwn ? '10px' : 0, paddingLeft: !isOwn ? '10px' : 0 }}
    >
      <div className={`max-w-sm lg:max-w-lg ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-1.5`}>

        {message.replyTo && (
          <div
            className="rounded-lg px-3 py-2 text-xs"
            style={{ background: P.card, color: P.textMid, borderLeft: `2px solid ${P.gold}`, lineHeight: 1.5 }}
          >
            {message.replyTo.content}
          </div>
        )}

        <div className="flex items-end gap-3.5" style={{ position: 'relative' }}>
          {!isOwn && (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
              style={{ background: P.goldGlow, color: P.gold, border: `1px solid ${P.goldDim}` }}
            >
              {message.sender?.name?.charAt(0).toUpperCase()}
            </div>
          )}

          {/* Own-message actions float to the left of the bubble, outside normal flow so they're never pushed off-screen */}
          {showActions && isOwn && (
            <div
              className="flex items-center gap-2"
              style={{ position: 'absolute', right: '100%', bottom: 0, marginRight: '12px' }}
            >
              <button
                onClick={() => onReply(message)}
                className="cw-action-btn w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: P.card, border: `1.5px solid ${P.borderHover}`, boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
              >
                <CornerUpLeft size={16} style={{ color: P.text }} />
              </button>
              {message.content && (
                <button
                  onClick={handleConvert}
                  disabled={converting}
                  className="cw-action-btn w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-40"
                  style={{ background: P.card, border: `1.5px solid ${P.borderHover}`, boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
                >
                  <CheckSquare size={16} style={{ color: P.text }} />
                </button>
              )}
            </div>
          )}

          {/* Message content */}
          <div
            className="rounded-2xl text-sm overflow-hidden"
            style={{
              background: isOwn ? P.gold : P.card,
              color: isOwn ? '#0d0d0d' : P.text,
              border: isOwn ? 'none' : `1px solid ${P.border}`,
              borderBottomRightRadius: isOwn ? '6px' : undefined,
              borderBottomLeftRadius: !isOwn ? '6px' : undefined,
            }}
          >
            {/* Image */}
            {isImage && (
              <a href={message.file.url} target="_blank" rel="noopener noreferrer">
               <img
  src={message.file.url}
  alt={message.file.name}
  className="cw-bubble-img rounded-2xl cursor-pointer transition"
  style={{
    width: "100%",
    maxWidth: "320px",
    height: "auto",
    display: "block",
    objectFit: "contain",
  }}
/>
              </a>
            )}

            {/* File */}
            {isFile && (
              <a href={message.file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="cw-bubble-file flex items-center gap-3 transition"
                style={{ padding: '14px 16px' }}
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: isOwn ? 'rgba(13,13,13,0.15)' : P.goldGlow }}
                >
                  <FileText size={20} style={{ color: isOwn ? '#0d0d0d' : P.gold }} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold truncate text-sm">{message.file.name}</p>
                  <p className="text-xs" style={{ opacity: 0.7 }}>{formatFileSize(message.file.size)}</p>
                </div>
                <Download size={16} className="shrink-0" style={{ opacity: 0.7 }} />
              </a>
            )}

            {/* Text */}
            {message.content && (
              <p
                className="font-medium"
                style={{
                  padding: '16px 22px',
                  lineHeight: 1.65,
                  wordBreak: 'break-word',
                  overflowWrap: 'anywhere',
                  borderTop: (isImage || isFile) ? `1px solid ${isOwn ? 'rgba(13,13,13,0.15)' : P.border}` : 'none',
                  marginTop: (isImage || isFile) ? '2px' : 0,
                }}
              >
                {message.content}
              </p>
            )}
          </div>

          {/* Other-user-message actions float to the right of the bubble, outside normal flow */}
          {showActions && !isOwn && (
            <div
              className="flex items-center gap-2"
              style={{ position: 'absolute', left: '100%', bottom: 0, marginLeft: '12px' }}
            >
              <button
                onClick={() => onReply(message)}
                className="cw-action-btn w-9 h-9 rounded-full flex items-center justify-center"
                style={{ background: P.card, border: `1.5px solid ${P.borderHover}`, boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
              >
                <CornerUpLeft size={16} style={{ color: P.text }} />
              </button>
              {message.content && (
                <button
                  onClick={handleConvert}
                  disabled={converting}
                  className="cw-action-btn w-9 h-9 rounded-full flex items-center justify-center disabled:opacity-40"
                  style={{ background: P.card, border: `1.5px solid ${P.borderHover}`, boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
                >
                  <CheckSquare size={16} style={{ color: P.text }} />
                </button>
              )}
            </div>
          )}
        </div>

        <p className="text-xs px-1" style={{ color: P.textDim, marginTop: '4px' }}>
          {message.createdAt
            ? formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })
            : ''}
        </p>
      </div>
    </div>
  );
}