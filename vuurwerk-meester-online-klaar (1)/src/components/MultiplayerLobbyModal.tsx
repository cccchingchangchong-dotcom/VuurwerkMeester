import React, { useEffect, useState } from 'react';
import {
  Check,
  Copy,
  Crown,
  Globe,
  Lock,
  LogOut,
  Plus,
  RefreshCw,
  ShieldAlert,
  UserCheck,
  Users,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import { RoomStatePayload, RoomSummary } from '../types';
import { loadSavedProfile, mpClient } from '../net/multiplayerClient';
import { soundEngine } from '../engine/audio';

const AVATAR_COLORS = ['#F59E0B', '#38BDF8', '#10B981', '#F43F5E', '#A855F7', '#F97316'];

interface MultiplayerLobbyModalProps {
  confirmedPlayerName?: string;
  connectionStatus: 'disconnected' | 'connecting' | 'connected';
  currentRoom: RoomStatePayload | null;
  publicRooms: RoomSummary[];
  localInventoryCount: number;
  roomError: string | null;
  onClearError: () => void;
  onEnterWorld: () => void;
  onClose: () => void;
}

export const MultiplayerLobbyModal: React.FC<MultiplayerLobbyModalProps> = ({
  confirmedPlayerName,
  connectionStatus,
  currentRoom,
  publicRooms,
  localInventoryCount,
  roomError,
  onClearError,
  onEnterWorld,
  onClose,
}) => {
  const initialProfile = loadSavedProfile();
  const [playerName, setPlayerName] = useState(
    confirmedPlayerName?.trim() || initialProfile.name,
  );
  const [playerColor, setPlayerColor] = useState(initialProfile.color);
  const [newRoomName, setNewRoomName] = useState('Nieuw-Oranjestad Show');
  const [newRoomPublic, setNewRoomPublic] = useState(true);
  const [joinCode, setJoinCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);

  useEffect(() => {
    if (confirmedPlayerName && confirmedPlayerName.trim().length >= 2) {
      setPlayerName(confirmedPlayerName.trim());
    }
  }, [confirmedPlayerName]);

  const localPlayer = currentRoom?.players.find((p) => p.id === mpClient.playerId);
  const isHost = currentRoom?.hostId === mpClient.playerId;

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    soundEngine.playUiClick();
    onClearError();
    mpClient.createRoom({
      roomName: newRoomName.trim() || 'Nieuw-Oranjestad Show',
      isPublic: newRoomPublic,
      playerName: playerName.trim() || 'VuurwerkSpeler',
      color: playerColor,
      inventoryCount: localInventoryCount,
    });
  };

  const handleJoinByCode = (e: React.FormEvent) => {
    e.preventDefault();
    if (!joinCode.trim()) return;
    soundEngine.playUiClick();
    onClearError();
    mpClient.joinRoom({
      code: joinCode.trim().toUpperCase(),
      playerName: playerName.trim() || 'VuurwerkSpeler',
      color: playerColor,
      inventoryCount: localInventoryCount,
    });
  };

  const handleJoinPublic = (roomId: string) => {
    soundEngine.playUiClick();
    onClearError();
    mpClient.joinRoom({
      roomId,
      playerName: playerName.trim() || 'VuurwerkSpeler',
      color: playerColor,
      inventoryCount: localInventoryCount,
    });
  };

  const handleCopyCode = () => {
    if (!currentRoom) return;
    navigator.clipboard?.writeText(currentRoom.code).catch(() => {});
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#06080D]/88 p-4">
      <div className="w-full max-w-5xl bg-[#10131C] border border-white/12 rounded-xl overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-4 border-b border-white/10 bg-[#0B0E15]">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-amber-400" />
            <div>
              <h2 className="text-lg font-bold text-white">Online Multiplayer Lobby</h2>
              <p className="text-xs text-slate-400">
                Winkel samen, bekijk elkaars collecties en organiseer vuurwerkshows met max 12 spelers
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <span
              className={`px-2.5 py-1 rounded-md text-xs font-semibold border ${
                connectionStatus === 'connected'
                  ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
                  : connectionStatus === 'connecting'
                  ? 'bg-amber-500/15 text-amber-300 border-amber-500/35'
                  : 'bg-red-500/15 text-red-300 border-red-500/35'
              }`}
            >
              {connectionStatus === 'connected'
                ? 'Server Verbonden'
                : connectionStatus === 'connecting'
                ? 'Verbinden...'
                : 'Offline'}
            </span>
            {connectionStatus !== 'connected' && (
              <button
                onClick={() => mpClient.connect()}
                className="px-2.5 py-1 rounded-md bg-white/8 hover:bg-white/15 text-xs text-slate-200"
              >
                Opnieuw verbinden
              </button>
            )}
            <button
              onClick={() => {
                soundEngine.playUiClick();
                onClose();
              }}
              className="p-2 rounded-lg bg-white/5 text-slate-300 hover:bg-white/15 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {roomError && (
          <div className="px-6 py-2.5 bg-red-950/70 border-b border-red-500/30 text-red-200 text-xs flex items-center justify-between">
            <span>{roomError}</span>
            <button onClick={onClearError} className="underline">
              Sluiten
            </button>
          </div>
        )}

        {/* Profile Bar */}
        <div className="px-6 py-3 bg-[#0D1018] border-b border-white/10 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <label className="text-xs text-slate-400">Spelernaam:</label>
            <input
              type="text"
              maxLength={22}
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              disabled={Boolean(currentRoom)}
              className="bg-[#151A26] border border-white/12 rounded-lg px-3 py-1.5 text-sm text-white disabled:opacity-60 focus:outline-none focus:border-amber-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400">Jaskleur:</span>
            {AVATAR_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                disabled={Boolean(currentRoom)}
                onClick={() => setPlayerColor(c)}
                className={`w-6 h-6 rounded-full border-2 transition-transform ${
                  playerColor === c ? 'border-white scale-110' : 'border-transparent opacity-75'
                }`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Main Content */}
        {!currentRoom ? (
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-12 overflow-y-auto">
            {/* Left: Public Room Browser */}
            <div className="lg:col-span-7 p-6 border-b lg:border-b-0 lg:border-r border-white/10 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Globe className="w-4 h-4 text-sky-400" />
                  Openbare Kamers ({publicRooms.length})
                </h3>
                <button
                  onClick={() => {
                    soundEngine.playUiClick();
                    mpClient.requestRoomList();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/12 text-xs text-slate-200 flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  Vernieuwen
                </button>
              </div>

              {publicRooms.length === 0 ? (
                <div className="p-8 rounded-xl bg-[#141925] border border-white/8 text-center text-slate-400 text-sm">
                  Geen openbare kamers actief. Maak rechts een nieuwe kamer aan of voer een kamercode in!
                </div>
              ) : (
                <div className="space-y-2.5">
                  {publicRooms.map((r) => (
                    <div
                      key={r.id}
                      className="p-3.5 rounded-lg bg-[#141925] border border-white/10 flex items-center justify-between gap-3"
                    >
                      <div className="min-w-0">
                        <div className="text-sm font-bold text-white truncate">{r.name}</div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          Host: {r.hostName} · Code: <span className="font-mono-tabular text-amber-400">{r.code}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 shrink-0">
                        <span className="text-xs font-mono-tabular text-slate-300 bg-[#0B0E15] px-2.5 py-1 rounded">
                          {r.playerCount}/{r.maxPlayers}
                        </span>
                        <button
                          onClick={() => handleJoinPublic(r.id)}
                          disabled={r.playerCount >= r.maxPlayers || connectionStatus !== 'connected'}
                          className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-xs"
                        >
                          Deelnemen
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Right: Create Room + Join by Code */}
            <div className="lg:col-span-5 p-6 bg-[#0D1018] space-y-6">
              <form onSubmit={handleCreate} className="space-y-3.5 p-4 rounded-xl bg-[#141925] border border-white/10">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Plus className="w-4 h-4 text-amber-400" />
                  Nieuwe Kamer Maken
                </h3>
                <div>
                  <label className="text-xs text-slate-400 block mb-1">Kamernaam</label>
                  <input
                    type="text"
                    maxLength={36}
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    className="w-full bg-[#0B0E15] border border-white/12 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-300">Zichtbaarheid</span>
                  <div className="flex items-center gap-1 bg-[#0B0E15] p-1 rounded-lg border border-white/10">
                    <button
                      type="button"
                      onClick={() => setNewRoomPublic(true)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 ${
                        newRoomPublic ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
                      }`}
                    >
                      <Globe className="w-3 h-3" />
                      Openbaar
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewRoomPublic(false)}
                      className={`px-2.5 py-1 rounded text-xs font-semibold flex items-center gap-1 ${
                        !newRoomPublic ? 'bg-amber-500 text-slate-950' : 'text-slate-400'
                      }`}
                    >
                      <Lock className="w-3 h-3" />
                      Privé
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={connectionStatus !== 'connected'}
                  className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 disabled:opacity-40 text-slate-950 font-bold text-sm"
                >
                  Kamer Aanmaken
                </button>
              </form>

              <form onSubmit={handleJoinByCode} className="space-y-3 p-4 rounded-xl bg-[#141925] border border-white/10">
                <h3 className="text-sm font-bold text-white">Deelnemen met Kamercode</h3>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={8}
                    value={joinCode}
                    onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                    placeholder="bijv. A7K9P2"
                    className="flex-1 bg-[#0B0E15] border border-white/12 rounded-lg px-3 py-2 text-sm font-mono-tabular text-white uppercase tracking-wider focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="submit"
                    disabled={connectionStatus !== 'connected' || !joinCode.trim()}
                    className="px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 disabled:opacity-40 text-slate-950 font-bold text-sm"
                  >
                    Join
                  </button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          /* INSIDE ROOM VIEW */
          <div className="flex-1 min-h-0 flex flex-col p-6 overflow-y-auto space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-xl bg-[#141925] border border-amber-500/30">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white">{currentRoom.name}</h3>
                  <span className="px-2 py-0.5 rounded bg-white/8 text-[11px] text-slate-300 flex items-center gap-1">
                    {currentRoom.isPublic ? <Globe className="w-3 h-3 text-sky-400" /> : <Lock className="w-3 h-3 text-amber-400" />}
                    {currentRoom.isPublic ? 'Openbaar' : 'Privé'}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-slate-400">
                  <span>
                    Spelers: <strong className="text-white font-mono-tabular">{currentRoom.players.length}/{currentRoom.maxPlayers}</strong>
                  </span>
                  <span>·</span>
                  <span>
                    Geplaatst vuurwerk: <strong className="text-amber-400 font-mono-tabular">{currentRoom.placedFireworks.length}</strong>
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={handleCopyCode}
                  className="px-3.5 py-2 rounded-lg bg-[#0B0E15] border border-amber-500/40 text-amber-300 font-mono-tabular text-sm font-bold flex items-center gap-2 hover:bg-amber-500/10"
                >
                  Code: {currentRoom.code}
                  {copiedCode ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
                <button
                  onClick={() => {
                    soundEngine.playUiClick();
                    mpClient.leaveRoom();
                  }}
                  className="px-3.5 py-2 rounded-lg bg-red-500/15 hover:bg-red-500/30 border border-red-500/30 text-red-300 text-xs font-semibold flex items-center gap-1.5"
                >
                  <LogOut className="w-4 h-4" />
                  Verlaat Kamer
                </button>
              </div>
            </div>

            {/* Player Roster & Collection Comparison */}
            <div className="space-y-2">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Spelers & Vuurwerkcollecties ({currentRoom.players.length}/{currentRoom.maxPlayers})
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                {currentRoom.players.map((p) => {
                  const isMe = p.id === mpClient.playerId;
                  const pIsHost = p.id === currentRoom.hostId;
                  return (
                    <div
                      key={p.id}
                      className={`p-3 rounded-lg border flex items-center justify-between gap-3 ${
                        isMe ? 'bg-[#192030] border-amber-500/45' : 'bg-[#141925] border-white/10'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <span
                          className="w-3.5 h-3.5 rounded-full shrink-0 border border-white/30"
                          style={{ backgroundColor: p.color }}
                        />
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-bold text-white truncate">{p.name}</span>
                            {isMe && <span className="text-[10px] text-amber-400 font-semibold">(Jij)</span>}
                            {pIsHost && <Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" />}
                            {p.mutedByHost && <VolumeX className="w-3.5 h-3.5 text-red-400 shrink-0" />}
                          </div>
                          <div className="text-[11px] text-slate-400 truncate">
                            {p.isShopping ? 'In Vuurwerkpaleis' : p.zone} · Collectie:{' '}
                            <span className="text-amber-300 font-mono-tabular">{p.inventoryCount} stuks</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            p.ready
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-white/8 text-slate-400'
                          }`}
                        >
                          {p.ready ? 'KLAAR' : 'WACHT'}
                        </span>
                        {isHost && !isMe && (
                          <>
                            <button
                              onClick={() => mpClient.hostAction('mute', p.id)}
                              title={p.mutedByHost ? 'Dempen opheffen' : 'Speler dempen'}
                              className="p-1.5 rounded bg-white/5 hover:bg-white/15 text-slate-300"
                            >
                              {p.mutedByHost ? <Volume2 className="w-3.5 h-3.5" /> : <VolumeX className="w-3.5 h-3.5" />}
                            </button>
                            <button
                              onClick={() => mpClient.hostAction('transfer_host', p.id)}
                              title="Maak Host"
                              className="p-1.5 rounded bg-white/5 hover:bg-amber-500/25 text-amber-300"
                            >
                              <Crown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => mpClient.hostAction('kick', p.id)}
                              title="Verwijder speler"
                              className="p-1.5 rounded bg-red-500/15 hover:bg-red-500/35 text-red-300"
                            >
                              <ShieldAlert className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Footer Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/10">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    soundEngine.playUiClick();
                    mpClient.setReady(!localPlayer?.ready);
                  }}
                  className={`px-4 py-2.5 rounded-lg text-sm font-semibold flex items-center gap-2 border ${
                    localPlayer?.ready
                      ? 'bg-emerald-500/20 border-emerald-500/45 text-emerald-300'
                      : 'bg-[#141925] border-white/12 text-slate-200 hover:bg-white/10'
                  }`}
                >
                  <UserCheck className="w-4 h-4" />
                  {localPlayer?.ready ? 'Status: Klaar' : 'Zet op Klaar'}
                </button>
                {isHost && (
                  <button
                    onClick={() => {
                      soundEngine.playUiClick();
                      mpClient.hostAction('toggle_privacy');
                    }}
                    className="px-4 py-2.5 rounded-lg bg-[#141925] hover:bg-white/10 border border-white/12 text-xs text-slate-200 font-semibold"
                  >
                    Maak {currentRoom.isPublic ? 'Privé' : 'Openbaar'}
                  </button>
                )}
              </div>

              <button
                onClick={() => {
                  soundEngine.unlock();
                  soundEngine.playUiClick();
                  onEnterWorld();
                }}
                className="px-6 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm shadow-lg"
              >
                Betreed Wereld (Speel Samen)
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
