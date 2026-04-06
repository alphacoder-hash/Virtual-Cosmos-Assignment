import useGameStore from '../store/useGameStore';
import { getSocket } from '../hooks/useSocket';

export default function BottomBar() {
  const chatPanelOpen = useGameStore((state) => state.chatPanelOpen);
  const setChatPanelOpen = (val) => useGameStore.setState({ chatPanelOpen: val });

  const leftIcons = [
    {
      name: 'Share',
      icon: <path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8M16 6l-4-4-4 4M12 2v13" />,
    },
    {
      name: 'Invite',
      icon: (
        <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M8.5 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM20 8v6M23 11h-6" />
      ),
    },
    {
      name: 'Record',
      icon: (
        <>
          <circle cx="12" cy="12" r="10" />
          <circle cx="12" cy="12" r="3" />
        </>
      ),
      color: '#ef4444',
    },
    {
      name: 'Move',
      icon: <path d="M5 9l-3 3 3 3M9 5l3-3 3 3M9 19l3 3-3-3M19 9l3 3-3 3M2 12h20M12 2v20" />,
    },
    {
      name: 'Hand',
      icon: (
        <path d="M18 11V6a2 2 0 0 0-4 0v4M14 11V4a2 2 0 0 0-4 0v6M10 11V5a2 2 0 0 0-4 0v11l-3.3-3.3a2 2 0 0 0-2.8 2.8l7.6 7.6A2 2 0 0 0 9 24h9a4 4 0 0 0 4-4V13a2 2 0 0 0-4-0" />
      ),
    },
    {
      name: 'React',
      icon: (
        <path d="M14 9V5a3 3 0 0 0-3-3l-4 9V11h2c1.3 0 2.5 1 2.5 2.5S10 16 10 16H8a4 4 0 0 0-4 4v2h14a2 2 0 0 0 2-2v-6c0-1.5-1-2.5-2.5-2.5z" />
      ),
    },
    {
      name: 'Action',
      icon: (
        <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
      ),
    },
  ];

  const emotes = ['👋', '❤️', '😂', '🔥'];

  const sendEmote = (emoji) => {
    const socket = getSocket();
    if (socket?.connected) {
      socket.emit('USER_EMOTE', { emoji });
    }
  };

  return (
    <div className="bottombar">
      <div className="emote-bar">
        {emotes.map((emoji) => (
          <button key={emoji} className="emote-btn" onClick={() => sendEmote(emoji)}>
            {emoji}
          </button>
        ))}
      </div>

      <div className="bottombar-left">
        {leftIcons.map((btn) => (
          <button key={btn.name} className="bottom-btn">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke={btn.color || 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              {btn.icon}
            </svg>
            <span>{btn.name}</span>
          </button>
        ))}
      </div>

      <div className="bottombar-right">
        <button className={`bottom-btn ${chatPanelOpen ? 'active' : ''}`} onClick={() => setChatPanelOpen(!chatPanelOpen)}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
          <span>Chat</span>
        </button>
        <button className="bottom-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="14" y="14" width="7" height="7" /><rect x="3" y="14" width="7" height="7" />
          </svg>
          <span>Apps</span>
        </button>
        <button className="bottom-btn">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" />
          </svg>
          <span>Set Home</span>
        </button>
      </div>
    </div>
  );
}
