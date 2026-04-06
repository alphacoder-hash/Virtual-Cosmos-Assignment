import useGameStore from '../store/useGameStore';

export default function VideoCards({ isMicOn, peerMuteStates }) {
  const { selfId, username, avatarColor, activeConnections, users } = useGameStore();

  const activePeers = Object.values(activeConnections);
  if (activePeers.length === 0) return null;

  // Include local user in the list
  const allCards = [
    { id: selfId, name: username, color: avatarColor, isMuted: !isMicOn },
    ...activePeers.map(peer => {
      // Find the user object to get their avatar color
      const user = users.find(u => u.socketId === peer.targetId);
      return {
        id: peer.targetId,
        name: peer.targetUsername,
        color: user?.avatarColor || '#6366f1',
        isMuted: peerMuteStates[peer.targetId] ?? true
      };
    })
  ];

  return (
    <div className="video-cards-overlay">
      <div className="video-cards-container">
        {allCards.map(card => (
          <div key={card.id} className="video-card">
            <div className="video-card-bg" style={{ background: card.color }}>
               {/* Decorative elements for a dummy avatar representation */}
               <div className="dummy-avatar-body" />
               <div className="dummy-avatar-head" />
            </div>
            <div className="video-card-badge">
              {card.isMuted ? (
                <svg className="mute-icon" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="1" y1="1" x2="23" y2="23"></line>
                  <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6"></path>
                  <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2a7 7 0 0 1-.11 1.23"></path>
                  <line x1="12" y1="19" x2="12" y2="23"></line>
                  <line x1="8" y1="23" x2="16" y2="23"></line>
                </svg>
              ) : (
                <div className="mic-active-dot" />
              )}
              <span className="card-name">{card.name}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
