import { useState } from 'react';
import { CheckSquare, FileText } from 'lucide-react';
import TaskPanel from '../tasks/TaskPanel';
import NotePanel from '../notes/NotePanel';
import useChatStore from '../../store/chatStore';

export default function WorkspacePanel() {
  const [tab, setTab] = useState('tasks');
  const { activeConversation } = useChatStore();

  return (
    <div className="w-80 bg-slate-800 border-l border-slate-700 flex flex-col flex-shrink-0">
      {/* Tabs */}
      <div className="flex border-b border-slate-700">
        <button
          onClick={() => setTab('tasks')}
          className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition ${
            tab === 'tasks'
              ? 'text-indigo-400 border-b-2 border-indigo-500'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <CheckSquare size={16} />
          Tasks
        </button>
        <button
          onClick={() => setTab('notes')}
          className={`flex-1 flex items-center justify-center gap-2 py-4 text-sm font-medium transition ${
            tab === 'notes'
              ? 'text-indigo-400 border-b-2 border-indigo-500'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileText size={16} />
          Notes
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