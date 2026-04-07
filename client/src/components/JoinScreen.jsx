import { useState } from 'react';
import useGameStore from '../store/useGameStore';
import { getSocket } from '../hooks/useSocket';

const AVATAR_COLORS = [
  '#6366f1', '#ec4899', '#f59e0b', '#10b981',
  '#3b82f6', '#ef4444', '#8b5cf6', '#06b6d4',
];

export default function JoinScreen() {
  const [username, setUsername] = useState('');
  const [selectedColor, setSelectedColor] = useState(AVATAR_COLORS[0]);
  const [isConnecting, setIsConnecting] = useState(false);
  const { setJoined, connectionError } = useGameStore();

  const join = () => {
    const name = username.trim() || `Explorer_${Math.floor(Math.random() * 9999)}`;
    setIsConnecting(true);
    const socket = getSocket();
    if (socket?.connected) {
      socket.emit('USER_JOIN', { username: name, avatarColor: selectedColor });
      setJoined(name, selectedColor);
    } else {
      // Wait for connection with a timeout
      const startTime = Date.now();
      const interval = setInterval(() => {
        const s = getSocket();
        
        // Success
        if (s?.connected) {
          s.emit('USER_JOIN', { username: name, avatarColor: selectedColor });
          setJoined(name, selectedColor);
          clearInterval(interval);
          setIsConnecting(false);
          return;
        }

        // Timeout or Error from store
        if (Date.now() - startTime > 6000 || useGameStore.getState().connectionError) {
          clearInterval(interval);
          setIsConnecting(false);
        }
      }, 200);
    }
  };

  return (
    <div className="join-overlay">
      <div className="join-bg-particles">
        {[...Array(20)].map((_, i) => (
          <div key={i} className="particle" style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 4}s`,
            width: `${2 + Math.random() * 4}px`,
            height: `${2 + Math.random() * 4}px`,
          }} />
        ))}
      </div>

      <div className="join-card">
        <div className="join-logo">
          <div className="join-orb" style={{ background: selectedColor }} />
          <div className="join-orb-glow" style={{ background: selectedColor }} />
        </div>

        <h1 className="join-title">Virtual Cosmos</h1>
        <p className="join-subtitle">Move close to others to start chatting</p>

        <div className="join-form">
          <div className="join-field">
            <label className="join-label">Your Name</label>
            <input
              className="join-input"
              type="text"
              placeholder="Enter your name…"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && join()}
              maxLength={20}
              autoFocus
            />
          </div>

          <div className="join-field">
            <label className="join-label">Avatar Color</label>
            <div className="color-picker">
              {AVATAR_COLORS.map((c) => (
                <button
                  key={c}
                  className={`color-dot ${selectedColor === c ? 'selected' : ''}`}
                  style={{ background: c }}
                  onClick={() => setSelectedColor(c)}
                />
              ))}
            </div>
          </div>

          <button
            className="join-btn"
            style={{ '--btn-color': selectedColor }}
            onClick={join}
            disabled={isConnecting}
          >
            {isConnecting ? (
              <span className="join-spinner" />
            ) : (
              <>
                <span>Enter the Cosmos</span>
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </>
            )}
          </button>

          {connectionError && (
            <div className="join-error">
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              <span>{connectionError}</span>
            </div>
          )}
        </div>

        <p className="join-hint">Use WASD or Arrow keys to move</p>
      </div>
    </div>
  );
}
