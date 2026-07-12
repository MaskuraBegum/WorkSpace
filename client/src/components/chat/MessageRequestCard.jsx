import { useState, useEffect } from 'react';
import { Check, X, MessageCircle } from 'lucide-react';
import useAuthStore from '../../store/authStore';
import useChatStore from '../../store/chatStore';
import api from '../../services/api';
import toast from 'react-hot-toast';
import { P } from '../../theme';
import { formatDistanceToNow } from 'date-fns';

export default function MessageRequestCard({ conversation }) {
  const { user } = useAuthStore();
  const { updateConversation, removeConversation, setActiveConversation } = useChatStore();
  const [accepting, setAccepting] = useState(false);
  const [declining, setDeclining] = useState(false);
  const [preview, setPreview] = useState(null);

  const other = conversation.members?.find(m => m._id !== user._id);
  const name = other?.name || 'Unknown';
  const initial = name?.charAt(0).toUpperCase();

  // Load first message preview
  useEffect(() => {
    const loadPreview = async () => {
      try {
        const { data } = await api.get(`/messages/${conversation._id}`);
        if (data.length > 0) setPreview(data[0]);
      } catch {}
    };
    loadPreview();
  }, [conversation._id]);

  const handleAccept = async () => {
    if (accepting) return;
    setAccepting(true);
    try {
      const { data } = await api.put(`/conversations/${conversation._id}/accept`);
      updateConversation(data);
      setActiveConversation(data);
      toast.success(`Now chatting with ${name}!`);
    } catch {
      toast.error('Failed to accept request');
    } finally {
      setAccepting(false);
    }
  };

  const handleDecline = async () => {
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
      className="rounded-2xl overflow-hidden"
      style={{
        background: P.card,
        border: `1px solid rgba(245,200,66,0.2)`,
        boxShadow: `0 0 20px rgba(245,200,66,0.05)`,
      }}
    >
      {/* Sender info */}
      <div className="flex items-center gap-3 px-4 pt-3.5 pb-2.5">
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-[14px] font-bold shrink-0"
          style={{
            background: 'rgba(245,200,66,0.15)',
            border: `1px solid rgba(245,200,66,0.3)`,
            color: P.gold,
          }}
        >
          {initial}
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-bold truncate" style={{ color: P.text }}>
            {name}
          </p>
          <p className="text-[11px]" style={{ color: P.textMid }}>
            wants to connect with you
          </p>
        </div>
        <div
          className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0"
          style={{ background: 'rgba(245,200,66,0.1)', color: P.goldDim, border: `1px solid rgba(245,200,66,0.2)` }}
        >
          <MessageCircle size={9} />
          New
        </div>
      </div>

      {/* Message preview */}
      {preview && (
        <div
          className="mx-3 mb-3 px-3 py-2 rounded-xl text-[12px] leading-relaxed"
          style={{
            background: P.surface,
            border: `1px solid ${P.border}`,
            color: P.textMid,
          }}
        >
          <p className="line-clamp-2 break-words">
            {preview.content || '📎 Sent a file'}
          </p>
          {preview.createdAt && (
            <p className="text-[10px] mt-1 opacity-60">
              {formatDistanceToNow(new Date(preview.createdAt), { addSuffix: true })}
            </p>
          )}
        </div>
      )}

      {/* Action buttons */}
      <div
        className="flex border-t"
        style={{ borderColor: P.border }}
      >
        <button
          onClick={handleDecline}
          disabled={declining || accepting}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-semibold transition disabled:opacity-40"
          style={{
            color: '#f87171',
            borderRight: `1px solid ${P.border}`,
          }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(248,113,113,0.08)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          {declining
            ? <div className="w-3.5 h-3.5 border-2 border-red-400 border-t-transparent rounded-full animate-spin" />
            : <X size={13} />
          }
          Decline
        </button>
        <button
          onClick={handleAccept}
          disabled={accepting || declining}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 text-[12px] font-bold transition disabled:opacity-40"
          style={{ color: P.gold }}
          onMouseEnter={e => e.currentTarget.style.background = 'rgba(245,200,66,0.08)'}
          onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
        >
          {accepting
            ? <div className="w-3.5 h-3.5 border-2 border-amber-400 border-t-transparent rounded-full animate-spin" />
            : <Check size={13} />
          }
          Accept
        </button>
      </div>
    </div>
  );
}
