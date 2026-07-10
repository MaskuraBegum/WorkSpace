import { useState } from 'react';
import { Search, Plus, LogOut, MessageSquare, LayoutDashboard } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import useChatStore from '../../store/chatStore';
import { disconnectSocket } from '../../services/socket';
import ConversationItem from '../chat/ConversationItem';
import NewChatModal from '../chat/NewChatModal';
import ProfilePanel from '../profile/ProfilePanel';
import { useNavigate } from 'react-router-dom';
import { P } from '../../theme';

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const { conversations, activeConversation, setActiveConversation } = useChatStore();
  const [search, setSearch] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    disconnectSocket();
    logout();
    navigate('/login');
  };

  const filtered = conversations.filter(c => {
    const other = c.members?.find(m => m._id !== user._id);
    const name = c.isGroup ? c.name : other?.name || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  const iconBtnClass =
    'w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-all duration-150 hover:bg-[rgba(245,200,66,0.12)] hover:text-[#f5c842]';
  const logoutBtnClass =
    'w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-all duration-150 hover:bg-[rgba(248,113,113,0.1)] hover:text-[#f87171]';

  return (
    <div
      className="w-full md:w-[320px] flex flex-col shrink-0 h-full border-r"
      style={{ background: P.surface, borderColor: P.border }}
    >
      {/* Header */}
      <div className="p-4" style={{ borderBottom: `1px solid ${P.border}` }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-[10px] flex items-center justify-center"
              style={{ background: `linear-gradient(135deg, ${P.gold}, ${P.goldDim})`, boxShadow: `0 0 12px ${P.goldGlow}` }}
            >
              <MessageSquare size={16} color="#0d0d0d" />
            </div>
            <span className="font-extrabold" style={{ color: P.text, letterSpacing: '-0.3px' }}>WorkSpace</span>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setShowNewChat(true)}
              className={iconBtnClass}
              title="New conversation"
              style={{ background: 'transparent', border: `1px solid ${P.border}`, color: P.textMid }}
            >
              <Plus size={16} />
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className={iconBtnClass}
              title="Dashboard"
              style={{ background: 'transparent', border: `1px solid ${P.border}`, color: P.textMid }}
            >
              <LayoutDashboard size={16} />
            </button>
            <button
              onClick={handleLogout}
              className={logoutBtnClass}
              title="Log out"
              style={{ background: 'transparent', border: `1px solid ${P.border}`, color: P.textMid }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: P.textMid }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="w-full text-[13px] py-[9px] pr-3.5 pl-9 rounded-[10px] outline-none transition-colors duration-150 focus:border-[#f5c842]"
            style={{ background: P.card, color: P.text, border: `1px solid ${P.border}` }}
          />
        </div>
      </div>

      {/* User profile card — clickable */}
      <button
        onClick={() => setShowProfile(true)}
        className="w-full px-4 py-3 flex items-center gap-3 text-left transition-all duration-150 group"
        style={{
          borderBottom: `1px solid ${P.border}`,
          background: 'rgba(0,0,0,0.15)',
        }}
        onMouseEnter={e => e.currentTarget.style.background = 'rgba(245,200,66,0.05)'}
        onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.15)'}
      >
        {/* Avatar */}
        <div className="relative flex-shrink-0">
          <div
            className="w-9 h-9 rounded-full overflow-hidden flex items-center justify-center text-[13px] font-extrabold"
            style={{ border: `2px solid ${P.gold}` }}
          >
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt="avatar" className="w-full h-full object-cover" />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-[13px] font-extrabold"
                style={{ background: `linear-gradient(135deg, ${P.gold}, ${P.goldDim})`, color: '#0d0d0d' }}
              >
                {user.name?.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          {/* Online dot */}
          <div
            className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2"
            style={{ background: '#4ade80', borderColor: P.surface, boxShadow: '0 0 6px rgba(74,222,128,0.6)' }}
          />
        </div>

        {/* Name + hint */}
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold truncate leading-tight" style={{ color: P.text }}>
            {user.name}
          </p>
          <p className="text-[11px] truncate leading-tight mt-0.5 transition-colors duration-150"
            style={{ color: P.textMid }}
          >
            {user.email}
          </p>
        </div>

        {/* Edit hint */}
        <span
          className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex-shrink-0"
          style={{ background: P.goldGlow, color: P.goldDim, border: `1px solid rgba(245,200,66,0.2)` }}
        >
          <span className='text-lg'>⚙︎</span>
        </span>
      </button>

      {/* Section label */}
      <div className="px-4 pt-3 pb-1 flex-shrink-0">
        <span className="text-[10px] font-bold uppercase tracking-widest" style={{ color: P.textMid }}>
          Conversations
        </span>
      </div>

      {/* Conversations list */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="px-4 py-10 text-center">
            <p className="text-[13px]" style={{ color: P.textMid }}>
              {search ? 'No conversations found' : 'No conversations yet'}
            </p>
            {!search && (
              <button
                onClick={() => setShowNewChat(true)}
                className="mt-2.5 text-[13px] font-semibold cursor-pointer transition-colors duration-150 hover:text-[#f5c842] bg-transparent border-0"
                style={{ color: P.goldDim }}
              >
                Start a conversation →
              </button>
            )}
          </div>
        ) : (
          filtered.map(conversation => (
            <ConversationItem
              key={conversation._id}
              conversation={conversation}
              isActive={activeConversation?._id === conversation._id}
              onClick={() => setActiveConversation(conversation)}
            />
          ))
        )}
      </div>

      {showNewChat && <NewChatModal onClose={() => setShowNewChat(false)} />}
      {showProfile && <ProfilePanel onClose={() => setShowProfile(false)} />}
    </div>
  );
}