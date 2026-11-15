import { useState, useEffect, useCallback } from 'react';
import {
  BasketItem,
  CustomShow,
  GameSettings,
  GraphicsQuality,
  InventoryItem,
  PlacedFireworkData,
  PurchaseRecord,
  SaveState,
  ShowCue,
  TutorialStep,
} from '../types';
import { PRODUCT_MAP } from '../data/products';
import { savePlayerProfile } from '../net/multiplayerClient';

const STORAGE_KEY = 'vuurwerk_meester_nl_save_v1';

export function detectRecommendedGraphicsQuality(): GraphicsQuality {
  return 'low';
}

export const DEFAULT_SETTINGS: GameSettings = {
  infiniteMoney: true,
  screenShake: false,
  graphicsQuality: 'low',
  autoGraphics: false,
  resolutionScale: 0.82,
  mouseSensitivity: 1.0,
  soundVolume: 0.8,
  musicVolume: 0.45,
  muted: false,
  vsync: true,
  performanceMode: false,
  timeOfDay: 'night',
  weather: 'clear',
};

const DEFAULT_SHOWS: CustomShow[] = [
  {
    id: 'show-oud-nieuw-starter',
    name: 'Oud & Nieuw Straatshow',
    createdAt: Date.now(),
    cues: [
      { id: 'c1', productId: 'ft-01', triggerTime: 0, padIndex: 1, angleDeg: 0 },
      { id: 'c2', productId: 'ft-01', triggerTime: 0, padIndex: 5, angleDeg: 0 },
      { id: 'c3', productId: 'ck-01', triggerTime: 3.0, padIndex: 3, angleDeg: 0 },
      { id: 'c4', productId: 'ck-03', triggerTime: 6.5, padIndex: 2, angleDeg: -10 },
      { id: 'c5', productId: 'ck-02', triggerTime: 6.5, padIndex: 4, angleDeg: 10 },
      { id: 'c6', productId: 'rk-02', triggerTime: 14.0, padIndex: 3, angleDeg: 0 },
      { id: 'c7', productId: 'sh-02', triggerTime: 17.0, padIndex: 3, angleDeg: 0 },
      { id: 'c8', productId: 'fn-01', triggerTime: 20.0, padIndex: 3, angleDeg: 0 },
    ],
  },
];

export function createInitialSaveState(): SaveState {
  return {
    version: 4,
    playerName: '',
    money: 350.0,
    inventory: [
      { productId: 'tk-01', quantity: 5 },
      { productId: 'ck-01', quantity: 3 },
      { productId: 'ft-01', quantity: 3 },
      { productId: 'rk-01', quantity: 3 },
      { productId: 'nov-8', quantity: 1 },
    ],
    hotbar: ['tk-01', 'ck-01', 'ft-01', 'rk-01', 'nov-8', null],
    purchaseHistory: [],
    placedFireworks: [],
    customShows: DEFAULT_SHOWS,
    settings: { ...DEFAULT_SETTINGS },
    tutorialStep: 'welcome',
    tutorialDismissed: false,
    totalShotsFired: 0,
  };
}

function loadSaveState(): { state: SaveState; hasExistingSave: boolean } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { state: createInitialSaveState(), hasExistingSave: false };
    const parsed = JSON.parse(raw) as Partial<SaveState>;
    if (!parsed || typeof parsed.money !== 'number') {
      return { state: createInitialSaveState(), hasExistingSave: false };
    }
    const base = createInitialSaveState();
    const mergedSettings: GameSettings = {
      ...DEFAULT_SETTINGS,
      ...(parsed.settings || {}),
    };
    if ((parsed.version ?? 0) < 2 && parsed.settings?.infiniteMoney === undefined) {
      mergedSettings.infiniteMoney = true;
    }
    if ((parsed.version ?? 0) < 3) {
      mergedSettings.screenShake = false;
    }
    if ((parsed.version ?? 0) < 4 && !parsed.settings?.weather) {
      mergedSettings.weather = 'clear';
    }
    // Always enforce low graphics for maximum stability
    mergedSettings.graphicsQuality = 'low';
    mergedSettings.resolutionScale = Math.min(mergedSettings.resolutionScale ?? 0.82, 0.9);
    mergedSettings.autoGraphics = false;
    return {
      hasExistingSave: true,
      state: {
        ...base,
        ...parsed,
        version: 5,
        playerName: typeof parsed.playerName === 'string' ? parsed.playerName : '',
        settings: mergedSettings,
        hotbar: Array.isArray(parsed.hotbar) && parsed.hotbar.length === 6 ? parsed.hotbar : base.hotbar,
        customShows:
          Array.isArray(parsed.customShows) && parsed.customShows.length > 0
            ? parsed.customShows
            : DEFAULT_SHOWS,
      },
    };
  } catch {
    return { state: createInitialSaveState(), hasExistingSave: false };
  }
}

export function useGameStore() {
  const [{ state, hasExistingSave }, setLoaded] = useState(() => loadSaveState());
  const [basket, setBasket] = useState<BasketItem[]>([]);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Ignore quota errors
    }
  }, [state]);

  const setTutorialStep = useCallback((step: TutorialStep) => {
    setLoaded((prev) => ({
      ...prev,
      hasExistingSave: true,
      state: { ...prev.state, tutorialStep: step },
    }));
  }, []);

  const dismissTutorial = useCallback(() => {
    setLoaded((prev) => ({
      ...prev,
      hasExistingSave: true,
      state: { ...prev.state, tutorialDismissed: true },
    }));
  }, []);

  const addToBasket = useCallback((productId: string, qty = 1) => {
    setBasket((prev) => {
      const existing = prev.find((b) => b.productId === productId);
      if (existing) {
        return prev.map((b) => (b.productId === productId ? { ...b, quantity: b.quantity + qty } : b));
      }
      return [...prev, { productId, quantity: qty }];
    });
  }, []);

  const removeFromBasket = useCallback((productId: string, qty = 1) => {
    setBasket((prev) =>
      prev
        .map((b) => (b.productId === productId ? { ...b, quantity: b.quantity - qty } : b))
        .filter((b) => b.quantity > 0),
    );
  }, []);

  const clearBasket = useCallback(() => setBasket([]), []);

  const purchaseBasket = useCallback((): { ok: boolean; error?: string } => {
    const total = basket.reduce((sum, item) => {
      const prod = PRODUCT_MAP.get(item.productId);
      return sum + (prod ? prod.price * item.quantity : 0);
    }, 0);

    if (basket.length === 0) return { ok: false, error: 'Je winkelmand is leeg.' };

    const unlimited = state.settings.infiniteMoney;
    if (!unlimited && total > state.money + 0.001) {
      return { ok: false, error: 'Onvoldoende saldo. Verwijder enkele artikelen of zet Onbeperkt Geld aan.' };
    }

    const record: PurchaseRecord = {
      id: `ord-${Date.now()}`,
      timestamp: Date.now(),
      total: Number(total.toFixed(2)),
      items: basket.map((b) => {
        const prod = PRODUCT_MAP.get(b.productId)!;
        return {
          productId: b.productId,
          name: prod.name,
          quantity: b.quantity,
          unitPrice: prod.price,
        };
      }),
    };

    setLoaded((prev) => {
      const nextInv = [...prev.state.inventory];
      const nextHotbar = [...prev.state.hotbar];

      for (const item of basket) {
        const idx = nextInv.findIndex((i) => i.productId === item.productId);
        if (idx >= 0) {
          nextInv[idx] = { ...nextInv[idx], quantity: nextInv[idx].quantity + item.quantity };
        } else {
          nextInv.push({ productId: item.productId, quantity: item.quantity });
          const emptySlot = nextHotbar.findIndex((h) => h === null);
          if (emptySlot >= 0) nextHotbar[emptySlot] = item.productId;
        }
      }

      const nextStep: TutorialStep =
        prev.state.tutorialStep === 'welcome' ||
        prev.state.tutorialStep === 'enter_shop' ||
        prev.state.tutorialStep === 'buy_firework'
          ? 'equip_item'
          : prev.state.tutorialStep;

      return {
        hasExistingSave: true,
        state: {
          ...prev.state,
          money: prev.state.settings.infiniteMoney
            ? prev.state.money
            : Number((prev.state.money - total).toFixed(2)),
          inventory: nextInv,
          hotbar: nextHotbar,
          purchaseHistory: [record, ...prev.state.purchaseHistory].slice(0, 50),
          tutorialStep: nextStep,
        },
      };
    });

    setBasket([]);
    return { ok: true };
  }, [basket, state.money, state.settings.infiniteMoney]);

  const buySingleInstant = useCallback(
    (productId: string, qty = 1): { ok: boolean; error?: string } => {
      const prod = PRODUCT_MAP.get(productId);
      if (!prod) return { ok: false, error: 'Product niet gevonden.' };
      const cost = prod.price * qty;
      const unlimited = state.settings.infiniteMoney;
      if (!unlimited && state.money + 0.001 < cost) {
        return { ok: false, error: 'Onvoldoende saldo.' };
      }

      const record: PurchaseRecord = {
        id: `ord-${Date.now()}`,
        timestamp: Date.now(),
        total: Number(cost.toFixed(2)),
        items: [{ productId, name: prod.name, quantity: qty, unitPrice: prod.price }],
      };

      setLoaded((prev) => {
        const nextInv = [...prev.state.inventory];
        const nextHotbar = [...prev.state.hotbar];
        const idx = nextInv.findIndex((i) => i.productId === productId);
        if (idx >= 0) {
          nextInv[idx] = { ...nextInv[idx], quantity: nextInv[idx].quantity + qty };
        } else {
          nextInv.push({ productId, quantity: qty });
          const emptySlot = nextHotbar.findIndex((h) => h === null);
          if (emptySlot >= 0) nextHotbar[emptySlot] = productId;
        }

        const nextStep: TutorialStep =
          prev.state.tutorialStep === 'welcome' ||
          prev.state.tutorialStep === 'enter_shop' ||
          prev.state.tutorialStep === 'buy_firework'
            ? 'equip_item'
            : prev.state.tutorialStep;

        return {
          hasExistingSave: true,
          state: {
            ...prev.state,
            money: prev.state.settings.infiniteMoney
              ? prev.state.money
              : Number((prev.state.money - cost).toFixed(2)),
            inventory: nextInv,
            hotbar: nextHotbar,
            purchaseHistory: [record, ...prev.state.purchaseHistory].slice(0, 50),
            tutorialStep: nextStep,
          },
        };
      });
      return { ok: true };
    },
    [state.money, state.settings.infiniteMoney],
  );

  const consumeInventoryItem = useCallback((productId: string, amount = 1) => {
    setLoaded((prev) => {
      const nextInv: InventoryItem[] = prev.state.inventory
        .map((item) =>
          item.productId === productId ? { ...item, quantity: item.quantity - amount } : item,
        )
        .filter((item) => item.quantity > 0);

      const stillHas = nextInv.some((i) => i.productId === productId);
      const nextHotbar = prev.state.hotbar.map((h) => (h === productId && !stillHas ? null : h));

      return {
        hasExistingSave: true,
        state: {
          ...prev.state,
          inventory: nextInv,
          hotbar: nextHotbar,
        },
      };
    });
  }, []);

  const addInventoryItem = useCallback((productId: string, amount = 1) => {
    setLoaded((prev) => {
      const nextInv = [...prev.state.inventory];
      const nextHotbar = [...prev.state.hotbar];
      const idx = nextInv.findIndex((i) => i.productId === productId);
      if (idx >= 0) {
        nextInv[idx] = { ...nextInv[idx], quantity: nextInv[idx].quantity + amount };
      } else {
        nextInv.push({ productId, quantity: amount });
        const emptySlot = nextHotbar.findIndex((h) => h === null);
        if (emptySlot >= 0) nextHotbar[emptySlot] = productId;
      }
      return {
        hasExistingSave: true,
        state: { ...prev.state, inventory: nextInv, hotbar: nextHotbar },
      };
    });
  }, []);

  const assignHotbarSlot = useCallback((slotIndex: number, productId: string | null) => {
    if (slotIndex < 0 || slotIndex > 5) return;
    setLoaded((prev) => {
      const nextHotbar = [...prev.state.hotbar];
      if (productId) {
        for (let i = 0; i < nextHotbar.length; i++) {
          if (nextHotbar[i] === productId) nextHotbar[i] = null;
        }
      }
      nextHotbar[slotIndex] = productId;
      return {
        hasExistingSave: true,
        state: { ...prev.state, hotbar: nextHotbar },
      };
    });
  }, []);

  const addPlacedFirework = useCallback((fw: PlacedFireworkData) => {
    setLoaded((prev) => ({
      hasExistingSave: true,
      state: {
        ...prev.state,
        placedFireworks: [...prev.state.placedFireworks, fw],
      },
    }));
  }, []);

  const updatePlacedFirework = useCallback((uid: string, patch: Partial<PlacedFireworkData>) => {
    setLoaded((prev) => ({
      hasExistingSave: true,
      state: {
        ...prev.state,
        placedFireworks: prev.state.placedFireworks.map((f) => (f.uid === uid ? { ...f, ...patch } : f)),
      },
    }));
  }, []);

  const removePlacedFirework = useCallback((uid: string) => {
    setLoaded((prev) => ({
      hasExistingSave: true,
      state: {
        ...prev.state,
        placedFireworks: prev.state.placedFireworks.filter((f) => f.uid !== uid),
      },
    }));
  }, []);

  const updateSettings = useCallback((patch: Partial<GameSettings>) => {
    setLoaded((prev) => ({
      hasExistingSave: true,
      state: {
        ...prev.state,
        settings: {
          ...prev.state.settings,
          ...patch,
          graphicsQuality: 'low',
          autoGraphics: false,
        },
      },
    }));
  }, []);

  const saveCustomShow = useCallback((name: string, cues: ShowCue[], existingId?: string): string => {
    const targetId = existingId || `show-${Date.now()}-${Math.random().toString(36).slice(2, 5)}`;
    setLoaded((prev) => {
      const shows = [...prev.state.customShows];
      const idx = shows.findIndex((s) => s.id === targetId);
      if (idx >= 0) {
        shows[idx] = { ...shows[idx], name, cues };
        return { hasExistingSave: true, state: { ...prev.state, customShows: shows } };
      }
      const newShow: CustomShow = {
        id: targetId,
        name,
        cues,
        createdAt: Date.now(),
      };
      return {
        hasExistingSave: true,
        state: { ...prev.state, customShows: [newShow, ...shows] },
      };
    });
    return targetId;
  }, []);

  const deleteCustomShow = useCallback((id: string) => {
    setLoaded((prev) => ({
      hasExistingSave: true,
      state: {
        ...prev.state,
        customShows: prev.state.customShows.filter((s) => s.id !== id),
      },
    }));
  }, []);

  const incrementShotsFired = useCallback(() => {
    setLoaded((prev) => ({
      hasExistingSave: true,
      state: { ...prev.state, totalShotsFired: prev.state.totalShotsFired + 1 },
    }));
  }, []);

  const addMoneyBonus = useCallback((amount: number) => {
    setLoaded((prev) => ({
      hasExistingSave: true,
      state: { ...prev.state, money: Number((prev.state.money + amount).toFixed(2)) },
    }));
  }, []);

  const setPlayerName = useCallback((rawName: string): string => {
    const clean = rawName.trim().slice(0, 22);
    if (!clean) return '';
    savePlayerProfile(clean);
    setLoaded((prev) => ({
      ...prev,
      hasExistingSave: true,
      state: { ...prev.state, playerName: clean },
    }));
    return clean;
  }, []);

  const resetSave = useCallback((preservePlayerName = true) => {
    const fresh = createInitialSaveState();
    setLoaded((prev) => {
      const nextState: SaveState = {
        ...fresh,
        playerName: preservePlayerName ? prev.state.playerName : '',
        settings: {
          ...fresh.settings,
          graphicsQuality: prev.state.settings.graphicsQuality,
          autoGraphics: prev.state.settings.autoGraphics,
          weather: prev.state.settings.weather,
        },
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState));
      return { state: nextState, hasExistingSave: false };
    });
    setBasket([]);
  }, []);

  return {
    state,
    hasExistingSave,
    basket,
    addToBasket,
    removeFromBasket,
    clearBasket,
    purchaseBasket,
    buySingleInstant,
    consumeInventoryItem,
    addInventoryItem,
    assignHotbarSlot,
    addPlacedFirework,
    updatePlacedFirework,
    removePlacedFirework,
    updateSettings,
    saveCustomShow,
    deleteCustomShow,
    incrementShotsFired,
    addMoneyBonus,
    setTutorialStep,
    dismissTutorial,
    setPlayerName,
    resetSave,
  };
}
