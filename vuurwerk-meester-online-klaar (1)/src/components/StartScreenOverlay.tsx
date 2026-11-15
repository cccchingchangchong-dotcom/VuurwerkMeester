import React, { useRef, useState } from 'react';
import {
  Flame,
  Info,
  Play,
  RotateCw,
  Sliders,
  Sparkles,
  User,
  Users,
} from 'lucide-react';
import { GameSettings, GraphicsQuality, RoomStatePayload } from '../types';
import { soundEngine } from '../engine/audio';

interface StartScreenOverlayProps {
  playerName: string;
  hasExistingSave: boolean;
  settings: GameSettings;
  money: number;
  inventoryCount: number;
  totalShotsFired: number;
  mpStatus: 'disconnected' | 'connecting' | 'connected';
  currentRoom: RoomStatePayload | null;
  onSelectGraphics: (quality: GraphicsQuality) => void;
  onPlay: (confirmedName: string, startNew: boolean) => void;
  onOpenMultiplayer: (confirmedName: string) => void;
  onOpenTestLab: () => void;
  onOpenSettings: () => void;
  onOpenCredits: () => void;
}

export const StartScreenOverlay: React.FC<StartScreenOverlayProps> = ({
  playerName,
  hasExistingSave,
  settings,
  money,
  inventoryCount,
  totalShotsFired,
  mpStatus,
  currentRoom,
  onSelectGraphics: _onSelectGraphics,
  onPlay,
  onOpenMultiplayer,
  onOpenTestLab,
  onOpenSettings,
  onOpenCredits,
}) => {
  const [nameInput, setNameInput] = useState(playerName || '');
  const [nameError, setNameError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const validateAndGetName = (): string | null => {
    const clean = nameInput.trim().slice(0, 22);
    if (clean.length < 2) {
      setNameError('Voer eerst een geldige spelersnaam in (minimaal 2 tekens).');
      inputRef.current?.focus();
      return null;
    }
    setNameError(null);
    return clean;
  };

  const handlePlaySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    soundEngine.unlock();
    const clean = validateAndGetName();
    if (!clean) return;
    soundEngine.playUiClick();
    onPlay(clean, false);
  };

  return (
    <div className="fixed inset-0 z-30 flex items-center justify-center md:justify-start bg-gradient-to-r from-[#07090F]/94 via-[#07090F]/76 to-transparent p-6 md:p-14 overflow-y-auto">
      <form onSubmit={handlePlaySubmit} className="w-full max-w-md space-y-5 my-auto">
        {/* Title Header */}
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 tracking-wide">
            <Flame className="w-4 h-4 text-orange-500" />
            <span>Hyperrealistic Edition · Nieuw-Oranjestad 3D</span>
          </div>
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-white tracking-tight mt-2 leading-[1.05]">
            DUTCH FIREWORKS <span className="text-amber-400">SIMULATOR</span>
          </h1>
          <p className="text-sm text-slate-300 mt-2.5 leading-relaxed">
            Verken een levendige Nederlandse stad met dynamisch weer, PBR-reflecties, 220+ fictieve
            producten in Vuurwerkpaleis De Gouden Pijl en online multiplayer.
          </p>
        </div>

        {/* Mandatory Player Name Input */}
        <div className="p-4 rounded-xl bg-[#0F131D]/95 border border-white/12 space-y-2 shadow-xl">
          <label
            htmlFor="player-name-input"
            className="text-xs font-bold text-slate-200 flex items-center justify-between"
          >
            <span className="flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-amber-400" />
              Spelersnaam <span className="text-amber-400">*</span>
            </span>
            <span className="text-[11px] font-normal text-slate-400">Verplicht voor start</span>
          </label>
          <input
            ref={inputRef}
            id="player-name-input"
            type="text"
            maxLength={22}
            value={nameInput}
            onChange={(e) => {
              setNameInput(e.target.value);
              if (nameError && e.target.value.trim().length >= 2) {
                setNameError(null);
              }
            }}
            placeholder="Voer je spelersnaam in"
            autoComplete="nickname"
            className={`w-full bg-[#090B11] border rounded-lg px-3.5 py-2.5 text-sm text-white placeholder:text-slate-500 focus:outline-none transition-colors ${
              nameError
                ? 'border-red-500/80 focus:border-red-400'
                : 'border-white/15 focus:border-amber-500'
            }`}
          />
          {nameError && (
            <p className="text-xs text-red-400 font-medium">{nameError}</p>
          )}
        </div>

        {/* Graphics Quality Preset (Always Low) */}
        <div className="p-3.5 rounded-xl bg-[#0F131D]/90 border border-white/10 flex items-center justify-between text-xs">
          <span className="font-semibold text-slate-200 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            Grafische Instelling
          </span>
          <span className="px-2.5 py-1 rounded bg-amber-500 text-slate-950 text-[10px] font-extrabold tracking-wide uppercase">
            LOW (Stabiel)
          </span>
        </div>

        {/* Primary Play & Secondary Controls */}
        <div className="space-y-2.5">
          <button
            type="submit"
            className="w-full py-3.5 px-5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-sm flex items-center justify-between transition-colors shadow-lg"
          >
            <span className="flex items-center gap-2.5 tracking-wide">
              <Play className="w-4 h-4 fill-current" />
              {hasExistingSave ? 'SPELEN (DOORGAAN)' : 'SPELEN'}
            </span>
            <span className="text-xs font-mono-tabular opacity-85">
              {settings.infiniteMoney ? '€∞' : `€${money.toFixed(2)}`}
            </span>
          </button>

          {hasExistingSave && (
            <button
              type="button"
              onClick={() => {
                soundEngine.unlock();
                const clean = validateAndGetName();
                if (!clean) return;
                soundEngine.playUiClick();
                onPlay(clean, true);
              }}
              className="w-full py-2.5 px-5 rounded-xl bg-[#141925]/92 hover:bg-[#1C2334] border border-white/12 text-slate-200 font-semibold text-xs flex items-center justify-between transition-colors"
            >
              <span className="flex items-center gap-2">
                <RotateCw className="w-3.5 h-3.5 text-amber-400" />
                Nieuw Spel Starten
              </span>
              <span className="text-[11px] text-slate-400 font-mono-tabular">
                {inventoryCount} in bezit · {totalShotsFired} schoten
              </span>
            </button>
          )}

          <div className="grid grid-cols-2 gap-2.5 pt-0.5">
            <button
              type="button"
              onClick={() => {
                soundEngine.unlock();
                const clean = validateAndGetName();
                if (!clean) return;
                soundEngine.playUiClick();
                onOpenMultiplayer(clean);
              }}
              className="py-2.5 px-4 rounded-xl bg-sky-500/18 hover:bg-sky-500/28 border border-sky-400/40 text-sky-200 font-bold text-xs flex items-center justify-between transition-colors"
            >
              <span className="flex items-center gap-2">
                <Users className="w-4 h-4 text-sky-400" />
                Multiplayer
              </span>
              <span className="text-[10px] font-mono-tabular text-sky-300">
                {currentRoom
                  ? `${currentRoom.players.length}/${currentRoom.maxPlayers}`
                  : mpStatus === 'connected'
                  ? 'Online'
                  : 'Lobby'}
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                soundEngine.unlock();
                soundEngine.playUiClick();
                onOpenSettings();
              }}
              className="py-2.5 px-4 rounded-xl bg-[#141925]/92 hover:bg-[#1C2334] border border-white/10 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2"
            >
              <Sliders className="w-4 h-4 text-slate-400" />
              Instellingen
            </button>
          </div>

          <button
            type="button"
            onClick={() => {
              soundEngine.unlock();
              soundEngine.playUiClick();
              onOpenTestLab();
            }}
            className="w-full py-2.5 px-4 rounded-xl bg-amber-500/12 hover:bg-amber-500/22 border border-amber-400/35 text-amber-200 text-xs font-bold flex items-center justify-center gap-2 transition-colors"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            Vuurwerk Testomgeving (220+ Effecten Inspecteren)
          </button>

          <button
            type="button"
            onClick={() => {
              soundEngine.unlock();
              soundEngine.playUiClick();
              onOpenCredits();
            }}
            className="w-full py-2 px-4 rounded-xl bg-[#0F131C]/82 hover:bg-[#181E2C] border border-white/8 text-slate-400 hover:text-slate-200 text-xs font-medium flex items-center justify-center gap-2"
          >
            <Info className="w-3.5 h-3.5" />
            Credits & Besturing
          </button>
        </div>
      </form>
    </div>
  );
};

interface LoadingScreenOverlayProps {
  playerName: string;
  progress: number;
  graphicsQuality: GraphicsQuality;
  weatherLabel: string;
}

export const LoadingScreenOverlay: React.FC<LoadingScreenOverlayProps> = ({
  playerName,
  progress,
  graphicsQuality,
  weatherLabel,
}) => {
  const stageText =
    progress < 35
      ? 'PBR-materialen, gevels & reflecties initialiseren...'
      : progress < 72
      ? 'Vuurwerkpaleis & 220+ effecten voorbereiden...'
      : 'Welkom in Nieuw-Oranjestad — Afsteekzone gereed!';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#06080E]/92 p-6">
      <div className="w-full max-w-md bg-[#0F131D] border border-amber-500/35 rounded-2xl p-7 shadow-2xl space-y-5">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/35 flex items-center justify-center">
            <Flame className="w-6 h-6 text-amber-400" />
          </div>
          <div>
            <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider">
              DUTCH FIREWORKS SIMULATOR
            </div>
            <h2 className="text-lg font-extrabold text-white mt-0.5">
              Spel laden voor {playerName}
            </h2>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-slate-300">
            <span>{stageText}</span>
            <span className="font-mono-tabular font-bold text-amber-400">
              {Math.min(100, Math.round(progress))}%
            </span>
          </div>
          <div className="w-full h-2.5 rounded-full bg-[#07090E] border border-white/10 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-orange-500 via-amber-400 to-yellow-300 transition-all duration-150"
              style={{ width: `${Math.min(100, Math.round(progress))}%` }}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2.5 text-[11px] text-slate-400 pt-1">
          <div className="p-2.5 rounded-lg bg-[#141925] border border-white/8">
            <div className="text-slate-500">Grafische Modus</div>
            <div className="text-white font-bold uppercase mt-0.5">{graphicsQuality}</div>
          </div>
          <div className="p-2.5 rounded-lg bg-[#141925] border border-white/8">
            <div className="text-slate-500">Weersituatie</div>
            <div className="text-white font-bold mt-0.5">{weatherLabel}</div>
          </div>
        </div>
      </div>
    </div>
  );
};
