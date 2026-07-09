import { useEffect } from 'react';
import useAuthStore from '../store/authStore';
import useChatStore from '../store/chatStore';
import { connectSocket, disconnectSocket, getSocket } from '../services/socket';
import Sidebar from '../components/layout/Sidebar';
import ChatWindow from '../components/chat/ChatWindow';
import WorkspacePanel from '../components/layout/WorkspacePanel';
import api from '../services/api';

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
    <div style={{
      display: 'flex',
      height: '100vh',
      background: '#0d0d0d',
      overflow: 'hidden',
      fontFamily: "'Inter', sans-serif",
    }}>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.4; }
        }
        .dot-pulse { animation: pulse 1.4s ease infinite; }
      `}</style>

      <Sidebar />

      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column',
        minWidth: 0, overflow: 'hidden', background: '#0d0d0d',
      }}>
        {activeConversation ? <ChatWindow /> : <NoChatSelected />}
      </div>

      {activeConversation && (
        <div style={{ display: 'flex', flexShrink: 0 }}>
          <WorkspacePanel />
        </div>
      )}
    </div>
  );
}

function NoChatSelected() {
  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      padding: '40px', textAlign: 'center',
      animation: 'fadeIn 0.4s ease', background: '#0d0d0d',
    }}>
      <div style={{
        width: '80px', height: '80px', borderRadius: '24px',
        background: 'linear-gradient(135deg, rgba(245,200,66,0.15), rgba(245,200,66,0.05))',
        border: '1px solid rgba(245,200,66,0.2)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: '36px', marginBottom: '24px',
        boxShadow: '0 0 40px rgba(245,200,66,0.08)',
      }}>
        💬
      </div>

      <h2 style={{
        fontSize: '22px', fontWeight: 800, color: '#f0ead6',
        letterSpacing: '-0.4px', marginBottom: '10px',
      }}>
        Welcome to WorkSpace
      </h2>

      <p style={{
        fontSize: '14px', color: '#6b5e40',
        maxWidth: '300px', lineHeight: 1.6, marginBottom: '36px',
      }}>
        Pick a conversation from the sidebar or start a new one to begin chatting and collaborating.
      </p>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px', justifyContent: 'center', maxWidth: '360px' }}>
        {[
          { icon: '⚡', label: 'Real-time messaging' },
          { icon: '✅', label: 'Shared task boards' },
          { icon: '📝', label: 'Collaborative notes' },
          { icon: '🔗', label: 'Link & doc storage' },
          { icon: '📎', label: 'File sharing' },
        ].map(({ icon, label }) => (
          <div key={label} style={{
            display: 'flex', alignItems: 'center', gap: '6px',
            padding: '6px 12px', borderRadius: '20px',
            background: 'rgba(245,200,66,0.06)',
            border: '1px solid rgba(245,200,66,0.12)',
            fontSize: '12px', color: '#8a7d5e', fontWeight: 500,
          }}>
            <span>{icon}</span><span>{label}</span>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '48px', opacity: 0.3 }}>
        {[0, 1, 2].map(i => (
          <div key={i} className="dot-pulse" style={{
            width: '6px', height: '6px', borderRadius: '50%',
            background: '#f5c842', animationDelay: `${i * 0.2}s`,
          }} />
        ))}
      </div>
    </div>
  );
}