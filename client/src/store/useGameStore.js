import { create } from 'zustand';

const useGameStore = create((set, get) => ({
  // Self
  selfId: null,
  selfPosition: { x: 960, y: 540 },
  username: '',
  avatarColor: '#6366f1',
  proximityRadius: 150,

  // World
  users: [], // [{ socketId, username, avatarColor, position }]

  // Proximity & Chat
  activeConnections: {}, // { [roomId]: { targetId, targetUsername, messages: [] } }

  // UI
  isJoined: false,
  chatPanelOpen: false,
  activeChatRoomId: null,
  isConnected: false,
  connectionError: null,

  // ── Actions ──────────────────────────────────────────────────────────────

  setJoined: (username, avatarColor) => set({ isJoined: true, username, avatarColor }),

  setSelfState: ({ socketId, position, proximityRadius }) =>
    set({ selfId: socketId, selfPosition: position, proximityRadius }),

  setSelfPosition: (pos) => set({ selfPosition: pos }),

  setUsers: (users) => set({ users }),

  addConnection: (roomId, targetId, targetUsername) =>
    set((state) => ({
      activeConnections: {
        ...state.activeConnections,
        [roomId]: { targetId, targetUsername, isTyping: false, messages: [] },
      },
      chatPanelOpen: true,
      activeChatRoomId: roomId,
    })),

  removeConnection: (roomId) =>
    set((state) => {
      const next = { ...state.activeConnections };
      delete next[roomId];
      const remaining = Object.keys(next);
      return {
        activeConnections: next,
        activeChatRoomId: remaining[remaining.length - 1] || null,
        chatPanelOpen: remaining.length > 0,
      };
    }),

  setTyping: (roomId, isTyping) =>
    set((state) => {
      const conn = state.activeConnections[roomId];
      if (!conn) return {};
      return {
        activeConnections: {
          ...state.activeConnections,
          [roomId]: { ...conn, isTyping },
        },
      };
    }),

  addMessage: (roomId, message) =>
    set((state) => {
      const conn = state.activeConnections[roomId];
      if (!conn) return {};
      return {
        activeConnections: {
          ...state.activeConnections,
          [roomId]: { ...conn, messages: [...conn.messages, message], isTyping: false },
        },
      };
    }),

  setActiveChatRoom: (roomId) => set({ activeChatRoomId: roomId, chatPanelOpen: true }),
  closeChatPanel: () => set({ chatPanelOpen: false }),

  // Connection Actions
  setConnected: (status) => set({ isConnected: status, connectionError: null }),
  setConnectionError: (error) => set({ connectionError: error, isConnected: false }),
}));

export default useGameStore;
