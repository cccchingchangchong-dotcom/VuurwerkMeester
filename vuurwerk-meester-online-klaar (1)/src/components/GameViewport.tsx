import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { VignetteShader } from 'three/addons/shaders/VignetteShader.js';
import {
  ActiveScreen,
  CustomShow,
  GameSettings,
  PlacedFireworkData,
  PlayerAnimState,
  RemotePlayerState,
  TutorialStep,
} from '../types';
import { PRODUCT_MAP } from '../data/products';
import {
  AABB,
  applyTimeOfDay,
  buildWorld,
  DISPLAY_ZONE_BOUNDS,
  getPlayerZoneName,
  getSurfaceType,
  InteractableTarget,
  SHOP_BOUNDS,
  updateWorldLOD,
  WORLD_BOUNDS,
  WorldRefs,
} from '../engine/worldBuilder';
import { createFireworkModel, createLighterModel } from '../engine/productModels';
import { FireworksEngine } from '../engine/fireworksEngine';
import { RemotePlayerManager } from '../engine/remotePlayers';
import { setTextureMaxAnisotropy } from '../engine/textures';
import { soundEngine } from '../engine/audio';
import { WeatherSystem } from '../engine/weatherSystem';

export interface CrosshairTargetInfo {
  label: string;
  sublabel: string;
  type: 'shop_product' | 'checkout' | 'basket_station' | 'info_board' | 'placed_firework';
  productId?: string;
  uid?: string;
  state?: PlacedFireworkData['state'];
}

export interface GameViewportHandle {
  igniteAllPlaced: () => void;
  startShowPlayback: (show: CustomShow) => void;
  stopShowPlayback: () => void;
  teleportTo: (zone: 'shop' | 'display' | 'street' | 'park') => void;
  teleportToCoords: (x: number, z: number, yaw?: number) => void;
  clearSpentFireworks: () => void;
  previewProductShot: (productId: string) => void;
  syncRemotePlayers: (players: RemotePlayerState[], localId: string) => void;
  upsertRemotePlayer: (player: RemotePlayerState) => void;
  removeRemotePlayer: (playerId: string) => void;
  clearRemotePlayers: () => void;
  playRemoteIgnition: (ev: {
    uid: string;
    productId: string;
    x: number;
    y: number;
    z: number;
    rotationY: number;
    fuseDuration: number;
  }) => void;
  getPlayerPosition: () => { x: number; z: number; yaw: number };
}

interface GameViewportProps {
  activeScreen: ActiveScreen;
  settings: GameSettings;
  equippedTool: 'none' | 'lighter' | 'product';
  equippedProductId: string | null;
  placedFireworks: PlacedFireworkData[];
  tutorialStep: TutorialStep;
  isMultiplayer?: boolean;
  viewportRef: React.MutableRefObject<GameViewportHandle | null>;
  onTargetChange: (target: CrosshairTargetInfo | null) => void;
  onZoneChange: (zone: string) => void;
  onPointerLockChange: (locked: boolean) => void;
  onInspectProduct: (productId: string) => void;
  onOpenCheckout: () => void;
  onOpenCatalog: () => void;
  onOpenInventory: () => void;
  onToggleChat?: () => void;
  onPauseRequest: () => void;
  onSelectSlotKey: (keyIndex: number) => void;
  onPlaceFirework: (data: PlacedFireworkData) => void;
  onUpdatePlacedFirework: (uid: string, patch: Partial<PlacedFireworkData>) => void;
  onRemovePlacedFirework: (uid: string) => void;
  onPickupPlacedToInventory: (uid: string, productId: string) => void;
  onIgniteFireworkRequest?: (uid: string, fuseDuration: number) => void;
  onIgniteAllRequest?: () => void;
  onPlayerNetworkSync?: (data: {
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
  }) => void;
  onTutorialAdvance: (step: TutorialStep) => void;
  onShotFired: () => void;
  onToast: (msg: string) => void;
  onShowPlaybackProgress: (elapsed: number, duration: number, playing: boolean) => void;
}

function detectSoftwareGl(): boolean {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2');
    if (!gl) return true;
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
    const gpu = String(gl.getParameter(param));
    gl.getExtension('WEBGL_lose_context')?.loseContext();
    return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
  } catch {
    return false;
  }
}

function collidesAABB(x: number, z: number, radius: number, box: AABB): boolean {
  const closestX = Math.max(box.minX, Math.min(x, box.maxX));
  const closestZ = Math.max(box.minZ, Math.min(z, box.maxZ));
  const dx = x - closestX;
  const dz = z - closestZ;
  return dx * dx + dz * dz < radius * radius;
}

// Pre-allocated scratch math helpers (Zero GC in render loop)
const _forward = new THREE.Vector3();
const _right = new THREE.Vector3();
const _rayOrigin = new THREE.Vector2(0, 0);
const _lookTarget = new THREE.Vector3();

export const GameViewport: React.FC<GameViewportProps> = ({
  activeScreen,
  settings,
  equippedTool,
  equippedProductId,
  placedFireworks,
  tutorialStep,
  isMultiplayer = false,
  viewportRef,
  onTargetChange,
  onZoneChange,
  onPointerLockChange,
  onInspectProduct,
  onOpenCheckout,
  onOpenCatalog,
  onOpenInventory,
  onToggleChat,
  onPauseRequest,
  onSelectSlotKey,
  onPlaceFirework,
  onUpdatePlacedFirework,
  onRemovePlacedFirework,
  onPickupPlacedToInventory,
  onIgniteFireworkRequest,
  onIgniteAllRequest,
  onPlayerNetworkSync,
  onTutorialAdvance,
  onShotFired,
  onToast,
  onShowPlaybackProgress,
}) => {
  const mountRef = useRef<HTMLDivElement | null>(null);

  // Mutable refs so Three.js loop always reads fresh React state without recreating WebGLRenderer
  const propsRef = useRef({
    activeScreen,
    settings,
    equippedTool,
    equippedProductId,
    placedFireworks,
    tutorialStep,
    isMultiplayer,
    onTargetChange,
    onZoneChange,
    onPointerLockChange,
    onInspectProduct,
    onOpenCheckout,
    onOpenCatalog,
    onOpenInventory,
    onToggleChat,
    onPauseRequest,
    onSelectSlotKey,
    onPlaceFirework,
    onUpdatePlacedFirework,
    onRemovePlacedFirework,
    onPickupPlacedToInventory,
    onIgniteFireworkRequest,
    onIgniteAllRequest,
    onPlayerNetworkSync,
    onTutorialAdvance,
    onShotFired,
    onToast,
    onShowPlaybackProgress,
  });

  propsRef.current = {
    activeScreen,
    settings,
    equippedTool,
    equippedProductId,
    placedFireworks,
    tutorialStep,
    isMultiplayer,
    onTargetChange,
    onZoneChange,
    onPointerLockChange,
    onInspectProduct,
    onOpenCheckout,
    onOpenCatalog,
    onOpenInventory,
    onToggleChat,
    onPauseRequest,
    onSelectSlotKey,
    onPlaceFirework,
    onUpdatePlacedFirework,
    onRemovePlacedFirework,
    onPickupPlacedToInventory,
    onIgniteFireworkRequest,
    onIgniteAllRequest,
    onPlayerNetworkSync,
    onTutorialAdvance,
    onShotFired,
    onToast,
    onShowPlaybackProgress,
  };

  // Placed meshes map stored in ref so we sync React's placedFireworks array cleanly
  const placedMeshesRef = useRef<
    Map<string, { group: THREE.Group; proxy: THREE.Mesh; data: PlacedFireworkData }>
  >(new Map());
  const sceneRef = useRef<THREE.Scene | null>(null);
  const worldRef = useRef<WorldRefs | null>(null);
  const engineRef = useRef<FireworksEngine | null>(null);
  const remotePlayersRef = useRef<RemotePlayerManager | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);
  const bloomPassRef = useRef<UnrealBloomPass | null>(null);
  const isSoftwareGlRef = useRef<boolean>(false);

  // Viewmodel hands & held item refs
  const viewmodelRef = useRef<THREE.Group | null>(null);
  const heldItemSlotRef = useRef<THREE.Group | null>(null);
  const lighterGroupRef = useRef<THREE.Group | null>(null);
  const lighterFlameRef = useRef<THREE.Mesh | null>(null);

  // Placement ghost refs
  const ghostGroupRef = useRef<THREE.Group | null>(null);
  const placementRotYRef = useRef<number>(0);

  // Player physics state
  const playerRef = useRef({
    pos: new THREE.Vector3(2.5, 1.72, 2.0), // Facing Oranjestraat & Shop entrance
    velY: 0,
    yaw: -Math.PI / 2, // Look East towards Vuurwerkpaleis entrance!
    pitch: -0.04,
    grounded: true,
    bobPhase: 0,
    footstepAccum: 0,
    lastZone: '',
  });

  // Show playback state
  const showPlaybackRef = useRef<{
    playing: boolean;
    show: CustomShow | null;
    elapsed: number;
    duration: number;
    firedCueIds: Set<string>;
  }>({
    playing: false,
    show: null,
    elapsed: 0,
    duration: 0,
    firedCueIds: new Set(),
  });

  // Sync Settings -> Renderer, Shadows, Bloom & Audio & FireworksEngine
  useEffect(() => {
    soundEngine.setVolumes(settings.soundVolume, settings.musicVolume, settings.muted);
    if (engineRef.current) {
      engineRef.current.setQuality(settings.graphicsQuality, settings.performanceMode);
    }
    const renderer = rendererRef.current;
    const isSoft = isSoftwareGlRef.current;
    if (renderer) {
      const highRes =
        settings.graphicsQuality === 'ultra' || settings.graphicsQuality === 'cinematic';
      const maxDpr = settings.graphicsQuality === 'low' ? 0.9 : highRes ? 1.5 : 1.2;
      const baseRatio = isSoft ? 1 : Math.min(window.devicePixelRatio || 1, maxDpr);
      renderer.setPixelRatio(baseRatio * settings.resolutionScale);
      renderer.shadowMap.enabled =
        !isSoft && !settings.performanceMode && settings.graphicsQuality !== 'low';
      if (composerRef.current) {
        composerRef.current.setPixelRatio(baseRatio * settings.resolutionScale);
      }
    }
    if (bloomPassRef.current) {
      const q = settings.graphicsQuality;
      bloomPassRef.current.strength = q === 'cinematic' ? 0.65 : q === 'ultra' ? 0.54 : 0.4;
      bloomPassRef.current.radius = q === 'cinematic' ? 0.58 : q === 'ultra' ? 0.5 : 0.42;
      bloomPassRef.current.threshold = q === 'cinematic' ? 0.68 : q === 'ultra' ? 0.74 : 0.8;
    }
  }, [settings]);

  // Sync Equipped Viewmodel Item when equippedTool / equippedProductId changes
  useEffect(() => {
    const slot = heldItemSlotRef.current;
    const lighter = lighterGroupRef.current;
    if (!slot || !lighter) return;

    const disposeModelAndClonedMats = (obj: THREE.Object3D) => {
      const baseDispose = obj.userData.dispose as (() => void) | undefined;
      if (obj.userData.clonedMats) {
        for (const m of obj.userData.clonedMats as THREE.Material[]) {
          m.dispose();
        }
      }
      baseDispose?.();
    };

    while (slot.children.length > 0) {
      const old = slot.children[0];
      slot.remove(old);
      disposeModelAndClonedMats(old);
    }
    if (ghostGroupRef.current) {
      while (ghostGroupRef.current.children.length > 0) {
        const old = ghostGroupRef.current.children[0];
        ghostGroupRef.current.remove(old);
        disposeModelAndClonedMats(old);
      }
      ghostGroupRef.current.visible = false;
    }

    if (equippedTool === 'lighter') {
      lighter.visible = true;
    } else {
      lighter.visible = false;
      if (equippedTool === 'product' && equippedProductId) {
        const prod = PRODUCT_MAP.get(equippedProductId);
        if (prod) {
          const handModel = createFireworkModel(prod);
          handModel.scale.setScalar(0.58);
          handModel.position.set(0.24, -0.26, -0.45);
          handModel.rotation.y = -0.35;
          slot.add(handModel);

          if (ghostGroupRef.current) {
            const ghostModel = createFireworkModel(prod);
            const clonedMats: THREE.Material[] = [];
            const makeGhostMat = (src: THREE.Material) => {
              const mat = src.clone() as THREE.MeshStandardMaterial;
              mat.transparent = true;
              mat.opacity = 0.52;
              mat.depthWrite = false;
              mat.polygonOffset = true;
              mat.polygonOffsetFactor = -2;
              mat.polygonOffsetUnits = -2;
              if (mat.emissive) {
                mat.emissive = new THREE.Color(0x22c55e);
                mat.emissiveIntensity = 0.45;
              }
              clonedMats.push(mat);
              return mat;
            };
            ghostModel.traverse((child) => {
              if ((child as THREE.Mesh).isMesh) {
                const m = child as THREE.Mesh;
                m.material = Array.isArray(m.material)
                  ? m.material.map(makeGhostMat)
                  : makeGhostMat(m.material);
              }
            });
            ghostModel.userData.clonedMats = clonedMats;
            ghostGroupRef.current.add(ghostModel);
          }
        }
      }
    }
  }, [equippedTool, equippedProductId]);

  // Sync Placed Fireworks in 3D World
  useEffect(() => {
    const scene = sceneRef.current;
    const world = worldRef.current;
    if (!scene || !world) return;

    const map = placedMeshesRef.current;
    const activeIds = new Set(placedFireworks.map((f) => f.uid));

    const applySpentDarken = (group: THREE.Group) => {
      if (group.userData.darkened) return;
      group.userData.darkened = true;
      const clonedDarkMats: THREE.Material[] = [];
      const darkenMat = (m: THREE.Material) => {
        if (m instanceof THREE.MeshStandardMaterial) {
          const dark = m.clone();
          dark.color.multiplyScalar(0.38);
          clonedDarkMats.push(dark);
          return dark;
        }
        return m;
      };
      group.traverse((c) => {
        if ((c as THREE.Mesh).isMesh) {
          const mesh = c as THREE.Mesh;
          mesh.material = Array.isArray(mesh.material)
            ? mesh.material.map(darkenMat)
            : darkenMat(mesh.material);
        }
      });
      group.userData.clonedDarkMats = clonedDarkMats;
    };

    // Remove deleted
    for (const [uid, entry] of map.entries()) {
      if (!activeIds.has(uid)) {
        scene.remove(entry.group);
        scene.remove(entry.proxy);
        if (entry.group.userData.clonedDarkMats) {
          for (const m of entry.group.userData.clonedDarkMats as THREE.Material[]) {
            m.dispose();
          }
        }
        (entry.group.userData.dispose as (() => void) | undefined)?.();
        entry.proxy.geometry.dispose();
        (entry.proxy.material as THREE.Material).dispose();
        const idx = world.interactables.findIndex((t) => t.uid === uid);
        if (idx >= 0) world.interactables.splice(idx, 1);
        map.delete(uid);
      }
    }

    // Add or update
    for (const fw of placedFireworks) {
      const existing = map.get(fw.uid);
      if (existing) {
        existing.group.position.set(fw.x, fw.y, fw.z);
        existing.group.rotation.y = fw.rotationY;
        existing.proxy.position.set(fw.x, fw.y + 0.35, fw.z);
        if (existing.data.state !== fw.state) {
          if (fw.state === 'spent') {
            applySpentDarken(existing.group);
          }
          const target = world.interactables.find((t) => t.uid === fw.uid);
          if (target) {
            target.sublabel =
              fw.state === 'idle'
                ? '[E / Klik] Lont aansteken · [F] Oppakken · [R] Draaien'
                : fw.state === 'spent'
                ? 'Afgestoken · [F] Opruimen'
                : 'Lont brandt / Actief!';
          }
        }
        existing.data = fw;
      } else {
        const prod = PRODUCT_MAP.get(fw.productId);
        if (!prod) continue;
        const group = createFireworkModel(prod);
        group.position.set(fw.x, fw.y, fw.z);
        group.rotation.y = fw.rotationY;
        if (fw.state === 'spent') {
          applySpentDarken(group);
        }
        scene.add(group);

        const proxy = new THREE.Mesh(
          new THREE.BoxGeometry(0.7, 0.75, 0.7),
          new THREE.MeshBasicMaterial({ visible: false }),
        );
        proxy.position.set(fw.x, fw.y + 0.35, fw.z);
        proxy.layers.enable(1);
        scene.add(proxy);

        world.interactables.push({
          mesh: proxy,
          type: 'placed_firework',
          productId: fw.productId,
          uid: fw.uid,
          label: prod.name,
          sublabel:
            fw.state === 'idle'
              ? '[E / Klik] Lont aansteken · [F] Oppakken · [R] Draaien'
              : fw.state === 'spent'
              ? 'Afgestoken · [F] Opruimen'
              : 'Lont brandt / Actief!',
        });

        map.set(fw.uid, { group, proxy, data: fw });
      }
    }
  }, [placedFireworks]);

  // Expose imperative actions to parent App
  useEffect(() => {
    viewportRef.current = {
      igniteAllPlaced: () => {
        if (propsRef.current.isMultiplayer && propsRef.current.onIgniteAllRequest) {
          propsRef.current.onIgniteAllRequest();
          return;
        }
        const engine = engineRef.current;
        const cam = cameraRef.current;
        if (!engine || !cam) return;
        let count = 0;
        for (const [uid, entry] of placedMeshesRef.current.entries()) {
          if (entry.data.state === 'idle') {
            const prod = PRODUCT_MAP.get(entry.data.productId);
            if (!prod) continue;
            count++;
            propsRef.current.onUpdatePlacedFirework(uid, { state: 'fusing' });
            engine.igniteFirework(
              uid,
              prod,
              entry.group.position,
              entry.data.rotationY,
              entry.group,
              cam,
              2.0 + count * 0.2,
              0,
              () => propsRef.current.onUpdatePlacedFirework(uid, { state: 'spent' }),
            );
          }
        }
        if (count > 0) {
          propsRef.current.onToast(`${count} vuurwerk(en) aangestoken!`);
          if (propsRef.current.tutorialStep === 'ignite_fuse') {
            propsRef.current.onTutorialAdvance('complete');
          }
        } else {
          propsRef.current.onToast('Plaats eerst vuurwerk in de Afsteekzone.');
        }
      },
      startShowPlayback: (show: CustomShow) => {
        const pb = showPlaybackRef.current;
        const maxT = show.cues.reduce((mx, c) => {
          const prod = PRODUCT_MAP.get(c.productId);
          return Math.max(mx, c.triggerTime + (prod ? prod.durationSec : 4));
        }, 5);
        pb.show = show;
        pb.elapsed = 0;
        pb.duration = maxT;
        pb.firedCueIds = new Set();
        pb.playing = true;
        propsRef.current.onShowPlaybackProgress(0, maxT, true);
      },
      stopShowPlayback: () => {
        const pb = showPlaybackRef.current;
        pb.playing = false;
        pb.elapsed = 0;
        pb.firedCueIds.clear();
        engineRef.current?.clearAllActive();
        propsRef.current.onShowPlaybackProgress(0, pb.duration || 10, false);
      },
      teleportTo: (zone) => {
        const p = playerRef.current;
        if (zone === 'shop') {
          p.pos.set(14.5, 1.72, 0);
          p.yaw = -Math.PI / 2;
          p.pitch = -0.03;
          if (propsRef.current.tutorialStep === 'welcome' || propsRef.current.tutorialStep === 'enter_shop') {
            propsRef.current.onTutorialAdvance('buy_firework');
          }
        } else if (zone === 'display') {
          p.pos.set(-15.5, 1.72, 0);
          p.yaw = Math.PI / 2;
          p.pitch = 0.08;
        } else if (zone === 'park') {
          p.pos.set(-34, 1.72, 98);
          p.yaw = Math.PI * 0.85;
          p.pitch = 0.02;
        } else {
          p.pos.set(0, 1.72, 12);
          p.yaw = 0;
          p.pitch = 0.02;
        }
        p.velY = 0;
      },
      teleportToCoords: (x, z, yaw = 0) => {
        const p = playerRef.current;
        p.pos.set(
          THREE.MathUtils.clamp(x, WORLD_BOUNDS.minX + 2, WORLD_BOUNDS.maxX - 2),
          1.72,
          THREE.MathUtils.clamp(z, WORLD_BOUNDS.minZ + 2, WORLD_BOUNDS.maxZ - 2),
        );
        p.yaw = yaw;
        p.pitch = 0.02;
        p.velY = 0;
        const zone = getPlayerZoneName(p.pos.x, p.pos.z);
        p.lastZone = zone;
        propsRef.current.onZoneChange(zone);
      },
      clearSpentFireworks: () => {
        const spent = propsRef.current.placedFireworks.filter((f) => f.state === 'spent');
        spent.forEach((s) => propsRef.current.onRemovePlacedFirework(s.uid));
        propsRef.current.onToast(`${spent.length} afgestoken resten opgeruimd.`);
      },
      previewProductShot: (productId: string) => {
        const prod = PRODUCT_MAP.get(productId);
        const engine = engineRef.current;
        const cam = cameraRef.current;
        if (!prod || !engine || !cam) return;
        engine.igniteFirework(
          `preview-${Date.now()}`,
          prod,
          new THREE.Vector3(-30, 0.1, 0),
          0,
          null,
          cam,
          0.1,
        );
      },
      syncRemotePlayers: (players, localId) => {
        remotePlayersRef.current?.syncPlayers(players, localId);
      },
      upsertRemotePlayer: (player) => {
        remotePlayersRef.current?.upsertPlayer(player);
      },
      removeRemotePlayer: (playerId) => {
        remotePlayersRef.current?.removePlayer(playerId);
      },
      clearRemotePlayers: () => {
        remotePlayersRef.current?.clearAll();
      },
      playRemoteIgnition: (ev) => {
        const engine = engineRef.current;
        const cam = cameraRef.current;
        const prod = PRODUCT_MAP.get(ev.productId);
        if (!engine || !cam || !prod) return;
        const entry = placedMeshesRef.current.get(ev.uid);
        if (entry) {
          entry.data.state = 'fusing';
        }
        const origin = entry ? entry.group.position : new THREE.Vector3(ev.x, ev.y, ev.z);
        engine.igniteFirework(
          ev.uid,
          prod,
          origin,
          ev.rotationY,
          entry?.group || null,
          cam,
          ev.fuseDuration,
          0,
          () => {
            propsRef.current.onUpdatePlacedFirework(ev.uid, { state: 'spent' });
          },
        );
      },
      getPlayerPosition: () => ({
        x: playerRef.current.pos.x,
        z: playerRef.current.pos.z,
        yaw: playerRef.current.yaw,
      }),
    };
  }, [viewportRef]);

  // Main Three.js Scene & Game Loop Initialization
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareGl();
    isSoftwareGlRef.current = isSoftwareGl;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x0d1323, 0.0024);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(
      72,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.18,
      400,
    );
    camera.rotation.order = 'YXZ';
    scene.add(camera);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl && !propsRef.current.settings.performanceMode && propsRef.current.settings.graphicsQuality !== 'low',
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.18;
    renderer.setSize(container.clientWidth, container.clientHeight);
    const initCfg = propsRef.current.settings;
    const initHighRes =
      initCfg.graphicsQuality === 'ultra' || initCfg.graphicsQuality === 'cinematic';
    const initMaxDpr = initCfg.graphicsQuality === 'low' ? 0.9 : initHighRes ? 1.5 : 1.2;
    const initPixelRatio =
      (isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, initMaxDpr)) *
      initCfg.resolutionScale;
    renderer.setPixelRatio(initPixelRatio);
    renderer.shadowMap.enabled =
      !isSoftwareGl && !initCfg.performanceMode && initCfg.graphicsQuality !== 'low';
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    setTextureMaxAnisotropy(renderer.capabilities.getMaxAnisotropy());

    // Studio Environment Reflection for metallic finishes & glass
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    const roomEnvTex = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environment = roomEnvTex;
    pmremGenerator.dispose();

    // Real-Time CubeCamera Reflections for wet roads, canals, shop windows & car clearcoats
    const dummyCanvas = document.createElement('canvas');
    dummyCanvas.width = 2;
    dummyCanvas.height = 2;
    const dctx = dummyCanvas.getContext('2d');
    if (dctx) {
      dctx.fillStyle = '#0d1323';
      dctx.fillRect(0, 0, 2, 2);
    }
    const dummyCubeTex = new THREE.CubeTexture([
      dummyCanvas,
      dummyCanvas,
      dummyCanvas,
      dummyCanvas,
      dummyCanvas,
      dummyCanvas,
    ]);
    dummyCubeTex.needsUpdate = true;

    const skipHeavyPipelines = isSoftwareGl || initCfg.graphicsQuality === 'low';

    let cubeRT: THREE.WebGLCubeRenderTarget | null = null;
    let cubeCamera: THREE.CubeCamera | null = null;
    if (!skipHeavyPipelines) {
      cubeRT = new THREE.WebGLCubeRenderTarget(256, {
        generateMipmaps: true,
        minFilter: THREE.LinearMipmapLinearFilter,
      });
      cubeCamera = new THREE.CubeCamera(0.5, 450, cubeRT);
      scene.add(cubeCamera);
    }

    container.appendChild(renderer.domElement);

    // Post-Processing Composer (Bloom + subtle color grading/vignette) for HIGH / ULTRA / CINEMATIC GPU tiers
    let composer: EffectComposer | null = null;
    let bloomPass: UnrealBloomPass | null = null;
    if (!skipHeavyPipelines) {
      composer = new EffectComposer(renderer);
      composer.setPixelRatio(initPixelRatio);
      composer.setSize(container.clientWidth, container.clientHeight);
      const renderPass = new RenderPass(scene, camera);
      composer.addPass(renderPass);

      const q = initCfg.graphicsQuality;
      bloomPass = new UnrealBloomPass(
        new THREE.Vector2(container.clientWidth, container.clientHeight),
        q === 'cinematic' ? 0.65 : q === 'ultra' ? 0.54 : 0.4,
        q === 'cinematic' ? 0.58 : q === 'ultra' ? 0.5 : 0.42,
        q === 'cinematic' ? 0.68 : q === 'ultra' ? 0.74 : 0.8,
      );
      composer.addPass(bloomPass);

      const vignettePass = new ShaderPass(VignetteShader);
      vignettePass.uniforms['offset'].value = 0.96;
      vignettePass.uniforms['darkness'].value = 0.85;
      composer.addPass(vignettePass);

      const outputPass = new OutputPass();
      composer.addPass(outputPass);
    }
    composerRef.current = composer;
    bloomPassRef.current = bloomPass;

    // Build Dutch Neighborhood & Fireworks Supermarket (Nieuw-Oranjestad 280x280m)
    const world = buildWorld(scene, isSoftwareGl);
    worldRef.current = world;

    // Weather System (Rain, Mist, Wind, Dynamic Wetness)
    const weatherSys = new WeatherSystem(scene);

    // Remote Multiplayer Avatars Manager
    const remoteMgr = new RemotePlayerManager(scene);
    remotePlayersRef.current = remoteMgr;

    // Build Fireworks Particle Engine
    const fwEngine = new FireworksEngine(scene);
    fwEngine.setQuality(
      propsRef.current.settings.graphicsQuality,
      propsRef.current.settings.performanceMode,
    );
    fwEngine.onShotCounter = () => propsRef.current.onShotFired();
    engineRef.current = fwEngine;

    // Build First-Person Viewmodel Hands attached to Camera
    const vmGroup = new THREE.Group();
    const sleeveMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.75 });
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xd9a88a, roughness: 0.65 });

    const rightArm = new THREE.Group();
    const rSleeveGeo = new THREE.BoxGeometry(0.085, 0.085, 0.32);
    const rSleeve = new THREE.Mesh(rSleeveGeo, sleeveMat);
    rSleeve.position.set(0.28, -0.32, -0.34);
    rSleeve.rotation.set(0.18, -0.18, 0);
    const rHandGeo = new THREE.BoxGeometry(0.068, 0.068, 0.1);
    const rHand = new THREE.Mesh(rHandGeo, skinMat);
    rHand.position.set(0.24, -0.27, -0.5);
    rightArm.add(rSleeve, rHand);
    vmGroup.add(rightArm);

    const { group: lighterGroup, flame: lighterFlame } = createLighterModel();
    lighterGroup.position.set(0.22, -0.25, -0.52);
    lighterGroup.rotation.set(0.12, -0.35, 0);
    lighterGroup.visible = false;
    vmGroup.add(lighterGroup);
    lighterGroupRef.current = lighterGroup;
    lighterFlameRef.current = lighterFlame;

    const heldSlot = new THREE.Group();
    vmGroup.add(heldSlot);
    heldItemSlotRef.current = heldSlot;

    camera.add(vmGroup);
    viewmodelRef.current = vmGroup;

    // Build Placement Ghost Group in World
    const ghostGroup = new THREE.Group();
    ghostGroup.visible = false;
    scene.add(ghostGroup);
    ghostGroupRef.current = ghostGroup;

    // WebGL Context Loss Safety
    const onContextLost = (e: Event) => {
      e.preventDefault();
    };
    renderer.domElement.addEventListener('webglcontextlost', onContextLost);

    if (!isSoftwareGl) {
      renderer.compile(scene, camera);
    }

    // Raycaster & Input State
    const raycaster = new THREE.Raycaster();
    raycaster.layers.set(1);
    raycaster.far = 6.5;

    const groundRaycaster = new THREE.Raycaster();
    groundRaycaster.far = 6.0;
    const groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.07);
    const groundHitPoint = new THREE.Vector3();

    const keys: Record<string, boolean> = {};
    let isDraggingLook = false;
    let lastMouseX = 0;
    let lastMouseY = 0;
    let lastTargetUidOrLabel = '';
    let raycastAccum = 0;
    let totalElapsed = 0;

    // Helper: Get current interactable under crosshair
    const getHoveredTarget = (): InteractableTarget | null => {
      raycaster.setFromCamera(_rayOrigin, camera);
      const meshes = world.interactables.map((t) => t.mesh);
      const hits = raycaster.intersectObjects(meshes, false);
      if (hits.length === 0) return null;
      const hitMesh = hits[0].object;
      return world.interactables.find((t) => t.mesh === hitMesh) || null;
    };

    const getPlacementSpot = (): { valid: boolean; inDisplayZone: boolean; pos: THREE.Vector3 } | null => {
      groundRaycaster.setFromCamera(_rayOrigin, camera);
      const hit = groundRaycaster.ray.intersectPlane(groundPlane, groundHitPoint);
      if (!hit) return null;
      const dist = hit.distanceTo(playerRef.current.pos);
      if (dist > 5.0 || dist < 0.7) return null;

      const insideShop =
        hit.x >= SHOP_BOUNDS.minX &&
        hit.x <= SHOP_BOUNDS.maxX &&
        hit.z >= SHOP_BOUNDS.minZ &&
        hit.z <= SHOP_BOUNDS.maxZ;
      const inDisplay =
        hit.x >= DISPLAY_ZONE_BOUNDS.minX &&
        hit.x <= DISPLAY_ZONE_BOUNDS.maxX &&
        hit.z >= DISPLAY_ZONE_BOUNDS.minZ &&
        hit.z <= DISPLAY_ZONE_BOUNDS.maxZ;

      const yOffset = inDisplay || Math.abs(hit.x) <= 9 || Math.abs(hit.z) <= 9 ? 0.102 : 0.058;
      return {
        valid: !insideShop,
        inDisplayZone: inDisplay,
        pos: new THREE.Vector3(hit.x, yOffset, hit.z),
      };
    };

    let netSyncAccum = 0;
    let ambienceAccum = 0;
    let frameCounter = 0;

    const tryIgniteTarget = (target: InteractableTarget | null) => {
      if (!target || target.type !== 'placed_firework' || !target.uid) return false;
      const entry = placedMeshesRef.current.get(target.uid);
      if (!entry || entry.data.state !== 'idle') return false;
      const prod = PRODUCT_MAP.get(entry.data.productId);
      if (!prod) return false;

      soundEngine.playLighterFlick();

      if (propsRef.current.isMultiplayer && propsRef.current.onIgniteFireworkRequest) {
        propsRef.current.onIgniteFireworkRequest(target.uid, 2.2);
        if (propsRef.current.tutorialStep === 'ignite_fuse') {
          propsRef.current.onTutorialAdvance('complete');
        }
        propsRef.current.onToast(`${prod.name} aangestoken!`);
        return true;
      }

      propsRef.current.onUpdatePlacedFirework(target.uid, { state: 'fusing' });

      // Update sublabel immediately
      target.sublabel = 'Lont brandt! Neem afstand!';
      propsRef.current.onTargetChange({
        label: prod.name,
        sublabel: 'Lont brandt! Neem afstand!',
        type: 'placed_firework',
        productId: prod.id,
        uid: target.uid,
        state: 'fusing',
      });

      fwEngine.igniteFirework(
        target.uid,
        prod,
        entry.group.position,
        entry.data.rotationY,
        entry.group,
        camera,
        2.2,
        0,
        () => {
          propsRef.current.onUpdatePlacedFirework(target.uid!, { state: 'spent' });
        },
      );

      if (propsRef.current.tutorialStep === 'ignite_fuse') {
        propsRef.current.onTutorialAdvance('complete');
      }
      propsRef.current.onToast(`${prod.name} aangestoken! Neem afstand!`);
      return true;
    };

    const tryPlaceHeldProduct = () => {
      const { equippedTool: tool, equippedProductId: pid } = propsRef.current;
      if (tool !== 'product' || !pid) return false;
      const spot = getPlacementSpot();
      if (!spot) {
        propsRef.current.onToast('Kijk naar de grond om vuurwerk te plaatsen.');
        return false;
      }
      if (!spot.valid) {
        propsRef.current.onToast('Je mag geen vuurwerk binnen in de winkel plaatsen! Loop naar de Afsteekzone.');
        return false;
      }
      const prod = PRODUCT_MAP.get(pid);
      if (!prod) return false;

      soundEngine.playPickup();
      propsRef.current.onPlaceFirework({
        uid: `fw-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        productId: pid,
        x: spot.pos.x,
        y: spot.pos.y,
        z: spot.pos.z,
        rotationY: placementRotYRef.current,
        state: 'idle',
      });

      if (
        propsRef.current.tutorialStep === 'place_firework' ||
        propsRef.current.tutorialStep === 'equip_item'
      ) {
        propsRef.current.onTutorialAdvance('equip_lighter');
      }
      return true;
    };

    const handleInteract = () => {
      if (propsRef.current.activeScreen !== 'playing') return;
      soundEngine.unlock();

      const target = getHoveredTarget();
      if (!target) {
        // If holding lighter with no target, still flick lighter!
        if (propsRef.current.equippedTool === 'lighter') {
          soundEngine.playLighterFlick();
        }
        return;
      }

      if (target.type === 'shop_product' && target.productId) {
        document.exitPointerLock?.();
        soundEngine.playUiClick();
        propsRef.current.onInspectProduct(target.productId);
      } else if (target.type === 'checkout') {
        document.exitPointerLock?.();
        soundEngine.playUiClick();
        propsRef.current.onOpenCheckout();
      } else if (target.type === 'basket_station') {
        document.exitPointerLock?.();
        soundEngine.playUiClick();
        propsRef.current.onOpenCatalog();
      } else if (target.type === 'placed_firework') {
        if (propsRef.current.equippedTool === 'lighter') {
          tryIgniteTarget(target);
        } else {
          propsRef.current.onToast('Selecteer eerst de Virtuele Aansteker [1] om het lont aan te steken!');
        }
      }
    };

    const onKeyDown = (e: KeyboardEvent) => {
      // Allow ESC anywhere
      if (e.code === 'Escape') {
        if (propsRef.current.activeScreen === 'playing') {
          document.exitPointerLock?.();
          propsRef.current.onPauseRequest();
        }
        return;
      }

      if (propsRef.current.activeScreen !== 'playing') return;
      // Ignore hotkeys when typing in an input
      if (document.activeElement && ['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) return;

      keys[e.code] = true;

      if (e.code === 'KeyE') {
        handleInteract();
      } else if (e.code === 'KeyF') {
        soundEngine.unlock();
        const target = getHoveredTarget();
        if (target && target.type === 'placed_firework' && target.uid && target.productId) {
          const entry = placedMeshesRef.current.get(target.uid);
          if (entry && entry.data.state === 'idle') {
            soundEngine.playPickup();
            propsRef.current.onPickupPlacedToInventory(target.uid, target.productId);
            propsRef.current.onToast(`${target.label} opgepakt.`);
          } else if (entry && entry.data.state === 'spent') {
            soundEngine.playPickup();
            propsRef.current.onRemovePlacedFirework(target.uid);
            propsRef.current.onToast('Afgestoken doos opgeruimd.');
          }
        } else if (propsRef.current.equippedTool === 'product') {
          tryPlaceHeldProduct();
        }
      } else if (e.code === 'KeyR') {
        const target = getHoveredTarget();
        if (target && target.type === 'placed_firework' && target.uid) {
          const entry = placedMeshesRef.current.get(target.uid);
          if (entry && entry.data.state === 'idle') {
            const nextRot = entry.data.rotationY + Math.PI / 4;
            propsRef.current.onUpdatePlacedFirework(target.uid, { rotationY: nextRot });
            soundEngine.playUiClick();
          }
        } else {
          placementRotYRef.current += Math.PI / 4;
        }
      } else if (e.code === 'KeyI') {
        document.exitPointerLock?.();
        propsRef.current.onOpenInventory();
      } else if (e.code === 'KeyT' && propsRef.current.isMultiplayer) {
        e.preventDefault();
        document.exitPointerLock?.();
        propsRef.current.onToggleChat?.();
      } else if (e.code.startsWith('Digit')) {
        const num = Number(e.code.replace('Digit', ''));
        if (num >= 1 && num <= 7) {
          propsRef.current.onSelectSlotKey(num);
        }
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keys[e.code] = false;
    };

    const onMouseDown = (e: MouseEvent) => {
      if (propsRef.current.activeScreen !== 'playing') return;
      if (e.target !== renderer.domElement) return;
      soundEngine.unlock();

      if (document.pointerLockElement === renderer.domElement) {
        if (e.button === 0) {
          const target = getHoveredTarget();
          if (propsRef.current.equippedTool === 'lighter' && target?.type === 'placed_firework') {
            tryIgniteTarget(target);
          } else if (propsRef.current.equippedTool === 'product') {
            tryPlaceHeldProduct();
          } else if (target) {
            handleInteract();
          } else if (propsRef.current.equippedTool === 'lighter') {
            soundEngine.playLighterFlick();
          }
        }
      } else {
        // Request pointer lock on click, and also allow drag-look fallback
        isDraggingLook = true;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        renderer.domElement.requestPointerLock?.();
      }
    };

    const onMouseUp = () => {
      isDraggingLook = false;
    };

    const onMouseMove = (e: MouseEvent) => {
      if (propsRef.current.activeScreen !== 'playing') return;
      const sens = 0.0022 * propsRef.current.settings.mouseSensitivity;

      if (document.pointerLockElement === renderer.domElement) {
        playerRef.current.yaw -= e.movementX * sens;
        playerRef.current.pitch = THREE.MathUtils.clamp(
          playerRef.current.pitch - e.movementY * sens,
          -1.42,
          1.45,
        );
      } else if (isDraggingLook) {
        const dx = e.clientX - lastMouseX;
        const dy = e.clientY - lastMouseY;
        lastMouseX = e.clientX;
        lastMouseY = e.clientY;
        playerRef.current.yaw -= dx * sens * 1.4;
        playerRef.current.pitch = THREE.MathUtils.clamp(
          playerRef.current.pitch - dy * sens * 1.4,
          -1.42,
          1.45,
        );
      }
    };

    const onWheel = (e: WheelEvent) => {
      if (propsRef.current.activeScreen !== 'playing') return;
      if (propsRef.current.equippedTool === 'product') {
        placementRotYRef.current += Math.sign(e.deltaY) * 0.25;
      }
    };

    const onPointerLockEvent = () => {
      propsRef.current.onPointerLockChange(document.pointerLockElement === renderer.domElement);
    };

    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = Math.max(1, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      if (composer) {
        composer.setSize(w, h);
      }
      if (bloomPass) {
        bloomPass.resolution.set(w, h);
      }
    };

    const onWindowBlur = () => {
      for (const k of Object.keys(keys)) keys[k] = false;
      isDraggingLook = false;
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('blur', onWindowBlur);
    document.addEventListener('pointerlockchange', onPointerLockEvent);
    window.addEventListener('resize', onResize);

    // Software WebGL Pacing Helper (per skill guidelines)
    let frameId = 0;
    let disposed = false;
    const clock = new THREE.Clock();

    function afterDraw(cb: () => void) {
      const gl = renderer.getContext() as WebGL2RenderingContext;
      const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
      gl.flush();
      const poll = () => {
        if (disposed) return;
        const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
        if (state === gl.UNSIGNALED) {
          frameId = window.setTimeout(poll, 5);
        } else {
          if (sync) gl.deleteSync(sync);
          frameId = window.setTimeout(cb, 80);
        }
      };
      frameId = window.setTimeout(poll, 5);
    }

    const tick = () => {
      if (disposed) return;
      if (document.hidden) {
        frameId = window.setTimeout(tick, 120);
        return;
      }
      const dt = Math.min(clock.getDelta(), 0.05);
      const { activeScreen: screen, settings: cfg } = propsRef.current;

      if (screen === 'test_lab') {
        if (isSoftwareGl) afterDraw(tick);
        else frameId = requestAnimationFrame(tick);
        return;
      }

      totalElapsed += dt;
      const player = playerRef.current;

      // Update Weather, Dynamic Wetness, Day/Night cycle, Sky Clouds & World LOD
      const weatherOut = weatherSys.update(
        dt,
        totalElapsed,
        cfg.weather,
        cfg.graphicsQuality,
        cfg.performanceMode,
        camera.position,
      );
      if (scene.fog instanceof THREE.FogExp2) {
        scene.fog.density = THREE.MathUtils.damp(scene.fog.density, weatherOut.fogDensity, 2.0, dt);
      }
      world.asphaltMat.roughness = THREE.MathUtils.lerp(0.62, 0.14, weatherOut.wetness);
      world.asphaltMat.clearcoat = THREE.MathUtils.lerp(0.18, 0.88, weatherOut.wetness);
      world.asphaltMat.clearcoatRoughness = THREE.MathUtils.lerp(0.42, 0.08, weatherOut.wetness);

      const windMag = Math.hypot(weatherOut.windX, weatherOut.windZ);
      applyTimeOfDay(scene, world, cfg.timeOfDay, totalElapsed, weatherOut.effectiveMode);
      updateWorldLOD(world, player.pos, cfg.graphicsQuality, dt, windMag);
      remoteMgr.update(dt);

      ambienceAccum += dt;
      if (ambienceAccum >= 0.35) {
        ambienceAccum = 0;
        soundEngine.setEnvironmentAmbience(
          player.lastZone.startsWith('Vuurwerkpaleis'),
          weatherOut.effectiveMode === 'rain',
          windMag,
        );
      }

      // Update Show Playback Sequencer if active
      const pb = showPlaybackRef.current;
      if (pb.playing && pb.show) {
        pb.elapsed += dt;
        for (const cue of pb.show.cues) {
          if (!pb.firedCueIds.has(cue.id) && pb.elapsed >= cue.triggerTime) {
            pb.firedCueIds.add(cue.id);
            const prod = PRODUCT_MAP.get(cue.productId);
            const padPos = world.displayPads[cue.padIndex % world.displayPads.length] || new THREE.Vector3(-30, 0.1, 0);
            if (prod) {
              fwEngine.igniteFirework(
                `show-${cue.id}-${Date.now()}`,
                prod,
                padPos,
                0,
                null,
                camera,
                0.25,
                cue.angleDeg,
              );
            }
          }
        }
        propsRef.current.onShowPlaybackProgress(pb.elapsed, pb.duration, true);
        if (pb.elapsed >= pb.duration + 3.5) {
          pb.playing = false;
          propsRef.current.onShowPlaybackProgress(pb.duration, pb.duration, false);
        }
      }

      let currentAnim: PlayerAnimState = 'idle';

      if (screen === 'display') {
        // Smooth camera glide to scenic Show Viewing Deck overlooking Afsteekzone
        vmGroup.visible = false;
        ghostGroup.visible = false;
        camera.position.x = THREE.MathUtils.damp(camera.position.x, -4.5, 4.5, dt);
        camera.position.y = THREE.MathUtils.damp(camera.position.y, 6.2, 4.5, dt);
        camera.position.z = THREE.MathUtils.damp(camera.position.z, 2.0, 4.5, dt);
        _lookTarget.set(-30, 18, 0);
        camera.lookAt(_lookTarget);
      } else if (screen === 'menu') {
        // Scenic atmospheric orbit showcasing Vuurwerkpaleis De Gouden Pijl, streetlamps & Oranjestraat
        vmGroup.visible = false;
        ghostGroup.visible = false;
        const ang = totalElapsed * 0.085;
        camera.position.set(
          -14 + Math.cos(ang) * 14,
          7.4 + Math.sin(ang * 0.7) * 1.2,
          Math.sin(ang) * 16 + 6,
        );
        _lookTarget.set(16, 4.2, -1);
        camera.lookAt(_lookTarget);
      } else {
        // First-Person Gameplay Movement
        vmGroup.visible = screen === 'playing';
        let moveSpeed = 0;

        if (screen !== 'playing' && isDraggingLook) {
          isDraggingLook = false;
        }
        if (screen !== 'playing') {
          for (const k of Object.keys(keys)) keys[k] = false;
        }

        if (screen === 'playing') {
          const fwdInput = (keys['KeyW'] || keys['ArrowUp'] ? 1 : 0) - (keys['KeyS'] || keys['ArrowDown'] ? 1 : 0);
          const strInput = (keys['KeyD'] || keys['ArrowRight'] ? 1 : 0) - (keys['KeyA'] || keys['ArrowLeft'] ? 1 : 0);

          _forward.set(-Math.sin(player.yaw), 0, -Math.cos(player.yaw));
          _right.set(Math.cos(player.yaw), 0, -Math.sin(player.yaw));

          const sprint = keys['ShiftLeft'] || keys['ShiftRight'] ? 1.65 : 1.0;
          const speed = 5.4 * sprint;

          let moveX = _forward.x * fwdInput + _right.x * strInput;
          let moveZ = _forward.z * fwdInput + _right.z * strInput;
          const mag = Math.hypot(moveX, moveZ);
          if (mag > 0.001) {
            moveX = (moveX / mag) * speed * dt;
            moveZ = (moveZ / mag) * speed * dt;
            moveSpeed = speed;
          }

          // Sliding AABB collision on X then Z across the 280x280m world
          const radius = 0.44;
          const nextX = THREE.MathUtils.clamp(player.pos.x + moveX, WORLD_BOUNDS.minX, WORLD_BOUNDS.maxX);
          let blockedX = false;
          for (const box of world.colliders) {
            if (collidesAABB(nextX, player.pos.z, radius, box)) {
              blockedX = true;
              break;
            }
          }
          if (!blockedX) player.pos.x = nextX;

          const nextZ = THREE.MathUtils.clamp(player.pos.z + moveZ, WORLD_BOUNDS.minZ, WORLD_BOUNDS.maxZ);
          let blockedZ = false;
          for (const box of world.colliders) {
            if (collidesAABB(player.pos.x, nextZ, radius, box)) {
              blockedZ = true;
              break;
            }
          }
          if (!blockedZ) player.pos.z = nextZ;

          // Jump & Gravity
          if (keys['Space'] && player.grounded) {
            player.velY = 7.4;
            player.grounded = false;
          }
          player.velY -= 21.0 * dt;
          player.pos.y += player.velY * dt;
          if (player.pos.y <= 1.72) {
            player.pos.y = 1.72;
            player.velY = 0;
            player.grounded = true;
          }

          if (!player.grounded) {
            currentAnim = 'jump';
          } else if (moveSpeed > 0.1) {
            currentAnim = sprint > 1 ? 'run' : 'walk';
          }

          // Footsteps & Head Bob
          if (moveSpeed > 0.1 && player.grounded) {
            player.bobPhase += dt * (sprint > 1 ? 13 : 9);
            player.footstepAccum += dt * (sprint > 1 ? 2.6 : 1.85);
            if (player.footstepAccum >= 1) {
              player.footstepAccum = 0;
              soundEngine.playFootstep(getSurfaceType(player.pos.x, player.pos.z));
            }
          } else {
            player.bobPhase = 0;
          }

          // Zone Detection & Tutorial Progression
          const zone = getPlayerZoneName(player.pos.x, player.pos.z);
          if (zone !== player.lastZone) {
            player.lastZone = zone;
            propsRef.current.onZoneChange(zone);
            const inShop = zone.startsWith('Vuurwerkpaleis');
            soundEngine.setEnvironmentAmbience(inShop, weatherOut.effectiveMode === 'rain', windMag);
            if (inShop && propsRef.current.tutorialStep === 'enter_shop') {
              propsRef.current.onTutorialAdvance('buy_firework');
            }
            if (zone === 'Afsteekzone Vuurwerkplein' && propsRef.current.tutorialStep === 'welcome') {
              propsRef.current.onTutorialAdvance('enter_shop');
            }
          }
        }

        // Camera position & rotation: ZERO shake/recoil by default (only if settings.screenShake is explicitly enabled)
        const bobY = Math.sin(player.bobPhase) * (moveSpeed > 0 ? 0.03 : 0);
        let sx = 0;
        let sy = 0;
        if (cfg.screenShake) {
          const shake = fwEngine.cameraShakeTrauma * fwEngine.cameraShakeTrauma * 0.24;
          sx = (Math.random() - 0.5) * shake;
          sy = (Math.random() - 0.5) * shake;
        } else {
          fwEngine.cameraShakeTrauma = 0;
        }

        camera.position.set(player.pos.x + sx, player.pos.y + bobY + sy, player.pos.z);
        camera.rotation.set(player.pitch + sy * 0.2, player.yaw + sx * 0.2, 0, 'YXZ');

        // Viewmodel subtle sway & lighter flame flicker
        vmGroup.position.x = THREE.MathUtils.damp(vmGroup.position.x, Math.cos(player.bobPhase * 0.5) * 0.012, 10, dt);
        vmGroup.position.y = THREE.MathUtils.damp(vmGroup.position.y, Math.abs(Math.sin(player.bobPhase * 0.5)) * -0.015, 10, dt);
        if (lighterFlameRef.current && lighterGroupRef.current?.visible) {
          lighterFlameRef.current.scale.set(
            0.9 + Math.random() * 0.25,
            0.85 + Math.sin(totalElapsed * 28) * 0.2 + Math.random() * 0.2,
            0.9 + Math.random() * 0.25,
          );
        }

        // Placement Ghost Preview
        if (
          screen === 'playing' &&
          propsRef.current.equippedTool === 'product' &&
          propsRef.current.equippedProductId &&
          ghostGroup.children.length > 0
        ) {
          const spot = getPlacementSpot();
          if (spot) {
            ghostGroup.visible = true;
            ghostGroup.position.copy(spot.pos);
            ghostGroup.rotation.y = placementRotYRef.current;
            const tint = spot.valid ? (spot.inDisplayZone ? 0x22c55e : 0xf59e0b) : 0xef4444;
            ghostGroup.traverse((c) => {
              if ((c as THREE.Mesh).isMesh) {
                const mesh = c as THREE.Mesh;
                const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
                for (const mat of mats) {
                  const std = mat as THREE.MeshStandardMaterial;
                  if (std.emissive) std.emissive.setHex(tint);
                }
              }
            });
          } else {
            ghostGroup.visible = false;
          }
        } else {
          ghostGroup.visible = false;
        }

        // Throttled Crosshair Raycasting (16Hz)
        raycastAccum += dt;
        if (raycastAccum >= 0.06 && screen === 'playing') {
          raycastAccum = 0;
          const target = getHoveredTarget();
          const key = target ? `${target.type}:${target.uid || target.productId || target.label}:${target.sublabel}` : '';
          if (key !== lastTargetUidOrLabel) {
            lastTargetUidOrLabel = key;
            if (target) {
              const fwEntry = target.uid ? placedMeshesRef.current.get(target.uid) : undefined;
              propsRef.current.onTargetChange({
                label: target.label,
                sublabel: target.sublabel || '',
                type: target.type,
                productId: target.productId,
                uid: target.uid,
                state: fwEntry?.data.state,
              });
            } else {
              propsRef.current.onTargetChange(null);
            }
          }
        }
      }

      // Multiplayer sync (20Hz when playing, 2Hz in menus)
      if (propsRef.current.isMultiplayer && propsRef.current.onPlayerNetworkSync) {
        netSyncAccum += dt;
        const syncInterval = screen === 'playing' ? 0.05 : 0.45;
        if (netSyncAccum >= syncInterval) {
          netSyncAccum = 0;
          propsRef.current.onPlayerNetworkSync({
            x: player.pos.x,
            y: player.pos.y,
            z: player.pos.z,
            yaw: player.yaw,
            pitch: player.pitch,
            animState: currentAnim,
            equippedTool: propsRef.current.equippedTool,
            equippedProductId: propsRef.current.equippedProductId,
            isShopping: screen === 'shop' || player.lastZone.startsWith('Vuurwerkpaleis'),
            zone: player.lastZone || getPlayerZoneName(player.pos.x, player.pos.z),
          });
        }
      }

      // Advance Fireworks Particle Engine with Wind Drift
      fwEngine.update(dt, camera, weatherOut.windX, weatherOut.windZ);

      // Update Real-Time CubeCamera Reflections on HIGH / ULTRA / CINEMATIC
      frameCounter++;
      const useRealtimeRefl =
        !isSoftwareGl &&
        !cfg.performanceMode &&
        (cfg.graphicsQuality === 'high' ||
          cfg.graphicsQuality === 'ultra' ||
          cfg.graphicsQuality === 'cinematic');
      if (useRealtimeRefl && cubeCamera && cubeRT) {
        if (frameCounter % 4 === 1) {
          const prevVm = vmGroup.visible;
          const prevGhost = ghostGroup.visible;
          vmGroup.visible = false;
          ghostGroup.visible = false;
          for (const rMat of world.reflectiveMaterials) {
            rMat.envMap = dummyCubeTex;
          }
          cubeCamera.position.set(
            camera.position.x,
            Math.max(2.0, camera.position.y),
            camera.position.z,
          );
          cubeCamera.update(renderer, scene);
          for (const rMat of world.reflectiveMaterials) {
            rMat.envMap = cubeRT.texture;
          }
          vmGroup.visible = prevVm;
          ghostGroup.visible = prevGhost;
        }
      } else {
        for (const rMat of world.reflectiveMaterials) {
          if (rMat.envMap !== null) {
            rMat.envMap = null;
          }
        }
      }

      const usePost =
        composer !== null &&
        !isSoftwareGl &&
        !cfg.performanceMode &&
        (cfg.graphicsQuality === 'high' ||
          cfg.graphicsQuality === 'ultra' ||
          cfg.graphicsQuality === 'cinematic');

      if (usePost) {
        composer!.render();
      } else {
        renderer.render(scene, camera);
      }

      if (isSoftwareGl) afterDraw(tick);
      else frameId = requestAnimationFrame(tick);
    };

    if (isSoftwareGl) frameId = window.setTimeout(tick, 16);
    else frameId = requestAnimationFrame(tick);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      clearTimeout(frameId);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('blur', onWindowBlur);
      document.removeEventListener('pointerlockchange', onPointerLockEvent);
      window.removeEventListener('resize', onResize);
      renderer.domElement.removeEventListener('webglcontextlost', onContextLost);
      for (const entry of placedMeshesRef.current.values()) {
        if (entry.group.userData.clonedDarkMats) {
          for (const m of entry.group.userData.clonedDarkMats as THREE.Material[]) m.dispose();
        }
        (entry.group.userData.dispose as (() => void) | undefined)?.();
        entry.proxy.geometry.dispose();
        (entry.proxy.material as THREE.Material).dispose();
      }
      placedMeshesRef.current.clear();
      while (heldSlot.children.length > 0) {
        const old = heldSlot.children[0];
        heldSlot.remove(old);
        (old.userData.dispose as (() => void) | undefined)?.();
      }
      while (ghostGroup.children.length > 0) {
        const old = ghostGroup.children[0];
        ghostGroup.remove(old);
        if (old.userData.clonedMats) {
          for (const m of old.userData.clonedMats as THREE.Material[]) m.dispose();
        }
        (old.userData.dispose as (() => void) | undefined)?.();
      }
      (lighterGroup.userData.dispose as (() => void) | undefined)?.();
      rSleeveGeo.dispose();
      rHandGeo.dispose();
      sleeveMat.dispose();
      skinMat.dispose();
      remoteMgr.clearAll();
      weatherSys.dispose();
      cubeRT?.dispose();
      dummyCubeTex.dispose();
      roomEnvTex.dispose();
      composer?.dispose();
      fwEngine.dispose();
      world.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  return <div ref={mountRef} className="fixed inset-0 w-full h-full z-0" />;
};
