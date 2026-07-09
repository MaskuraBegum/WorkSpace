import useAuthStore from '../../store/authStore';
import useChatStore from '../../store/chatStore';
import { formatDistanceToNow } from 'date-fns';

const P = {
  gold:      '#f5c842',
  goldDim:   '#c9a227',
  text:      '#ffffff',   // active name — max contrast
  textMid:   '#ded4b0',   // last message preview — brighter, clearly legible
  textDim:   '#a89f82',   // timestamps
  textFaint: '#9a8f70',   // inactive name
};

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
      className={`flex items-center gap-3 px-4 py-[11px] cursor-pointer transition-colors duration-150 border-r-2 ${
        isActive ? 'border-[#f5c842]' : 'border-transparent hover:bg-[rgba(245,200,66,0.06)]'
      }`}
      style={isActive ? { background: 'rgba(245,200,66,0.10)' } : undefined}
    >
      <div className="relative shrink-0">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-[15px] font-bold transition-all duration-150"
          style={{
            background: isActive ? `linear-gradient(135deg, ${P.gold}, ${P.goldDim})` : 'rgba(245,200,66,0.16)',
            border: `1px solid ${isActive ? P.gold : 'rgba(245,200,66,0.3)'}`,
            color: isActive ? '#0d0d0d' : P.gold,
          }}
        >
          {initial}
        </div>
        {isOnline && (
          <div
            className="absolute bottom-[1px] right-[1px] w-2.5 h-2.5 rounded-full"
            style={{ background: '#4ade80', border: '2px solid #111111', boxShadow: '0 0 5px rgba(74,222,128,0.7)' }}
          />
        )}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-baseline justify-between gap-2 mb-1">
          <p
            className="text-[14.5px] font-bold whitespace-nowrap overflow-hidden text-ellipsis m-0"
            style={{ letterSpacing: '0.1px', color: isActive ? P.text : P.textFaint }}
          >
            {name}
          </p>
          {time && (
            <span className="text-[11px] font-medium shrink-0" style={{ color: P.textDim }}>
              {time}
            </span>
          )}
        </div>
        <p
          className="text-[12.5px] font-medium leading-[1.45] whitespace-nowrap overflow-hidden text-ellipsis m-0"
          style={{ color: P.textMid }}
        >
          {lastMsg}
        </p>
      </div>
    </div>
  );
}