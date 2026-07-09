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
      style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        padding: '11px 16px', cursor: 'pointer',
        background: isActive ? 'rgba(245,200,66,0.10)' : 'transparent',
        borderRight: isActive ? `2px solid ${P.gold}` : '2px solid transparent',
        transition: 'background 0.15s, border-color 0.15s',
      }}
      onMouseEnter={e => { if (!isActive) e.currentTarget.style.background = 'rgba(245,200,66,0.06)'; }}
      onMouseLeave={e => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
    >
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <div style={{
          width: '40px', height: '40px', borderRadius: '50%',
          background: isActive
            ? `linear-gradient(135deg, ${P.gold}, ${P.goldDim})`
            : 'rgba(245,200,66,0.16)',
          border: `1px solid ${isActive ? P.gold : 'rgba(245,200,66,0.3)'}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '15px', fontWeight: 700,
          color: isActive ? '#0d0d0d' : P.gold,
          transition: 'all 0.15s',
        }}>
          {initial}
        </div>
        {isOnline && (
          <div style={{
            position: 'absolute', bottom: '1px', right: '1px',
            width: '10px', height: '10px', borderRadius: '50%',
            background: '#4ade80', border: '2px solid #111111',
            boxShadow: '0 0 5px rgba(74,222,128,0.7)',
          }} />
        )}
      </div>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: '8px', marginBottom: '4px' }}>
          <p style={{
            fontSize: '14.5px', fontWeight: 700, letterSpacing: '0.1px',
            color: isActive ? P.text : P.textFaint,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            margin: 0,
          }}>
            {name}
          </p>
          {time && (
            <span style={{ fontSize: '11px', fontWeight: 500, color: P.textDim, flexShrink: 0 }}>
              {time}
            </span>
          )}
        </div>
        <p style={{
          fontSize: '12.5px', fontWeight: 500, color: P.textMid, lineHeight: 1.45,
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          margin: 0,
        }}>
          {lastMsg}
        </p>
      </div>
    </div>
  );
}