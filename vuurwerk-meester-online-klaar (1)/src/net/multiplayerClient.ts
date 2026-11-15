import {
  CustomShow,
  PlayerAnimState,
  RemotePlayerState,
  RoomChatMessage,
  RoomPlacedFirework,
  RoomStatePayload,
  RoomSummary,
} from '../types';

const PLAYER_ID_KEY = 'vuurwerk_mp_player_id_v3';
const PLAYER_PROFILE_KEY = 'vuurwerk_mp_profile_v3';

export function getOrCreateSessionPlayerId(): string {
  try {
    let id = sessionStorage.getItem(PLAYER_ID_KEY);
    if (!id) {
      id = `plr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      sessionStorage.setItem(PLAYER_ID_KEY, id);
    }
    return id;
  } catch {
    return `plr-${Math.random().toString(36).slice(2, 10)}`;
  }
}

export function loadSavedProfile(): { name: string; color: string } {
  try {
    const raw = localStorage.getItem(PLAYER_PROFILE_KEY);
    if (raw) {
      const p = JSON.parse(raw);
      if (typeof p.name === 'string' && typeof p.color === 'string') {
        return { name: p.name, color: p.color };
      }
    }
  } catch {
    // ignore
  }
  const palette = ['#F59E0B', '#38BDF8', '#10B981', '#F43F5E', '#A855F7', '#F97316'];
  return {
    name: `Speler-${Math.floor(100 + Math.random() * 899)}`,
    color: palette[Math.floor(Math.random() * palette.length)],
  };
}

export function savePlayerProfile(name: string, color?: string) {
  try {
    const existing = loadSavedProfile();
    localStorage.setItem(
      PLAYER_PROFILE_KEY,
      JSON.stringify({ name: name.trim().slice(0, 22), color: color || existing.color }),
    );
  } catch {
    // ignore
  }
}

export interface IgnitedEventPayload {
  uid: string;
  productId: string;
  x: number;
  y: number;
  z: number;
  rotationY: number;
  fuseDuration: number;
  ignitedBy: string;
}

export interface ShowcaseEventPayload {
  playerId: string;
  playerName: string;
  productId: string;
  productName: string;
}

export interface MultiplayerHandlers {
  onConnectionChange?: (status: 'disconnected' | 'connecting' | 'connected') => void;
  onRoomList?: (rooms: RoomSummary[]) => void;
  onRoomJoined?: (room: RoomStatePayload) => void;
  onRoomLeft?: (reason?: string) => void;
  onRoomError?: (message: string) => void;
  onPlayerJoined?: (player: RemotePlayerState) => void;
  onPlayerLeft?: (playerId: string, name: string) => void;
  onPlayerMoved?: (player: RemotePlayerState) => void;
  onPlayerUpdated?: (player: RemotePlayerState) => void;
  onHostChanged?: (hostId: string, hostName: string) => void;
  onPrivacyChanged?: (isPublic: boolean) => void;
  onFireworkPlaced?: (fw: RoomPlacedFirework) => void;
  onFireworkUpdated?: (fw: RoomPlacedFirework) => void;
  onFireworkRemoved?: (uid: string) => void;
  onFireworkIgnited?: (ev: IgnitedEventPayload) => void;
  onShowStarted?: (show: CustomShow, startedBy: string) => void;
  onShowStopped?: (stoppedBy: string) => void;
  onChatMessage?: (msg: RoomChatMessage) => void;
  onPlayerShowcased?: (ev: ShowcaseEventPayload) => void;
  onModerationReport?: (ev: {
    reporterName: string;
    targetName: string;
    targetId: string;
    reason: string;
  }) => void;
}

class MultiplayerClient {
  private ws: WebSocket | null = null;
  private status: 'disconnected' | 'connecting' | 'connected' = 'disconnected';
  private reconnectTimer: number | null = null;
  private intentionalDisconnect = false;
  private lastJoinAttempt: { roomId?: string; code?: string; playerName: string; color: string } | null = null;
  public readonly playerId: string = getOrCreateSessionPlayerId();
  public handlers: MultiplayerHandlers = {};

  public connect() {
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    this.intentionalDisconnect = false;
    this.setStatus('connecting');

    const proto = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${proto}//${window.location.host}/ws`;
    const ws = new WebSocket(wsUrl);
    this.ws = ws;

    ws.onopen = () => {
      this.setStatus('connected');
      this.send('auth:identify', { playerId: this.playerId });
      // Auto-rejoin room if reconnecting after brief drop
      if (this.lastJoinAttempt) {
        this.send('room:join', {
          playerId: this.playerId,
          ...this.lastJoinAttempt,
        });
      }
    };

    ws.onmessage = (event) => {
      let parsed: { type?: string; payload?: Record<string, unknown> };
      try {
        parsed = JSON.parse(String(event.data));
      } catch {
        return;
      }
      const p = (parsed.payload || {}) as Record<string, unknown>;
      switch (parsed.type) {
        case 'room:list':
          this.handlers.onRoomList?.((p.rooms as RoomSummary[]) || []);
          break;
        case 'room:joined':
          this.handlers.onRoomJoined?.(p as unknown as RoomStatePayload);
          break;
        case 'room:left':
          this.lastJoinAttempt = null;
          this.handlers.onRoomLeft?.();
          break;
        case 'room:kicked':
          this.lastJoinAttempt = null;
          this.handlers.onRoomLeft?.(String(p.message || 'Verwijderd uit kamer.'));
          break;
        case 'room:error':
          this.handlers.onRoomError?.(String(p.message || 'Netwerkfout'));
          break;
        case 'room:player_joined':
          this.handlers.onPlayerJoined?.(p as unknown as RemotePlayerState);
          break;
        case 'room:player_left':
          this.handlers.onPlayerLeft?.(String(p.playerId || ''), String(p.name || 'Speler'));
          break;
        case 'player:moved':
          this.handlers.onPlayerMoved?.(p as unknown as RemotePlayerState);
          break;
        case 'room:player_updated':
          this.handlers.onPlayerUpdated?.(p as unknown as RemotePlayerState);
          break;
        case 'room:host_changed':
          this.handlers.onHostChanged?.(String(p.hostId || ''), String(p.hostName || ''));
          break;
        case 'room:privacy_changed':
          this.handlers.onPrivacyChanged?.(Boolean(p.isPublic));
          break;
        case 'firework:placed':
          this.handlers.onFireworkPlaced?.(p as unknown as RoomPlacedFirework);
          break;
        case 'firework:updated':
          this.handlers.onFireworkUpdated?.(p as unknown as RoomPlacedFirework);
          break;
        case 'firework:removed':
          this.handlers.onFireworkRemoved?.(String(p.uid || ''));
          break;
        case 'firework:ignited':
          this.handlers.onFireworkIgnited?.(p as unknown as IgnitedEventPayload);
          break;
        case 'show:started':
          this.handlers.onShowStarted?.(p.show as CustomShow, String(p.startedBy || 'Speler'));
          break;
        case 'show:stopped':
          this.handlers.onShowStopped?.(String(p.stoppedBy || 'Speler'));
          break;
        case 'chat:message':
          this.handlers.onChatMessage?.(p as unknown as RoomChatMessage);
          break;
        case 'player:showcased':
          this.handlers.onPlayerShowcased?.(p as unknown as ShowcaseEventPayload);
          break;
        case 'moderation:report':
          this.handlers.onModerationReport?.(
            p as { reporterName: string; targetName: string; targetId: string; reason: string },
          );
          break;
      }
    };

    ws.onclose = () => {
      this.ws = null;
      this.setStatus('disconnected');
      if (!this.intentionalDisconnect) {
        if (this.reconnectTimer) window.clearTimeout(this.reconnectTimer);
        this.reconnectTimer = window.setTimeout(() => this.connect(), 2500);
      }
    };

    ws.onerror = () => {
      // onclose handles reconnect cleanly
    };
  }

  public disconnect() {
    this.intentionalDisconnect = true;
    this.lastJoinAttempt = null;
    if (this.reconnectTimer) {
      window.clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.ws?.close();
    this.ws = null;
    this.setStatus('disconnected');
  }

  private setStatus(s: 'disconnected' | 'connecting' | 'connected') {
    this.status = s;
    this.handlers.onConnectionChange?.(s);
  }

  public getStatus() {
    return this.status;
  }

  public send(type: string, payload: Record<string, unknown> = {}) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify({ type, payload }));
      return true;
    }
    return false;
  }

  public requestRoomList() {
    this.send('room:list');
  }

  public createRoom(opts: {
    roomName: string;
    isPublic: boolean;
    playerName: string;
    color: string;
    inventoryCount: number;
  }) {
    savePlayerProfile(opts.playerName, opts.color);
    this.lastJoinAttempt = null;
    this.send('room:create', { playerId: this.playerId, ...opts });
  }

  public joinRoom(opts: {
    roomId?: string;
    code?: string;
    playerName: string;
    color: string;
    inventoryCount: number;
  }) {
    savePlayerProfile(opts.playerName, opts.color);
    this.lastJoinAttempt = {
      roomId: opts.roomId,
      code: opts.code,
      playerName: opts.playerName,
      color: opts.color,
    };
    this.send('room:join', { playerId: this.playerId, ...opts });
  }

  public leaveRoom() {
    this.lastJoinAttempt = null;
    this.send('room:leave');
  }

  public setReady(ready: boolean) {
    this.send('room:ready', { ready });
  }

  public hostAction(
    action: 'kick' | 'mute' | 'transfer_host' | 'toggle_privacy',
    targetPlayerId?: string,
  ) {
    this.send('room:host_action', { action, targetPlayerId });
  }

  public sendPlayerUpdate(data: {
    x: number;
    y: number;
    z: number;
    yaw: number;
    pitch: number;
    animState: PlayerAnimState;
    equippedTool: 'none' | 'lighter' | 'product';
    equippedProductId: string | null;
    isShopping: boolean;
    zone: string;
    inventoryCount: number;
  }) {
    this.send('player:update', data);
  }

  public sendPlayerRename(name: string) {
    const clean = name.trim().slice(0, 22);
    if (!clean) return;
    savePlayerProfile(clean);
    this.send('player:rename', { name: clean });
  }

  public sendShowcase(productId: string, productName: string) {
    this.send('player:showcase', { productId, productName });
  }

  public sendPlaceFirework(fw: {
    uid: string;
    productId: string;
    x: number;
    y: number;
    z: number;
    rotationY: number;
  }) {
    this.send('firework:place', fw);
  }

  public sendUpdateFirework(uid: string, patch: { rotationY?: number; state?: string }) {
    this.send('firework:update', { uid, ...patch });
  }

  public sendRemoveFirework(uid: string) {
    this.send('firework:remove', { uid });
  }

  public sendIgniteFirework(uid: string, fuseDuration = 2.2) {
    this.send('firework:ignite', { uid, fuseDuration });
  }

  public sendIgniteAll() {
    this.send('firework:ignite_all');
  }

  public sendStartShow(show: CustomShow) {
    this.send('show:start', { show });
  }

  public sendStopShow() {
    this.send('show:stop');
  }

  public sendChat(text: string) {
    this.send('chat:send', { text });
  }

  public reportPlayer(targetPlayerId: string, reason: string) {
    this.send('player:report', { targetPlayerId, reason });
  }
}

export const mpClient = new MultiplayerClient();
