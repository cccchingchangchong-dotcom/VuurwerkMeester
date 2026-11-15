import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  FlaskConical,
  Users,
} from 'lucide-react';
import {
  ActiveScreen,
  CustomShow,
  PlacedFireworkData,
  RemotePlayerState,
  RoomChatMessage,
  RoomPlacedFirework,
  RoomStatePayload,
  RoomSummary,
  WeatherMode,
} from './types';
import { useGameStore } from './state/useGameStore';
import {
  CrosshairTargetInfo,
  GameViewport,
  GameViewportHandle,
} from './components/GameViewport';
import { ShopModal } from './components/ShopModal';
import { InventoryModal } from './components/InventoryModal';
import { DisplayModeOverlay } from './components/DisplayModeOverlay';
import { CreditsModal, SettingsModal } from './components/SettingsAndCreditsModal';
import { InGameHud } from './components/InGameHud';
import { FireworkTestLab } from './components/FireworkTestLab';
import { MultiplayerLobbyModal } from './components/MultiplayerLobbyModal';
import { ChatOverlay } from './components/ChatOverlay';
import { LoadingScreenOverlay, StartScreenOverlay } from './components/StartScreenOverlay';
import { soundEngine } from './engine/audio';
import { PRODUCT_MAP } from './data/products';
import { mpClient } from './net/multiplayerClient';

export default function App() {
  const {
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
  } = useGameStore();

  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('menu');
  const [returnScreen, setReturnScreen] = useState<ActiveScreen>('menu');
  const [paused, setPaused] = useState(false);
  const [isLoadingWorld, setIsLoadingWorld] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0);

  const [shopInitialProduct, setShopInitialProduct] = useState<string | null>(null);
  const [shopInitialTab, setShopInitialTab] = useState<'catalog' | 'basket' | 'history'>('catalog');

  const [equippedTool, setEquippedTool] = useState<'none' | 'lighter' | 'product'>('lighter');
  const [equippedProductId, setEquippedProductId] = useState<string | null>(null);

  const [zoneName, setZoneName] = useState('Oranjestraat');
  const [pointerLocked, setPointerLocked] = useState(false);
  const [target, setTarget] = useState<CrosshairTargetInfo | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [playbackState, setPlaybackState] = useState({ elapsed: 0, duration: 10, playing: false });

  // Multiplayer State
  const [mpStatus, setMpStatus] = useState<'disconnected' | 'connecting' | 'connected'>('disconnected');
  const [publicRooms, setPublicRooms] = useState<RoomSummary[]>([]);
  const [currentRoom, setCurrentRoom] = useState<RoomStatePayload | null>(null);
  const [roomError, setRoomError] = useState<string | null>(null);
  const [mpPlacedFireworks, setMpPlacedFireworks] = useState<RoomPlacedFirework[]>([]);
  const [chatMessages, setChatMessages] = useState<RoomChatMessage[]>([]);
  const [mutedPlayerIds, setMutedPlayerIds] = useState<Set<string>>(() => new Set());
  const [chatOpen, setChatOpen] = useState(true);
  const [chatFocusTrigger, setChatFocusTrigger] = useState(0);

  const viewportRef = useRef<GameViewportHandle | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const loadTimerRef = useRef<number | null>(null);
  const inRoomRef = useRef(false);
  inRoomRef.current = currentRoom !== null;

  const inventoryCount = useMemo(
    () => state.inventory.reduce((s, i) => s + i.quantity, 0),
    [state.inventory],
  );
  const inventoryCountRef = useRef(inventoryCount);
  inventoryCountRef.current = inventoryCount;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    toastTimerRef.current = window.setTimeout(() => setToast(null), 3400);
  }, []);

  const openModalScreen = useCallback((screen: ActiveScreen, from: ActiveScreen) => {
    soundEngine.playUiClick();
    setReturnScreen(from);
    setPaused(false);
    setActiveScreen(screen);
  }, []);

  // Connect & Subscribe to Real Multiplayer WebSocket Server
  useEffect(() => {
    mpClient.handlers = {
      onConnectionChange: (status) => {
        setMpStatus(status);
      },
      onRoomList: (rooms) => {
        setPublicRooms(rooms);
      },
      onRoomJoined: (room) => {
        setRoomError(null);
        setCurrentRoom(room);
        setMpPlacedFireworks(room.placedFireworks || []);
        setChatMessages(room.chatHistory || []);
        viewportRef.current?.syncRemotePlayers(room.players || [], mpClient.playerId);
        showToast(`Verbonden met kamer "${room.name}" (Code: ${room.code})`);
      },
      onRoomLeft: (reason) => {
        setCurrentRoom(null);
        setMpPlacedFireworks([]);
        setChatMessages([]);
        viewportRef.current?.clearRemotePlayers();
        if (reason) showToast(reason);
      },
      onRoomError: (message) => {
        setRoomError(message);
        showToast(message);
      },
      onPlayerJoined: (player) => {
        setCurrentRoom((prev) => {
          if (!prev) return prev;
          const exists = prev.players.some((p) => p.id === player.id);
          const nextPlayers = exists
            ? prev.players.map((p) => (p.id === player.id ? player : p))
            : [...prev.players, player];
          return { ...prev, players: nextPlayers };
        });
        if (player.id !== mpClient.playerId) {
          viewportRef.current?.upsertRemotePlayer(player);
          showToast(`${player.name} is de kamer binnengekomen!`);
        }
      },
      onPlayerLeft: (playerId, name) => {
        setCurrentRoom((prev) =>
          prev ? { ...prev, players: prev.players.filter((p) => p.id !== playerId) } : prev,
        );
        viewportRef.current?.removeRemotePlayer(playerId);
        showToast(`${name} heeft de kamer verlaten.`);
      },
      onPlayerMoved: (player) => {
        if (player.id === mpClient.playerId) return;
        viewportRef.current?.upsertRemotePlayer(player);
        setCurrentRoom((prev) => {
          if (!prev) return prev;
          const idx = prev.players.findIndex((p) => p.id === player.id);
          if (idx < 0) return { ...prev, players: [...prev.players, player] };
          const copy = [...prev.players];
          copy[idx] = player;
          return { ...prev, players: copy };
        });
      },
      onPlayerUpdated: (player) => {
        if (player.id !== mpClient.playerId) {
          viewportRef.current?.upsertRemotePlayer(player);
        }
        setCurrentRoom((prev) => {
          if (!prev) return prev;
          const nextPlayers = prev.players.map((p) => (p.id === player.id ? player : p));
          return { ...prev, players: nextPlayers };
        });
      },
      onHostChanged: (hostId, hostName) => {
        setCurrentRoom((prev) => (prev ? { ...prev, hostId } : prev));
        showToast(`${hostName} is nu de kamer-host.`);
      },
      onPrivacyChanged: (isPublic) => {
        setCurrentRoom((prev) => (prev ? { ...prev, isPublic } : prev));
      },
      onFireworkPlaced: (fw) => {
        setMpPlacedFireworks((prev) => (prev.some((x) => x.uid === fw.uid) ? prev : [...prev, fw]));
      },
      onFireworkUpdated: (fw) => {
        setMpPlacedFireworks((prev) => prev.map((x) => (x.uid === fw.uid ? fw : x)));
      },
      onFireworkRemoved: (uid) => {
        setMpPlacedFireworks((prev) => prev.filter((x) => x.uid !== uid));
      },
      onFireworkIgnited: (ev) => {
        setMpPlacedFireworks((prev) =>
          prev.map((x) => (x.uid === ev.uid ? { ...x, state: 'fusing' } : x)),
        );
        viewportRef.current?.playRemoteIgnition(ev);
      },
      onShowStarted: (show, startedBy) => {
        viewportRef.current?.startShowPlayback(show);
        showToast(`${startedBy} is een gesynchroniseerde vuurwerkshow gestart!`);
      },
      onShowStopped: (stoppedBy) => {
        viewportRef.current?.stopShowPlayback();
        showToast(`Vuurwerkshow gestopt door ${stoppedBy}.`);
      },
      onChatMessage: (msg) => {
        setChatMessages((prev) => [...prev.slice(-79), msg]);
      },
      onPlayerShowcased: (ev) => {
        showToast(`${ev.playerName} toont product: ${ev.productName}!`);
      },
      onModerationReport: (ev) => {
        showToast(`Moderatie: ${ev.reporterName} meldt ${ev.targetName} (${ev.reason})`);
      },
    };

    mpClient.connect();
    return () => {
      mpClient.disconnect();
      if (loadTimerRef.current) window.clearInterval(loadTimerRef.current);
      if (toastTimerRef.current) window.clearTimeout(toastTimerRef.current);
    };
  }, [showToast]);

  const beginEnterGame = useCallback(
    (confirmedName: string, startNew: boolean) => {
      const clean = setPlayerName(confirmedName);
      if (startNew) {
        resetSave(true);
      }
      if (inRoomRef.current) {
        mpClient.sendPlayerRename(clean);
      }
      if (loadTimerRef.current) window.clearInterval(loadTimerRef.current);
      setPaused(false);
      setIsLoadingWorld(true);
      setLoadProgress(12);
      const started = performance.now();
      loadTimerRef.current = window.setInterval(() => {
        const pct = Math.min(100, 12 + ((performance.now() - started) / 1100) * 88);
        setLoadProgress(pct);
        if (pct >= 100) {
          if (loadTimerRef.current) window.clearInterval(loadTimerRef.current);
          loadTimerRef.current = null;
          setIsLoadingWorld(false);
          setActiveScreen('playing');
          showToast(`Welkom ${clean}! Loop naar Vuurwerkpaleis of de Afsteekzone.`);
        }
      }, 40);
    },
    [resetSave, setPlayerName, showToast],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape' && activeScreen !== 'menu' && activeScreen !== 'playing') {
        if (activeScreen === 'display') {
          if (inRoomRef.current) mpClient.sendStopShow();
          else viewportRef.current?.stopShowPlayback();
        }
        setActiveScreen(returnScreen);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeScreen, returnScreen]);

  const handleSelectSlotKey = useCallback(
    (keyNum: number) => {
      soundEngine.unlock();
      if (keyNum === 1) {
        soundEngine.playLighterFlick();
        setEquippedTool('lighter');
        setEquippedProductId(null);
        if (state.tutorialStep === 'equip_lighter') {
          setTutorialStep('ignite_fuse');
        }
        return;
      }
      const slotIdx = keyNum - 2;
      const pid = state.hotbar[slotIdx];
      if (!pid) {
        setEquippedTool('none');
        setEquippedProductId(null);
        return;
      }
      const hasQty = (state.inventory.find((i) => i.productId === pid)?.quantity || 0) > 0;
      if (!hasQty) {
        showToast('Dit product is op. Koop nieuwe voorraad in de winkel.');
        return;
      }
      soundEngine.playPickup();
      setEquippedTool('product');
      setEquippedProductId(pid);
      if (state.tutorialStep === 'equip_item') {
        setTutorialStep('place_firework');
      }
    },
    [state.hotbar, state.inventory, state.tutorialStep, setTutorialStep, showToast],
  );

  const handlePlaceFirework = useCallback(
    (fw: PlacedFireworkData) => {
      if (inRoomRef.current) {
        mpClient.sendPlaceFirework({
          uid: fw.uid,
          productId: fw.productId,
          x: fw.x,
          y: fw.y,
          z: fw.z,
          rotationY: fw.rotationY,
        });
      } else {
        addPlacedFirework(fw);
      }
      consumeInventoryItem(fw.productId, 1);

      const currentQty = state.inventory.find((i) => i.productId === fw.productId)?.quantity || 0;
      if (currentQty <= 1) {
        setEquippedTool('lighter');
        setEquippedProductId(null);
      }
    },
    [addPlacedFirework, consumeInventoryItem, state.inventory],
  );

  const handleUpdatePlacedFirework = useCallback(
    (uid: string, patch: Partial<PlacedFireworkData>) => {
      if (inRoomRef.current) {
        mpClient.sendUpdateFirework(uid, {
          rotationY: patch.rotationY,
          state: patch.state,
        });
      } else {
        updatePlacedFirework(uid, patch);
      }
    },
    [updatePlacedFirework],
  );

  const handleRemovePlacedFirework = useCallback(
    (uid: string) => {
      if (inRoomRef.current) {
        mpClient.sendRemoveFirework(uid);
      } else {
        removePlacedFirework(uid);
      }
    },
    [removePlacedFirework],
  );

  const handlePickupPlacedToInventory = useCallback(
    (uid: string, productId: string) => {
      handleRemovePlacedFirework(uid);
      addInventoryItem(productId, 1);
    },
    [handleRemovePlacedFirework, addInventoryItem],
  );

  const handleEquipProductFromInv = useCallback(
    (productId: string) => {
      setEquippedTool('product');
      setEquippedProductId(productId);
      if (state.tutorialStep === 'equip_item') {
        setTutorialStep('place_firework');
      }
    },
    [state.tutorialStep, setTutorialStep],
  );

  const handleCycleTimeOfDay = () => {
    soundEngine.playUiClick();
    const order: ('night' | 'dusk' | 'day' | 'auto')[] = ['night', 'dusk', 'day', 'auto'];
    const idx = order.indexOf(state.settings.timeOfDay);
    const next = order[(idx + 1) % order.length];
    updateSettings({ timeOfDay: next });
    showToast(
      `Tijdstip gewijzigd naar: ${
        next === 'night' ? 'Nacht' : next === 'dusk' ? 'Schemering' : next === 'day' ? 'Dag' : 'Automatisch'
      }`,
    );
  };

  const handleCycleWeather = () => {
    soundEngine.playUiClick();
    const order: WeatherMode[] = ['clear', 'rain', 'mist', 'wind', 'auto'];
    const idx = order.indexOf(state.settings.weather);
    const next = order[(idx + 1) % order.length];
    updateSettings({ weather: next });
    const labels: Record<WeatherMode, string> = {
      clear: 'Helder',
      rain: 'Regen',
      mist: 'Mist',
      wind: 'Wind',
      auto: 'Automatisch',
    };
    showToast(`Weer gewijzigd naar: ${labels[next]}`);
  };

  const handleStartShow = (show: CustomShow) => {
    if (inRoomRef.current) {
      mpClient.sendStartShow(show);
    } else {
      viewportRef.current?.startShowPlayback(show);
    }
  };

  const handleStopShow = () => {
    if (inRoomRef.current) {
      mpClient.sendStopShow();
    } else {
      viewportRef.current?.stopShowPlayback();
    }
  };

  const activePlacedFireworks = currentRoom ? mpPlacedFireworks : state.placedFireworks;
  const remotePlayers: RemotePlayerState[] = useMemo(
    () => (currentRoom ? currentRoom.players.filter((p) => p.id !== mpClient.playerId) : []),
    [currentRoom],
  );
  const playersInShop = useMemo(
    () => remotePlayers.filter((p) => p.isShopping),
    [remotePlayers],
  );

  const placedIdleCount = activePlacedFireworks.filter((f) => f.state === 'idle').length;
  const placedSpentCount = activePlacedFireworks.filter((f) => f.state === 'spent').length;
  const basketCount = basket.reduce((s, b) => s + b.quantity, 0);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-[#090B10]">
      {/* Persistent 3D World Canvas */}
      <GameViewport
        activeScreen={paused ? 'settings' : activeScreen}
        settings={state.settings}
        equippedTool={equippedTool}
        equippedProductId={equippedProductId}
        placedFireworks={activePlacedFireworks}
        tutorialStep={state.tutorialStep}
        isMultiplayer={currentRoom !== null}
        viewportRef={viewportRef}
        onTargetChange={setTarget}
        onZoneChange={setZoneName}
        onPointerLockChange={setPointerLocked}
        onInspectProduct={(pid) => {
          setShopInitialProduct(pid);
          setShopInitialTab('catalog');
          openModalScreen('shop', 'playing');
        }}
        onOpenCheckout={() => {
          setShopInitialProduct(null);
          setShopInitialTab('basket');
          openModalScreen('shop', 'playing');
        }}
        onOpenCatalog={() => {
          setShopInitialProduct(null);
          setShopInitialTab('catalog');
          openModalScreen('shop', 'playing');
        }}
        onOpenInventory={() => openModalScreen('inventory', 'playing')}
        onToggleChat={() => {
          setChatOpen(true);
          setChatFocusTrigger((n) => n + 1);
        }}
        onPauseRequest={() => setPaused((p) => !p)}
        onSelectSlotKey={handleSelectSlotKey}
        onPlaceFirework={handlePlaceFirework}
        onUpdatePlacedFirework={handleUpdatePlacedFirework}
        onRemovePlacedFirework={handleRemovePlacedFirework}
        onPickupPlacedToInventory={handlePickupPlacedToInventory}
        onIgniteFireworkRequest={(uid, fuseDuration) => {
          mpClient.sendIgniteFirework(uid, fuseDuration);
        }}
        onIgniteAllRequest={() => {
          mpClient.sendIgniteAll();
        }}
        onPlayerNetworkSync={(data) => {
          mpClient.sendPlayerUpdate({
            ...data,
            inventoryCount: inventoryCountRef.current,
          });
        }}
        onTutorialAdvance={setTutorialStep}
        onShotFired={incrementShotsFired}
        onToast={showToast}
        onShowPlaybackProgress={(elapsed, duration, playing) =>
          setPlaybackState({ elapsed, duration, playing })
        }
      />

      {/* NEW START SCREEN (MANDATORY PLAYER NAME + QUALITY PRESETS) */}
      {activeScreen === 'menu' && !isLoadingWorld && (
        <StartScreenOverlay
          playerName={state.playerName}
          hasExistingSave={hasExistingSave}
          settings={state.settings}
          money={state.money}
          inventoryCount={inventoryCount}
          totalShotsFired={state.totalShotsFired}
          mpStatus={mpStatus}
          currentRoom={currentRoom}
          onSelectGraphics={(quality) => updateSettings({ graphicsQuality: quality, autoGraphics: false })}
          onPlay={(confirmedName, startNew) => beginEnterGame(confirmedName, startNew)}
          onOpenMultiplayer={(confirmedName) => {
            setPlayerName(confirmedName);
            mpClient.requestRoomList();
            openModalScreen('multiplayer', 'menu');
          }}
          onOpenTestLab={() => openModalScreen('test_lab', 'menu')}
          onOpenSettings={() => openModalScreen('settings', 'menu')}
          onOpenCredits={() => openModalScreen('credits', 'menu')}
        />
      )}

      {/* STYLISH LOADING TRANSITION */}
      {isLoadingWorld && (
        <LoadingScreenOverlay
          playerName={state.playerName || 'Speler'}
          progress={loadProgress}
          graphicsQuality={state.settings.graphicsQuality}
          weatherLabel={
            state.settings.weather === 'clear'
              ? 'Helder'
              : state.settings.weather === 'rain'
              ? 'Regen'
              : state.settings.weather === 'mist'
              ? 'Mist'
              : state.settings.weather === 'wind'
              ? 'Wind'
              : 'Automatisch'
          }
        />
      )}

      {/* IN-GAME HUD */}
      {activeScreen === 'playing' && !paused && !isLoadingWorld && (
        <>
          <InGameHud
            playerName={state.playerName}
            money={state.money}
            zoneName={zoneName}
            basketCount={basketCount}
            pointerLocked={pointerLocked}
            equippedTool={equippedTool}
            equippedProductId={equippedProductId}
            hotbar={state.hotbar}
            inventory={state.inventory}
            target={target}
            tutorialStep={state.tutorialStep}
            tutorialDismissed={state.tutorialDismissed}
            settings={state.settings}
            placedIdleCount={placedIdleCount}
            placedSpentCount={placedSpentCount}
            toast={toast}
            mpPlayerCount={currentRoom ? currentRoom.players.length : 0}
            mpRoomMax={currentRoom?.maxPlayers || 12}
            onSelectSlotKey={handleSelectSlotKey}
            onOpenInventory={() => openModalScreen('inventory', 'playing')}
            onOpenBasket={() => {
              setShopInitialProduct(null);
              setShopInitialTab('basket');
              openModalScreen('shop', 'playing');
            }}
            onOpenDisplayMode={() => openModalScreen('display', 'playing')}
            onOpenTestLab={() => openModalScreen('test_lab', 'playing')}
            onOpenMultiplayer={() => {
              mpClient.requestRoomList();
              openModalScreen('multiplayer', 'playing');
            }}
            onPause={() => setPaused(true)}
            onIgniteAll={() => viewportRef.current?.igniteAllPlaced()}
            onClearSpent={() => viewportRef.current?.clearSpentFireworks()}
            onCycleTimeOfDay={handleCycleTimeOfDay}
            onCycleWeather={handleCycleWeather}
            onTeleport={(z) => {
              soundEngine.playUiClick();
              viewportRef.current?.teleportTo(z);
            }}
            onDismissTutorial={dismissTutorial}
            onAddBonusFunds={() => {
              soundEngine.playCashRegister();
              addMoneyBonus(100);
              showToast('€100,00 Oudejaarsbonus toegevoegd!');
            }}
          />

          {/* Live Multiplayer Chat Overlay (Bottom-Left) */}
          {currentRoom && (
            <div className="fixed bottom-4 left-4 z-30 pointer-events-none">
              <ChatOverlay
                messages={chatMessages}
                mutedPlayerIds={mutedPlayerIds}
                chatOpen={chatOpen}
                focusTrigger={chatFocusTrigger}
                onToggleOpen={() => setChatOpen((o) => !o)}
                onToggleMutePlayer={(pid, name) => {
                  setMutedPlayerIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(pid)) {
                      next.delete(pid);
                      showToast(`${name} is niet langer gedempt.`);
                    } else {
                      next.add(pid);
                      showToast(`${name} lokaal gedempt.`);
                    }
                    return next;
                  });
                }}
                onReportPlayer={(pid, name) => {
                  mpClient.reportPlayer(pid, 'Ongepast gedrag in chat');
                  showToast(`Melding tegen ${name} verzonden naar de host.`);
                }}
              />
            </div>
          )}
        </>
      )}

      {/* PAUSE MENU */}
      {activeScreen === 'playing' && paused && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#06080D]/82 p-4">
          <div className="w-full max-w-sm bg-[#10131C] border border-white/12 rounded-xl p-6 space-y-2.5 shadow-2xl">
            <h2 className="text-xl font-bold text-white text-center mb-2">Spel Gepauzeerd</h2>
            <button
              onClick={() => {
                soundEngine.playUiClick();
                setPaused(false);
              }}
              className="w-full py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-sm"
            >
              Hervatten
            </button>
            <button
              onClick={() => {
                mpClient.requestRoomList();
                openModalScreen('multiplayer', 'playing');
              }}
              className="w-full py-2.5 rounded-lg bg-[#161B28] hover:bg-[#1E2536] border border-sky-500/35 text-sky-200 text-sm font-medium flex items-center justify-center gap-2"
            >
              <Users className="w-4 h-4 text-sky-400" />
              Online Multiplayer
            </button>
            <button
              onClick={() => openModalScreen('test_lab', 'playing')}
              className="w-full py-2.5 rounded-lg bg-[#161B28] hover:bg-[#1E2536] border border-amber-500/30 text-amber-200 text-sm font-medium flex items-center justify-center gap-2"
            >
              <FlaskConical className="w-4 h-4 text-amber-400" />
              Vuurwerk Testomgeving (220+ Effecten)
            </button>
            <button
              onClick={() => {
                setShopInitialProduct(null);
                setShopInitialTab('catalog');
                openModalScreen('shop', 'playing');
              }}
              className="w-full py-2.5 rounded-lg bg-[#161B28] hover:bg-[#1E2536] border border-white/10 text-white text-sm font-medium"
            >
              Vuurwerkwinkel
            </button>
            <button
              onClick={() => openModalScreen('inventory', 'playing')}
              className="w-full py-2.5 rounded-lg bg-[#161B28] hover:bg-[#1E2536] border border-white/10 text-white text-sm font-medium"
            >
              Inventaris
            </button>
            <button
              onClick={() => openModalScreen('display', 'playing')}
              className="w-full py-2.5 rounded-lg bg-[#161B28] hover:bg-[#1E2536] border border-white/10 text-amber-300 text-sm font-medium"
            >
              Vuurwerkshow Regisseur
            </button>
            <button
              onClick={() => openModalScreen('settings', 'playing')}
              className="w-full py-2.5 rounded-lg bg-[#161B28] hover:bg-[#1E2536] border border-white/10 text-white text-sm font-medium"
            >
              Instellingen
            </button>
            <button
              onClick={() => {
                soundEngine.playUiClick();
                setPaused(false);
                setActiveScreen('menu');
              }}
              className="w-full py-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-sm"
            >
              Naar Hoofdmenu
            </button>
          </div>
        </div>
      )}

      {/* DEDICATED 3D FIREWORK VISUAL TEST LAB */}
      {activeScreen === 'test_lab' && (
        <FireworkTestLab
          settings={state.settings}
          onClose={() => setActiveScreen(returnScreen)}
        />
      )}

      {/* MULTIPLAYER LOBBY MODAL */}
      {activeScreen === 'multiplayer' && (
        <MultiplayerLobbyModal
          confirmedPlayerName={state.playerName}
          connectionStatus={mpStatus}
          currentRoom={currentRoom}
          publicRooms={publicRooms}
          localInventoryCount={inventoryCount}
          roomError={roomError}
          onClearError={() => setRoomError(null)}
          onEnterWorld={() => {
            setPaused(false);
            setActiveScreen('playing');
          }}
          onClose={() => setActiveScreen(returnScreen)}
        />
      )}

      {/* FIREWORKS SHOP MODAL */}
      {activeScreen === 'shop' && (
        <ShopModal
          money={state.money}
          infiniteMoney={state.settings.infiniteMoney}
          basket={basket}
          purchaseHistory={state.purchaseHistory}
          initialProductId={shopInitialProduct}
          initialTab={shopInitialTab}
          inMultiplayer={currentRoom !== null}
          playersInShop={playersInShop}
          onAddToBasket={addToBasket}
          onRemoveFromBasket={removeFromBasket}
          onClearBasket={clearBasket}
          onPurchaseBasket={purchaseBasket}
          onBuyInstant={buySingleInstant}
          onPreviewEffect={(pid) => {
            viewportRef.current?.previewProductShot(pid);
            const p = PRODUCT_MAP.get(pid);
            if (p) showToast(`Testschot: ${p.name}`);
          }}
          onShowcaseProduct={(prod) => {
            mpClient.sendShowcase(prod.id, prod.name);
            showToast(`"${prod.name}" getoond aan alle spelers in de kamer!`);
          }}
          onClose={() => setActiveScreen(returnScreen)}
        />
      )}

      {/* INVENTORY MODAL */}
      {activeScreen === 'inventory' && (
        <InventoryModal
          inventory={state.inventory}
          hotbar={state.hotbar}
          equippedTool={equippedTool}
          equippedProductId={equippedProductId}
          onEquipProduct={(pid) => {
            handleEquipProductFromInv(pid);
            setActiveScreen('playing');
          }}
          onEquipLighter={() => {
            setEquippedTool('lighter');
            setEquippedProductId(null);
            setActiveScreen('playing');
          }}
          onUnequip={() => {
            setEquippedTool('none');
            setEquippedProductId(null);
          }}
          onAssignHotbar={assignHotbarSlot}
          onDropItemToWorld={(pid) => {
            handlePlaceFirework({
              uid: `fw-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
              productId: pid,
              x: -24 + (Math.random() - 0.5) * 4,
              y: 0.102,
              z: (Math.random() - 0.5) * 4,
              rotationY: 0,
              state: 'idle',
            });
            showToast('Geplaatst op Afsteekzone Vuurwerkplein!');
          }}
          onClose={() => setActiveScreen(returnScreen)}
        />
      )}

      {/* FIREWORKS DISPLAY MODE */}
      {activeScreen === 'display' && (
        <DisplayModeOverlay
          inventory={state.inventory}
          customShows={state.customShows}
          playbackState={playbackState}
          onStartShow={handleStartShow}
          onStopShow={handleStopShow}
          onSaveShow={saveCustomShow}
          onDeleteShow={deleteCustomShow}
          onExitDisplayMode={() => setActiveScreen(returnScreen)}
        />
      )}

      {/* SETTINGS MODAL */}
      {activeScreen === 'settings' && (
        <SettingsModal
          playerName={state.playerName}
          settings={state.settings}
          onUpdatePlayerName={(name) => {
            const clean = setPlayerName(name);
            if (inRoomRef.current) {
              mpClient.sendPlayerRename(clean);
            }
            showToast(`Spelersnaam gewijzigd naar ${clean}`);
          }}
          onUpdateSettings={updateSettings}
          onResetSave={() => {
            resetSave(true);
            showToast('Spelvoortgang gereset.');
          }}
          onClose={() => setActiveScreen(returnScreen)}
        />
      )}

      {/* CREDITS MODAL */}
      {activeScreen === 'credits' && (
        <CreditsModal onClose={() => setActiveScreen(returnScreen)} />
      )}
    </div>
  );
}
