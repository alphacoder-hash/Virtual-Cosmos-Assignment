require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');

const User = require('./models/User');
const {
  PROXIMITY_RADIUS,
  getProximityRoomId,
  findNearbyUsers,
  getDistance,
} = require('./services/proximityService');

// ─── App Setup ───────────────────────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

// ─── In-Memory User State ────────────────────────────────────────────────────
// Map<socketId, { username, avatarColor, position: {x, y}, proximityPartners: Set<socketId> }>
const users = new Map();

// ─── MongoDB Connection ───────────────────────────────────────────────────────
mongoose.set('bufferCommands', false);
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/virtual-cosmos';
mongoose.connect(MONGO_URI)
  .then(() => console.log('[DB] MongoDB connected'))
  .catch((err) => console.warn('[DB] MongoDB unavailable, running in-memory only:', err.message));

// ─── Helper: Broadcast Full World State ──────────────────────────────────────
function broadcastWorldState() {
  const worldState = Array.from(users.entries()).map(([socketId, u]) => ({
    socketId,
    username: u.username,
    avatarColor: u.avatarColor,
    position: u.position,
  }));
  io.emit('WORLD_STATE', worldState);
}

// ─── Socket.IO Events ─────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`[SOCKET] Client connected: ${socket.id}`);

  // ── USER_JOIN ────────────────────────────────────────────────────────────
  socket.on('USER_JOIN', async ({ username, avatarColor }) => {
    const startX = 200 + Math.random() * 1520;
    const startY = 200 + Math.random() * 680;

    users.set(socket.id, {
      username: username || `User_${socket.id.slice(0, 4)}`,
      avatarColor: avatarColor || '#6366f1',
      position: { x: startX, y: startY },
      proximityPartners: new Set(),
    });

    // Persist to MongoDB (non-blocking)
    User.findOneAndUpdate(
      { socketId: socket.id },
      { socketId: socket.id, username, avatarColor, position: { x: startX, y: startY }, isOnline: true },
      { upsert: true, new: true }
    ).catch(() => {});

    console.log(`[JOIN] ${username} (${socket.id}) at (${Math.round(startX)}, ${Math.round(startY)})`);

    // Send the joining user their own state
    socket.emit('SELF_STATE', {
      socketId: socket.id,
      position: { x: startX, y: startY },
      proximityRadius: PROXIMITY_RADIUS,
    });

    broadcastWorldState();
  });

  // ── POSITION_UPDATE ──────────────────────────────────────────────────────
  socket.on('POSITION_UPDATE', ({ x, y }) => {
    const user = users.get(socket.id);
    if (!user) return;

    user.position = { x, y };

    // ── SYSTEM DESIGN Thinking: Proximity Logic ──────────────────────────────
    // 1. Every movement (POSITION_UPDATE) triggers a radius-based scan.
    // 2. Server calculates Euclidean distance between all pairs (O(n)).
    // 3. Socket.IO 'Rooms' are used to isolate chat traffic to nearby users.
    // 4. This ensures security and low bandwidth for the participants.
    // ────────────────────────────────────────────────────────────────────────

    const currentPartners = user.proximityPartners;
    const nowNearby = new Set();

    for (const [otherId, otherUser] of users) {
      if (otherId === socket.id) continue;
      const dist = getDistance({ x, y }, otherUser.position);
      if (dist < PROXIMITY_RADIUS) {
        nowNearby.add(otherId);
      }
    }

    // Newly entered proximity
    for (const partnerId of nowNearby) {
      if (!currentPartners.has(partnerId)) {
        const roomId = getProximityRoomId(socket.id, partnerId);
        socket.join(roomId);

        const partnerSocket = io.sockets.sockets.get(partnerId);
        if (partnerSocket) {
          partnerSocket.join(roomId);

          // Notify both users
          socket.emit('PROXIMITY_START', {
            targetId: partnerId,
            targetUsername: users.get(partnerId)?.username,
            roomId,
          });
          partnerSocket.emit('PROXIMITY_START', {
            targetId: socket.id,
            targetUsername: user.username,
            roomId,
          });
        }

        currentPartners.add(partnerId);
        users.get(partnerId)?.proximityPartners.add(socket.id);
      }
    }

    // Left proximity
    for (const partnerId of currentPartners) {
      if (!nowNearby.has(partnerId)) {
        const roomId = getProximityRoomId(socket.id, partnerId);
        socket.leave(roomId);

        const partnerSocket = io.sockets.sockets.get(partnerId);
        if (partnerSocket) {
          partnerSocket.leave(roomId);

          socket.emit('PROXIMITY_END', { targetId: partnerId, roomId });
          partnerSocket.emit('PROXIMITY_END', { targetId: socket.id, roomId });
        }

        currentPartners.delete(partnerId);
        users.get(partnerId)?.proximityPartners.delete(socket.id);
      }
    }

    // Broadcast updated positions to all
    broadcastWorldState();
  });

  // ── CHAT_MESSAGE ─────────────────────────────────────────────────────────
  socket.on('CHAT_MESSAGE', ({ roomId, text }) => {
    const user = users.get(socket.id);
    if (!user || !text?.trim()) return;

    // FIX: roomId MUST be included in the broadcast payload
    // Client uses it to route the message to the correct conversation
    io.to(roomId).emit('CHAT_MESSAGE', {
      roomId,                    // ← was missing, causing messages to be lost
      senderId: socket.id,
      senderName: user.username,
      senderColor: user.avatarColor,
      text: text.trim(),
      timestamp: Date.now(),
    });
  });

  // ── WebRTC Signaling (relay only - server never inspects SDP) ────────────
  socket.on('WEBRTC_OFFER', ({ targetId, offer }) => {
    io.to(targetId).emit('WEBRTC_OFFER', { fromId: socket.id, offer });
  });

  socket.on('WEBRTC_ANSWER', ({ targetId, answer }) => {
    io.to(targetId).emit('WEBRTC_ANSWER', { fromId: socket.id, answer });
  });

  socket.on('WEBRTC_ICE_CANDIDATE', ({ targetId, candidate }) => {
    io.to(targetId).emit('WEBRTC_ICE_CANDIDATE', { fromId: socket.id, candidate });
  });

  socket.on('USER_EMOTE', ({ emoji }) => {
    // Relay to everyone so they see the emote on the sender
    io.emit('USER_EMOTE', { socketId: socket.id, emoji });
  });

  socket.on('TYPING_STATUS', ({ roomId, isTyping }) => {
    // Relay to everyone in the room
    socket.to(roomId).emit('TYPING_STATUS', { socketId: socket.id, isTyping, roomId });
  });

  socket.on('AUDIO_MUTE_TOGGLE', ({ muted }) => {
    // Broadcast mute state to all proximity partners
    const user = users.get(socket.id);
    if (!user) return;
    for (const partnerId of user.proximityPartners) {
      io.to(partnerId).emit('PEER_MUTE_STATE', { socketId: socket.id, muted });
    }
  });


  // ── DISCONNECT ───────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (user) {
      // Notify all proximity partners
      for (const partnerId of user.proximityPartners) {
        const partnerSocket = io.sockets.sockets.get(partnerId);
        if (partnerSocket) {
          const roomId = getProximityRoomId(socket.id, partnerId);
          partnerSocket.leave(roomId);
          partnerSocket.emit('PROXIMITY_END', { targetId: socket.id, roomId });
        }
        users.get(partnerId)?.proximityPartners.delete(socket.id);
      }

      users.delete(socket.id);
      User.findOneAndUpdate({ socketId: socket.id }, { isOnline: false }).catch(() => {});
      console.log(`[LEAVE] ${user.username} (${socket.id}) disconnected`);
    }

    broadcastWorldState();
  });
});

// ─── Root & Health Routes ──────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    name: 'Virtual Cosmos API',
    status: 'running',
    version: '1.0.0',
    usersOnline: users.size,
    endpoints: {
      health: 'GET /health',
      socketio: 'ws://localhost:3001 (Socket.IO)',
    },
    note: 'Frontend is served at http://localhost:5173',
  });
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    usersOnline: users.size,
    uptime: Math.round(process.uptime()) + 's',
    timestamp: new Date().toISOString(),
  });
});

// ─── Start ────────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`[SERVER] Virtual Cosmos running on http://localhost:${PORT}`);
});
