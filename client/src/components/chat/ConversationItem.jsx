import { useState } from 'react';
import { Trash2, Check, X } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import useChatStore from '../../store/chatStore';
import { formatDistanceToNow } from 'date-fns';
import api from '../../services/api';
import toast from 'react-hot-toast';

const P = {
  gold:      '#f5c842',
  goldDim:   '#c9a227',
  text:      '#ffffff',
  textMid:   '#ded4b0',
  textDim:   '#a89f82',
  textFaint: '#9a8f70',
};

export default function ConversationItem({ conversation, isActive, onClick }) {
  const { user } = useAuthStore();
  const { onlineUsers, removeConversation, updateConversation, setActiveConversation } = useChatStore();
  const [showDelete, setShowDelete] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false); // Tracks inline confirmation state
  const [deleting, setDeleting] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);

  const other = conversation.members?.find(m => m._id !== user._id);
  const name = conversation.isGroup ? conversation.name : other?.name || 'Unknown';
  const initial = name?.charAt(0).toUpperCase();
  const isOnline = !conversation.isGroup && onlineUsers.includes(other?._id);
  const lastMsg = conversation.lastMessage?.content || 'No messages yet';
  const time = conversation.updatedAt
    ? formatDistanceToNow(new Date(conversation.updatedAt), { addSuffix: true })
    : '';
  const unreadCount = conversation.unreadCount || 0;
  const isPending = conversation.status === 'pending';
  const isCreator = conversation.createdBy === user._id ||
    conversation.createdBy?._id === user._id;
  const needsAcceptance = isPending && !isCreator;

  // Reset confirmation state if mouse leaves item entirely
  const handleMouseLeave = () => {
    setShowDelete(false);
    setConfirmDelete(false);
  };

  const handleDeleteTrigger = (e) => {
    e.stopPropagation();
    setConfirmDelete(true);
  };

  const handleCancelDelete = (e) => {
    e.stopPropagation();
    setConfirmDelete(false);
  };

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (deleting) return;
    setDeleting(true);
    try {
      await api.delete(`/conversations/${conversation._id}`);
      removeConversation(conversation._id);
      toast.success('Conversation deleted');
    } catch {
      toast.error('Failed to delete conversation');
    } finally {
      setDeleting(false);
      setConfirmDelete(false);
      setShowDelete(false);
    }
  };

  const handleAccept = async (e) => {
    e.stopPropagation();
    if (accepting) return;
    setAccepting(true);
    try {
      const { data } = await api.put(`/conversations/${conversation._id}/accept`);
      updateConversation(data);
      toast.success('Request accepted!');
    } catch {
      toast.error('Failed to accept request');
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = async (e) => {
    e.stopPropagation();
    if (declining) return;
    setDeclining(true);
    try {
      await api.put(`/conversations/${conversation._id}/decline`);
      removeConversation(conversation._id);
      toast.success('Request declined');
    } catch {
      toast.error('Failed to decline request');
    } finally {
      setDeclining(false);
    }
  };

  return (
    <div
      onClick={needsAcceptance || confirmDelete ? undefined : onClick}
      className={`flex items-center gap-3 px-4 py-[11px] transition-colors duration-150 border-r-2 group relative ${
        needsAcceptance || confirmDelete ? 'cursor-default' : 'cursor-pointer'
      } ${
        isActive ? 'border-[#f5c842]' : 'border-transparent hover:bg-[rgba(245,200,66,0.06)]'
      }`}
      style={isActive ? { background: 'rgba(245,200,66,0.10)' } : undefined}
      onMouseEnter={() => setShowDelete(true)}
      onMouseLeave={handleMouseLeave}
    >
      {/* Avatar */}
      <div className="relative shrink-0">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-[15px] font-bold transition-all duration-150"
          style={{
            background: isActive
              ? `linear-gradient(135deg, ${P.gold}, ${P.goldDim})`
              : needsAcceptance
                ? 'rgba(248,113,113,0.15)'
                : 'rgba(245,200,66,0.16)',
            border: `1px solid ${isActive ? P.gold : needsAcceptance ? 'rgba(248,113,113,0.4)' : 'rgba(245,200,66,0.3)'}`,
            color: isActive ? '#0d0d0d' : needsAcceptance ? '#f87171' : P.gold,
          }}
        >
          {initial}
        </div>
        {isOnline && !needsAcceptance && (
          <div
            className="absolute bottom-[1px] right-[1px] w-2.5 h-2.5 rounded-full"
            style={{ background: '#4ade80', border: '2px solid #111111', boxShadow: '0 0 5px rgba(74,222,128,0.7)' }}
          />
        )}
      </div>

      {/* Info Container */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-1">
          <p
            className="text-[14px] font-bold whitespace-nowrap overflow-hidden text-ellipsis flex-1"
            style={{ color: isActive ? P.text : P.textFaint }}
          >
            {name}
          </p>

          {/* Dynamic Action/Meta Slot */}
          {!needsAcceptance && (
            <div className="flex items-center justify-end h-5 min-w-[50px] relative">
              
              {/* Normal Meta Stats: Invisible when hovering OR confirming deletion */}
              <div className={`flex items-center gap-1.5 transition-opacity duration-150 ${
                confirmDelete || showDelete ? 'opacity-0 pointer-events-none' : 'opacity-100'
              }`}>
                {unreadCount > 0 && (
                  <span className="text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center"
                    style={{ background: P.gold, color: '#0d0d0d' }}>
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
                {time && (
                  <span className="text-[11px] font-medium whitespace-nowrap" style={{ color: P.textDim }}>
                    {time}
                  </span>
                )}
              </div>

              {/* Delete Trigger Button (Trash Can) - Shows only if not confirming yet */}
              {!confirmDelete && (
                <button
                  onClick={handleDeleteTrigger}
                  className="absolute right-0 top-1/2 flex items-center justify-center w-6 h-6 rounded-md border transition-all duration-150 opacity-0 scale-90 pointer-events-none group-hover:opacity-100 group-hover:scale-100 group-hover:pointer-events-auto"
                  style={{
                    background: 'rgba(248,113,113,0.12)',
                    borderColor: 'rgba(248,113,113,0.25)',
                    color: '#f87171',
                  }}
                  title="Delete conversation"
                >
                  <Trash2 size={12} className="hover:scale-110 transition-transform" />
                </button>
              )}

              {/* Inline Confirm UI - Slides/fades into view when trash icon is clicked */}
              {confirmDelete && (
                <div className="absolute right-0 flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-150">
                  <button
                    onClick={handleDelete}
                    disabled={deleting}
                    className="flex items-center justify-center w-5 h-5 rounded bg-red-500 hover:bg-red-600 text-white transition shadow-sm"
                    title="Confirm delete"
                  >
                    {deleting ? (
                      <div className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Check size={11} strokeWidth={3} />
                    )}
                  </button>
                  <button
                    onClick={handleCancelDelete}
                    disabled={deleting}
                    className="flex items-center justify-center w-5 h-5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-400 border border-zinc-700 transition"
                    title="Cancel"
                  >
                    <X size={11} strokeWidth={3} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Last message OR request actions */}
        {needsAcceptance ? (
          <div className="flex items-center gap-2 mt-1">
            <span className="text-[11px] font-semibold text-red-400">Message request</span>
            <button
              onClick={handleAccept}
              disabled={accepting}
              className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full transition"
              style={{ background: 'rgba(74,222,128,0.15)', color: '#4ade80', border: '1px solid rgba(74,222,128,0.3)' }}
            >
              <Check size={10} />
              {accepting ? '...' : 'Accept'}
            </button>
            <button
              onClick={handleDecline}
              disabled={declining}
              className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full transition"
              style={{ background: 'rgba(248,113,113,0.15)', color: '#f87171', border: '1px solid rgba(248,113,113,0.3)' }}
            >
              <X size={10} />
              {declining ? '...' : 'Decline'}
            </button>
          </div>
        ) : (
          <p
            className={`text-[12.5px] font-medium leading-[1.45] whitespace-nowrap overflow-hidden text-ellipsis transition-opacity ${
              confirmDelete ? 'opacity-30' : 'opacity-100'
            } ${unreadCount > 0 ? 'font-semibold' : ''}`}
            style={{ color: unreadCount > 0 ? P.textMid : P.textDim }}
          >
            {confirmDelete ? 'Delete this chat?' : lastMsg}
          </p>
        )}
      </div>
    </div>
  );
}