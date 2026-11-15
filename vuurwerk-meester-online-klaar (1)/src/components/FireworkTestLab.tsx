import React, { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import {
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Flame,
  Play,
  Repeat,
  RotateCcw,
  Search,
  Sparkles,
  Trash2,
  X,
} from 'lucide-react';
import {
  PRODUCTS as ALL_PRODUCTS,
  CATEGORIES as PRODUCT_CATEGORIES,
  PRODUCT_MAP,
} from '../data/products';
import { EffectStyle, FireworkProduct, GameSettings, ProductCategory } from '../types';
import { FireworksEngine } from '../engine/fireworksEngine';
import { createFireworkModel } from '../engine/productModels';
import { soundEngine } from '../engine/audio';

interface FireworkTestLabProps {
  settings: GameSettings;
  onClose: () => void;
}

const STYLE_LABELS: Record<EffectStyle, string> = {
  golden_willow: 'Golden Willow',
  golden_kamuro: 'Golden Kamuro',
  red_peony: 'Red Peony',
  blue_peony: 'Blue Peony',
  green_peony: 'Green Peony',
  chrysanthemum: 'Chrysanthemum',
  brocade_crown: 'Brocade Crown',
  crackling: 'Crackling',
  silver_glitter: 'Silver Glitter',
  white_strobe: 'White Strobe',
  palm: 'Palm',
  crackle_palm: 'Crackle Palm',
  multi_color: 'Multi-Color',
  ring_burst: 'Ring Burst',
  crossette: 'Crossette',
  comet_mine: 'Comet Mine',
  finale: 'Finale',
  fountain_gold: 'Gold Fountain',
  fountain_crackling: 'Crackling Fountain',
  fountain_color: 'Color Fountain',
  sparkler_shower: 'Sparkler Shower',
  smoke_plume: 'Smoke Plume',
  ground_spinner: 'Ground Spinner',
  salute: 'Salute / Flash',
};

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

export const FireworkTestLab: React.FC<FireworkTestLabProps> = ({ settings, onClose }) => {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const engineRef = useRef<FireworksEngine | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const pedestalSlotRef = useRef<THREE.Group | null>(null);
  const pedestalModelRef = useRef<THREE.Group | null>(null);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<ProductCategory | 'Alle'>('Alle');
  const [styleFilter, setStyleFilter] = useState<EffectStyle | 'Alle'>('Alle');
  const [selectedId, setSelectedId] = useState<string>(ALL_PRODUCTS[0]?.id || '');
  const [timeScale, setTimeScale] = useState<number>(1);
  const [autoLoop, setAutoLoop] = useState<boolean>(false);
  const [panelCollapsed, setPanelCollapsed] = useState<boolean>(false);
  const [counts, setCounts] = useState({ stars: 0, micros: 0 });

  const timeScaleRef = useRef(timeScale);
  timeScaleRef.current = timeScale;

  const camStateRef = useRef({
    yaw: 0.32,
    pitch: 0.32,
    dist: 58,
    targetY: 22,
  });

  const allStyles = useMemo(() => {
    const set = new Set<EffectStyle>();
    for (const p of ALL_PRODUCTS) {
      set.add(p.effect.style);
    }
    return Array.from(set).sort();
  }, []);

  const filteredProducts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return ALL_PRODUCTS.filter((p) => {
      if (category !== 'Alle' && p.category !== category) return false;
      if (styleFilter !== 'Alle' && p.effect.style !== styleFilter && p.effect.secondaryStyle !== styleFilter) {
        return false;
      }
      if (
        q &&
        !p.name.toLowerCase().includes(q) &&
        !p.brand.toLowerCase().includes(q) &&
        !p.effect.style.toLowerCase().includes(q)
      ) {
        return false;
      }
      return true;
    });
  }, [search, category, styleFilter]);

  const selectedProduct: FireworkProduct = useMemo(() => {
    return PRODUCT_MAP.get(selectedId) || filteredProducts[0] || ALL_PRODUCTS[0];
  }, [selectedId, filteredProducts]);

  const selectedIndex = useMemo(() => {
    const idx = filteredProducts.findIndex((p) => p.id === selectedProduct.id);
    return idx >= 0 ? idx : 0;
  }, [filteredProducts, selectedProduct.id]);

  // Mount isolated 3D Proving Ground scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const isSoftwareGl = detectSoftwareGl();
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x040710);
    scene.fog = new THREE.FogExp2(0x040710, 0.0022);

    const camera = new THREE.PerspectiveCamera(
      62,
      container.clientWidth / Math.max(1, container.clientHeight),
      0.2,
      400,
    );
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl && settings.graphicsQuality !== 'low',
      powerPreference: 'high-performance',
    });
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    renderer.setSize(container.clientWidth, container.clientHeight);
    const maxDpr = settings.graphicsQuality === 'low' ? 1 : 1.8;
    renderer.setPixelRatio((isSoftwareGl ? 1 : Math.min(window.devicePixelRatio || 1, maxDpr)) * settings.resolutionScale);
    container.appendChild(renderer.domElement);

    let composer: EffectComposer | null = null;
    let bloomPass: UnrealBloomPass | null = null;
    if (!isSoftwareGl && settings.graphicsQuality !== 'low') {
      composer = new EffectComposer(renderer);
      composer.setSize(container.clientWidth, container.clientHeight);
      composer.addPass(new RenderPass(scene, camera));
      bloomPass = new UnrealBloomPass(
        new THREE.Vector2(container.clientWidth, container.clientHeight),
        0.58,
        0.52,
        0.65,
      );
      composer.addPass(bloomPass);
      composer.addPass(new OutputPass());
    }

    // Subtle Starfield Dome
    const starPositions = new Float32Array(700 * 3);
    for (let i = 0; i < 700; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(0.08 + Math.random() * 0.92);
      const r = 240;
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      starPositions[i * 3 + 1] = r * Math.cos(phi);
      starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    const starGeo = new THREE.BufferGeometry();
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    const starMat = new THREE.PointsMaterial({ color: 0xcbd5e1, size: 1.1, sizeAttenuation: true });
    scene.add(new THREE.Points(starGeo, starMat));

    // Lighting
    scene.add(new THREE.AmbientLight(0x28344e, 0.7));
    const keyLight = new THREE.DirectionalLight(0x93c5fd, 0.65);
    keyLight.position.set(18, 35, 25);
    scene.add(keyLight);

    // Matte Dark Proving Ground Apron + Range Rings
    const groundGeo = new THREE.CircleGeometry(140, 64);
    groundGeo.rotateX(-Math.PI / 2);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0b101b,
      roughness: 0.68,
      metalness: 0.15,
    });
    scene.add(new THREE.Mesh(groundGeo, groundMat));

    const extraDisposables: { dispose: () => void }[] = [];
    const ringRadii = [6, 15, 30, 50];
    for (const r of ringRadii) {
      const rg = new THREE.RingGeometry(r - 0.08, r + 0.08, 72);
      rg.rotateX(-Math.PI / 2);
      const rm = new THREE.MeshBasicMaterial({
        color: r === 6 ? 0xf59e0b : 0x334155,
        transparent: true,
        opacity: r === 6 ? 0.5 : 0.32,
        side: THREE.DoubleSide,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
      });
      extraDisposables.push(rg, rm);
      const mesh = new THREE.Mesh(rg, rm);
      mesh.position.y = 0.035;
      scene.add(mesh);
    }

    // Launch Pedestal
    const pedGeo = new THREE.CylinderGeometry(1.1, 1.3, 0.14, 24);
    const pedMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.4 });
    const ped = new THREE.Mesh(pedGeo, pedMat);
    ped.position.y = 0.07;
    scene.add(ped);

    const slot = new THREE.Group();
    slot.position.set(0, 0.14, 0);
    scene.add(slot);
    pedestalSlotRef.current = slot;

    // Height Reference Pole off to left (-26m) at 15m, 30m, 50m marks
    const poleGeo = new THREE.CylinderGeometry(0.06, 0.06, 55, 8);
    const poleMat = new THREE.MeshBasicMaterial({ color: 0x334155, transparent: true, opacity: 0.4 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(-28, 27.5, -10);
    scene.add(pole);

    const tickGeo = new THREE.BoxGeometry(2.4, 0.14, 0.14);
    const tickMat = new THREE.MeshBasicMaterial({ color: 0x64748b });
    extraDisposables.push(tickGeo, tickMat);
    for (const h of [15, 30, 50]) {
      const tick = new THREE.Mesh(tickGeo, tickMat);
      tick.position.set(-26.8, h, -10);
      scene.add(tick);
    }

    // Real Upgraded FireworksEngine
    const fwEngine = new FireworksEngine(scene);
    fwEngine.setQuality(settings.graphicsQuality, settings.performanceMode);
    engineRef.current = fwEngine;

    // Orbit Drag & Wheel Zoom Controls
    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    const onDown = (e: MouseEvent) => {
      if (e.target !== renderer.domElement) return;
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
    };
    const onUp = () => {
      dragging = false;
    };
    const onMove = (e: MouseEvent) => {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      camStateRef.current.yaw -= dx * 0.0065;
      camStateRef.current.pitch = THREE.MathUtils.clamp(
        camStateRef.current.pitch + dy * 0.0055,
        -0.12,
        1.25,
      );
    };
    const onWheel = (e: WheelEvent) => {
      if (e.target !== renderer.domElement) return;
      camStateRef.current.dist = THREE.MathUtils.clamp(
        camStateRef.current.dist + Math.sign(e.deltaY) * 4.5,
        16,
        115,
      );
    };
    const onResize = () => {
      if (!container) return;
      const w = container.clientWidth;
      const h = Math.max(1, container.clientHeight);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      composer?.setSize(w, h);
      bloomPass?.resolution.set(w, h);
    };

    window.addEventListener('mousedown', onDown);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('mousemove', onMove);
    window.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('resize', onResize);

    let frameId = 0;
    let disposed = false;
    let statsAccum = 0;
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
      const rawDt = Math.min(clock.getDelta(), 0.05);
      const scaledDt = rawDt * timeScaleRef.current;

      const cs = camStateRef.current;
      const cosP = Math.cos(cs.pitch);
      camera.position.set(
        Math.sin(cs.yaw) * cosP * cs.dist,
        Math.max(1.5, cs.targetY + Math.sin(cs.pitch) * cs.dist * 0.45),
        Math.cos(cs.yaw) * cosP * cs.dist,
      );
      camera.lookAt(0, cs.targetY, 0);

      fwEngine.update(scaledDt, camera, 0, 0);

      statsAccum += rawDt;
      if (statsAccum >= 0.12) {
        statsAccum = 0;
        const c = fwEngine.getActiveCounts();
        setCounts({ stars: c.activeStars, micros: c.activeMicroSparks });
      }

      if (composer && !isSoftwareGl && !settings.performanceMode) {
        composer.render();
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
      window.removeEventListener('mousedown', onDown);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);
      fwEngine.dispose();
      composer?.dispose();
      while (slot.children.length > 0) {
        const old = slot.children[0];
        slot.remove(old);
        (old.userData.dispose as (() => void) | undefined)?.();
      }
      pedestalModelRef.current = null;
      for (const d of extraDisposables) d.dispose();
      starGeo.dispose();
      starMat.dispose();
      groundGeo.dispose();
      groundMat.dispose();
      pedGeo.dispose();
      pedMat.dispose();
      poleGeo.dispose();
      poleMat.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode === container) {
        container.removeChild(renderer.domElement);
      }
    };
  }, [settings.graphicsQuality, settings.performanceMode, settings.resolutionScale]);

  // Swap pedestal 3D model when selected product changes
  useEffect(() => {
    const slot = pedestalSlotRef.current;
    if (!slot) return;
    while (slot.children.length > 0) {
      const old = slot.children[0];
      slot.remove(old);
      (old.userData.dispose as (() => void) | undefined)?.();
    }
    const model = createFireworkModel(selectedProduct);
    slot.add(model);
    pedestalModelRef.current = model;
  }, [selectedProduct]);

  const fireProduct = (singleShotOnly: boolean) => {
    soundEngine.unlock();
    const engine = engineRef.current;
    const cam = cameraRef.current;
    if (!engine || !cam) return;

    const prodToFire: FireworkProduct = singleShotOnly
      ? {
          ...selectedProduct,
          shots: 1,
          durationSec: Math.min(selectedProduct.durationSec, 3.5),
        }
      : selectedProduct;

    // Adjust camera elevation smoothly for ground vs high aerial products
    const isGround =
      selectedProduct.effect.isFountain ||
      selectedProduct.effect.isSpinner ||
      selectedProduct.effect.isSmoke;
    camStateRef.current.targetY = isGround
      ? 4.5
      : Math.max(14, selectedProduct.effect.burstHeight * 0.72);
    camStateRef.current.dist = isGround ? 22 : Math.max(42, selectedProduct.effect.burstHeight * 1.45);

    engine.igniteFirework(
      `lab-${selectedProduct.id}-${Date.now()}`,
      prodToFire,
      new THREE.Vector3(0, 0.14, 0),
      0,
      pedestalModelRef.current,
      cam,
      0.08,
      0,
    );
  };

  // Auto-Loop Timer
  useEffect(() => {
    if (!autoLoop) return;
    fireProduct(true);
    const intervalMs = Math.max(1800, Math.round(2800 / timeScale));
    const timer = window.setInterval(() => {
      fireProduct(true);
    }, intervalMs);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoLoop, selectedProduct.id, timeScale]);

  const stepProduct = (dir: number) => {
    if (filteredProducts.length === 0) return;
    const nextIdx = (selectedIndex + dir + filteredProducts.length) % filteredProducts.length;
    setSelectedId(filteredProducts[nextIdx].id);
  };

  return (
    <div className="fixed inset-0 z-40 bg-[#040710] select-none">
      {/* 3D WebGL Canvas */}
      <div ref={mountRef} className="fixed inset-0 w-full h-full" />

      {/* Top Compact Status & Exit Bar (Unobstructed Sky) */}
      <div className="fixed top-4 left-4 right-4 z-10 pointer-events-none flex flex-wrap items-start justify-between gap-3">
        <div className="pointer-events-auto bg-[#090D16]/90 border border-white/12 rounded-xl px-4 py-2.5 flex items-center gap-4 shadow-xl">
          <div>
            <div className="flex items-center gap-2 text-[11px] font-bold text-amber-400 uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5" />
              Vuurwerk Testomgeving (3D)
            </div>
            <div className="text-sm font-extrabold text-white mt-0.5 flex items-center gap-2">
              <span>{selectedProduct.name}</span>
              <span className="text-xs font-normal text-slate-400">· {selectedProduct.brand}</span>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-300 mt-0.5 font-mono-tabular">
              <span className="text-amber-300">{STYLE_LABELS[selectedProduct.effect.style]}</span>
              {selectedProduct.effect.secondaryStyle && (
                <span>+ {STYLE_LABELS[selectedProduct.effect.secondaryStyle]}</span>
              )}
              <span className="text-slate-500">|</span>
              <span>{selectedProduct.caliberMm}mm</span>
              <span>· {selectedProduct.shots} shots</span>
              <span>· {selectedProduct.effect.burstHeight}m hoog</span>
              <span>· {counts.stars} linten / {counts.micros} vonken</span>
            </div>
          </div>
        </div>

        <div className="pointer-events-auto flex items-center gap-2">
          <button
            onClick={() => {
              camStateRef.current = { yaw: 0.32, pitch: 0.32, dist: 58, targetY: 22 };
            }}
            className="px-3 py-2 rounded-lg bg-[#090D16]/90 hover:bg-[#141C2E] border border-white/12 text-xs text-slate-200 flex items-center gap-1.5"
            title="Camera resetten"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Camera
          </button>
          <button
            onClick={() => setPanelCollapsed((c) => !c)}
            className="px-3 py-2 rounded-lg bg-[#090D16]/90 hover:bg-[#141C2E] border border-white/12 text-xs text-slate-200 flex items-center gap-1.5"
          >
            {panelCollapsed ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            {panelCollapsed ? 'Paneel Tonen' : 'Volle Lucht'}
          </button>
          <button
            onClick={() => {
              soundEngine.playUiClick();
              onClose();
            }}
            className="px-3.5 py-2 rounded-lg bg-red-500/20 hover:bg-red-500/35 border border-red-400/40 text-red-200 text-xs font-bold flex items-center gap-1.5"
          >
            <X className="w-4 h-4" />
            Sluiten
          </button>
        </div>
      </div>

      {/* Bottom Collapsible Control Dock (Leaves Central Sky 100% Open) */}
      {!panelCollapsed && (
        <div className="fixed bottom-4 left-4 right-4 z-10 pointer-events-none flex justify-center">
          <div className="pointer-events-auto w-full max-w-5xl bg-[#090D16]/92 border border-white/12 rounded-2xl p-3.5 shadow-2xl space-y-3">
            {/* Row 1: Action Controls */}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => fireProduct(true)}
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs flex items-center gap-1.5 shadow-lg"
                >
                  <Flame className="w-4 h-4" />
                  Test 1 Schot
                </button>
                <button
                  onClick={() => fireProduct(false)}
                  className="px-3.5 py-2 rounded-lg bg-orange-500/20 hover:bg-orange-500/30 border border-orange-400/45 text-orange-200 font-bold text-xs flex items-center gap-1.5"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Volledige Sequentie ({selectedProduct.shots}×)
                </button>
                <button
                  onClick={() => setAutoLoop((v) => !v)}
                  className={`px-3 py-2 rounded-lg border text-xs font-semibold flex items-center gap-1.5 ${
                    autoLoop
                      ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300'
                      : 'bg-[#121826] border-white/10 text-slate-300 hover:text-white'
                  }`}
                >
                  <Repeat className="w-3.5 h-3.5" />
                  Auto-Herhaal
                </button>
                <button
                  onClick={() => engineRef.current?.clearAllActive()}
                  className="px-3 py-2 rounded-lg bg-[#121826] hover:bg-[#1B2438] border border-white/10 text-xs text-slate-300 flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Wissen
                </button>
              </div>

              {/* Slow-Motion Speed Selector */}
              <div className="flex items-center gap-1 bg-[#05080F] p-1 rounded-lg border border-white/10">
                <span className="text-[10px] text-slate-400 px-2 font-semibold">Snelheid:</span>
                {[0.25, 0.5, 1].map((spd) => (
                  <button
                    key={spd}
                    onClick={() => setTimeScale(spd)}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono-tabular font-bold ${
                      timeScale === spd
                        ? 'bg-amber-500 text-slate-950'
                        : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {spd}×
                  </button>
                ))}
              </div>
            </div>

            {/* Row 2: Search, Category, Style & Product Selector */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-2 items-center">
              <div className="md:col-span-3 relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Zoek uit 220+ producten..."
                  className="w-full bg-[#05080F] border border-white/12 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="md:col-span-3">
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as ProductCategory | 'Alle')}
                  className="w-full bg-[#05080F] border border-white/12 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="Alle">Alle Categorieën ({ALL_PRODUCTS.length})</option>
                  {PRODUCT_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3">
                <select
                  value={styleFilter}
                  onChange={(e) => setStyleFilter(e.target.value as EffectStyle | 'Alle')}
                  className="w-full bg-[#05080F] border border-white/12 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                >
                  <option value="Alle">Alle Effectstijlen</option>
                  {allStyles.map((st) => (
                    <option key={st} value={st}>
                      {STYLE_LABELS[st] || st}
                    </option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-3 flex items-center gap-1.5">
                <button
                  onClick={() => stepProduct(-1)}
                  className="p-1.5 rounded-lg bg-[#121826] hover:bg-[#1B2438] border border-white/10 text-slate-200"
                  title="Vorig product"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <select
                  value={selectedProduct.id}
                  onChange={(e) => setSelectedId(e.target.value)}
                  className="flex-1 min-w-0 bg-[#05080F] border border-amber-500/40 rounded-lg px-2 py-1.5 text-xs text-white font-semibold focus:outline-none"
                >
                  {filteredProducts.map((p, idx) => (
                    <option key={p.id} value={p.id}>
                      {idx + 1}/{filteredProducts.length} · {p.name}
                    </option>
                  ))}
                </select>
                <button
                  onClick={() => stepProduct(1)}
                  className="p-1.5 rounded-lg bg-[#121826] hover:bg-[#1B2438] border border-white/10 text-slate-200"
                  title="Volgend product"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
