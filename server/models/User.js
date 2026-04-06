const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  socketId: { type: String, required: true, unique: true },
  username: { type: String, required: true },
  avatarColor: { type: String, default: '#6366f1' },
  position: {
    x: { type: Number, default: 960 },
    y: { type: Number, default: 540 },
  },
  isOnline: { type: Boolean, default: true },
  lastSeen: { type: Date, default: Date.now },
}, { timestamps: true });

module.exports = mongoose.model('User', UserSchema);
