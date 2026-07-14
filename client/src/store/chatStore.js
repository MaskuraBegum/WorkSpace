import { create } from 'zustand';

const useChatStore = create((set, get) => ({
  conversations: [],
  activeConversation: null,
  messages: [],
  onlineUsers: [],
  typingUsers: {},
  tasks: [],

  setConversations: (conversations) => set({ conversations }),

  setActiveConversation: (conversation) => set({
    activeConversation: conversation,
    messages: [],
    tasks: []
  }),

  setMessages: (messages) => set({ messages }),

  addMessage: (message) => set((state) => ({
    messages: [...state.messages, message],
    conversations: state.conversations.map(c =>
      c._id === message.conversation
        ? { ...c, lastMessage: message, updatedAt: message.createdAt }
        : c
    ).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
  })),

  // Replace temp message with real one from server
  replaceMessage: (message) => set((state) => {
    const hasTempMsg = state.messages.some(m =>
      m._id?.length !== 24 &&
      m.content === message.content &&
      m.sender?._id === message.sender?._id
    );
    if (!hasTempMsg) return state;
    return {
      messages: state.messages.map(m =>
        m._id?.length !== 24 &&
        m.content === message.content &&
        m.sender?._id === message.sender?._id
          ? message
          : m
      )
    };
  }),

  setOnlineUsers: (users) => set({ onlineUsers: users }),

  updateUserStatus: (userId, status) => set((state) => ({
    onlineUsers: status === 'online'
      ? [...new Set([...state.onlineUsers, userId])]
      : state.onlineUsers.filter(id => id !== userId)
  })),

  setTyping: (conversationId, userId, userName, isTyping) => set((state) => ({
    typingUsers: {
      ...state.typingUsers,
      [conversationId]: isTyping ? { userId, userName } : null
    }
  })),

  setTasks: (tasks) => set({ tasks }),

  addTask: (task) => set((state) => {
    const exists = state.tasks.find(t => t._id === task._id);
    if (exists) return state;
    return { tasks: [task, ...state.tasks] };
  }),

  updateTask: (task) => set((state) => ({
    tasks: state.tasks.map(t => t._id === task._id ? task : t)
  })),

  removeTask: (taskId) => set((state) => ({
    tasks: state.tasks.filter(t => t._id !== taskId)
  })),

  removeMessage: (messageId) => set((state) => ({
    messages: state.messages.filter(m => m._id !== messageId)
  })),

  removeConversation: (conversationId) => set((state) => ({
    conversations: state.conversations.filter(c => c._id !== conversationId),
    activeConversation: state.activeConversation?._id === conversationId
      ? null
      : state.activeConversation
  })),

  updateConversation: (conversation) => set((state) => ({
    conversations: state.conversations
      .map(c => c._id === conversation._id ? conversation : c)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
  })),

  markConversationRead: (conversationId) => set((state) => ({
    conversations: state.conversations.map(c =>
      c._id === conversationId ? { ...c, unreadCount: 0 } : c
    )
  })),
}));

export default useChatStore;