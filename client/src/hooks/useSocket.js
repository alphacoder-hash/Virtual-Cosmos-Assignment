import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import useGameStore from '../store/useGameStore';

const SOCKET_URL = 'http://localhost:3001';

let socketInstance = null;

export function getSocket() {
  return socketInstance;
}

export function useSocket() {
  const socketRef = useRef(null);
  const {
    setSelfState,
    setUsers,
    addConnection,
    removeConnection,
    addMessage,
  } = useGameStore.getState();

  useEffect(() => {
    if (socketInstance) {
      socketRef.current = socketInstance;
      return;
    }

    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    socketInstance = socket;
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('[Socket] Connected:', socket.id);
    });

    socket.on('SELF_STATE', (data) => {
      setSelfState(data);
    });

    socket.on('WORLD_STATE', (users) => {
      setUsers(users);
    });

    socket.on('PROXIMITY_START', ({ targetId, targetUsername, roomId }) => {
      addConnection(roomId, targetId, targetUsername);
      console.log(`[PROXIMITY] Connected to ${targetUsername} in room ${roomId}`);
    });

    socket.on('PROXIMITY_END', ({ targetId, roomId }) => {
      removeConnection(roomId);
      console.log(`[PROXIMITY] Disconnected from ${targetId}`);
    });

    socket.on('CHAT_MESSAGE', ({ roomId, ...msg }) => {
      addMessage(roomId, msg);
    });

    socket.on('TYPING_STATUS', ({ roomId, isTyping }) => {
      useGameStore.getState().setTyping(roomId, isTyping);
    });

    socket.on('disconnect', () => {
      console.log('[Socket] Disconnected');
      socketInstance = null;
    });

    return () => {
      // Don't destroy on unmount – let the singleton live for the app lifetime
    };
  }, []);

  return socketRef.current;
}
