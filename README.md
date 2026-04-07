# 🌌 Virtual Cosmos

A high-performance, real-time 2D social environment where users meet and interact through **proximity-based chat and audio**. Move around a shared canvas — when you get close to someone, a private chat and voice link automatically opens.

---

## 🚀 Quick Start (Recommended)

> **Prerequisites**: [Node.js v18+](https://nodejs.org/) must be installed. That's it — MongoDB is optional (falls back to in-memory mode automatically).

### Windows
```bash
# Double-click start.bat, OR run in terminal:
.\start.bat
```

### Mac / Linux
```bash
chmod +x start.sh
./start.sh
```

Both scripts will:
1. ✅ Check your Node.js installation
2. 📦 Install all dependencies automatically
3. ⚙️ Create the `.env` config file for you
4. 🚀 Launch the server + client simultaneously
5. 🌐 Open `http://localhost:5173` in your browser

---

## 🛠 Manual Setup (Alternative)

If you prefer to run things yourself:

### 1. Install dependencies
```bash
# From the virtual-cosmos/ root folder
npm run install-all
```

### 2. Configure environment
```bash
# Copy the example env file for the server
cp server/.env.example server/.env
```
The defaults work out-of-the-box for local development. Edit `server/.env` only if you want to use a remote MongoDB URI.

### 3. Run
```bash
# Starts both server and client together
npm run dev
```

| Service  | URL                       |
|----------|---------------------------|
| Frontend | http://localhost:5173     |
| Backend  | http://localhost:3001     |

---

## 🎮 How to Play

1. Open `http://localhost:5173` in **two browser tabs** (or share the link with a friend on the same network)
2. Enter a name and pick an avatar color
3. Move with **WASD** or **Arrow Keys**
4. Walk **close to another player** — chat and voice open automatically
5. Walk **away** — they close automatically

---

## ✨ Features

| Feature | Description |
|---|---|
| 🕹 **Real-time Movement** | 60fps canvas rendering via PixiJS, synced across all clients |
| 💬 **Proximity Chat** | Private chat room activates automatically within 150px |
| 🔊 **Proximity Voice** | Peer-to-peer WebRTC voice link, no setup needed |
| 📡 **Radar Mini-map** | Live radar HUD showing all player positions |
| 🎭 **Emoji Reactions** | Floating emotes synced in real-time (👋 ❤️ 😂 🔥) |
| ⌨️ **Typing Indicators** | "..." bubble appears above avatars while composing |
| 🧭 **Smooth Camera** | Lerp-based camera keeps your avatar centered |

---

## 🛠 Tech Stack

| Technology | Role |
|---|---|
| **React (Vite)** | Frontend framework |
| **PixiJS** | GPU-accelerated canvas rendering |
| **Zustand** | Lightweight global state |
| **Socket.IO** | Real-time bi-directional sync |
| **Node.js + Express** | Backend server |
| **MongoDB** | Persistence (auto falls back to in-memory) |
| **WebRTC** | Peer-to-peer voice chat |

---

## ❓ Troubleshooting

| Problem | Fix |
|---|---|
| **No audio/voice** | Click anywhere in the game after joining to unblock browser audio policy |
| **MongoDB error** | Server auto-falls back to in-memory mode — everything still works |
| **Microphone blocked** | Allow mic access when the browser prompts you |
| **Port already in use** | Kill the process on port 3001/5173, or change `PORT` in `server/.env` |

---

## 📂 Project Structure

```
virtual-cosmos/
├── start.bat          ← Windows one-click launcher
├── start.sh           ← Mac/Linux one-click launcher
├── package.json       ← Monorepo scripts
├── client/            ← React + Vite frontend
│   ├── src/
│   │   ├── components/   # UI (HUD, Chat, Join, Canvas)
│   │   ├── hooks/        # Socket, Keyboard, WebRTC logic
│   │   ├── store/        # Zustand global state
│   │   └── App.jsx
│   └── .env.example   ← Client env template
└── server/            ← Node.js + Socket.IO backend
    ├── services/         # Proximity detection logic
    ├── models/           # MongoDB models
    ├── .env.example   ← Server env template
    └── index.js
```

---

## 📄 License
MIT
