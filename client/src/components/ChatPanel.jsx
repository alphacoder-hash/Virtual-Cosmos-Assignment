import { useState, useRef, useEffect } from 'react';
import useGameStore from '../store/useGameStore';
import { getSocket } from '../hooks/useSocket';

export default function ChatPanel() {
  const state = useGameStore();
  const {
    chatPanelOpen,
    activeConnections,
    activeChatRoomId,
    selfId,
    setActiveChatRoom,
  } = state;
  const setChatPanelOpen = (val) => useGameStore.setState({ chatPanelOpen: val });

  const [text, setText] = useState('');
  const messagesEndRef = useRef(null);

  const activeConn = activeChatRoomId ? activeConnections[activeChatRoomId] : null;

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConn?.messages?.length]);

  if (!chatPanelOpen) return null;

  const roomIds = Object.keys(activeConnections);

  const send = () => {
    const trimmed = text.trim();
    if (!trimmed || !activeChatRoomId) return;
    const socket = getSocket();
    if (socket?.connected) {
      socket.emit('CHAT_MESSAGE', { roomId: activeChatRoomId, text: trimmed });
    }
    setText('');
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // prevent spatial game movement
      e.stopPropagation();
      send();
    }
  };

  return (
    <div className="chat-sidebar">
      {/* Header */}
      <div className="chat-header">
        <div className="chat-header-title">Chat</div>
        <button className="chat-close-btn" onClick={() => setChatPanelOpen(false)}>✕</button>
      </div>

      {!activeConn ? (
        <div className="chat-empty">
          <p>Move closer to someone to start chatting.</p>
        </div>
      ) : (
        <>
          {/* Tabs */}
          {roomIds.length > 1 && (
            <div className="chat-tabs">
              {roomIds.map((rid) => (
                <button
                  key={rid}
                  className={`chat-tab${rid === activeChatRoomId ? ' active' : ''}`}
                  onClick={() => setActiveChatRoom(rid)}
                >
                  {activeConnections[rid].targetUsername}
                </button>
              ))}
            </div>
          )}

          {/* Messages */}
          <div className="chat-messages">
            <div className="chat-intro">
               <div className="chat-intro-avatar" style={{ background: activeConn.targetUsername ? 'var(--accent)' : '#555' }} />
               <h3>This is the beginning of your chat history with <span className="highlight-name">@{activeConn.targetUsername}</span>.</h3>
               <p>Send messages, attachments, links, emojis, and more.</p>
            </div>
            {activeConn.messages.map((msg, i) => {
              const isSelf = msg.senderId === selfId;
              return (
                <div key={i} className={`chat-line ${isSelf ? 'self' : 'other'}`}>
                  {!isSelf && (
                    <div className="chat-avatar-dot" style={{ background: msg.senderColor }} />
                  )}
                  <div className="chat-bubble">
                    {!isSelf && <span className="chat-sender">{msg.senderName}</span>}
                    <p>{msg.text}</p>
                    <span className="chat-time">
                      {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              );
            })}
            
            {activeConn.isTyping && (
              <div className="chat-typing-indicator">
                <div className="dot-flashing" />
                <span>{activeConn.targetUsername} is typing...</span>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="chat-input-container">
            <input
              type="text"
              className="chat-input"
              placeholder={`Message @${activeConn.targetUsername}`}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                // Typing logic
                const socket = getSocket();
                if (socket?.connected && activeChatRoomId) {
                  socket.emit('TYPING_STATUS', { roomId: activeChatRoomId, isTyping: true });
                  
                  if (window.typingTimeout) clearTimeout(window.typingTimeout);
                  window.typingTimeout = setTimeout(() => {
                    socket.emit('TYPING_STATUS', { roomId: activeChatRoomId, isTyping: false });
                  }, 2000);
                }
              }}
              onKeyDown={handleKey}
              autoFocus
            />
            <div className="chat-input-actions">
               {/* Dummy action icons mapping to the reference input styles */}
               <div className="actions-left">
                  <span className="icon">☺</span>
                  <span className="icon">↑</span>
                  <span className="icon">📄</span>
                  <span className="icon">𝐁</span>
                  <span className="icon">𝐼</span>
                  <span className="icon">§</span>
                  <span className="icon">&lt;&gt;</span>
               </div>
               <button className="chat-send-btn outline" onClick={send} disabled={!text.trim()}>
                  ➤
               </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
