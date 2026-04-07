# 🌌 Virtual Cosmos – Assignment Submission

A high-performance, real-time 2D social environment where users can meet and interact through **proximity-based chat and audio**. This project simulates real-world social dynamics in a digital space.

---

## ✨ Core Features (Assignment Requirements)

- [x] **User Movement**: Multi-directional movement (WASD/Arrows) using **PixiJS** for smooth, 60fps canvas rendering.
- [x] **Real-Time Multiplayer**: All user positions are synced across all clients with ultra-low latency using **Socket.IO**.
- [x] **Proximity Detection**: Automatic detection of nearby users using a 150px radius logic.
- [x] **Smart Chat System**: 
    - Automatically joins a private room when users enter proximity.
    - Seamlessly disconnects when users move apart.
    - Minimalist slide-in chat panel for messaging.
- [x] **UI/UX**: Clean, glassmorphic interface showing avatars, active connections, and a dynamic HUD.

---

## 💎 Bonus Features (Enhanced Experience)

1.  **🚀 Modern Join Experience**: 
    - **Particle Background**: A dynamic, animated background with floating cosmos particles.
    - **Avatar Customization**: Choose your signature color from a curated palette before entering.
    - **Interactive UI**: Glassmorphic cards with subtle hover effects and smooth transitions.
2.  **📡 Radar Mini-map**: A real-time, pulsing radar in the HUD that shows yours and other players' positions across the entire map.
3.  **🏃 Human-like Animated Avatars**: We replaced simple circles with composite character models (Body, Head, Eyes) featuring **Walking Bobbing** and **Idle Breathing** animations.
4.  **🔊 Automatic Proximity Audio (Voice Chat)**: A peer-to-peer **WebRTC** voice link that activates automatically on proximity, allowing users to talk just like in real life.
5.  **🧭 Advanced Camera System**: A smooth-lerping camera that keeps your avatar centered in the infinite-feeling cosmos.
6.  **🎭 Social Emoji Reactions**: Real-time floating emotes (👋 ❤️ 😂 🔥) that sync across users for instant social feedback.
7.  **💬 Real-Time Typing Indicators**: See a "..." bubble above avatars and a "User is typing..." message in the chat panel while messages are being composed.

---

## 🛠 Tech Stack & Justification

| Technology | Role | Justification |
|---|---|---|
| **React (Vite)** | Frontend Framework | Fast development with high-performance bundling (Vite). Perfect for building the state-driven HUD overlay. |
| **PixiJS** | WebGL Rendering | Chosen over raw Canvas for its **GPU-accelerated** sprite system and optimized ticker. Essential for smooth animations of many players. |
| **Zustand** | State Management | Far lighter than Redux. Perfect for high-frequency position updates without causing unnecessary React re-renders. |
| **Socket.IO** | Real-time Sync | industry-standard for bi-directional socket communication. Handles automatic reconnections and rooms effortlessly. |
| **Node.js (Express)**| Backend Server | scalable and handles asynchronous I/O (sockets) perfectly for a real-time game server. |
| **MongoDB** | Persistence | Stores user profiles and session data. Used an in-memory fallback for rapid development. |

---

## 🏗 System Design Thinking

- **Proximity Calculation**: The server handles proximity detection using a centralized service that calculates the Euclidean distance between all pairs. This avoids "Client-side Cheating" and ensures room consistency.
- **WebRTC Handshake**: We use the Socket.IO connection as a "Signaling Channel" to exchange WebRTC offers and answers automatically when the server detects proximity.
- **Network Optimization**: Position updates are throttled and interpolated to ensure smooth movement even on slower connections.

---

## 🚀 Setup & Installation

### Prerequisites
- **Node.js** (v18 or higher)
- **npm** (v9 or higher)
- **MongoDB** (Running locally at `localhost:27017` or use a MongoDB Atlas URI)

### 1. Installation
The project is structured as a monorepo. You can install all dependencies (root, silver, and client) with one command from the project root:

```bash
# From the virtual-cosmos folder
npm install
npm run install-all
```

### 2. Configure Environment
Create a `.env` file in the `server/` directory:
```env
PORT=3001
MONGO_URI=mongodb://localhost:27017/virtual-cosmos
CLIENT_URL=http://localhost:5173
```

### 3. Quick Start (Run Everything)
To launch both the backend and the frontend simultaneously:

```bash
# From the project root
npm run dev
```

- **Backend**: [http://localhost:3001](http://localhost:3001)
- **Frontend**: [http://localhost:5173](http://localhost:5173)

---

## 🛠 Troubleshooting

- **No Audio?** Browser security policies prevent audio from playing until you interact with the page. Click anywhere in the game after joining to enable the voice chat.
- **MongoDB Connection**: If the server logs `MongoDB unavailable`, it will automatically fall back to **In-Memory mode**, so you can still test all features without a local database.
- **Microphone Permissions**: Ensure you allow microphone access in your browser when prompted to enable proximity voice chat.

---

## 📂 Project Structure
```text
client/
├── src/
│   ├── components/       # UI Components (HUD, Chat, Join, Canvas)
│   ├── hooks/            # Logic (Socket, Keyboard, WebRTC Audio)
│   ├── store/            # Zustand global game state
│   └── App.jsx           # Main Layout
server/
├── services/             # Proximity & logic services
├── models/               # MongoDB Database models
└── index.js              # Socket.IO & Express entry
```

---

## 📄 License
MIT
