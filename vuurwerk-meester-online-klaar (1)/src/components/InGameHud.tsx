import React from 'react';
import {
  Backpack,
  CloudSun,
  Flame,
  FlaskConical,
  MapPin,
  Pause,
  ShoppingCart,
  Sparkles,
  SunMoon,
  Trash2,
  User,
  Users,
} from 'lucide-react';
import { PRODUCT_MAP } from '../data/products';
import {
  GameSettings,
  InventoryItem,
  TutorialStep,
} from '../types';
import { CrosshairTargetInfo } from './GameViewport';
import { ProductPreviewGraphic } from './ProductPreviewGraphic';

interface InGameHudProps {
  playerName: string;
  money: number;
  zoneName: string;
  basketCount: number;
  pointerLocked: boolean;
  equippedTool: 'none' | 'lighter' | 'product';
  equippedProductId: string | null;
  hotbar: (string | null)[];
  inventory: InventoryItem[];
  target: CrosshairTargetInfo | null;
  tutorialStep: TutorialStep;
  tutorialDismissed: boolean;
  settings: GameSettings;
  placedIdleCount: number;
  placedSpentCount: number;
  toast: string | null;
  mpPlayerCount: number;
  mpRoomMax: number;
  onSelectSlotKey: (keyNum: number) => void;
  onOpenInventory: () => void;
  onOpenBasket: () => void;
  onOpenDisplayMode: () => void;
  onOpenTestLab: () => void;
  onOpenMultiplayer: () => void;
  onPause: () => void;
  onIgniteAll: () => void;
  onClearSpent: () => void;
  onCycleTimeOfDay: () => void;
  onCycleWeather: () => void;
  onTeleport: (zone: 'shop' | 'display' | 'street' | 'park') => void;
  onDismissTutorial: () => void;
  onAddBonusFunds: () => void;
}

const TUTORIAL_TEXT: Record<TutorialStep, { title: string; body: string }> = {
  welcome: {
    title: 'Welkom in Oranjewijk!',
    body: 'Loop naar binnen bij Vuurwerkpaleis De Gouden Pijl (recht voor je) om vuurwerk te bekijken en te kopen, of test direct je startpakket aan de overkant op de Afsteekzone.',
  },
  enter_shop: {
    title: 'Stap 1: Bezoek de Vuurwerkwinkel',
    body: 'Loop door de grote open glazen ingang naar binnen (WASD) of klik snel op "Winkel" bovenin.',
  },
  buy_firework: {
    title: 'Stap 2: Inspecteer & Koop Vuurwerk',
    body: 'Richt op een doos in de schappen en druk [E] om te inspecteren en te kopen. Loop daarna terug naar buiten.',
  },
  equip_item: {
    title: 'Stap 3: Kies Vuurwerk uit Snelbalk',
    body: 'Druk op toets [2]–[7] onderin of open Inventaris [I] om een cake, fontein of vuurpijl vast te pakken.',
  },
  place_firework: {
    title: 'Stap 4: Plaats in de Afsteekzone',
    body: 'Steek de straat over naar de Afsteekzone. Richt op de grond en druk [F] (of klik) om te plaatsen. Gebruik [R] om te draaien.',
  },
  equip_lighter: {
    title: 'Stap 5: Pak de Virtuele Aansteker',
    body: 'Druk op toets [1] om je aansteker te pakken.',
  },
  ignite_fuse: {
    title: 'Stap 6: Steek het Lont aan!',
    body: 'Richt op het geplaatste vuurwerk, druk [E] of klik om het lont aan te steken, stap achteruit en geniet van de show!',
  },
  complete: {
    title: 'Vuurwerk Meester!',
    body: 'Je kent alle basisregels. Probeer ook de Regisseur-modus voor geprogrammeerde shows met meerdere pads tegelijk!',
  },
};

export const InGameHud: React.FC<InGameHudProps> = ({
  playerName,
  money,
  zoneName,
  basketCount,
  pointerLocked,
  equippedTool,
  equippedProductId,
  hotbar,
  inventory,
  target,
  tutorialStep,
  tutorialDismissed,
  settings,
  placedIdleCount,
  placedSpentCount,
  toast,
  mpPlayerCount,
  mpRoomMax,
  onSelectSlotKey,
  onOpenInventory,
  onOpenBasket,
  onOpenDisplayMode,
  onOpenTestLab,
  onOpenMultiplayer,
  onPause,
  onIgniteAll,
  onClearSpent,
  onCycleTimeOfDay,
  onCycleWeather,
  onTeleport,
  onDismissTutorial,
  onAddBonusFunds,
}) => {
  const tut = TUTORIAL_TEXT[tutorialStep];

  return (
    <div className="fixed inset-0 z-20 pointer-events-none flex flex-col justify-between p-4">
      {/* TOP BAR */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        {/* Top-Left: Location & Money */}
        <div className="flex flex-col items-start gap-2.5">
          <div className="pointer-events-auto bg-[#0B0E15]/88 border border-white/10 rounded-xl px-4 py-2.5 flex items-center gap-4 shadow-lg">
            <div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className="flex items-center gap-1 text-slate-200 font-semibold">
                  <User className="w-3 h-3 text-amber-400" />
                  {playerName || 'Speler'}
                </span>
                <span className="text-slate-600">·</span>
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-orange-400" />
                  {zoneName}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-lg font-bold text-amber-400 font-mono-tabular">
                  {settings.infiniteMoney ? '€∞ · ONBEPERKT' : `€${money.toFixed(2)}`}
                </span>
                {!settings.infiniteMoney && money < 15 && (
                  <button
                    onClick={onAddBonusFunds}
                    className="text-[11px] px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/35"
                  >
                    +€100 Bonus
                  </button>
                )}
              </div>
            </div>

            <div className="h-8 w-px bg-white/10 hidden sm:block" />

            {/* Quick Teleport Buttons */}
            <div className="hidden sm:flex items-center gap-1.5">
              <button
                onClick={() => onTeleport('shop')}
                className="px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/12 text-xs text-slate-200 transition-colors"
              >
                Winkel
              </button>
              <button
                onClick={() => onTeleport('display')}
                className="px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/12 text-xs text-slate-200 transition-colors"
              >
                Afsteekzone
              </button>
              <button
                onClick={() => onTeleport('park')}
                className="px-2.5 py-1 rounded-md bg-white/5 hover:bg-white/12 text-xs text-slate-200 transition-colors"
              >
                Park
              </button>
            </div>
          </div>
        </div>

        {/* Top-Right: Actions */}
        <div className="pointer-events-auto flex flex-wrap items-center gap-2">
          {placedIdleCount > 0 && (
            <button
              onClick={onIgniteAll}
              className="px-3.5 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-lg"
            >
              <Flame className="w-4 h-4" />
              Alles Aansteken ({placedIdleCount})
            </button>
          )}
          {placedSpentCount > 0 && (
            <button
              onClick={onClearSpent}
              className="px-3 py-2 rounded-lg bg-[#0B0E15]/88 hover:bg-white/15 border border-white/10 text-slate-300 text-xs flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Opruimen ({placedSpentCount})
            </button>
          )}
          <button
            onClick={onOpenMultiplayer}
            className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 ${
              mpPlayerCount > 0
                ? 'bg-emerald-500/20 border-emerald-500/45 text-emerald-300 hover:bg-emerald-500/30'
                : 'bg-[#0B0E15]/88 border-white/10 text-slate-200 hover:bg-white/15'
            }`}
          >
            <Users className="w-4 h-4" />
            {mpPlayerCount > 0 ? `Online (${mpPlayerCount}/${mpRoomMax})` : 'Multiplayer'}
          </button>
          <button
            onClick={onOpenTestLab}
            className="px-3 py-2 rounded-lg bg-[#0B0E15]/88 hover:bg-white/15 border border-amber-400/35 text-amber-200 text-xs font-medium flex items-center gap-1.5"
          >
            <FlaskConical className="w-4 h-4 text-amber-400" />
            Testomgeving
          </button>
          <button
            onClick={onCycleWeather}
            className="px-3 py-2 rounded-lg bg-[#0B0E15]/88 hover:bg-white/15 border border-white/10 text-slate-200 text-xs flex items-center gap-1.5"
            title="Wissel weer (Helder / Regen / Mist / Wind / Auto)"
          >
            <CloudSun className="w-4 h-4 text-sky-400" />
            <span>
              {settings.weather === 'clear'
                ? 'Helder'
                : settings.weather === 'rain'
                ? 'Regen'
                : settings.weather === 'mist'
                ? 'Mist'
                : settings.weather === 'wind'
                ? 'Wind'
                : 'Auto-Weer'}
            </span>
          </button>
          <button
            onClick={onCycleTimeOfDay}
            className="px-3 py-2 rounded-lg bg-[#0B0E15]/88 hover:bg-white/15 border border-white/10 text-slate-200 text-xs flex items-center gap-1.5"
            title="Wissel dag/schemering/nacht"
          >
            <SunMoon className="w-4 h-4 text-amber-400" />
            <span className="capitalize">
              {settings.timeOfDay === 'night'
                ? 'Nacht'
                : settings.timeOfDay === 'dusk'
                ? 'Schemering'
                : settings.timeOfDay === 'day'
                ? 'Dag'
                : 'Auto'}
            </span>
          </button>
          <button
            onClick={onOpenDisplayMode}
            className="px-3 py-2 rounded-lg bg-[#0B0E15]/88 hover:bg-white/15 border border-amber-500/35 text-amber-300 text-xs font-semibold flex items-center gap-1.5"
          >
            <Sparkles className="w-4 h-4" />
            Show Regisseur
          </button>
          <button
            onClick={onOpenBasket}
            className="px-3 py-2 rounded-lg bg-[#0B0E15]/88 hover:bg-white/15 border border-white/10 text-slate-200 text-xs font-medium flex items-center gap-1.5"
          >
            <ShoppingCart className="w-4 h-4 text-orange-400" />
            Mand ({basketCount})
          </button>
          <button
            onClick={onOpenInventory}
            className="px-3 py-2 rounded-lg bg-[#0B0E15]/88 hover:bg-white/15 border border-white/10 text-slate-200 text-xs font-medium flex items-center gap-1.5"
          >
            <Backpack className="w-4 h-4 text-amber-400" />
            Inventaris [I]
          </button>
          <button
            onClick={onPause}
            className="p-2 rounded-lg bg-[#0B0E15]/88 hover:bg-white/15 border border-white/10 text-slate-200"
            title="Pauze [ESC]"
          >
            <Pause className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* CENTER CROSSHAIR & INTERACTION PROMPT */}
      <div className="flex flex-col items-center justify-center gap-3">
        {toast && (
          <div className="bg-[#0B0E15]/92 border border-amber-500/45 text-amber-200 px-4 py-2 rounded-lg text-xs font-semibold shadow-xl">
            {toast}
          </div>
        )}

        {/* Crisp minimal crosshair */}
        <div className="relative flex items-center justify-center">
          <div
            className={`w-2 h-2 rounded-full transition-transform ${
              target ? 'bg-amber-400 scale-125' : 'bg-white/80'
            }`}
          />
          <div className="absolute w-5 h-5 rounded-full border border-white/25" />
        </div>

        {target ? (
          <div className="bg-[#0B0E15]/90 border border-amber-500/40 rounded-lg px-4 py-2 text-center shadow-lg">
            <div className="text-sm font-bold text-white">{target.label}</div>
            <div className="text-xs text-amber-300">{target.sublabel}</div>
          </div>
        ) : !pointerLocked ? (
          <div className="bg-[#0B0E15]/82 border border-white/10 rounded-lg px-3.5 py-1.5 text-xs text-slate-300">
            Klik in het 3D-scherm om rond te kijken (of sleep met de muis) · WASD om te lopen
          </div>
        ) : null}
      </div>

      {/* BOTTOM AREA: TUTORIAL BANNER + HOTBAR */}
      <div className="flex flex-col items-center gap-2.5">
        {!tutorialDismissed && (
          <div className="pointer-events-auto max-w-xl w-full bg-[#0B0E15]/90 border border-amber-500/30 rounded-xl px-4 py-2.5 flex items-start justify-between gap-3 shadow-lg">
            <div>
              <div className="text-xs font-bold text-amber-400">{tut.title}</div>
              <div className="text-xs text-slate-300 mt-0.5 leading-snug">{tut.body}</div>
            </div>
            <button
              onClick={onDismissTutorial}
              className="text-[11px] text-slate-400 hover:text-white shrink-0 underline"
            >
              Verberg
            </button>
          </div>
        )}

        {/* 7-Slot Bottom Hotbar: [1] Lighter + [2..7] Products */}
        <div className="pointer-events-auto bg-[#0B0E15]/90 border border-white/12 rounded-xl p-2 flex items-center gap-2 shadow-2xl">
          {/* Slot 1: Virtual Lighter */}
          <button
            onClick={() => onSelectSlotKey(1)}
            className={`w-16 h-16 rounded-lg border flex flex-col items-center justify-center gap-1 transition-colors relative ${
              equippedTool === 'lighter'
                ? 'bg-orange-500/20 border-orange-400 text-orange-300'
                : 'bg-[#141925] border-white/10 text-slate-300 hover:border-white/25'
            }`}
          >
            <span className="absolute top-1 left-1.5 text-[10px] font-mono-tabular text-slate-400">
              1
            </span>
            <Flame className="w-5 h-5 text-orange-400" />
            <span className="text-[10px] font-semibold">Aansteker</span>
          </button>

          {/* Slots 2..7: Quick-Equip Products */}
          {hotbar.map((pid, idx) => {
            const prod = pid ? PRODUCT_MAP.get(pid) : null;
            const qty = pid ? inventory.find((i) => i.productId === pid)?.quantity || 0 : 0;
            const isActive = equippedTool === 'product' && equippedProductId === pid && pid !== null;
            return (
              <button
                key={idx}
                onClick={() => onSelectSlotKey(idx + 2)}
                title={prod ? `${prod.name} (${qty}×)` : 'Leeg vak'}
                className={`w-16 h-16 rounded-lg border flex flex-col items-center justify-center relative transition-colors px-1 ${
                  isActive
                    ? 'bg-amber-500/20 border-amber-400'
                    : 'bg-[#141925] border-white/10 hover:border-white/25'
                }`}
              >
                <span className="absolute top-1 left-1.5 text-[10px] font-mono-tabular text-slate-400 z-10">
                  {idx + 2}
                </span>
                {prod && qty > 0 ? (
                  <>
                    <ProductPreviewGraphic product={prod} size="sm" />
                    <span className="absolute bottom-0.5 right-1 text-[10px] font-mono-tabular font-bold text-amber-300 bg-[#090B10]/85 px-1 rounded">
                      {qty}×
                    </span>
                  </>
                ) : (
                  <span className="text-[10px] text-slate-600">Leeg</span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
