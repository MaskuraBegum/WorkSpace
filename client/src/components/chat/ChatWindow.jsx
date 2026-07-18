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
  const [viewerImageUrl, setViewerImageUrl] = useState(null);
  const [activeActionMenuId, setActiveActionMenuId] = useState(null); // Managed single active menu state
  
  const bottomRef = useRef(null);
  const typingTimeout = useRef(null);
  const fileInputRef = useRef(null);
  const {
    activeConversation,
    messages,
    setMessages,
    typingUsers,
    addMessage,
    addTask,
    removeMessage,
    markConversationRead,
    updateConversation,
    removeConversation,
  } = useChatStore();

  const other = activeConversation?.members?.find(m => m._id !== user._id);
  const name = activeConversation?.isGroup ? activeConversation.name : other?.name;
  const typing = typingUsers[activeConversation?._id];
  const isCreator = activeConversation?.createdBy === user._id ||
    activeConversation?.createdBy?._id === user._id;
  const isPending = activeConversation?.status === 'pending';

  useEffect(() => {
    if (!activeConversation) return;
    const socket = getSocket();

    socket?.emit('conversation:join', activeConversation._id);

    const load = async () => {
      try {
        const { data } = await api.get(`/messages/${activeConversation._id}`);
        setMessages(data);
        await api.put(`/conversations/${activeConversation._id}/read`);
        markConversationRead(activeConversation._id);
        socket?.emit('messages:read', {
          conversationId: activeConversation._id,
          userId: user._id
        });
      } catch {
        toast.error('Failed to load messages');
      }
    };

    load();

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

    if (isPending && !isCreator) {
      toast.error('Accept the request first to reply');
      return;
    }

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
      isRead: false,
      isTemp: true,
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
      setActiveActionMenuId(null);
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
      setActiveActionMenuId(null);
    } catch (error) {
      toast.error(error.response?.data?.message || 'Failed to delete message');
    }
  };

  const handleAccept = async () => {
    try {
      const { data } = await api.put(`/conversations/${activeConversation._id}/accept`);
      updateConversation(data);
      toast.success('Request accepted!');
    } catch { toast.error('Failed to accept'); }
  };

  const handleDecline = async () => {
    try {
      await api.put(`/conversations/${activeConversation._id}/decline`);
      removeConversation(activeConversation._id);
      toast.success('Request declined');
    } catch { toast.error('Failed to decline'); }
  };

  return (
    <div className="flex flex-col h-full w-full relative overflow-hidden" style={{ background: P.surface }}>
      <style>{`
        @keyframes cw-fadeUp { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes cw-pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } }
        .cw-typing-dot { animation: cw-pulse 1.2s ease infinite; }
      `}</style>

      {/* Header — Professional Grid Layout & Responsive Arrow Slot */}
      <div
        className="grid grid-cols-[auto_1fr_auto] items-center gap-4 shrink-0 py-4 px-4 sm:px-6 md:px-7 z-10 transition-all duration-200"
        style={{ 
          background: P.card, 
          borderBottom: `1px solid ${P.border}`,
          backdropFilter: 'blur(8px)'
        }}
      >
        {/* Left Side Spacer: Provides dedicated container bounds for the floating back arrow on mobile layouts */}
        <div className="w-8 sm:hidden block transition-all" aria-hidden="true" />

        {/* Center Main Section: Info Meta Wrap */}
        <div className="flex items-center gap-3.5 min-w-0">
          <div
            className="w-10 h-10 rounded-full flex items-center justify-center font-bold shrink-0 overflow-hidden cursor-pointer relative group transition-transform duration-200 active:scale-95 shadow-sm"
            style={{ 
              background: P.goldGlow, 
              color: P.gold, 
              border: `1px solid ${P.goldDim}` 
            }}
            onClick={() => !activeConversation?.isGroup && other?.avatarUrl && setViewerImageUrl(other.avatarUrl)}
          >
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-150" />
            {!activeConversation?.isGroup && other?.avatarUrl ? (
              <img
                src={other.avatarUrl.replace('/upload/', '/upload/q_100,f_auto/')}
                alt={name}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-sm tracking-wider">{name?.charAt(0).toUpperCase()}</span>
            )}
          </div>

          <div className="min-w-0 flex flex-col justify-center">
            <h2 
              className="font-semibold text-sm truncate tracking-wide leading-snug" 
              style={{ color: P.text }}
            >
              {name}
            </h2>
            {typing ? (
              <div className="text-xs flex items-center gap-1.5 leading-none mt-1" style={{ color: P.green }}>
                <span className="cw-typing-dot inline-block w-1.5 h-1.5 rounded-full" style={{ background: P.green }} />
                <span className="italic opacity-90">{typing.userName} is typing...</span>
              </div>
            ) : (
              <p 
                className="text-xs truncate font-medium mt-0.5 opacity-80" 
                style={{ color: P.textMid }}
              >
                {activeConversation?.isGroup
                  ? `${activeConversation.members?.length} members`
                  : other?.email}
              </p>
            )}
          </div>
        </div>

        {/* Right Side Slot: Ready for utility icons if necessary */}
        <div className="flex items-center gap-2 justify-self-end"></div>
      </div>

      {/* Pending banner */}
      {isPending && (
        isCreator ? (
          <div
            className="px-6 py-2.5 shrink-0 text-center"
            style={{ background: 'rgba(245,200,66,0.04)', borderBottom: `1px solid rgba(245,200,66,0.1)` }}
          >
            <p className="text-[11px]" style={{ color: P.textMid }}>
              ⏳ Waiting for <strong style={{ color: P.text }}>{other?.name}</strong> to accept your request
            </p>
          </div>
        ) : (
          <div
            className="px-4 sm:px-5 py-3 shrink-0 flex items-center justify-between gap-4"
            style={{ background: 'rgba(245,200,66,0.06)', borderBottom: `1px solid rgba(245,200,66,0.15)` }}
          >
            <p className="text-[12px] font-medium truncate" style={{ color: P.textMid }}>
              💬 <strong style={{ color: P.text }}>{other?.name}</strong> wants to connect
            </p>
            <div className="flex items-center gap-2 flex-shrink-0">
              <button
                onClick={handleDecline}
                className="text-[11px] font-semibold px-2.5 py-1.5 rounded-lg transition"
                style={{ background: 'rgba(248,113,113,0.12)', color: '#f87171', border: '1px solid rgba(248,113,113,0.25)' }}
              >
                Decline
              </button>
              <button
                onClick={handleAccept}
                className="text-[11px] font-bold px-2.5 py-1.5 rounded-lg transition hover:opacity-90"
                style={{ background: P.gold, color: '#0d0d0d' }}
              >
                Accept
              </button>
            </div>
          </div>
        )
      )}

      {/* Messages View Area */}
      <div
        className="flex-1 overflow-y-auto overflow-x-hidden space-y-6 px-6 py-5"
        style={{ scrollbarWidth: 'thin', scrollbarColor: `${P.goldDim} ${P.surface}` }}
        onClick={() => setActiveActionMenuId(null)} // Dismiss actions clicking empty window space
      >
        {messages.map(msg => (
          <MessageBubble
            key={msg._id}
            message={msg}
            isOwn={msg.sender?._id === user._id}
            menuIsOpen={activeActionMenuId === msg._id}
            onToggleMenu={(isOpen) => setActiveActionMenuId(isOpen ? msg._id : null)}
            onReply={() => setReplyTo(msg)}
            onConvertToTask={handleConvertToTask}
            onDelete={handleDeleteMessage}
            isTemp={msg.isTemp === true || msg._id?.length !== 24}
            onViewImage={setViewerImageUrl}
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

      {/* Input section */}
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
          style={{
            background: isPending && !isCreator ? 'rgba(0,0,0,0.2)' : P.surface,
            border: `1px solid ${P.border}`,
            opacity: isPending && !isCreator ? 0.5 : 1,
            pointerEvents: isPending && !isCreator ? 'none' : 'auto',
          }}
        >
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="transition shrink-0 disabled:opacity-40 hover:text-[#f5c842]"
            style={{ color: P.textMid }}
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
            placeholder={isPending && !isCreator ? 'Accept the request to reply...' : 'Type a message...'}
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

        {isPending && !isCreator && (
          <p className="text-[11px] text-center mt-2" style={{ color: P.textMid }}>
            Accept the request above to start chatting
          </p>
        )}

        {uploading && (
          <p className="text-xs mt-2 text-center" style={{ color: P.textMid }}>Uploading file...</p>
        )}
      </div>

      {/* Image Modal Viewer */}
      {viewerImageUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-[cw-fadeUp_0.15s_ease]">
          <div className="w-full max-w-md mx-4 bg-zinc-900 rounded-2xl border border-zinc-800 flex flex-col overflow-hidden shadow-2xl">
            <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800 bg-zinc-950/50">
              <span className="text-zinc-300 font-semibold text-sm">Image Preview</span>
              <button
                onClick={() => setViewerImageUrl(null)}
                className="w-8 h-8 rounded-lg bg-transparent hover:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white transition"
              >
                <X size={16} />
              </button>
            </div>
            <div className="p-5 flex items-center justify-center bg-zinc-900">
              <img
                src={viewerImageUrl.replace('/upload/', '/upload/q_100,f_auto/')}
                alt="Preview"
                className="w-full h-auto max-h-[380px] object-contain rounded-xl shadow-md"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MessageBubble({ message, isOwn, menuIsOpen, onToggleMenu, onReply, onConvertToTask, onDelete, isTemp, onViewImage }) {
  const [converting, setConverting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleBubbleClick = (e) => {
    e.stopPropagation();
    if (isTemp) return;
    onToggleMenu(!menuIsOpen);
  };

  const handleConvert = async (e) => {
    e.stopPropagation();
    if (converting) return;
    setConverting(true);
    await onConvertToTask(message);
    setConverting(false);
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
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
    <div className={`flex animate-[cw-fadeUp_0.2s_ease] ${isOwn ? 'justify-end pr-2.5' : 'justify-start pl-2.5'}`}>
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
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden cursor-pointer hover:opacity-90 transition mb-1"
              style={{ background: P.goldGlow, color: P.gold, border: `1px solid ${P.goldDim}` }}
              onClick={(e) => { e.stopPropagation(); message.sender?.avatarUrl && onViewImage(message.sender.avatarUrl); }}
            >
              {message.sender?.avatarUrl ? (
                <img
                  src={message.sender.avatarUrl.replace('/upload/', '/upload/q_100,f_auto/')}
                  alt={message.sender?.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                message.sender?.name?.charAt(0).toUpperCase()
              )}
            </div>
          )}

          {/* Message Core Container */}
          <div
            onClick={handleBubbleClick}
            className={`rounded-2xl text-sm overflow-hidden select-none transition-transform duration-100 ${!isTemp ? 'cursor-pointer active:scale-[0.99]' : ''}`}
            style={{
              background: isOwn ? P.gold : P.card,
              color: isOwn ? '#0d0d0d' : P.text,
              border: isOwn ? 'none' : `1px solid ${P.border}`,
              borderBottomRightRadius: isOwn ? '6px' : undefined,
              borderBottomLeftRadius: !isOwn ? '6px' : undefined,
              opacity: isTemp ? 0.7 : 1,
            }}
          >
            {isImage && (
              <div onClick={(e) => { e.stopPropagation(); onViewImage(message.file.url); }} className="cursor-pointer">
                <img
                  src={message.file.url}
                  alt={message.file.name}
                  className="rounded-2xl transition w-full max-w-[320px] h-auto block object-contain hover:opacity-90"
                />
              </div>
            )}

            {isFile && (
              <a href={message.file.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
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
        </div>

        {/* INLINE ACTIONS PANEL: Mounted below the bubble, above the timestamp */}
        {menuIsOpen && !isTemp && (
          <div 
            className={`flex items-center gap-1.5 py-1 mt-0.5 w-full animate-in fade-in slide-in-from-top-2 duration-150 ${isOwn ? 'justify-end' : 'justify-start'}`}
            onClick={(e) => e.stopPropagation()}
          >
            {showDeleteConfirm && isOwn ? (
              <div
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap"
                style={{ background: P.card, border: `1px solid rgba(248,113,113,0.3)` }}
              >
                <span style={{ color: '#f87171' }}>Delete?</span>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-2 py-0.5 rounded-lg text-xs font-bold bg-red-500/20 text-red-400"
                >
                  {deleting ? '...' : 'Yes'}
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-2 py-0.5 rounded-lg text-xs font-bold"
                  style={{ background: P.surface, color: P.textMid }}
                >
                  No
                </button>
              </div>
            ) : (
              <>
                <button
                  onClick={(e) => { e.stopPropagation(); onReply(message); onToggleMenu(false); }}
                  className={actionBtnClass}
                  style={{ background: P.card, border: `1px solid ${P.border}`, boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}
                  title="Reply"
                >
                  <CornerUpLeft size={14} style={{ color: P.text }} />
                </button>
                {message.content && (
                  <button
                    onClick={handleConvert}
                    disabled={converting}
                    className={actionBtnClass}
                    style={{ background: P.card, border: `1px solid ${P.border}`, boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}
                    title="Convert to task"
                  >
                    <CheckSquare size={14} style={{ color: P.text }} />
                  </button>
                )}
                {isOwn && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowDeleteConfirm(true); }}
                    className={actionBtnClass}
                    style={{ background: P.card, border: `1px solid rgba(248,113,113,0.3)`, boxShadow: '0 2px 6px rgba(0,0,0,0.2)' }}
                    title="Delete message"
                  >
                    <Trash2 size={14} style={{ color: '#f87171' }} />
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* Timestamp — Flowed down safely beneath bubble or panel */}
        <p className="text-xs px-1 mt-0.5 select-none" style={{ color: P.textDim }}>
          {isTemp
            ? <span style={{ opacity: 0.5 }}>Sending...</span>
            : message.createdAt
              ? formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })
              : ''
          }
        </p>
      </div>
    </div>
  );
}