import { useSocket } from './hooks/useSocket';
import { useAudio } from './hooks/useAudio';
import useGameStore from './store/useGameStore';
import JoinScreen from './components/JoinScreen';
import GameCanvas from './components/GameCanvas';
import ChatPanel from './components/ChatPanel';
import TopBar from './components/TopBar';
import HUD from './components/HUD';
import BottomBar from './components/BottomBar';
import VideoCards from './components/VideoCards';
import './App.css';

export default function App() {
  useSocket(); // Initialize socket connection at root level
  const audioProps = useAudio();
  const { isJoined } = useGameStore();

  return (
    <div className="app-root">
      {!isJoined ? (
        <JoinScreen onJoin={() => audioProps.enableMic(true)} />
      ) : (
        <div className="layout-container">
          <TopBar {...audioProps} />
          <div className="main-content">
            <div className="canvas-wrapper">
              <GameCanvas />
              <HUD />
              <VideoCards {...audioProps} />
              <BottomBar />
            </div>
            <ChatPanel />
          </div>
        </div>
      )}
    </div>
  );
}
