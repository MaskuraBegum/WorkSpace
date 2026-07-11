import { useEffect, useRef, useState } from 'react';
import { Send, CornerUpLeft, X, CheckSquare, Paperclip, FileText, Download, Trash2 } from 'lucide-react';
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
  const { activeConversation, messages, setMessages, typingUsers, addMessage, addTask, removeMessage } = useChatStore();

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

    // Listen for deleted messages from other users
    socket?.on('message:deleted', ({ messageId }) => {
      removeMessage(messageId);
    });

    return () => {
      socket?.emit('conversation:leave', activeConversation._id);
      socket?.off('message:deleted');
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
      const { uploadToCloudinary } = await import('../../services/upload.js');
      const fileData = await uploadToCloudinary(file);
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

  const handleDeleteMessage = async (message) => {
    try {
      await api.delete(`/messages/${message._id}`);
      removeMessage(message._id);
      getSocket()?.emit('message:delete', {
        messageId: message._id,
        conversationId: activeConversation._id
      });
      toast.success('Message deleted');
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete message');
    }
  };

  return (
    <div className="flex flex-col h-full" style={{ background: P.surface }}>
      <style>{`
        @keyframes cw-fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes cw-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        .cw-typing-dot { animation: cw-pulse 1.2s ease infinite; }
      `}</style>

      {/* Header */}
      <div
        className="flex items-center gap-4 shrink-0 py-6 pl-[66px] pr-[62px] md:px-7"
        style={{ background: P.card, borderBottom: `1px solid ${P.border}` }}
      >
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0"
          style={{ background: P.goldGlow, color: P.gold, border: `1px solid ${P.goldDim}` }}
        >
          {name?.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0 pl-0.5">
          <p className="font-semibold text-sm truncate leading-[1.4]" style={{ color: P.text }}>{name}</p>
          {typing ? (
            <p className="text-xs flex items-center gap-1.5 leading-[1.4] mt-1" style={{ color: P.green }}>
              <span className="cw-typing-dot inline-block w-[5px] h-[5px] rounded-full" style={{ background: P.green }} />
              {typing.userName} is typing...
            </p>
          ) : (
            <p className="text-xs truncate leading-[1.4] mt-1" style={{ color: P.textMid }}>
              {activeConversation?.isGroup
                ? `${activeConversation.members?.length} members`
                : other?.email}
            </p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden space-y-6 px-6 py-5"
        style={{ scrollbarWidth: 'thin', scrollbarColor: `${P.goldDim} ${P.surface}` }}
      >
        {messages.map(msg => (
          <MessageBubble
            key={msg._id}
            message={msg}
            isOwn={msg.sender?._id === user._id}
            onReply={() => setReplyTo(msg)}
            onConvertToTask={handleConvertToTask}
            onDelete={handleDeleteMessage}
          />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Reply preview */}
      {replyTo && (
        <div
          className="mx-6 mt-1 px-4 py-2.5 flex items-center justify-between rounded-t-xl shrink-0"
          style={{ background: P.card, border: `1px solid ${P.border}`, borderBottom: 'none' }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <CornerUpLeft size={14} style={{ color: P.gold }} className="shrink-0" />
            <p className="text-sm truncate" style={{ color: P.textMid }}>{replyTo.content}</p>
          </div>
          <button onClick={() => setReplyTo(null)} style={{ color: P.textMid }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="px-6 py-5 shrink-0" style={{ background: P.card, borderTop: `1px solid ${P.border}` }}>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="hidden"
          accept="image/*,.pdf,.docx,.xlsx,.txt"
        />
        <div
          className="flex items-center gap-3 rounded-2xl px-3.5 py-2.5 transition focus-within:border-[#c9a227] focus-within:shadow-[0_0_0_3px_rgba(245,200,66,0.12)]"
          style={{ background: P.surface, border: `1px solid ${P.border}` }}
        >
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="transition shrink-0 disabled:opacity-40 hover:text-[#f5c842]"
            style={{ color: P.textMid }}
            title="Attach file"
          >
            {uploading
              ? <div className="w-4 h-4 rounded-full animate-spin" style={{ border: `2px solid ${P.goldDim}`, borderTopColor: 'transparent' }} />
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
            className="w-9 h-9 rounded-xl flex items-center justify-center transition shrink-0 disabled:opacity-40 hover:bg-[#c9a227] hover:-translate-y-px"
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

function MessageBubble({ message, isOwn, onReply, onConvertToTask, onDelete }) {
  const [showActions, setShowActions] = useState(false);
  const [converting, setConverting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleConvert = async () => {
    if (converting) return;
    setConverting(true);
    await onConvertToTask(message);
    setConverting(false);
  };

  const handleDelete = async () => {
    if (deleting) return;
    setDeleting(true);
    await onDelete(message);
    setDeleting(false);
    setShowDeleteConfirm(false);
  };

  const isImage = message.file?.type?.startsWith('image/');
  const isFile = message.file && !isImage;

  const formatFileSize = (bytes) => {
    if (!bytes) return '';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const actionBtnClass = 'w-9 h-9 rounded-full flex items-center justify-center transition-all duration-150 hover:bg-[rgba(245,200,66,0.12)] disabled:opacity-40';

  return (
    <div
      className={`flex animate-[cw-fadeUp_0.2s_ease] ${isOwn ? 'justify-end pr-2.5' : 'justify-start pl-2.5'}`}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => { setShowActions(false); setShowDeleteConfirm(false); }}
    >
      <div className={`max-w-sm lg:max-w-lg ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-1.5`}>

        {message.replyTo && (
          <div
            className="rounded-lg px-3 py-2 text-xs leading-[1.5]"
            style={{ background: P.card, color: P.textMid, borderLeft: `2px solid ${P.gold}` }}
          >
            {message.replyTo.content}
          </div>
        )}

        <div className="flex items-end gap-3.5 relative">
          {!isOwn && (
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
              style={{ background: P.goldGlow, color: P.gold, border: `1px solid ${P.goldDim}` }}
            >
              {message.sender?.name?.charAt(0).toUpperCase()}
            </div>
          )}

          {/* Own message actions */}
          {showActions && isOwn && (
            <div className="flex items-center gap-1.5 absolute right-full bottom-0 mr-3">
              {/* Delete confirm */}
              {showDeleteConfirm ? (
                <div
                  className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold"
                  style={{ background: P.card, border: `1px solid rgba(248,113,113,0.3)` }}
                >
                  <span style={{ color: '#f87171' }}>Delete?</span>
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="px-2 py-0.5 rounded-lg text-xs font-bold transition"
                    style={{ background: 'rgba(248,113,113,0.2)', color: '#f87171' }}
                  >
                    {deleting ? '...' : 'Yes'}
                  </button>
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    className="px-2 py-0.5 rounded-lg text-xs font-bold transition"
                    style={{ background: P.surface, color: P.textMid }}
                  >
                    No
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => onReply(message)}
                    className={actionBtnClass}
                    style={{ background: P.card, border: `1.5px solid ${P.borderHover}`, boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
                    title="Reply"
                  >
                    <CornerUpLeft size={15} style={{ color: P.text }} />
                  </button>
                  {message.content && (
                    <button
                      onClick={handleConvert}
                      disabled={converting}
                      className={actionBtnClass}
                      style={{ background: P.card, border: `1.5px solid ${P.borderHover}`, boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
                      title="Convert to task"
                    >
                      <CheckSquare size={15} style={{ color: P.text }} />
                    </button>
                  )}
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    className={actionBtnClass}
                    style={{ background: P.card, border: `1.5px solid rgba(248,113,113,0.3)`, boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
                    title="Delete message"
                  >
                    <Trash2 size={15} style={{ color: '#f87171' }} />
                  </button>
                </>
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
            {isImage && (
              <a href={message.file.url} target="_blank" rel="noopener noreferrer">
                <img
                  src={message.file.url}
                  alt={message.file.name}
                  className="rounded-2xl cursor-pointer transition w-full max-w-[320px] h-auto block object-contain hover:opacity-90"
                />
              </a>
            )}

            {isFile && (
              
                <a href={message.file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 transition px-4 py-3.5 hover:opacity-85"
              >
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: isOwn ? 'rgba(13,13,13,0.15)' : P.goldGlow }}
                >
                  <FileText size={20} style={{ color: isOwn ? '#0d0d0d' : P.gold }} />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold truncate text-sm">{message.file.name}</p>
                  <p className="text-xs opacity-70">{formatFileSize(message.file.size)}</p>
                </div>
                <Download size={16} className="shrink-0 opacity-70" />
              </a>
            )}

            {message.content && (
              <p
                className="font-medium px-[22px] py-4 leading-[1.65] break-words"
                style={{
                  overflowWrap: 'anywhere',
                  borderTop: (isImage || isFile) ? `1px solid ${isOwn ? 'rgba(13,13,13,0.15)' : P.border}` : 'none',
                }}
              >
                {message.content}
              </p>
            )}
          </div>

          {/* Other user actions */}
          {showActions && !isOwn && (
            <div className="flex items-center gap-1.5 absolute left-full bottom-0 ml-3">
              <button
                onClick={() => onReply(message)}
                className={actionBtnClass}
                style={{ background: P.card, border: `1.5px solid ${P.borderHover}`, boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
                title="Reply"
              >
                <CornerUpLeft size={15} style={{ color: P.text }} />
              </button>
              {message.content && (
                <button
                  onClick={handleConvert}
                  disabled={converting}
                  className={actionBtnClass}
                  style={{ background: P.card, border: `1.5px solid ${P.borderHover}`, boxShadow: '0 2px 8px rgba(0,0,0,0.3)' }}
                  title="Convert to task"
                >
                  <CheckSquare size={15} style={{ color: P.text }} />
                </button>
              )}
            </div>
          )}
        </div>

        <p className="text-xs px-1 mt-1" style={{ color: P.textDim }}>
          {message.createdAt
            ? formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })
            : ''}
        </p>
      </div>
    </div>
  );
}