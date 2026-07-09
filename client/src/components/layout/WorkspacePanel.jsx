import { useState } from 'react';
import { CheckSquare, FileText } from 'lucide-react';
import TaskPanel from '../tasks/TaskPanel';
import NotePanel from '../notes/NotePanel';
import useChatStore from '../../store/chatStore';
import { P } from '../../theme';

export default function WorkspacePanel() {
  const [tab, setTab] = useState('tasks');
  const { activeConversation } = useChatStore();

  const tabStyle = (active) => ({
    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px',
    padding: '11px 0', fontSize: '13px', fontWeight: 600, cursor: 'pointer',
    borderRadius: '8px 8px 0 0', transition: 'all 0.15s', border: 'none',
    background: active ? P.goldGlow : 'transparent',
    color: active ? P.gold : P.textMid,
    borderBottom: active ? `2px solid ${P.gold}` : '2px solid transparent',
  });

  return (
    <div
      className="wp-container"
      style={{ width: '320px', background: P.surface, borderLeft: `1px solid ${P.border}`, display: 'flex', flexDirection: 'column', flexShrink: 0, height: '100%' }}
    >
      <style>{`
        /* Mobile: take the full width of its container instead of the fixed desktop width */
        @media (max-width: 767px) {
          .wp-container { width: 100% !important; border-left: none !important; }
        }
      `}</style>

      <div style={{ display: 'flex', borderBottom: `1px solid ${P.border}`, padding: '4px 4px 0' }}>
        <button onClick={() => setTab('tasks')} style={tabStyle(tab === 'tasks')}>
          <CheckSquare size={15} /> Tasks
        </button>
        <button onClick={() => setTab('notes')} style={tabStyle(tab === 'notes')}>
          <FileText size={15} /> Notes
        </button>
      </div>

      <div style={{ flex: 1, overflow: 'hidden' }}>
        {tab === 'tasks'
          ? <TaskPanel conversationId={activeConversation?._id} />
          : <NotePanel conversationId={activeConversation?._id} />
        }
      </div>
    </div>
  );
}