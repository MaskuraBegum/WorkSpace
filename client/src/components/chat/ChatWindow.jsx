import { useEffect, useRef, useState } from 'react';
import { Send, CornerUpLeft, X } from 'lucide-react';
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
  const bottomRef = useRef(null);
  const typingTimeout = useRef(null);
  const { activeConversation, messages, setMessages, typingUsers, addMessage } = useChatStore();

  const other = activeConversation?.members?.find(m => m._id !== user._id);
  const name = activeConversation?.isGroup ? activeConversation.name : other?.name;
  const typing = typingUsers[activeConversation?._id];

  // Load messages
  useEffect(() => {
    if (!activeConversation) return;
    const socket = getSocket();
  
    // Join room first
    socket?.emit('conversation:join', activeConversation._id);
    console.log('Joining room:', activeConversation._id);
  
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

  // Scroll to bottom
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
  
    console.log('Sending message to room:', activeConversation._id);
    console.log('Socket connected:', socket.connected);
    console.log('Socket id:', socket.id);
  
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
    }, (ack) => {
      console.log('Message send acknowledgment:', ack);
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
        <div className="flex items-center gap-3 bg-slate-700 rounded-2xl px-4 py-2">
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
      </div>
    </div>
  );
}

function MessageBubble({ message, isOwn, onReply }) {
  const [showReply, setShowReply] = useState(false);

  return (
    <div
      className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
      onMouseEnter={() => setShowReply(true)}
      onMouseLeave={() => setShowReply(false)}
    >
      <div className={`max-w-xs lg:max-w-md ${isOwn ? 'items-end' : 'items-start'} flex flex-col gap-1`}>
        {/* Reply reference */}
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

          <div className={`px-4 py-2 rounded-2xl text-sm ${isOwn
            ? 'bg-indigo-600 text-white rounded-br-sm'
            : 'bg-slate-700 text-slate-100 rounded-bl-sm'
          }`}>
            {message.content}
          </div>

          {showReply && (
            <button
              onClick={onReply}
              className="text-slate-500 hover:text-slate-300 transition"
            >
              <CornerUpLeft size={14} />
            </button>
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
