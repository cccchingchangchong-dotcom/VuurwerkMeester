import React, { useState } from 'react';
import { Check, Maximize2, RotateCcw, Sliders, User, Volume2, VolumeX, X } from 'lucide-react';
import { GameSettings, GraphicsQuality, WeatherMode } from '../types';
import { soundEngine } from '../engine/audio';

interface SettingsModalProps {
  playerName: string;
  settings: GameSettings;
  onUpdatePlayerName: (name: string) => void;
  onUpdateSettings: (patch: Partial<GameSettings>) => void;
  onResetSave: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  playerName,
  settings,
  onUpdatePlayerName,
  onUpdateSettings,
  onResetSave,
  onClose,
}) => {
  const [confirmReset, setConfirmReset] = useState(false);
  const [nameDraft, setNameDraft] = useState(playerName || '');
  const [nameFeedback, setNameFeedback] = useState<string | null>(null);
  const [nameErr, setNameErr] = useState<string | null>(null);

  const handleSaveName = () => {
    const clean = nameDraft.trim().slice(0, 22);
    if (clean.length < 2) {
      setNameErr('Minimaal 2 tekens vereist.');
      setNameFeedback(null);
      return;
    }
    soundEngine.playUiClick();
    setNameErr(null);
    onUpdatePlayerName(clean);
    setNameFeedback('Opgeslagen!');
    setTimeout(() => setNameFeedback(null), 2000);
  };

  const toggleFullscreen = () => {
    soundEngine.playUiClick();
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen?.().catch(() => {});
    } else {
      document.exitFullscreen?.().catch(() => {});
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#06080D]/88 p-4">
      <div className="w-full max-w-2xl bg-[#10131C] border border-white/10 rounded-xl overflow-hidden shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-[#0B0E15]">
          <div className="flex items-center gap-2.5">
            <Sliders className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white">Instellingen</h2>
          </div>
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

        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto text-sm">
          {/* Player Name Editor */}
          <div className="p-3.5 rounded-lg bg-[#141925] border border-white/10 space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-semibold text-white flex items-center gap-1.5">
                <User className="w-4 h-4 text-amber-400" />
                Spelersnaam
              </div>
              {nameFeedback && (
                <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
                  <Check className="w-3.5 h-3.5" />
                  {nameFeedback}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                maxLength={22}
                value={nameDraft}
                onChange={(e) => {
                  setNameDraft(e.target.value);
                  if (nameErr) setNameErr(null);
                }}
                placeholder="Voer je spelersnaam in"
                className="flex-1 bg-[#0B0E15] border border-white/12 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500"
              />
              <button
                type="button"
                onClick={handleSaveName}
                className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs"
              >
                Naam Opslaan
              </button>
            </div>
            {nameErr && <p className="text-xs text-red-400">{nameErr}</p>}
          </div>

          {/* Infinite Money Toggle */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-lg bg-[#141925] border border-amber-500/25">
            <div>
              <div className="font-semibold text-white">Onbeperkt Geld (Infinite Money)</div>
              <div className="text-xs text-slate-400">
                Koop onbeperkt vuurwerk zonder saldo-limiet (€∞)
              </div>
            </div>
            <button
              onClick={() => {
                soundEngine.playUiClick();
                onUpdateSettings({ infiniteMoney: !settings.infiniteMoney });
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                settings.infiniteMoney
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-white/8 text-slate-300 hover:bg-white/15'
              }`}
            >
              {settings.infiniteMoney ? 'AAN (€∞)' : 'UIT'}
            </button>
          </div>

          {/* Optional Camera Shake Toggle (OFF by default) */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-lg bg-[#141925] border border-white/10">
            <div>
              <div className="font-semibold text-white">Schermtrilling bij Explosies (Camera Shake)</div>
              <div className="text-xs text-slate-400">
                Standaard uitgeschakeld voor een volledig stabiele, trillingsvrije camera
              </div>
            </div>
            <button
              onClick={() => {
                soundEngine.playUiClick();
                onUpdateSettings({ screenShake: !settings.screenShake });
              }}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-colors ${
                settings.screenShake
                  ? 'bg-amber-500 text-slate-950'
                  : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
              }`}
            >
              {settings.screenShake ? 'AAN' : 'UIT (Stabiele Camera)'}
            </button>
          </div>

          {/* Graphics Quality (Always Low) */}
          <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-lg bg-[#141925] border border-white/10">
            <div>
              <div className="font-semibold text-white">Grafische Kwaliteit</div>
              <div className="text-xs text-slate-400">
                Altijd op Laag (LOW) ingesteld voor vloeiende, glitchvrije prestaties
              </div>
            </div>
            <span className="px-3.5 py-1.5 rounded-lg bg-amber-500 text-slate-950 text-xs font-extrabold">
              LAAG (LOW)
            </span>
          </div>

          {/* Time of Day */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-white">Tijdstip (Dag / Nacht Cyclus)</div>
              <div className="text-xs text-slate-400">Kies nacht, schemering, dag of automatische cyclus</div>
            </div>
            <div className="flex items-center gap-1 bg-[#0B0E15] p-1 rounded-lg border border-white/10">
              {(['night', 'dusk', 'day', 'auto'] as const).map((tod) => (
                <button
                  key={tod}
                  onClick={() => {
                    soundEngine.playUiClick();
                    onUpdateSettings({ timeOfDay: tod });
                  }}
                  className={`px-3 py-1.5 rounded text-xs font-semibold ${
                    settings.timeOfDay === tod
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {tod === 'night'
                    ? 'Nacht'
                    : tod === 'dusk'
                    ? 'Schemering'
                    : tod === 'day'
                    ? 'Dag'
                    : 'Auto'}
                </button>
              ))}
            </div>
          </div>

          {/* Weather Condition */}
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-white">Weersomstandigheden</div>
              <div className="text-xs text-slate-400">
                Regen (natte reflecterende straten), mist, wind of dynamisch auto-weer
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-1 bg-[#0B0E15] p-1 rounded-lg border border-white/10">
              {(['clear', 'rain', 'mist', 'wind', 'auto'] as WeatherMode[]).map((w) => (
                <button
                  key={w}
                  onClick={() => {
                    soundEngine.playUiClick();
                    onUpdateSettings({ weather: w });
                  }}
                  className={`px-2.5 py-1.5 rounded text-xs font-semibold ${
                    settings.weather === w
                      ? 'bg-amber-500 text-slate-950'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  {w === 'clear'
                    ? 'Helder'
                    : w === 'rain'
                    ? 'Regen'
                    : w === 'mist'
                    ? 'Mist'
                    : w === 'wind'
                    ? 'Wind'
                    : 'Auto'}
                </button>
              ))}
            </div>
          </div>

          {/* Resolution Scaling */}
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="font-semibold text-white">Resolutieschaal</span>
              <span className="font-mono-tabular text-amber-400">
                {Math.round(settings.resolutionScale * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0.5}
              max={1.0}
              step={0.1}
              value={settings.resolutionScale}
              onChange={(e) => onUpdateSettings({ resolutionScale: Number(e.target.value) })}
              className="w-full accent-amber-500"
            />
          </div>

          {/* Mouse Sensitivity */}
          <div className="space-y-1.5">
            <div className="flex justify-between">
              <span className="font-semibold text-white">Muisgevoeligheid</span>
              <span className="font-mono-tabular text-amber-400">
                {settings.mouseSensitivity.toFixed(1)}×
              </span>
            </div>
            <input
              type="range"
              min={0.3}
              max={2.5}
              step={0.1}
              value={settings.mouseSensitivity}
              onChange={(e) => onUpdateSettings({ mouseSensitivity: Number(e.target.value) })}
              className="w-full accent-amber-500"
            />
          </div>

          {/* Audio Controls */}
          <div className="pt-2 border-t border-white/10 space-y-4">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-white">Geluid Dempen</span>
              <button
                onClick={() => onUpdateSettings({ muted: !settings.muted })}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                  settings.muted
                    ? 'bg-red-500/20 text-red-300 border border-red-500/40'
                    : 'bg-white/8 text-slate-200'
                }`}
              >
                {settings.muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                {settings.muted ? 'Gedempt' : 'Geluid Aan'}
              </button>
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-200">Vuurwerk & SFX Volume</span>
                <span className="font-mono-tabular text-amber-400">
                  {Math.round(settings.soundVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.soundVolume}
                onChange={(e) => onUpdateSettings({ soundVolume: Number(e.target.value) })}
                className="w-full accent-amber-500"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-200">Omgevingsgeluid & Sfeer</span>
                <span className="font-mono-tabular text-amber-400">
                  {Math.round(settings.musicVolume * 100)}%
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={settings.musicVolume}
                onChange={(e) => onUpdateSettings({ musicVolume: Number(e.target.value) })}
                className="w-full accent-amber-500"
              />
            </div>
          </div>

          {/* Toggles: Performance Mode, VSync, Fullscreen */}
          <div className="pt-2 border-t border-white/10 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              onClick={() => onUpdateSettings({ performanceMode: !settings.performanceMode })}
              className={`p-3 rounded-lg border text-left transition-colors ${
                settings.performanceMode
                  ? 'bg-amber-500/15 border-amber-500/50 text-amber-200'
                  : 'bg-[#141925] border-white/10 text-slate-300'
              }`}
            >
              <div className="text-xs font-bold">Prestatiemodus</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {settings.performanceMode ? 'Aan (Laptop vriendelijk)' : 'Uit'}
              </div>
            </button>

            <button
              onClick={() => onUpdateSettings({ vsync: !settings.vsync })}
              className={`p-3 rounded-lg border text-left transition-colors ${
                settings.vsync
                  ? 'bg-amber-500/15 border-amber-500/50 text-amber-200'
                  : 'bg-[#141925] border-white/10 text-slate-300'
              }`}
            >
              <div className="text-xs font-bold">VSync</div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                {settings.vsync ? 'Aan (Browser RAF)' : 'Uit'}
              </div>
            </button>

            <button
              onClick={toggleFullscreen}
              className="p-3 rounded-lg border bg-[#141925] border-white/10 hover:border-amber-500/40 text-slate-200 text-left transition-colors"
            >
              <div className="text-xs font-bold flex items-center gap-1.5">
                <Maximize2 className="w-3.5 h-3.5 text-amber-400" />
                Volledig Scherm
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Schakel schermmodus</div>
            </button>
          </div>

          {/* Reset Save */}
          <div className="pt-3 border-t border-white/10 flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-red-300">Opgeslagen Spel Resetten</div>
              <div className="text-xs text-slate-400">
                Herstelt startpakket en wist inventaris & geplaatste shows
              </div>
            </div>
            {!confirmReset ? (
              <button
                onClick={() => setConfirmReset(true)}
                className="px-4 py-2 rounded-lg bg-red-500/15 hover:bg-red-500/30 border border-red-500/30 text-red-300 text-xs font-semibold flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Reset Spel
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    onResetSave();
                    setConfirmReset(false);
                  }}
                  className="px-3.5 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold"
                >
                  Bevestig Reset
                </button>
                <button
                  onClick={() => setConfirmReset(false)}
                  className="px-3 py-2 rounded-lg bg-white/10 text-slate-300 text-xs"
                >
                  Annuleren
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const CreditsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#06080D]/88 p-4">
    <div className="w-full max-w-lg bg-[#10131C] border border-white/10 rounded-xl p-6 space-y-4 shadow-2xl">
      <div className="flex items-center justify-between border-b border-white/10 pb-3">
        <h2 className="text-lg font-bold text-white">Credits & Simulatie-informatie</h2>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg bg-white/5 text-slate-300 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="space-y-3 text-sm text-slate-300 leading-relaxed">
        <p>
          <strong className="text-amber-400">Dutch Fireworks Simulator — Vuurwerk Meester NL</strong>{' '}
          is een volledige 3D first-person vuurwerksimulator in de hyperrealistische Nederlandse open
          wereld <strong className="text-white">Nieuw-Oranjestad</strong>, met online multiplayer voor
          maximaal 12 spelers per kamer.
        </p>
        <p className="text-xs text-slate-400">
          Alle 220+ vuurwerkproducten, merken (KroonVuurwerk, DonderWerk, NoorderLicht, PolderPyro,
          OranjeKnallers, VlinderVlam) en effecten zijn fictief en puur ontworpen voor virtueel
          simulatieplezier in de browser.
        </p>
        <div className="bg-[#141925] rounded-lg p-3.5 text-xs space-y-1 text-slate-300 border border-white/8">
          <div>WASD: Lopen · Shift: Sprinten · Spatie: Springen</div>
          <div>Muis: Rondkijken (klik in beeld) · E: Inspecteren / Aansteken</div>
          <div>F: Plaatsen / Oppakken · R: Draaien · I: Inventaris · T: Chat · ESC: Pauze</div>
        </div>
      </div>
    </div>
  </div>
);
