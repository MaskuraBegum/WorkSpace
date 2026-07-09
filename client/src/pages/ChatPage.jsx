import { useEffect } from 'react';
import { MessageCircle, Zap, CheckCircle2, NotebookPen, Link2, Paperclip } from 'lucide-react';
import useAuthStore from '../store/authStore';
import useChatStore from '../store/chatStore';
import { connectSocket, disconnectSocket, getSocket } from '../services/socket';
import Sidebar from '../components/layout/Sidebar';
import ChatWindow from '../components/chat/ChatWindow';
import WorkspacePanel from '../components/layout/WorkspacePanel';
import api from '../services/api';
import { P } from '../theme';

export default function ChatPage() {
  const { user } = useAuthStore();
  const {
    setConversations,
    activeConversation,
    addMessage,
    setOnlineUsers,
    updateUserStatus,
    setTyping
  } = useChatStore();

  useEffect(() => {
    const loadConversations = async () => {
      const { data } = await api.get('/conversations');
      setConversations(data);
    };
    loadConversations();
  }, []);

  useEffect(() => {
    const socket = connectSocket(user._id);

    socket.on('connect', () => {
      socket.emit('user:online', user._id);
    });

    socket.on('users:online', (users) => setOnlineUsers(users));
    socket.on('user:status', ({ userId, status }) => updateUserStatus(userId, status));

    socket.on('message:received', (message) => {
      if (message.sender?._id !== user._id) addMessage(message);
    });

    socket.on('message:broadcast', ({ message }) => {
      if (message.sender?._id !== user._id) addMessage(message);
    });

    socket.on('typing:start', ({ userId, userName, conversationId }) => {
      setTyping(conversationId, userId, userName, true);
    });

    socket.on('typing:stop', ({ userId, conversationId }) => {
      setTyping(conversationId, userId, null, false);
    });

    return () => disconnectSocket();
  }, []);

  return (
    <div
      className="cp-shell"
      style={{
        display: 'flex',
        height: '100vh',
        background: P.surface,
        overflow: 'hidden',
        fontFamily: "'Inter', sans-serif",
      }}
    >
      <style>{`
        @keyframes cp-fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes cp-fadeUp { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes cp-pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.35; transform: scale(0.85); } }
        @keyframes cp-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-6px); } }
        .cp-dot-pulse { animation: cp-pulse 1.4s ease infinite; }
        .cp-chip { transition: all 0.18s ease; }
        .cp-chip:hover { border-color: ${P.goldDim} !important; background: ${P.goldGlow} !important; transform: translateY(-1px); }
        .cp-badge-icon { animation: cp-float 3.5s ease-in-out infinite; }

        /* Responsive: stack workspace panel away and shrink sidebar on smaller screens */
        @media (max-width: 1024px) {
          .cp-workspace { display: none !important; }
        }
        @media (max-width: 640px) {
          .cp-empty-chips { max-width: 280px !important; }
          .cp-empty-title { font-size: 19px !important; }
        }
      `}</style>

      <Sidebar />

      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        minWidth: 0, overflow: 'hidden', background: P.surface,
      }}>
        {activeConversation ? <ChatWindow /> : <NoChatSelected />}
      </div>

      {activeConversation && (
        <div className="cp-workspace" style={{ display: 'flex', flexShrink: 0 }}>
          <WorkspacePanel />
        </div>
      )}
    </div>
  );
}

function NoChatSelected() {
  const features = [
    { icon: Zap, label: 'Real-time messaging' },
    { icon: CheckCircle2, label: 'Shared task boards' },
    { icon: NotebookPen, label: 'Collaborative notes' },
    { icon: Link2, label: 'Link & doc storage' },
    { icon: Paperclip, label: 'File sharing' },
  ];

  return (
    <div
      className="flex flex-col items-center justify-center text-center"
      style={{
        flex: 1,
        padding: '40px 24px',
        animation: 'cp-fadeIn 0.4s ease',
        background: `radial-gradient(circle at 50% 35%, ${P.goldGlow} 0%, transparent 60%), ${P.surface}`,
      }}
    >
      <div
        className="cp-badge-icon"
        style={{
          width: '84px', height: '84px', borderRadius: '26px',
          background: `linear-gradient(135deg, ${P.goldGlow}, rgba(245,200,66,0.03))`,
          border: `1px solid ${P.goldDim}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: '28px',
          boxShadow: `0 0 44px ${P.goldGlow}`,
        }}
      >
        <MessageCircle size={34} style={{ color: P.gold }} strokeWidth={1.75} />
      </div>

      <h2
        className="cp-empty-title"
        style={{
          fontSize: '24px', fontWeight: 800, color: P.text,
          letterSpacing: '-0.5px', marginBottom: '10px',
        }}
      >
        Welcome to WorkSpace
      </h2>

      <p style={{
        fontSize: '14px', color: P.textMid,
        maxWidth: '320px', lineHeight: 1.7, marginBottom: '32px',
      }}>
        Pick a conversation from the sidebar or start a new one to begin chatting and collaborating.
      </p>

      <div
        className="cp-empty-chips flex flex-wrap items-center justify-center"
        style={{ gap: '10px', maxWidth: '380px' }}
      >
        {features.map(({ icon: Icon, label }, i) => (
          <div
            key={label}
            className="cp-chip flex items-center gap-2"
            style={{
              padding: '7px 14px', borderRadius: '20px',
              background: P.card,
              border: `1px solid ${P.border}`,
              fontSize: '12px', color: P.textMid, fontWeight: 600,
              animation: `cp-fadeUp 0.35s ease ${i * 0.05}s both`,
            }}
          >
            <Icon size={13} style={{ color: P.goldDim }} />
            <span>{label}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '44px', opacity: 0.5 }}>
        {[0, 1, 2].map(i => (
          <div key={i} className="cp-dot-pulse" style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: P.gold, animationDelay: `${i * 0.2}s`,
          }} />
        ))}
      </div>
    </div>
  );
}