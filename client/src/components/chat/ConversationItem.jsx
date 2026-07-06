import useAuthStore from '../../store/authStore';
import useChatStore from '../../store/chatStore';
import { formatDistanceToNow } from 'date-fns';

export default function ConversationItem({ conversation, isActive, onClick }) {
  const { user } = useAuthStore();
  const { onlineUsers } = useChatStore();

  const other = conversation.members?.find(m => m._id !== user._id);
  const name = conversation.isGroup ? conversation.name : other?.name || 'Unknown';
  const initial = name?.charAt(0).toUpperCase();
  const isOnline = !conversation.isGroup && onlineUsers.includes(other?._id);
  const lastMsg = conversation.lastMessage?.content || 'No messages yet';
  const time = conversation.updatedAt
    ? formatDistanceToNow(new Date(conversation.updatedAt), { addSuffix: true })
    : '';

  return (
    <div
      onClick={onClick}
      className={`flex items-center gap-3 px-4 py-3 cursor-pointer transition hover:bg-slate-700 ${isActive ? 'bg-slate-700 border-r-2 border-indigo-500' : ''}`}
    >
      {/* Avatar */}
      <div className="relative flex-shrink-0">
        <div className="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center text-white font-semibold">
          {initial}
        </div>
        {isOnline && (
          <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-400 rounded-full border-2 border-slate-800" />
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between">
          <p className="text-white text-sm font-medium truncate">{name}</p>
          <p className="text-slate-500 text-xs flex-shrink-0 ml-2">{time}</p>
        </div>
        <p className="text-slate-400 text-xs truncate mt-0.5">{lastMsg}</p>
      </div>
    </div>
  );
}
