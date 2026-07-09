import { useState } from 'react';
import { CheckSquare, FileText } from 'lucide-react';
import TaskPanel from '../tasks/TaskPanel';
import NotePanel from '../notes/NotePanel';
import useChatStore from '../../store/chatStore';
import { P } from '../../theme';

export default function WorkspacePanel() {
  const [tab, setTab] = useState('tasks');
  const { activeConversation } = useChatStore();

  const tabClass = (active) =>
    `flex-1 flex items-center justify-center gap-[7px] py-[11px] text-[13px] font-semibold cursor-pointer rounded-t-lg transition-all duration-150 border-0 border-b-2 ${
      active ? 'border-[#f5c842]' : 'border-transparent'
    }`;

  const tabStyle = (active) => ({
    background: active ? P.goldGlow : 'transparent',
    color: active ? P.gold : P.textMid,
  });

  return (
    <div
      className="w-full md:w-[320px] flex flex-col shrink-0 h-full border-l-0 md:border-l"
      style={{ background: P.surface, borderColor: P.border }}
    >
      <div className="flex px-1 pt-1" style={{ borderBottom: `1px solid ${P.border}` }}>
        <button onClick={() => setTab('tasks')} className={tabClass(tab === 'tasks')} style={tabStyle(tab === 'tasks')}>
          <CheckSquare size={15} /> Tasks
        </button>
        <button onClick={() => setTab('notes')} className={tabClass(tab === 'notes')} style={tabStyle(tab === 'notes')}>
          <FileText size={15} /> Notes
        </button>
      </div>

      <div className="flex-1 overflow-hidden">
        {tab === 'tasks'
          ? <TaskPanel conversationId={activeConversation?._id} />
          : <NotePanel conversationId={activeConversation?._id} />
        }
      </div>
    </div>
  );
}