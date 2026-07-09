import { useState } from 'react';
import { Search, Plus, LogOut, MessageSquare, LayoutDashboard } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import useChatStore from '../../store/chatStore';
import { disconnectSocket } from '../../services/socket';
import api from '../../services/api';
import ConversationItem from '../chat/ConversationItem';
import NewChatModal from '../chat/NewChatModal';
import { useNavigate } from 'react-router-dom';
import { P } from '../../theme';

export default function Sidebar() {
  const { user, logout } = useAuthStore();
  const { conversations, activeConversation, setActiveConversation } = useChatStore();
  const [search, setSearch] = useState('');
  const [showNewChat, setShowNewChat] = useState(false);
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

  return (
    <div className="sb-container" style={{
      width: '320px', background: P.surface, display: 'flex', flexDirection: 'column',
      borderRight: `1px solid ${P.border}`, flexShrink: 0, height: '100%',
    }}>
      <style>{`
        .sb-icon-btn:hover { background: ${P.goldGlow} !important; color: ${P.gold} !important; }
        .sb-logout-btn:hover { background: rgba(248,113,113,0.1) !important; color: ${P.red} !important; }
        .sb-search:focus { border-color: ${P.gold} !important; }
        .sb-empty-link:hover { color: ${P.gold} !important; }

        /* Mobile: take the full width of its container instead of the fixed desktop width */
        @media (max-width: 767px) {
          .sb-container { width: 100% !important; }
        }
      `}</style>

      {/* Header */}
      <div style={{ padding: '16px', borderBottom: `1px solid ${P.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '10px',
              background: `linear-gradient(135deg, ${P.gold}, ${P.goldDim})`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: `0 0 12px ${P.goldGlow}`,
            }}>
              <MessageSquare size={16} color="#0d0d0d" />
            </div>
            <span style={{ fontWeight: 800, color: P.text, letterSpacing: '-0.3px' }}>WorkSpace</span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button
              onClick={() => setShowNewChat(true)}
              className="sb-icon-btn"
              title="New conversation"
              style={{
                width: '32px', height: '32px', borderRadius: '8px',
                background: 'transparent', border: `1px solid ${P.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: P.textMid, cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <Plus size={16} />
            </button>
            <button
              onClick={() => navigate('/dashboard')}
              className="sb-icon-btn"
              title="Dashboard"
              style={{
                width: '32px', height: '32px', borderRadius: '8px',
                background: 'transparent', border: `1px solid ${P.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: P.textMid, cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <LayoutDashboard size={16} />
            </button>
            <button
              onClick={handleLogout}
              className="sb-logout-btn"
              title="Log out"
              style={{
                width: '32px', height: '32px', borderRadius: '8px',
                background: 'transparent', border: `1px solid ${P.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: P.textMid, cursor: 'pointer', transition: 'all 0.15s',
              }}
            >
              <LogOut size={16} />
            </button>
          </div>
        </div>

        {/* Search */}
        <div style={{ position: 'relative' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: P.textMid }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search conversations..."
            className="sb-search"
            style={{
              width: '100%', background: P.card, color: P.text, fontSize: '13px',
              padding: '9px 14px 9px 36px', borderRadius: '10px',
              border: `1px solid ${P.border}`, outline: 'none', transition: 'border-color 0.15s',
              boxSizing: 'border-box',
            }}
          />
        </div>
      </div>

      {/* User info */}
      <div style={{
        padding: '12px 16px', borderBottom: `1px solid ${P.border}`,
        display: 'flex', alignItems: 'center', gap: '10px', background: 'rgba(0,0,0,0.15)',
      }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '50%', flexShrink: 0,
          background: `linear-gradient(135deg, ${P.gold}, ${P.goldDim})`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '13px', fontWeight: 800, color: '#0d0d0d',
        }}>
          {user.name?.charAt(0).toUpperCase()}
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ color: P.text, fontSize: '13px', fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user.name}
          </p>
          <p style={{ color: P.textMid, fontSize: '11px', margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {user.email}
          </p>
        </div>
      </div>

      {/* Conversations list */}
      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filtered.length === 0 ? (
          <div style={{ padding: '40px 16px', textAlign: 'center' }}>
            <p style={{ color: P.textMid, fontSize: '13px', margin: 0 }}>
              {search ? 'No conversations found' : 'No conversations yet'}
            </p>
            {!search && (
              <button
                onClick={() => setShowNewChat(true)}
                className="sb-empty-link"
                style={{
                  marginTop: '10px', background: 'none', border: 'none',
                  color: P.goldDim, fontSize: '13px', fontWeight: 600,
                  cursor: 'pointer', transition: 'color 0.15s',
                }}
              >
                Start a conversation
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
    </div>
  );
}