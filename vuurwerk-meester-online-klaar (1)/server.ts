import express from 'express';
import http from 'http';
import path from 'path';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = Number(process.env.PORT) || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

type PlayerAnimState = 'idle' | 'walk' | 'run' | 'jump';

interface ServerPlayer {
  id: string;
  name: string;
  color: string;
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  animState: PlayerAnimState;
  equippedTool: 'none' | 'lighter' | 'product';
  equippedProductId: string | null;
  isShopping: boolean;
  ready: boolean;
  zone: string;
  mutedByHost: boolean;
  inventoryCount: number;
  showcaseProductId: string | null;
}

interface ServerPlacedFirework {
  uid: string;
  productId: string;
  ownerId: string;
  ownerName: string;
  x: number;
  y: number;
  z: number;
  rotationY: number;
  state: 'idle' | 'fusing' | 'firing' | 'spent';
}

interface ServerChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  system?: boolean;
}

interface ServerRoom {
  id: string;
  code: string;
  name: string;
  isPublic: boolean;
  maxPlayers: number;
  hostId: string;
  createdAt: number;
  players: Map<string, ServerPlayer>;
  sockets: Map<string, WebSocket>;
  placedFireworks: Map<string, ServerPlacedFirework>;
  chatHistory: ServerChatMessage[];
  bannedIds: Set<string>;
}

const rooms = new Map<string, ServerRoom>();
const codeToRoomId = new Map<string, string>();
const socketMeta = new WeakMap<WebSocket, { playerId: string; roomId: string | null; alive: boolean }>();

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  do {
    code = '';
    for (let i = 0; i < 6; i++) {
      code += chars[Math.floor(Math.random() * chars.length)];
    }
  } while (codeToRoomId.has(code));
  return code;
}

function clampCoord(val: unknown, min = -145, max = 145, fallback = 0): number {
  const n = typeof val === 'number' && Number.isFinite(val) ? val : fallback;
  return Math.max(min, Math.min(max, n));
}

function sendJson(ws: WebSocket, type: string, payload: unknown) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ type, payload }));
  }
}

function broadcastRoom(room: ServerRoom, type: string, payload: unknown, excludePlayerId?: string) {
  const raw = JSON.stringify({ type, payload });
  for (const [pid, sock] of room.sockets.entries()) {
    if (excludePlayerId && pid === excludePlayerId) continue;
    if (sock.readyState === WebSocket.OPEN) {
      sock.send(raw);
    }
  }
}

function getRoomPublicSummaries() {
  const list = [];
  for (const r of rooms.values()) {
    if (!r.isPublic) continue;
    const host = r.players.get(r.hostId);
    list.push({
      id: r.id,
      code: r.code,
      name: r.name,
      isPublic: r.isPublic,
      playerCount: r.players.size,
      maxPlayers: r.maxPlayers,
      hostName: host?.name || 'Host',
    });
  }
  return list;
}

function serializeRoomState(room: ServerRoom) {
  return {
    id: room.id,
    code: room.code,
    name: room.name,
    isPublic: room.isPublic,
    maxPlayers: room.maxPlayers,
    hostId: room.hostId,
    players: Array.from(room.players.values()),
    placedFireworks: Array.from(room.placedFireworks.values()),
    chatHistory: room.chatHistory.slice(-60),
  };
}

function addSystemChat(room: ServerRoom, text: string) {
  const msg: ServerChatMessage = {
    id: `sys-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    senderId: 'system',
    senderName: 'Systeem',
    text,
    timestamp: Date.now(),
    system: true,
  };
  room.chatHistory.push(msg);
  if (room.chatHistory.length > 80) room.chatHistory.shift();
  broadcastRoom(room, 'chat:message', msg);
}

function leaveCurrentRoom(ws: WebSocket, reason = 'verliet de kamer') {
  const meta = socketMeta.get(ws);
  if (!meta || !meta.roomId) return;
  const room = rooms.get(meta.roomId);
  meta.roomId = null;
  if (!room) return;

  const player = room.players.get(meta.playerId);
  const currentSock = room.sockets.get(meta.playerId);
  // Only remove if this socket is still the active socket for this playerId
  if (currentSock === ws) {
    room.players.delete(meta.playerId);
    room.sockets.delete(meta.playerId);
    broadcastRoom(room, 'room:player_left', { playerId: meta.playerId, name: player?.name || 'Speler' });
    if (player) {
      addSystemChat(room, `${player.name} ${reason}.`);
    }

    if (room.players.size === 0) {
      codeToRoomId.delete(room.code);
      rooms.delete(room.id);
    } else if (room.hostId === meta.playerId) {
      const nextHost = room.players.values().next().value as ServerPlayer | undefined;
      if (nextHost) {
        room.hostId = nextHost.id;
        broadcastRoom(room, 'room:host_changed', { hostId: nextHost.id, hostName: nextHost.name });
        addSystemChat(room, `${nextHost.name} is nu de nieuwe host.`);
      }
    }
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, rooms: rooms.size, uptime: process.uptime() });
  });

  app.get('/api/rooms', (_req, res) => {
    res.json({ rooms: getRoomPublicSummaries() });
  });

  if (IS_PROD) {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  } else {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  const server = http.createServer(app);
  const wss = new WebSocketServer({ server, path: '/ws' });

  // Heartbeat check every 15s
  const heartbeat = setInterval(() => {
    for (const client of wss.clients) {
      const meta = socketMeta.get(client);
      if (!meta) continue;
      if (!meta.alive) {
        leaveCurrentRoom(client, 'verbinding verbroken');
        client.terminate();
        continue;
      }
      meta.alive = false;
      client.ping();
    }
  }, 15000);

  wss.on('close', () => clearInterval(heartbeat));

  wss.on('connection', (ws) => {
    socketMeta.set(ws, {
      playerId: `anon-${Math.random().toString(36).slice(2, 9)}`,
      roomId: null,
      alive: true,
    });

    ws.on('pong', () => {
      const meta = socketMeta.get(ws);
      if (meta) meta.alive = true;
    });

    ws.on('close', () => {
      leaveCurrentRoom(ws, 'heeft het spel verlaten');
    });

    ws.on('message', (rawBuf) => {
      const meta = socketMeta.get(ws);
      if (!meta) return;

      let msg: { type?: string; payload?: Record<string, unknown> };
      try {
        msg = JSON.parse(rawBuf.toString());
      } catch {
        return;
      }

      const type = msg.type;
      const payload = (msg.payload || {}) as Record<string, unknown>;

      if (type === 'auth:identify') {
        const requestedId = typeof payload.playerId === 'string' ? payload.playerId.trim().slice(0, 48) : '';
        if (requestedId) {
          meta.playerId = requestedId;
        }
        sendJson(ws, 'auth:ok', { playerId: meta.playerId });
        sendJson(ws, 'room:list', { rooms: getRoomPublicSummaries() });
        return;
      }

      if (type === 'room:list') {
        sendJson(ws, 'room:list', { rooms: getRoomPublicSummaries() });
        return;
      }

      if (type === 'room:create') {
        leaveCurrentRoom(ws);
        const rawPlayerId = typeof payload.playerId === 'string' && payload.playerId.trim()
          ? payload.playerId.trim().slice(0, 48)
          : meta.playerId;
        meta.playerId = rawPlayerId;

        const roomName =
          typeof payload.roomName === 'string' && payload.roomName.trim()
            ? payload.roomName.trim().slice(0, 36)
            : 'Oranjewijk Vuurwerk Room';
        const isPublic = payload.isPublic !== false;
        const playerName =
          typeof payload.playerName === 'string' && payload.playerName.trim()
            ? payload.playerName.trim().slice(0, 22)
            : 'VuurwerkSpeler';
        const color = typeof payload.color === 'string' ? payload.color : '#F59E0B';

        const roomId = `rm-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
        const code = generateRoomCode();
        const room: ServerRoom = {
          id: roomId,
          code,
          name: roomName,
          isPublic,
          maxPlayers: 12,
          hostId: meta.playerId,
          createdAt: Date.now(),
          players: new Map(),
          sockets: new Map(),
          placedFireworks: new Map(),
          chatHistory: [],
          bannedIds: new Set(),
        };

        const hostPlayer: ServerPlayer = {
          id: meta.playerId,
          name: playerName,
          color,
          x: 2.5,
          y: 1.72,
          z: 2.0,
          yaw: -Math.PI / 2,
          pitch: -0.04,
          animState: 'idle',
          equippedTool: 'lighter',
          equippedProductId: null,
          isShopping: false,
          ready: true,
          zone: 'Oranjestraat',
          mutedByHost: false,
          inventoryCount: Number(payload.inventoryCount) || 0,
          showcaseProductId: null,
        };

        room.players.set(hostPlayer.id, hostPlayer);
        room.sockets.set(hostPlayer.id, ws);
        rooms.set(roomId, room);
        codeToRoomId.set(code, roomId);
        meta.roomId = roomId;

        addSystemChat(room, `${playerName} heeft kamer "${roomName}" aangemaakt (Code: ${code}).`);
        sendJson(ws, 'room:joined', serializeRoomState(room));
        return;
      }

      if (type === 'room:join') {
        const rawPlayerId = typeof payload.playerId === 'string' && payload.playerId.trim()
          ? payload.playerId.trim().slice(0, 48)
          : meta.playerId;
        meta.playerId = rawPlayerId;

        const targetId =
          typeof payload.roomId === 'string' && rooms.has(payload.roomId)
            ? payload.roomId
            : typeof payload.code === 'string'
            ? codeToRoomId.get(payload.code.trim().toUpperCase())
            : undefined;

        if (!targetId) {
          sendJson(ws, 'room:error', { message: 'Kamer niet gevonden. Controleer de kamercode.' });
          return;
        }

        const room = rooms.get(targetId)!;
        if (room.bannedIds.has(meta.playerId)) {
          sendJson(ws, 'room:error', { message: 'Je bent door de host uit deze kamer verwijderd.' });
          return;
        }

        // Prevent duplicate player IDs: handle reconnect cleanly if same ID already exists in this room
        const existingSocket = room.sockets.get(meta.playerId);
        if (existingSocket && existingSocket !== ws) {
          if (existingSocket.readyState === WebSocket.OPEN) {
            sendJson(existingSocket, 'room:error', {
              message: 'Je bent vanaf een ander venster met hetzelfde speler-ID verbonden.',
            });
            existingSocket.close();
          }
          room.sockets.delete(meta.playerId);
        }

        if (!room.players.has(meta.playerId) && room.players.size >= room.maxPlayers) {
          sendJson(ws, 'room:error', { message: `Kamer zit vol (${room.maxPlayers}/${room.maxPlayers} spelers).` });
          return;
        }

        if (meta.roomId && meta.roomId !== room.id) {
          leaveCurrentRoom(ws);
        }

        const playerName =
          typeof payload.playerName === 'string' && payload.playerName.trim()
            ? payload.playerName.trim().slice(0, 22)
            : 'VuurwerkSpeler';
        const color = typeof payload.color === 'string' ? payload.color : '#38BDF8';

        const prevPlayer = room.players.get(meta.playerId);
        const player: ServerPlayer = prevPlayer
          ? { ...prevPlayer, name: playerName, color }
          : {
              id: meta.playerId,
              name: playerName,
              color,
              x: -14 + (Math.random() - 0.5) * 4,
              y: 1.72,
              z: (Math.random() - 0.5) * 6,
              yaw: Math.PI / 2,
              pitch: 0,
              animState: 'idle',
              equippedTool: 'lighter',
              equippedProductId: null,
              isShopping: false,
              ready: false,
              zone: 'Afsteekzone Vuurwerkplein',
              mutedByHost: false,
              inventoryCount: Number(payload.inventoryCount) || 0,
              showcaseProductId: null,
            };

        room.players.set(player.id, player);
        room.sockets.set(player.id, ws);
        meta.roomId = room.id;

        sendJson(ws, 'room:joined', serializeRoomState(room));
        broadcastRoom(room, 'room:player_joined', player, player.id);
        if (!prevPlayer) {
          addSystemChat(room, `${playerName} is de kamer binnengekomen.`);
        }
        return;
      }

      if (type === 'room:leave') {
        leaveCurrentRoom(ws, 'heeft de kamer verlaten');
        sendJson(ws, 'room:left', {});
        return;
      }

      // All actions below require being inside an active room
      if (!meta.roomId) return;
      const room = rooms.get(meta.roomId);
      if (!room) return;
      const sender = room.players.get(meta.playerId);
      if (!sender) return;

      if (type === 'room:ready') {
        sender.ready = Boolean(payload.ready);
        broadcastRoom(room, 'room:player_updated', sender);
        return;
      }

      if (type === 'room:host_action') {
        if (room.hostId !== sender.id) return;
        const action = payload.action;
        const targetPlayerId = typeof payload.targetPlayerId === 'string' ? payload.targetPlayerId : '';

        if (action === 'toggle_privacy') {
          room.isPublic = !room.isPublic;
          broadcastRoom(room, 'room:privacy_changed', { isPublic: room.isPublic });
          addSystemChat(room, `Kamer is nu ${room.isPublic ? 'Openbaar' : 'Privé'}.`);
        } else if (action === 'mute' && targetPlayerId && targetPlayerId !== sender.id) {
          const target = room.players.get(targetPlayerId);
          if (target) {
            target.mutedByHost = !target.mutedByHost;
            broadcastRoom(room, 'room:player_updated', target);
            addSystemChat(
              room,
              `${target.name} is ${target.mutedByHost ? 'gedempt' : 'niet langer gedempt'} door de host.`,
            );
          }
        } else if (action === 'kick' && targetPlayerId && targetPlayerId !== sender.id) {
          const target = room.players.get(targetPlayerId);
          const targetWs = room.sockets.get(targetPlayerId);
          room.bannedIds.add(targetPlayerId);
          if (targetWs) {
            sendJson(targetWs, 'room:kicked', { message: 'Je bent door de host uit de kamer verwijderd.' });
            leaveCurrentRoom(targetWs, 'is verwijderd door de host');
          } else if (target) {
            room.players.delete(targetPlayerId);
            broadcastRoom(room, 'room:player_left', { playerId: targetPlayerId, name: target.name });
          }
        } else if (action === 'transfer_host' && targetPlayerId && room.players.has(targetPlayerId)) {
          const nextHost = room.players.get(targetPlayerId)!;
          room.hostId = targetPlayerId;
          broadcastRoom(room, 'room:host_changed', { hostId: targetPlayerId, hostName: nextHost.name });
          addSystemChat(room, `${nextHost.name} is nu de nieuwe host.`);
        }
        return;
      }

      if (type === 'player:update') {
        sender.x = clampCoord(payload.x, -145, 145, sender.x);
        sender.y = clampCoord(payload.y, -5, 120, sender.y);
        sender.z = clampCoord(payload.z, -145, 145, sender.z);
        sender.yaw = typeof payload.yaw === 'number' && Number.isFinite(payload.yaw) ? payload.yaw : sender.yaw;
        sender.pitch = typeof payload.pitch === 'number' && Number.isFinite(payload.pitch) ? payload.pitch : sender.pitch;
        if (payload.animState === 'idle' || payload.animState === 'walk' || payload.animState === 'run' || payload.animState === 'jump') {
          sender.animState = payload.animState;
        }
        if (payload.equippedTool === 'none' || payload.equippedTool === 'lighter' || payload.equippedTool === 'product') {
          sender.equippedTool = payload.equippedTool;
        }
        sender.equippedProductId = typeof payload.equippedProductId === 'string' ? payload.equippedProductId : null;
        sender.isShopping = Boolean(payload.isShopping);
        if (typeof payload.zone === 'string') sender.zone = payload.zone.slice(0, 60);
        if (typeof payload.inventoryCount === 'number' && Number.isFinite(payload.inventoryCount)) {
          sender.inventoryCount = Math.max(0, Math.floor(payload.inventoryCount));
        }

        broadcastRoom(room, 'player:moved', sender, sender.id);
        return;
      }

      if (type === 'player:rename') {
        const nextName =
          typeof payload.name === 'string' && payload.name.trim().length >= 2
            ? payload.name.trim().slice(0, 22)
            : '';
        if (!nextName || nextName === sender.name) return;
        const oldName = sender.name;
        sender.name = nextName;
        broadcastRoom(room, 'room:player_updated', sender);
        addSystemChat(room, `${oldName} heet nu ${nextName}.`);
        return;
      }

      if (type === 'player:showcase') {
        const productId = typeof payload.productId === 'string' ? payload.productId : '';
        const productName = typeof payload.productName === 'string' ? payload.productName : productId;
        if (!productId) return;
        sender.showcaseProductId = productId;
        broadcastRoom(room, 'player:showcased', {
          playerId: sender.id,
          playerName: sender.name,
          productId,
          productName,
        });
        addSystemChat(room, `${sender.name} toont product: ${productName}!`);
        return;
      }

      if (type === 'firework:place') {
        const uid = typeof payload.uid === 'string' ? payload.uid : '';
        const productId = typeof payload.productId === 'string' ? payload.productId : '';
        if (!uid || !productId) return;
        // Idempotent guard
        if (room.placedFireworks.has(uid)) return;

        const fw: ServerPlacedFirework = {
          uid,
          productId,
          ownerId: sender.id,
          ownerName: sender.name,
          x: clampCoord(payload.x, -145, 145, 0),
          y: clampCoord(payload.y, 0, 20, 0.102),
          z: clampCoord(payload.z, -145, 145, 0),
          rotationY: typeof payload.rotationY === 'number' && Number.isFinite(payload.rotationY) ? payload.rotationY : 0,
          state: 'idle',
        };
        room.placedFireworks.set(uid, fw);
        broadcastRoom(room, 'firework:placed', fw);
        return;
      }

      if (type === 'firework:update') {
        const uid = typeof payload.uid === 'string' ? payload.uid : '';
        const fw = room.placedFireworks.get(uid);
        if (!fw) return;
        if (typeof payload.rotationY === 'number' && Number.isFinite(payload.rotationY)) {
          fw.rotationY = payload.rotationY;
        }
        if (
          payload.state === 'idle' ||
          payload.state === 'fusing' ||
          payload.state === 'firing' ||
          payload.state === 'spent'
        ) {
          fw.state = payload.state;
        }
        broadcastRoom(room, 'firework:updated', fw);
        return;
      }

      if (type === 'firework:remove') {
        const uid = typeof payload.uid === 'string' ? payload.uid : '';
        if (!room.placedFireworks.has(uid)) return;
        room.placedFireworks.delete(uid);
        broadcastRoom(room, 'firework:removed', { uid });
        return;
      }

      if (type === 'firework:ignite') {
        const uid = typeof payload.uid === 'string' ? payload.uid : '';
        const fw = room.placedFireworks.get(uid);
        if (!fw || fw.state !== 'idle') return;
        const fuseDuration = typeof payload.fuseDuration === 'number' ? Math.max(0.1, Math.min(5, payload.fuseDuration)) : 2.2;
        fw.state = 'fusing';
        broadcastRoom(room, 'firework:ignited', {
          uid: fw.uid,
          productId: fw.productId,
          x: fw.x,
          y: fw.y,
          z: fw.z,
          rotationY: fw.rotationY,
          fuseDuration,
          ignitedBy: sender.name,
        });
        return;
      }

      if (type === 'firework:ignite_all') {
        let count = 0;
        for (const fw of room.placedFireworks.values()) {
          if (fw.state === 'idle') {
            count++;
            fw.state = 'fusing';
            broadcastRoom(room, 'firework:ignited', {
              uid: fw.uid,
              productId: fw.productId,
              x: fw.x,
              y: fw.y,
              z: fw.z,
              rotationY: fw.rotationY,
              fuseDuration: 2.0 + count * 0.2,
              ignitedBy: sender.name,
            });
          }
        }
        if (count > 0) {
          addSystemChat(room, `${sender.name} heeft ${count} vuurwerk(en) tegelijk aangestoken!`);
        }
        return;
      }

      if (type === 'show:start') {
        const show = payload.show;
        if (!show || typeof show !== 'object') return;
        broadcastRoom(room, 'show:started', { show, startedBy: sender.name });
        addSystemChat(room, `${sender.name} is een gesynchroniseerde vuurwerkshow gestart!`);
        return;
      }

      if (type === 'show:stop') {
        broadcastRoom(room, 'show:stopped', { stoppedBy: sender.name });
        return;
      }

      if (type === 'chat:send') {
        if (sender.mutedByHost) {
          sendJson(ws, 'room:error', { message: 'Je bent gedempt door de host en kunt niet chatten.' });
          return;
        }
        const rawText = typeof payload.text === 'string' ? payload.text.trim() : '';
        if (!rawText) return;
        const cleanText = rawText.slice(0, 240);
        const chatMsg: ServerChatMessage = {
          id: `msg-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
          senderId: sender.id,
          senderName: sender.name,
          text: cleanText,
          timestamp: Date.now(),
        };
        room.chatHistory.push(chatMsg);
        if (room.chatHistory.length > 80) room.chatHistory.shift();
        broadcastRoom(room, 'chat:message', chatMsg);
        return;
      }

      if (type === 'player:report') {
        const targetId = typeof payload.targetPlayerId === 'string' ? payload.targetPlayerId : '';
        const reason = typeof payload.reason === 'string' ? payload.reason.slice(0, 120) : 'Ongepast gedrag';
        const target = room.players.get(targetId);
        if (!target) return;
        const hostWs = room.sockets.get(room.hostId);
        if (hostWs) {
          sendJson(hostWs, 'moderation:report', {
            reporterName: sender.name,
            targetName: target.name,
            targetId: target.id,
            reason,
          });
        }
        sendJson(ws, 'chat:message', {
          id: `rep-${Date.now()}`,
          senderId: 'system',
          senderName: 'Moderatie',
          text: `Melding tegen ${target.name} verzonden naar de host.`,
          timestamp: Date.now(),
          system: true,
        });
      }
    });
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`[VuurwerkMeester Server] Running on http://0.0.0.0:${PORT} (${IS_PROD ? 'PROD' : 'DEV'})`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
