import React, { useEffect, useRef, useState } from 'react';
import {
  Play,
  Square,
  RotateCcw,
  Plus,
  Trash2,
  Save,
  ChevronLeft,
  FolderOpen,
} from 'lucide-react';
import { PRODUCT_MAP, PRODUCTS } from '../data/products';
import { CustomShow, InventoryItem, ShowCue } from '../types';
import { soundEngine } from '../engine/audio';

interface DisplayModeOverlayProps {
  inventory: InventoryItem[];
  customShows: CustomShow[];
  playbackState: { elapsed: number; duration: number; playing: boolean };
  onStartShow: (show: CustomShow) => void;
  onStopShow: () => void;
  onSaveShow: (name: string, cues: ShowCue[], existingId?: string) => string | void;
  onDeleteShow: (id: string) => void;
  onExitDisplayMode: () => void;
}

export const DisplayModeOverlay: React.FC<DisplayModeOverlayProps> = ({
  inventory,
  customShows,
  playbackState,
  onStartShow,
  onStopShow,
  onSaveShow,
  onDeleteShow,
  onExitDisplayMode,
}) => {
  const [activeShowId, setActiveShowId] = useState<string>(customShows[0]?.id || '');
  const [showName, setShowName] = useState<string>(customShows[0]?.name || 'Nieuwe Vuurwerkshow');
  const [cues, setCues] = useState<ShowCue[]>(customShows[0]?.cues || []);
  const [useInventoryOnly, setUseInventoryOnly] = useState(false);

  const [newProductId, setNewProductId] = useState<string>(
    inventory[0]?.productId || PRODUCTS[0].id,
  );
  const [newTime, setNewTime] = useState<number>(0);
  const [newPad, setNewPad] = useState<number>(3);
  const [newAngle, setNewAngle] = useState<number>(0);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const statusTimerRef = useRef<number | null>(null);
  const replayTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (statusTimerRef.current !== null) window.clearTimeout(statusTimerRef.current);
      if (replayTimerRef.current !== null) window.clearTimeout(replayTimerRef.current);
    };
  }, []);

  useEffect(() => {
    const found = customShows.find((s) => s.id === activeShowId);
    if (found) {
      setShowName(found.name);
      setCues(found.cues);
    }
  }, [activeShowId, customShows]);

  const selectableProducts = useInventoryOnly
    ? PRODUCTS.filter((p) => inventory.some((i) => i.productId === p.id && i.quantity > 0))
    : PRODUCTS;

  useEffect(() => {
    if (selectableProducts.length === 0) {
      if (newProductId !== '') setNewProductId('');
      return;
    }
    if (!selectableProducts.some((p) => p.id === newProductId)) {
      setNewProductId(selectableProducts[0].id);
    }
  }, [selectableProducts, newProductId]);

  const handleAddCue = () => {
    if (!newProductId || !selectableProducts.some((p) => p.id === newProductId)) {
      setStatusMsg('Geen product beschikbaar om toe te voegen.');
      return;
    }
    soundEngine.playUiClick();
    const cue: ShowCue = {
      id: `cue-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`,
      productId: newProductId,
      triggerTime: Math.max(0, Number(newTime)),
      padIndex: newPad,
      angleDeg: newAngle,
    };
    const next = [...cues, cue].sort((a, b) => a.triggerTime - b.triggerTime);
    setCues(next);
    const prod = PRODUCT_MAP.get(newProductId);
    setNewTime(Number((newTime + Math.min(8, Math.max(1.5, (prod?.durationSec || 4) * 0.5))).toFixed(1)));
  };

  const handleSave = () => {
    soundEngine.playPickup();
    const cleanName = showName.trim() || 'Aangepaste Show';
    const savedId = onSaveShow(cleanName, cues, activeShowId || undefined);
    if (savedId && savedId !== activeShowId) {
      setActiveShowId(savedId);
    }
    setStatusMsg(`Show "${cleanName}" opgeslagen!`);
    if (statusTimerRef.current !== null) window.clearTimeout(statusTimerRef.current);
    statusTimerRef.current = window.setTimeout(() => setStatusMsg(null), 2500);
  };

  const handleCreateNew = () => {
    soundEngine.playUiClick();
    setActiveShowId('');
    setShowName(`Mijn Show ${customShows.length + 1}`);
    setCues([]);
    setNewTime(0);
  };

  const handlePlay = () => {
    soundEngine.unlock();
    if (cues.length === 0) {
      setStatusMsg('Voeg eerst minstens één vuurwerk cue toe!');
      return;
    }
    onStartShow({
      id: activeShowId || 'temp',
      name: showName,
      cues,
      createdAt: Date.now(),
    });
  };

  const handleReplay = () => {
    onStopShow();
    if (replayTimerRef.current !== null) window.clearTimeout(replayTimerRef.current);
    replayTimerRef.current = window.setTimeout(() => handlePlay(), 60);
  };

  const sortedCues = [...cues].sort((a, b) => a.triggerTime - b.triggerTime);

  return (
    <div className="fixed inset-0 z-30 pointer-events-none flex flex-col justify-between p-4 md:p-6">
      {/* Top Bar */}
      <div className="pointer-events-auto flex flex-wrap items-center justify-between gap-3 bg-[#0B0E15]/92 border border-white/10 rounded-xl px-5 py-3 shadow-xl">
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              onStopShow();
              onExitDisplayMode();
            }}
            className="px-3 py-1.5 rounded-lg bg-white/8 hover:bg-white/15 text-slate-200 text-xs font-medium flex items-center gap-1.5"
          >
            <ChevronLeft className="w-4 h-4" />
            Terug naar Spel
          </button>
          <div>
            <h2 className="text-base font-bold text-white leading-tight">
              Vuurwerkshow Regisseur
            </h2>
            <p className="text-xs text-slate-400">
              Afsteekzone Vuurwerkplein · {sortedCues.length} geprogrammeerde cues
            </p>
          </div>
        </div>

        {/* Playback Controls */}
        <div className="flex items-center gap-2.5">
          {playbackState.playing ? (
            <button
              onClick={onStopShow}
              className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              Stop Show
            </button>
          ) : (
            <button
              onClick={handlePlay}
              className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold flex items-center gap-1.5"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Start Show
            </button>
          )}
          <button
            onClick={handleReplay}
            className="px-3.5 py-2 rounded-lg bg-white/8 hover:bg-white/15 text-slate-200 text-xs font-medium flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Herhalen
          </button>
          <span className="text-xs font-mono-tabular text-amber-400 pl-2">
            {playbackState.elapsed.toFixed(1)}s / {playbackState.duration.toFixed(1)}s
          </span>
        </div>
      </div>

      {/* Bottom Compact Sequencer Dock (keeps sky 100% open & unobstructed!) */}
      <div className="pointer-events-auto bg-[#0B0E15]/92 border border-white/10 rounded-xl p-4 shadow-2xl max-w-6xl w-full mx-auto space-y-3">
        {statusMsg && (
          <div className="text-xs text-emerald-300 bg-emerald-950/60 border border-emerald-500/30 rounded px-3 py-1.5">
            {statusMsg}
          </div>
        )}

        {/* Show Selector & Save Row */}
        <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-white/10">
          <div className="flex flex-wrap items-center gap-2">
            <FolderOpen className="w-4 h-4 text-amber-400" />
            <select
              value={activeShowId}
              onChange={(e) => setActiveShowId(e.target.value)}
              className="bg-[#151A26] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
            >
              <option value="">-- Nieuwe Show --</option>
              {customShows.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.cues.length} cues)
                </option>
              ))}
            </select>
            <input
              type="text"
              value={showName}
              onChange={(e) => setShowName(e.target.value)}
              placeholder="Naam van show..."
              className="bg-[#151A26] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white w-48 focus:outline-none focus:border-amber-500"
            />
            <button
              onClick={handleSave}
              className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              Opslaan
            </button>
            <button
              onClick={handleCreateNew}
              className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs"
            >
              Nieuw
            </button>
            {activeShowId && customShows.length > 1 && (
              <button
                onClick={() => {
                  onDeleteShow(activeShowId);
                  const remaining = customShows.filter((s) => s.id !== activeShowId);
                  if (remaining[0]) setActiveShowId(remaining[0].id);
                }}
                className="p-1.5 rounded-lg bg-red-500/15 hover:bg-red-500/30 text-red-300"
                title="Verwijder show"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={useInventoryOnly}
              onChange={(e) => setUseInventoryOnly(e.target.checked)}
              className="accent-amber-500"
            />
            Alleen uit mijn inventaris
          </label>
        </div>

        {/* Add Cue Controls */}
        <div className="flex flex-wrap items-end gap-2.5">
          <div className="flex-1 min-w-[200px]">
            <label className="text-[11px] text-slate-400 block mb-1">Product</label>
            <select
              value={newProductId}
              onChange={(e) => setNewProductId(e.target.value)}
              disabled={selectableProducts.length === 0}
              className="w-full bg-[#151A26] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white disabled:opacity-50"
            >
              {selectableProducts.length === 0 ? (
                <option value="">-- Geen producten in inventaris --</option>
              ) : (
                selectableProducts.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} ({p.category} · {p.shots}s)
                  </option>
                ))
              )}
            </select>
          </div>
          <div className="w-24">
            <label className="text-[11px] text-slate-400 block mb-1">Start (sec)</label>
            <input
              type="number"
              min={0}
              max={300}
              step={0.5}
              value={newTime}
              onChange={(e) => setNewTime(Number(e.target.value))}
              className="w-full bg-[#151A26] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono-tabular"
            />
          </div>
          <div className="w-32">
            <label className="text-[11px] text-slate-400 block mb-1">Lanceerpad (1–12)</label>
            <select
              value={newPad}
              onChange={(e) => setNewPad(Number(e.target.value))}
              className="w-full bg-[#151A26] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono-tabular"
            >
              {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11].map((idx) => (
                <option key={idx} value={idx}>
                  Pad {idx + 1}
                </option>
              ))}
            </select>
          </div>
          <div className="w-24">
            <label className="text-[11px] text-slate-400 block mb-1">Hoek (°)</label>
            <input
              type="number"
              min={-25}
              max={25}
              step={5}
              value={newAngle}
              onChange={(e) => setNewAngle(Number(e.target.value))}
              className="w-full bg-[#151A26] border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white font-mono-tabular"
            />
          </div>
          <button
            onClick={handleAddCue}
            disabled={selectableProducts.length === 0}
            className="px-4 py-1.5 h-[32px] rounded-lg bg-orange-500 hover:bg-orange-400 disabled:opacity-45 disabled:pointer-events-none text-slate-950 font-bold text-xs flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5" />
            Cue Toevoegen
          </button>
        </div>

        {/* Horizontal Cue Timeline Strip */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {sortedCues.length === 0 ? (
            <span className="text-xs text-slate-500 py-1">
              Tijdlijn is leeg. Voeg vuurwerk toe om je show te bouwen.
            </span>
          ) : (
            sortedCues.map((c) => {
              const p = PRODUCT_MAP.get(c.productId);
              const isActive =
                playbackState.playing &&
                playbackState.elapsed >= c.triggerTime &&
                playbackState.elapsed <= c.triggerTime + (p?.durationSec || 4);
              return (
                <div
                  key={c.id}
                  className={`shrink-0 px-3 py-1.5 rounded-lg border text-xs flex items-center gap-2 ${
                    isActive
                      ? 'bg-amber-500/20 border-amber-400 text-white'
                      : 'bg-[#141925] border-white/10 text-slate-200'
                  }`}
                >
                  <span className="font-mono-tabular font-bold text-amber-400">
                    {c.triggerTime.toFixed(1)}s
                  </span>
                  <span className="max-w-[130px] truncate">{p?.name || c.productId}</span>
                  <span className="text-[11px] text-slate-400 font-mono-tabular">
                    P{c.padIndex + 1}
                  </span>
                  <button
                    onClick={() => setCues((prev) => prev.filter((x) => x.id !== c.id))}
                    className="text-slate-500 hover:text-red-400"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
