import { useEffect, useState } from 'react';
import { MessageCircle, Zap, CheckCircle2, NotebookPen, Link2, Paperclip, ArrowLeft, CheckSquare } from 'lucide-react';
import useAuthStore from '../store/authStore';
import useChatStore from '../store/chatStore';
import { connectSocket, disconnectSocket } from '../services/socket';
import Sidebar from '../components/layout/Sidebar';
import ChatWindow from '../components/chat/ChatWindow';
import WorkspacePanel from '../components/layout/WorkspacePanel';
import api from '../services/api';

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

  const [showWorkspaceMobile, setShowWorkspaceMobile] = useState(false);
  const [isDesktop, setIsDesktop] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth >= 1024 : true
  );
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.innerWidth < 768 : false
  );

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

    socket.on('connect', () => socket.emit('user:online', user._id));
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

    socket.on('conversation:new', (conversation) => {
      setConversations(prev => {
        const exists = prev.find(c => c._id === conversation._id);
        if (exists) {
          return prev
            .map(c => c._id === conversation._id ? conversation : c)
            .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt));
        }
        return [conversation, ...prev];
      });
    });

    return () => {
      socket.off('conversation:new');
      disconnectSocket();
    };
  }, []);

  useEffect(() => {
    setShowWorkspaceMobile(false);
  }, [activeConversation?._id]);

  const sidebarVisible = isDesktop ? true : isTablet ? !showWorkspaceMobile : !activeConversation;
  const chatVisible = isDesktop || isTablet ? true : Boolean(activeConversation) && !showWorkspaceMobile;
  const workspaceVisible = Boolean(activeConversation) && (isDesktop || showWorkspaceMobile);
  const showChatBackArrow = isMobile;
  const showWorkspaceFab = !isDesktop && Boolean(activeConversation) && !showWorkspaceMobile;
  const showWorkspaceHeader = !isDesktop && workspaceVisible;

  return (
    <div className="flex h-screen overflow-hidden bg-zinc-900">
      <style>{`
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(6px); } to { opacity:1; transform:translateY(0); } }
        @keyframes float { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-6px); } }
        @keyframes dotPulse { 0%,100% { opacity:1; transform:scale(1); } 50% { opacity:0.35; transform:scale(0.85); } }
        @keyframes fabIn { from { opacity:0; transform:scale(0.8) translateY(8px); } to { opacity:1; transform:scale(1) translateY(0); } }
        .anim-fadeIn { animation: fadeIn 0.4s ease; }
        .anim-fadeUp { animation: fadeUp 0.35s ease both; }
        .anim-float { animation: float 3.5s ease-in-out infinite; }
        .anim-dot { animation: dotPulse 1.4s ease infinite; }
        .anim-fab { animation: fabIn 0.25s ease; }
        .feature-chip:hover { border-color: #c9a227 !important; background: rgba(245,200,66,0.08) !important; transform: translateY(-1px); }
      `}</style>

      {/* Sidebar */}
      <div className={`${sidebarVisible ? 'flex' : 'hidden'} ${isMobile ? 'w-full' : ''}`}>
        <Sidebar />
      </div>

      {/* Chat window */}
      <div
        className={`${chatVisible ? 'flex' : 'hidden'} flex-1 flex-col min-w-0 overflow-hidden bg-zinc-900 relative ${isMobile ? 'w-full' : ''}`}
      >
        {activeConversation ? <ChatWindow /> : <NoChatSelected />}

        {activeConversation && (
          <>
            {/* Back button — mobile only */}
            {showChatBackArrow && (
              <button
                onClick={() => setActiveConversation(null)}
                className="absolute top-[18px] left-4 z-10 w-9 h-9 rounded-xl flex items-center justify-center bg-zinc-800 border border-zinc-700 hover:bg-zinc-700 transition"
                title="Back to conversations"
              >
                <ArrowLeft size={16} className="text-zinc-200" />
              </button>
            )}

            {/* Tasks FAB — mobile + tablet */}
            {showWorkspaceFab && (
              <button
                onClick={() => setShowWorkspaceMobile(true)}
                className="anim-fab absolute top-[18px] right-4 z-10 w-9 h-9 rounded-xl flex items-center justify-center border-none hover:-translate-y-0.5 transition"
                style={{ background: '#f5c842', boxShadow: '0 2px 10px rgba(245,200,66,0.25)' }}
                title="Tasks & Notes"
              >
                <CheckSquare size={16} className="text-zinc-900" />
              </button>
            )}
          </>
        )}
      </div>

      {/* Workspace panel */}
      {activeConversation && workspaceVisible && (
        <div
          className={`flex flex-col bg-zinc-900 ${
            isMobile ? 'fixed inset-0 z-20 w-full' : ''
          }`}
        >
          {/* Back header — mobile + tablet */}
          {showWorkspaceHeader && (
            <div className="flex items-center gap-3 px-5 py-[18px] bg-zinc-800 border-b border-zinc-700 flex-shrink-0">
              <button
                onClick={() => setShowWorkspaceMobile(false)}
                className="w-9 h-9 rounded-xl flex items-center justify-center bg-zinc-900 border border-zinc-700 hover:bg-zinc-700 transition"
              >
                <ArrowLeft size={16} className="text-zinc-200" />
              </button>
              <span className="text-sm font-semibold text-zinc-200">Tasks &amp; Notes</span>
            </div>
          )}

          <div className="flex-1 min-h-0 flex">
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
    <div className="anim-fadeIn flex-1 flex flex-col items-center justify-center text-center px-6 py-10"
      style={{ background: 'radial-gradient(circle at 50% 35%, rgba(245,200,66,0.07) 0%, transparent 60%)' }}
    >
      {/* Icon */}
      <div
        className="anim-float w-20 h-20 rounded-3xl flex items-center justify-center mb-7"
        style={{
          background: 'linear-gradient(135deg, rgba(245,200,66,0.12), rgba(245,200,66,0.03))',
          border: '1px solid #c9a227',
          boxShadow: '0 0 44px rgba(245,200,66,0.1)',
        }}
      >
        <MessageCircle size={34} color="#f5c842" strokeWidth={1.75} />
      </div>

      <h2 className="text-2xl font-black text-zinc-100 tracking-tight mb-2.5">
        Welcome to WorkSpace
      </h2>

      <p className="text-sm text-zinc-500 max-w-xs leading-relaxed mb-8">
        Pick a conversation from the sidebar or start a new one to begin chatting and collaborating.
      </p>

      {/* Feature chips */}
      <div className="flex flex-wrap items-center justify-center gap-2.5 max-w-sm">
        {features.map(({ icon: Icon, label }, i) => (
          <div
            key={label}
            className="feature-chip anim-fadeUp flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-zinc-800 border border-zinc-700 text-xs font-semibold text-zinc-400 transition cursor-default"
            style={{ animationDelay: `${i * 0.05}s` }}
          >
            <Icon size={12} color="#c9a227" />
            {label}
          </div>
        ))}
      </div>

      {/* Typing dots */}
      <div className="flex items-center gap-1.5 mt-11 opacity-40">
        {[0, 1, 2].map(i => (
          <div
            key={i}
            className="anim-dot w-1.5 h-1.5 rounded-full bg-amber-400"
            style={{ animationDelay: `${i * 0.2}s` }}
          />
        ))}
      </div>
    </div>
  );
}