const PROXIMITY_RADIUS = 150; // pixels

/**
 * Calculate Euclidean distance between two users.
 */
function getDistance(pos1, pos2) {
  const dx = pos1.x - pos2.x;
  const dy = pos1.y - pos2.y;
  return Math.sqrt(dx * dx + dy * dy);
}

/**
 * Check if two users are within proximity.
 */
function isWithinRadius(pos1, pos2, radius = PROXIMITY_RADIUS) {
  return getDistance(pos1, pos2) < radius;
}

/**
 * Generate a deterministic room ID for a pair of users.
 * Always produces the same ID regardless of argument order.
 */
function getProximityRoomId(userId1, userId2) {
  const sorted = [userId1, userId2].sort();
  return `proximity:${sorted[0]}_${sorted[1]}`;
}

/**
 * Find all users within proximity of the given user.
 * Returns array of { socketId, roomId } objects.
 */
function findNearbyUsers(targetSocketId, targetPos, allUsers, radius = PROXIMITY_RADIUS) {
  const nearby = [];
  for (const [socketId, user] of allUsers) {
    if (socketId === targetSocketId) continue;
    if (isWithinRadius(targetPos, user.position, radius)) {
      nearby.push({
        socketId,
        username: user.username,
        avatarColor: user.avatarColor,
        position: user.position,
        roomId: getProximityRoomId(targetSocketId, socketId),
      });
    }
  }
  return nearby;
}

module.exports = {
  PROXIMITY_RADIUS,
  getDistance,
  isWithinRadius,
  getProximityRoomId,
  findNearbyUsers,
};
