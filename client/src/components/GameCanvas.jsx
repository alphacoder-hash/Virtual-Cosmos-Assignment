import { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import { getSocket } from '../hooks/useSocket';
import { useKeyboard } from '../hooks/useKeyboard';
import useGameStore from '../store/useGameStore';

const WORLD_W = 2400;
const WORLD_H = 1600;
const GRID_SIZE = 80;
const EMIT_THROTTLE_MS = 40; // ~25 updates/sec

function lerp(a, b, t) {
  return a + (b - a) * t;
}

function hexToNumber(hex) {
  return parseInt(hex.replace('#', ''), 16);
}

export default function GameCanvas() {
  const canvasRef = useRef(null);
  const appRef = useRef(null);
  const { getVelocity } = useKeyboard();
  const parentRef = useRef(null);

  useEffect(() => {
    let destroyed = false;
    let resizeObserver;

    async function initPixi() {
      const store = useGameStore.getState();

      const container = parentRef.current;
      const app = new PIXI.Application();
      await app.init({
        width: container.clientWidth,
        height: container.clientHeight,
        background: 0x0a0a1a,
        antialias: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });

      if (destroyed) {
        app.destroy(true);
        return;
      }

      app.canvas.style.display = 'block';
      app.canvas.style.width = '100%';
      app.canvas.style.height = '100%';
      canvasRef.current.appendChild(app.canvas);
      appRef.current = app;

      // ── World container (scrollable) ──────────────────────────────────────
      const world = new PIXI.Container();
      app.stage.addChild(world);

      // ── Grid background ───────────────────────────────────────────────────
      const grid = new PIXI.Graphics();
      for (let x = 0; x <= WORLD_W; x += GRID_SIZE) {
        grid.moveTo(x, 0).lineTo(x, WORLD_H);
      }
      for (let y = 0; y <= WORLD_H; y += GRID_SIZE) {
        grid.moveTo(0, y).lineTo(WORLD_W, y);
      }
      grid.stroke({ width: 1, color: 0x1e1e3a, alpha: 0.8 });

      // World border
      grid.rect(0, 0, WORLD_W, WORLD_H);
      grid.stroke({ width: 2, color: 0x6366f1, alpha: 0.4 });
      world.addChild(grid);

      // Corner accent dots
      const corners = new PIXI.Graphics();
      [[0, 0], [WORLD_W, 0], [0, WORLD_H], [WORLD_W, WORLD_H]].forEach(([cx, cy]) => {
        corners.circle(cx, cy, 6);
      });
      corners.fill({ color: 0x6366f1, alpha: 0.5 });
      world.addChild(corners);

      // ── Proximity lines layer (rendered behind avatars) ───────────────────
      const proximityLines = new PIXI.Graphics();
      world.addChild(proximityLines);

      // ── Player graphics registry ──────────────────────────────────────────
      const playerGraphics = new Map();

      function createPlayerSprite(socketId, username, color, isLocal) {
        const numColor = hexToNumber(color);
        const playerContainer = new PIXI.Container();

        // 1. Shadow (at base)
        const shadow = new PIXI.Graphics();
        shadow.ellipse(0, 0, 16, 8);
        shadow.fill({ color: 0x000000, alpha: 0.25 });
        shadow.position.y = 8;
        playerContainer.addChild(shadow);

        // 2. Proximity Ring (local only)
        if (isLocal) {
          const ring = new PIXI.Graphics();
          const radius = useGameStore.getState().proximityRadius || 150;
          ring.circle(0, 0, radius);
          ring.stroke({ width: 1.5, color: numColor, alpha: 0.22 });
          playerContainer.addChild(ring);
        }

        // 3. Aura
        const aura = new PIXI.Graphics();
        aura.circle(0, 0, isLocal ? 32 : 28);
        aura.fill({ color: numColor, alpha: 0.1 });
        playerContainer.addChild(aura);

        // 4. Character Pivot (to avoid moving shadow/ring)
        const charModel = new PIXI.Container();
        playerContainer.addChild(charModel);

        // 5. Body (Rounded bean)
        const body = new PIXI.Graphics();
        body.roundRect(-12, -24, 24, 32, 12);
        body.fill({ color: numColor, alpha: 1 });
        body.roundRect(-12, -24, 24, 32, 12);
        body.stroke({ width: 1.5, color: 0x000000, alpha: 0.2 });
        charModel.addChild(body);

        // 6. Head
        const head = new PIXI.Graphics();
        head.circle(0, -28, 11);
        head.fill({ color: numColor, alpha: 1 });
        head.circle(0, -28, 11);
        head.stroke({ width: 1.5, color: 0x000000, alpha: 0.15 });
        charModel.addChild(head);

        // 7. Eyes
        const eyes = new PIXI.Container();
        const eyeL = new PIXI.Graphics().circle(-4, -30, 2.5).fill({ color: 0xffffff, alpha: 1 });
        const eyeR = new PIXI.Graphics().circle(4, -30, 2.5).fill({ color: 0xffffff, alpha: 1 });
        const pupilL = new PIXI.Graphics().circle(-4.5, -30.5, 1).fill({ color: 0x000000, alpha: 1 });
        const pupilR = new PIXI.Graphics().circle(3.5, -30.5, 1).fill({ color: 0x000000, alpha: 1 });
        eyes.addChild(eyeL, eyeR, pupilL, pupilR);
        charModel.addChild(eyes);

        // Labels
        const style = new PIXI.TextStyle({
          fontFamily: 'Inter, sans-serif',
          fontSize: isLocal ? 13 : 12,
          fontWeight: isLocal ? '700' : '500',
          fill: isLocal ? '#ffffff' : '#e2e8f0',
          dropShadow: { color: '#000000', blur: 4, distance: 1 },
        });
        const label = new PIXI.Text({ text: isLocal ? `${username} (You)` : username, style });
        label.anchor.set(0.5, 0);
        label.position.set(0, 14);
        playerContainer.addChild(label);

        world.addChild(playerContainer);
        return { container: playerContainer, charModel, aura, head, body, eyes };
      }

      let localPos = { ...store.selfPosition };
      let localId = store.selfId;

      const localSprite = createPlayerSprite(localId, store.username, store.avatarColor, true);
      playerGraphics.set(localId, {
        ...localSprite,
        targetPos: { ...localPos },
        animT: 0,
        isMoving: false,
        facingLeft: false,
      });
      localSprite.container.position.set(localPos.x, localPos.y);

      let lastEmit = 0;
      let tick = 0;

      app.ticker.add(() => {
        tick++;
        const now = Date.now();
        const state = useGameStore.getState();
        
        // ── Handle SelfId Transition ──────────────────────────────────
        // If current localId in ticker is null/mismatched with store, migrate
        if (state.selfId && localId !== state.selfId) {
          const oldGfx = playerGraphics.get(localId); // might be null
          if (oldGfx) {
            playerGraphics.delete(localId);
            playerGraphics.set(state.selfId, oldGfx);
            console.log(`[PIXI] Migrated local player from ${localId} to ${state.selfId}`);
          }
          localId = state.selfId;
        }

        const { dx, dy } = getVelocity();
        const localGfx = playerGraphics.get(localId);

        if ((dx !== 0 || dy !== 0) && localId) {
          localPos.x = Math.max(20, Math.min(WORLD_W - 20, localPos.x + dx));
          localPos.y = Math.max(20, Math.min(WORLD_H - 20, localPos.y + dy));
          useGameStore.setState({ selfPosition: localPos });

          if (localGfx) {
            localGfx.isMoving = true;
            if (dx !== 0) localGfx.facingLeft = dx < 0;
          }

          if (now - lastEmit > EMIT_THROTTLE_MS) {
            const socket = getSocket();
            if (socket?.connected) {
              socket.emit('POSITION_UPDATE', { x: localPos.x, y: localPos.y });
            }
            lastEmit = now;
          }
        } else if (localGfx) {
          localGfx.isMoving = false;
        }

        if (localGfx) {
          localGfx.container.position.set(localPos.x, localPos.y);
          localGfx.animT += localGfx.isMoving ? 0.2 : 0.05; // faster bounce when walking
          
          // Walking / Idle Bobbing
          const bob = Math.sin(localGfx.animT) * (localGfx.isMoving ? 4 : 1.5);
          localGfx.charModel.position.y = -bob;
          
          // Waddle rotation
          if (localGfx.isMoving) {
            localGfx.charModel.rotation = Math.sin(localGfx.animT * 0.8) * 0.08;
          } else {
            localGfx.charModel.rotation = lerp(localGfx.charModel.rotation, 0, 0.1);
          }

          // Horizontal facing
          const targetScaleX = localGfx.facingLeft ? -1 : 1;
          localGfx.charModel.scale.x = lerp(localGfx.charModel.scale.x, targetScaleX, 0.2);

          if (localGfx.aura) {
            localGfx.aura.alpha = 0.06 + 0.04 * Math.sin(localGfx.animT * 0.5);
            localGfx.aura.scale = 1 + 0.05 * Math.sin(localGfx.animT * 0.4);
          }
        }

        const remoteUsers = state.users.filter((u) => u.socketId !== localId);

        for (const [id, gfx] of playerGraphics) {
          if (id === localId) continue;
          if (!remoteUsers.find((u) => u.socketId === id)) {
            world.removeChild(gfx.container);
            playerGraphics.delete(id);
          }
        }

        for (const user of remoteUsers) {
          if (!playerGraphics.has(user.socketId)) {
            const sprite = createPlayerSprite(user.socketId, user.username, user.avatarColor, false);
            playerGraphics.set(user.socketId, {
              ...sprite,
              targetPos: { ...user.position },
              animT: Math.random() * Math.PI * 2,
              lastX: user.position.x,
              isMoving: false,
              facingLeft: false,
            });
          }

          const gfx = playerGraphics.get(user.socketId);
          const moving = Math.abs(user.position.x - gfx.lastX) > 0.1 || Math.abs(user.position.y - gfx.container.y) > 0.1;
          
          if (moving) {
            gfx.facingLeft = user.position.x < gfx.lastX;
          }
          gfx.isMoving = moving;
          gfx.lastX = user.position.x;
          gfx.targetPos = user.position;

          const cx = gfx.container.position.x || gfx.targetPos.x;
          const cy = gfx.container.position.y || gfx.targetPos.y;
          gfx.container.position.set(
            lerp(cx, gfx.targetPos.x, 0.15),
            lerp(cy, gfx.targetPos.y, 0.15)
          );

          gfx.animT += gfx.isMoving ? 0.2 : 0.05;
          const bob = Math.sin(gfx.animT) * (gfx.isMoving ? 4 : 1.5);
          gfx.charModel.position.y = -bob;

          const targetScaleX = gfx.facingLeft ? -1 : 1;
          gfx.charModel.scale.x = lerp(gfx.charModel.scale.x, targetScaleX, 0.2);

          if (gfx.isMoving) {
            gfx.charModel.rotation = Math.sin(gfx.animT * 0.8) * 0.08;
          } else {
            gfx.charModel.rotation = lerp(gfx.charModel.rotation, 0, 0.1);
          }

          if (gfx.aura) {
            gfx.aura.alpha = 0.06 + 0.04 * Math.sin(gfx.animT * 0.5);
          }

          // 💬 Typing Indicator Logic
          const typingIcon = gfx.container.getChildByName('typingIcon');
          // Check if this user is typing in any room
          const isTyping = Object.values(state.activeConnections).some(
            (c) => c.targetId === user.socketId && c.isTyping
          );
          if (typingIcon) {
            typingIcon.visible = isTyping;
            if (isTyping) {
              typingIcon.y = -55 + Math.sin(tick * 0.1) * 2;
            }
          } else {
            // Create once if missing
            const tIcon = new PIXI.Text({ text: '💬', style: { fontSize: 14 } });
            tIcon.name = 'typingIcon';
            tIcon.anchor.set(0.5, 1);
            tIcon.position.set(16, -55);
            tIcon.visible = false;
            gfx.container.addChild(tIcon);
          }
        }

        proximityLines.clear();
        const connections = state.activeConnections;
        for (const [, conn] of Object.entries(connections)) {
          const partnerGfx = playerGraphics.get(conn.targetId);
          if (!partnerGfx || !localGfx) continue;

          const lx = localGfx.container.position.x;
          const ly = localGfx.container.position.y;
          const px = partnerGfx.container.position.x;
          const py = partnerGfx.container.position.y;

          const alpha = 0.3 + 0.15 * Math.sin(tick * 0.05);
          proximityLines.moveTo(lx, ly).lineTo(px, py);
          proximityLines.stroke({ width: 2, color: 0x6366f1, alpha });

          const mx = (lx + px) / 2;
          const my = (ly + py) / 2;
          proximityLines.circle(mx, my, 3);
          proximityLines.fill({ color: 0xa78bfa, alpha: 0.7 });
        }

        const screenW = app.renderer.width / (app.renderer.resolution || 1);
        const screenH = app.renderer.height / (app.renderer.resolution || 1);
        world.position.x = lerp(world.position.x, screenW / 2 - localPos.x, 0.1);
        world.position.y = lerp(world.position.y, screenH / 2 - localPos.y, 0.1);
      });

      // ── Emoji Emotes ──────────────────────────────────────────────────────
      const activeEmotes = new Set();
      const socket = getSocket();

      if (socket) {
        socket.on('USER_EMOTE', ({ socketId, emoji }) => {
          const gfx = playerGraphics.get(socketId);
          if (!gfx) return;

          const emoteStyle = new PIXI.TextStyle({
            fontSize: 28,
          });
          const emote = new PIXI.Text({ text: emoji, style: emoteStyle });
          emote.anchor.set(0.5, 1);
          emote.position.set(0, -50); // Above head
          emote.alpha = 0;
          emote.scale.set(0.5);
          
          gfx.container.addChild(emote);
          
          const emoteData = {
            obj: emote,
            startTime: Date.now(),
            lifetime: 2000, // 2 seconds
          };
          activeEmotes.add(emoteData);
        });
      }

      app.ticker.add(() => {
        const now = Date.now();
        for (const emoteData of activeEmotes) {
          const elapsed = now - emoteData.startTime;
          const progress = elapsed / emoteData.lifetime;

          if (progress >= 1) {
            emoteData.obj.parent?.removeChild(emoteData.obj);
            emoteData.obj.destroy();
            activeEmotes.delete(emoteData);
          } else {
            // Animation logic
            emoteData.obj.position.y = -50 - (progress * 40); // Float up
            emoteData.obj.alpha = progress < 0.2 ? progress / 0.2 : 1 - progress; // Fade in/out
            emoteData.obj.scale.set(0.5 + (1 - Math.pow(1 - progress, 3)) * 0.5); // Pop in
          }
        }
      });

      // Resize
      resizeObserver = new ResizeObserver((entries) => {
        for (let entry of entries) {
           app.renderer.resize(entry.contentRect.width, entry.contentRect.height);
        }
      });
      resizeObserver.observe(container);

      appRef.current = { app, observer: resizeObserver, container };
    }

    initPixi().catch(console.error);

    return () => {
      destroyed = true;
      if (appRef.current?.app) {
        appRef.current.observer?.disconnect();
        appRef.current.app.destroy(true, { children: true });
        appRef.current = null;
      }
    };
  }, []);

  return (
    <div ref={parentRef} style={{ width: '100%', height: '100%', overflow: 'hidden' }}>
      <div ref={canvasRef} style={{ width: '100%', height: '100%' }} />
    </div>
  );
}
