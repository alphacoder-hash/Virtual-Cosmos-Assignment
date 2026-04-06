import useGameStore from '../store/useGameStore';

export default function HUD() {
  const { users, selfId, selfPosition, username, avatarColor, activeConnections } = useGameStore();

  const onlineCount = users.length;
  const connectionCount = Object.keys(activeConnections).length;

  const WORLD_W = 2400;
  const WORLD_H = 1600;
  const MAP_W = 180;
  const MAP_H = 120;
  const scaleX = MAP_W / WORLD_W;
  const scaleY = MAP_H / WORLD_H;

  return (
    <div className="hud">
      {/* Top-left: Branding */}
      <div className="hud-brand">
        <div className="hud-brand-orb" style={{ background: avatarColor }} />
        <div>
          <div className="hud-title">Virtual Cosmos</div>
          <div className="hud-username">{username}</div>
        </div>
      </div>

      {/* Top-right: Stats */}
      <div className="hud-stats">
        <div className="hud-stat">
          <div className="hud-stat-dot online" />
          <span>{onlineCount} online</span>
        </div>
        {connectionCount > 0 && (
          <div className="hud-connections-tray">
            <div className="hud-stat connected">
              <svg width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <span>{connectionCount} Connected</span>
            </div>
            <div className="hud-connection-names">
              {Object.values(activeConnections).map(conn => (
                <span key={conn.targetId} className="connection-chip">
                  {conn.targetUsername}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Bottom-left: Controls hint */}
      <div className="hud-controls">
        <div className="key-row">
          <span className="key">W</span>
          <span className="key">A</span>
          <span className="key">S</span>
          <span className="key">D</span>
        </div>
        <span className="hint-text">to explore the cosmos</span>
      </div>

      {/* Bottom-right: Mini-map */}
      <div className="hud-minimap">
        <div className="minimap-container" style={{ width: MAP_W, height: MAP_H }}>
          <div className="minimap-grid" />
          
          {/* Other players */}
          {users.filter(u => u.socketId !== selfId).map(u => (
            <div 
              key={u.socketId}
              className="minimap-dot"
              style={{ 
                left: u.position.x * scaleX, 
                top: u.position.y * scaleY,
                background: u.avatarColor 
              }}
            />
          ))}

          {/* Local player */}
          <div 
            className="minimap-dot self"
            style={{ 
              left: selfPosition.x * scaleX, 
              top: selfPosition.y * scaleY,
              background: avatarColor
            }}
          />
        </div>
        <div className="minimap-coords">
          <span>X: {Math.round(selfPosition.x)}</span>
          <span>Y: {Math.round(selfPosition.y)}</span>
        </div>
      </div>

      {/* Proximity indicator */}
      {connectionCount > 0 && (
        <div className="hud-proximity-badge">
          <span className="pulse-ring" />
          <span>Proximity Chat Active</span>
        </div>
      )}
    </div>
  );
}
