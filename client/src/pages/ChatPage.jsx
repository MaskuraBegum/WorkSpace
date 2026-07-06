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

  // Load conversations
  useEffect(() => {
    const loadConversations = async () => {
      const { data } = await api.get('/conversations');
      setConversations(data);
    };
    loadConversations();
  }, []);

  // Connect socket
  useEffect(() => {
    const socket = connectSocket(user._id);

    socket.on('connect', () => {
      console.log('Socket connected, emitting user:online for', user._id);
      socket.emit('user:online', user._id);
    });

    socket.on('users:online', (users) => {
      console.log('Online users:', users);
      setOnlineUsers(users);
    });

    socket.on('user:status', ({ userId, status }) => {
      updateUserStatus(userId, status);
    });

    socket.on('message:received', (message) => {
      console.log('Message received:', message);
      if (message.sender?._id !== user._id) {
        addMessage(message);
      }
    });

    socket.on('typing:start', ({ userId, userName, conversationId }) => {
      console.log('Typing start:', { userId, userName, conversationId });
      setTyping(conversationId, userId, userName, true);
    });
    
    socket.on('typing:stop', ({ userId, conversationId }) => {
      console.log('Typing stop:', { userId, conversationId });
      setTyping(conversationId, userId, null, false);
    });

    return () => disconnectSocket();
  }, []);

  return (
    <div className="flex h-screen bg-slate-900 overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0">
        {activeConversation ? <ChatWindow /> : <NoChatSelected />}
      </div>
      {activeConversation && <WorkspacePanel />}
    </div>
  );
}

function NoChatSelected() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
      <div className="w-20 h-20 bg-slate-800 rounded-full flex items-center justify-center mb-4">
        <span className="text-4xl">💬</span>
      </div>
      <h2 className="text-xl font-semibold text-white mb-2">Welcome to WorkSpace</h2>
      <p className="text-slate-400 max-w-sm">
        Select a conversation from the sidebar or search for someone to start chatting and collaborating.
      </p>
    </div>
  );
}