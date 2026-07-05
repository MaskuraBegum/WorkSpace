import { create } from 'zustand';

const useChatStore = create((set, get) => ({
  conversations: [],
  activeConversation: null,
  messages: [],
  onlineUsers: [],
  typingUsers: {},

  setConversations: (conversations) => set({ conversations }),

  setActiveConversation: (conversation) => set({
    activeConversation: conversation,
    messages: []
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

  setOnlineUsers: (users) => set({ onlineUsers: users }),

  updateUserStatus: (userId, status) => set((state) => ({
    onlineUsers: status === 'online'
      ? [...new Set([...state.onlineUsers, userId])]
      : state.onlineUsers.filter(id => id !== userId)
  })),

  setTyping: (conversationId, userId, userName, isTyping) => set((state) => ({
    typingUsers: {
      ...state.typingUsers,
      [conversationId]: isTyping
        ? { userId, userName }
        : null
    }
  })),
}));

export default useChatStore;
