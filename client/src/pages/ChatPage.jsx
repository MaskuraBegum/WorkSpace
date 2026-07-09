import { useEffect, useState } from 'react';
import { MessageCircle, Zap, CheckCircle2, NotebookPen, Link2, Paperclip, ArrowLeft, CheckSquare } from 'lucide-react';
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
    setActiveConversation,
    addMessage,
    setOnlineUsers,
    updateUserStatus,
    setTyping
  } = useChatStore();

  // Mobile/tablet: whether the Tasks/Notes panel is open in place of another panel.
  // Desktop layout ignores this entirely and always shows the workspace panel alongside the chat.
  const [showWorkspaceMobile, setShowWorkspaceMobile] = useState(false);

  // Three layout tiers, tracked via matchMedia so we can branch panel visibility in JS
  // (CSS alone can't express "hide sidebar only when showWorkspaceMobile is true").
  const [isDesktop, setIsDesktop] = useState(() => typeof window !== 'undefined' ? window.innerWidth >= 1024 : true);
  const [isMobile, setIsMobile] = useState(() => typeof window !== 'undefined' ? window.innerWidth < 768 : false);

  useEffect(() => {
    const mqDesktop = window.matchMedia('(min-width: 1024px)');
    const mqMobile = window.matchMedia('(max-width: 767px)');

    const updateDesktop = (e) => setIsDesktop(e.matches);
    const updateMobile = (e) => setIsMobile(e.matches);

    setIsDesktop(mqDesktop.matches);
    setIsMobile(mqMobile.matches);

    mqDesktop.addEventListener('change', updateDesktop);
    mqMobile.addEventListener('change', updateMobile);
    return () => {
      mqDesktop.removeEventListener('change', updateDesktop);
      mqMobile.removeEventListener('change', updateMobile);
    };
  }, []);

  const isTablet = !isDesktop && !isMobile;

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

  // Whenever the selected conversation changes, close the workspace overlay
  // so switching chats always lands you back on the chat view, not a stale tasks screen.
  useEffect(() => {
    setShowWorkspaceMobile(false);
  }, [activeConversation?._id]);

  // --- Panel visibility, resolved per layout tier ---
  // Desktop: all three panels always visible.
  // Tablet: Sidebar+Chat by default; tapping the task button swaps Sidebar -> Workspace, Chat stays.
  // Mobile: one panel at a time (Sidebar, or Chat, or Workspace as a full-screen overlay).
  const sidebarVisible = isDesktop
    ? true
    : isTablet
      ? !showWorkspaceMobile
      : !activeConversation;

  const chatVisible = isDesktop || isTablet
    ? true
    : Boolean(activeConversation) && !showWorkspaceMobile;

  const workspaceVisible = Boolean(activeConversation) && (isDesktop || showWorkspaceMobile);

  // Only mobile fully replaces the chat with the sidebar (needs a "back to conversations" arrow).
  // Tablet keeps the sidebar always reachable via the workspace's own back button.
  const showChatBackArrow = isMobile;
  // FAB to open Tasks/Notes is needed on mobile AND tablet (desktop shows it permanently).
  const showWorkspaceFab = !isDesktop && Boolean(activeConversation) && !showWorkspaceMobile;
  // Workspace's own "back to chat/sidebar" header is needed whenever it's not a permanent column.
  const showWorkspaceHeader = !isDesktop && workspaceVisible;

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
        @keyframes cp-fabIn { from { opacity: 0; transform: scale(0.8) translateY(8px); } to { opacity: 1; transform: scale(1) translateY(0); } }
        .cp-dot-pulse { animation: cp-pulse 1.4s ease infinite; }
        .cp-chip { transition: all 0.18s ease; }
        .cp-chip:hover { border-color: ${P.goldDim} !important; background: ${P.goldGlow} !important; transform: translateY(-1px); }
        .cp-badge-icon { animation: cp-float 3.5s ease-in-out infinite; }
        .cp-fab { transition: all 0.18s ease; animation: cp-fabIn 0.25s ease; }
        .cp-fab:hover { transform: translateY(-2px); box-shadow: 0 6px 20px ${P.goldGlow}; }
        .cp-back-btn { transition: all 0.15s ease; }
        .cp-back-btn:hover { background: ${P.borderHover} !important; }
      `}</style>

      {/* Sidebar / conversation list */}
      <div
        className="cp-sidebar-col"
        style={{
          display: sidebarVisible ? 'flex' : 'none',
          width: isMobile ? '100%' : 'auto',
        }}
      >
        <div style={{ display: 'flex', width: '100%' }}>
          <Sidebar />
        </div>
      </div>

      {/* Chat window */}
      <div
        className="cp-chat-col"
        style={{
          display: chatVisible ? 'flex' : 'none',
          flex: 1, flexDirection: 'column', minWidth: 0, overflow: 'hidden',
          background: P.surface, position: 'relative',
          width: isMobile ? '100%' : 'auto',
        }}
      >
        {activeConversation ? <ChatWindow /> : <NoChatSelected />}

        {activeConversation && (
          <>
            {/* Back to conversation list — mobile only, since tablet+ keep the sidebar reachable */}
            {showChatBackArrow && (
              <button
                className="cp-back-btn"
                onClick={() => setActiveConversation?.(null)}
                style={{
                  position: 'absolute', top: '18px', left: '16px', zIndex: 5,
                  width: '36px', height: '36px', borderRadius: '10px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: P.card, border: `1px solid ${P.border}`,
                }}
                title="Back to conversations"
              >
                <ArrowLeft size={16} style={{ color: P.text }} />
              </button>
            )}

            {/* Open Tasks & Notes — mobile and tablet only */}
            {showWorkspaceFab && (
              <button
                className="cp-fab"
                onClick={() => setShowWorkspaceMobile(true)}
                style={{
                  position: 'absolute', top: '18px', right: '16px', zIndex: 5,
                  width: '36px', height: '36px', borderRadius: '10px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: P.gold, border: 'none',
                  boxShadow: `0 2px 10px ${P.goldGlow}`,
                }}
                title="Tasks & Notes"
              >
                <CheckSquare size={16} style={{ color: '#0d0d0d' }} />
              </button>
            )}
          </>
        )}
      </div>

      {/* Workspace panel (Tasks/Notes) — permanent column on desktop, toggled column on tablet, full-screen overlay on mobile */}
      {activeConversation && workspaceVisible && (
        <div
          className="cp-workspace-col"
          style={{
            display: 'flex',
            flexDirection: 'column',
            position: isMobile ? 'fixed' : 'static',
            inset: isMobile ? 0 : 'auto',
            zIndex: isMobile ? 20 : 'auto',
            background: P.surface,
            width: isMobile ? '100%' : 'auto',
          }}
        >
          {/* Back header — shown whenever the panel isn't a permanent desktop column */}
          {showWorkspaceHeader && (
            <div
              style={{
                display: 'flex', alignItems: 'center', gap: '12px',
                padding: '18px 20px', background: P.card, borderBottom: `1px solid ${P.border}`, flexShrink: 0,
              }}
            >
              <button
                className="cp-back-btn"
                onClick={() => setShowWorkspaceMobile(false)}
                style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: P.surface, border: `1px solid ${P.border}`,
                }}
                title="Back"
              >
                <ArrowLeft size={16} style={{ color: P.text }} />
              </button>
              <span className="font-semibold text-sm" style={{ color: P.text }}>Tasks &amp; Notes</span>
            </div>
          )}

          <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
            <WorkspacePanel />
          </div>
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