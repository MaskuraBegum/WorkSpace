import { useEffect, useRef, useState } from 'react';
import { Send, CornerUpLeft, X, CheckSquare, Paperclip, FileText, Download } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import useChatStore from '../../store/chatStore';
import { getSocket } from '../../services/socket';
import api from '../../services/api';
import { formatDistanceToNow } from 'date-fns';
import toast from 'react-hot-toast';

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
    const formData = new FormData();
    formData.append('file', file);
    formData.append('conversationId', activeConversation._id);

    try {
      const { data } = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      // Add to chat immediately
      addMessage(data);

      // Broadcast to other users in room
      getSocket()?.emit('message:broadcast', {
        conversationId: activeConversation._id,
        message: data
      });

      toast.success('File uploaded!');
    } catch {
      toast.error('Failed to upload file');
    } finally {
      setUploading(false);
      fileInputRef.current.value = '';
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
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-4 bg-slate-800 border-b border-slate-700 flex items-center gap-3">
        <div className="w-9 h-9 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold">
          {name?.charAt(0).toUpperCase()}
        </div>
        <div>
          <p className="text-white font-semibold">{name}</p>
          {typing ? (
            <p className="text-green-400 text-xs">{typing.userName} is typing...</p>
          ) : (
            <p className="text-slate-400 text-xs">
              {activeConversation?.isGroup
                ? `${activeConversation.members?.length} members`
                : other?.email}
            </p>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
        <div className="mx-4 px-4 py-2 bg-slate-700 rounded-t-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CornerUpLeft size={14} className="text-indigo-400" />
            <p className="text-slate-300 text-sm truncate">{replyTo.content}</p>
          </div>
          <button onClick={() => setReplyTo(null)}>
            <X size={14} className="text-slate-400 hover:text-white" />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="p-4 bg-slate-800 border-t border-slate-700">
        {/* Hidden file input */}
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileUpload}
          className="hidden"
          accept="image/*,.pdf,.docx,.xlsx,.txt"
        />

        <div className="flex items-center gap-3 bg-slate-700 rounded-2xl px-4 py-2">
          {/* File upload button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="text-slate-400 hover:text-indigo-400 transition disabled:opacity-40 flex-shrink-0"
            title="Attach file"
          >
            {uploading
              ? <div className="w-4 h-4 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
              : <Paperclip size={18} />
            }
          </button>

          <input
            value={input}
            onChange={e => { setInput(e.target.value); handleTyping(); }}
            onKeyDown={handleKeyDown}
            placeholder="Type a message..."
            className="flex-1 bg-transparent text-white outline-none text-sm placeholder:text-slate-500"
          />

          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="w-8 h-8 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 rounded-xl flex items-center justify-center transition"
          >
            <Send size={14} className="text-white" />
          </button>
        </div>

        {uploading && (
          <p className="text-xs text-slate-500 mt-2 text-center">Uploading file...</p>
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
    >
      <div className={`max-w-xs lg:max-w-md ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-1`}>

        {message.replyTo && (
          <div className="bg-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-400 border-l-2 border-indigo-500">
            {message.replyTo.content}
          </div>
        )}

        <div className="flex items-end gap-2">
          {!isOwn && (
            <div className="w-6 h-6 rounded-full bg-indigo-600 flex items-center justify-center text-white text-xs flex-shrink-0">
              {message.sender?.name?.charAt(0).toUpperCase()}
            </div>
          )}

          {showActions && isOwn && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onReply(message)}
                className="w-6 h-6 bg-slate-700 hover:bg-slate-600 rounded-full flex items-center justify-center transition"
              >
                <CornerUpLeft size={12} className="text-slate-300" />
              </button>
              {message.content && (
                <button
                  onClick={handleConvert}
                  disabled={converting}
                  className="w-6 h-6 bg-slate-700 hover:bg-indigo-600 disabled:opacity-40 rounded-full flex items-center justify-center transition"
                >
                  <CheckSquare size={12} className="text-slate-300" />
                </button>
              )}
            </div>
          )}

          {/* Message content */}
          <div className={`rounded-2xl text-sm overflow-hidden ${isOwn
            ? 'bg-indigo-600 text-white rounded-br-sm'
            : 'bg-slate-700 text-slate-100 rounded-bl-sm'
          }`}>
            {/* Image */}
            {isImage && (
              <a href={message.file.url} target="_blank" rel="noopener noreferrer">
                <img
                  src={message.file.url}
                  alt={message.file.name}
                  className="max-w-xs rounded-2xl cursor-pointer hover:opacity-90 transition"
                />
              </a>
            )}

            {/* File */}
            {isFile && (
              
               <a href={message.file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3 hover:opacity-80 transition"
              >
                <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FileText size={20} />
                </div>
                <div className="min-w-0">
                  <p className="font-medium truncate text-sm">{message.file.name}</p>
                  <p className="text-xs opacity-70">{formatFileSize(message.file.size)}</p>
                </div>
                <Download size={16} className="flex-shrink-0 opacity-70" />
              </a>
            )}

            {/* Text */}
            {message.content && (
              <p className="px-4 py-2">{message.content}</p>
            )}
          </div>

          {showActions && !isOwn && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => onReply(message)}
                className="w-6 h-6 bg-slate-700 hover:bg-slate-600 rounded-full flex items-center justify-center transition"
              >
                <CornerUpLeft size={12} className="text-slate-300" />
              </button>
              {message.content && (
                <button
                  onClick={handleConvert}
                  disabled={converting}
                  className="w-6 h-6 bg-slate-700 hover:bg-indigo-600 disabled:opacity-40 rounded-full flex items-center justify-center transition"
                >
                  <CheckSquare size={12} className="text-slate-300" />
                </button>
              )}
            </div>
          )}
        </div>

        <p className="text-slate-600 text-xs px-1">
          {message.createdAt
            ? formatDistanceToNow(new Date(message.createdAt), { addSuffix: true })
            : ''}
        </p>
      </div>
    </div>
  );
}