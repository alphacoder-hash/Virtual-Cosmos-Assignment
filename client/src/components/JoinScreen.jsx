import { useState, useEffect } from 'react';
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
  const { setJoined, connectionError, setCustomBackendUrl, isConnected } = useGameStore();
  const [showServerSetup, setShowServerSetup] = useState(false);
  const [tempBackendUrl, setTempBackendUrl] = useState(localStorage.getItem('custom_backend_url') || '');

  // AUTO-OFFLINE FALLBACK
  useEffect(() => {
    let timer;
    if (connectionError && isConnecting && !showServerSetup) {
      // If we've been trying to connect and failed, wait 3s then jump in anyway
      timer = setTimeout(() => {
        if (!isConnected && !showServerSetup) {
          console.log("Connection failed/timed out. Auto-entering offline mode.");
          joinOffline();
        }
      }, 3000);
    }
    return () => clearTimeout(timer);
  }, [connectionError, isConnecting, showServerSetup, isConnected]);

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
        if (Date.now() - startTime > 4000 || useGameStore.getState().connectionError) {
          clearInterval(interval);
          setIsConnecting(false);
        }
      }, 200);
    }
  };

  const joinOffline = () => {
    const name = username.trim() || `Explorer_${Math.floor(Math.random() * 9999)}`;
    setJoined(name, selectedColor);
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
            <div className="join-error-container">
              <div className="join-error">
                <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                  <circle cx="12" cy="12" r="10" />
                  <line x1="12" y1="8" x2="12" y2="12" />
                  <line x1="12" y1="16" x2="12.01" y2="16" />
                </svg>
                <span>{connectionError}</span>
              </div>
              <div className="join-error-actions">
                <button className="error-action-btn primary" onClick={() => setShowServerSetup(true)}>
                  ⚙️ Server Setup
                </button>
                <button className="error-action-btn secondary" onClick={joinOffline}>
                  🚶 Enter Offline
                </button>
              </div>
            </div>
          )}
        </div>

        {showServerSetup && (
          <div className="server-setup-overlay">
            <div className="server-setup-card">
              <h3>Server Settings</h3>
              <p>Enter your hosted backend URL or Desktop IP (e.g. http://192.168.1.5:3001)</p>
              <input 
                type="text" 
                className="join-input" 
                placeholder="http://localhost:3001"
                value={tempBackendUrl}
                onChange={(e) => setTempBackendUrl(e.target.value)}
              />
              <div className="server-setup-buttons">
                <button className="setup-btn save" onClick={() => setCustomBackendUrl(tempBackendUrl)}>Save & Reload</button>
                <button className="setup-btn close" onClick={() => setShowServerSetup(false)}>Close</button>
              </div>
            </div>
          </div>
        )}

        <p className="join-hint">Use WASD or Arrow keys to move</p>
      </div>
    </div>
  );
}
