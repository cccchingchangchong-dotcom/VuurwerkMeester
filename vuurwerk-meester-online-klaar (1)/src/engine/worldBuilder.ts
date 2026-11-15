import * as THREE from 'three';
import { PRODUCTS } from '../data/products';
import { FastTravelMarker, FireworkProduct, GraphicsQuality } from '../types';
import { createFireworkModel } from './productModels';
import {
  createAsphaltRoughnessTexture,
  createAsphaltTexture,
  createBrickTexture,
  createGrassTexture,
  createHouseWindowTexture,
  createInfoBoardTexture,
  createPavementTexture,
  createRoofTileTexture,
  createShopFloorTexture,
  createSignTexture,
  createSurfaceBumpTexture,
  createTrafficSignTexture,
  createVolumetricConeTexture,
  createZebraCrossingTexture,
} from './textures';

export interface AABB {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  maxY?: number;
}

export interface InteractableTarget {
  mesh: THREE.Object3D;
  type: 'shop_product' | 'checkout' | 'basket_station' | 'info_board' | 'placed_firework';
  productId?: string;
  uid?: string;
  label: string;
  sublabel?: string;
}

export interface WorldChunk {
  group: THREE.Group;
  cx: number;
  cz: number;
  radius: number;
}

export interface WorldRefs {
  colliders: AABB[];
  interactables: InteractableTarget[];
  streetLampMaterials: THREE.MeshStandardMaterial[];
  streetLampLights: { light: THREE.PointLight; x: number; z: number }[];
  volumetricCones: THREE.Mesh[];
  windowMaterials: THREE.MeshStandardMaterial[];
  reflectiveMaterials: (THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial)[];
  asphaltMat: THREE.MeshPhysicalMaterial;
  paveMat: THREE.MeshStandardMaterial;
  waterMat: THREE.MeshPhysicalMaterial;
  skyDome: THREE.Mesh;
  skyDomeMat: THREE.ShaderMaterial;
  windUniforms: { uTime: { value: number }; uWind: { value: number } };
  sunLight: THREE.DirectionalLight;
  hemiLight: THREE.HemisphereLight;
  displayPads: THREE.Vector3[];
  chunks: WorldChunk[];
  windmillBlades: THREE.Group | null;
  dispose: () => void;
}

export const WORLD_BOUNDS = {
  minX: -140,
  maxX: 140,
  minZ: -140,
  maxZ: 140,
};

// Compact Designated Fireworks Field & Event Ground
export const DISPLAY_ZONE_BOUNDS = {
  minX: -84,
  maxX: -11,
  minZ: -44,
  maxZ: 44,
};

// Vuurwerkpaleis De Gouden Pijl Supermarket Bounds
export const SHOP_BOUNDS = {
  minX: 12,
  maxX: 54,
  minZ: -26,
  maxZ: 24,
};

export const FAST_TRAVEL_MARKERS: FastTravelMarker[] = [
  {
    id: 'shop',
    name: 'Vuurwerkpaleis De Gouden Pijl',
    district: 'Commercieel Centrum',
    x: 14.5,
    z: 0,
    yaw: -Math.PI / 2,
    color: '#F59E0B',
  },
  {
    id: 'display',
    name: 'Afsteekzone Vuurwerkplein',
    district: 'Vuurwerk Evenementenveld',
    x: -16,
    z: 0,
    yaw: Math.PI / 2,
    color: '#F97316',
  },
  {
    id: 'commercial',
    name: 'Winkelstraat & OranjeOlie Tankstation',
    district: 'Commercieel District',
    x: 68,
    z: 18,
    yaw: -Math.PI / 4,
    color: '#38BDF8',
  },
  {
    id: 'park',
    name: 'Oranjepark & Molen De Vuurpijl',
    district: 'Park & Recreatie',
    x: -34,
    z: 98,
    yaw: Math.PI * 0.85,
    color: '#10B981',
  },
  {
    id: 'industrial',
    name: 'Industrieterrein De Kruitmolen',
    district: 'Logistiek & Opslag',
    x: 112,
    z: -102,
    yaw: -Math.PI / 3,
    color: '#94A3B8',
  },
  {
    id: 'north_res',
    name: 'Oranjewijk Noord',
    district: 'Woonwijk Noord',
    x: 0,
    z: -96,
    yaw: 0,
    color: '#EC4899',
  },
  {
    id: 'east_res',
    name: 'Bloemenbuurt Oost',
    district: 'Woonwijk Oost',
    x: 114,
    z: 34,
    yaw: -Math.PI / 2,
    color: '#A855F7',
  },
];

export function getPlayerZoneName(x: number, z: number): string {
  if (x >= SHOP_BOUNDS.minX && x <= SHOP_BOUNDS.maxX && z >= SHOP_BOUNDS.minZ && z <= SHOP_BOUNDS.maxZ) {
    if (x >= 44 && z >= -6 && z <= 8) {
      return 'Vuurwerkpaleis · Premium Collector Sectie';
    }
    return 'Vuurwerkpaleis De Gouden Pijl';
  }
  if (
    x >= DISPLAY_ZONE_BOUNDS.minX &&
    x <= DISPLAY_ZONE_BOUNDS.maxX &&
    z >= DISPLAY_ZONE_BOUNDS.minZ &&
    z <= DISPLAY_ZONE_BOUNDS.maxZ
  ) {
    return 'Afsteekzone Vuurwerkplein';
  }
  if (x >= 10 && x <= 56 && z >= 25 && z <= 49) {
    return 'Parkeerterrein Vuurwerkpaleis';
  }
  if (x >= 56 && x <= 88 && z >= -65 && z <= 65) {
    return 'Winkelstraat & Tankstation';
  }
  if (x >= 102 && z <= -90) {
    return 'Industrieterrein De Kruitmolen';
  }
  if (z >= 75 && x <= 85) {
    return 'Oranjepark & Molenveld';
  }
  if (x >= 105 && z > -90) {
    return 'Bloemenbuurt Oost';
  }
  if (z < -70) {
    return 'Oranjewijk Noord';
  }
  if (Math.abs(x) <= 9) {
    return 'Oranjestraat';
  }
  if (Math.abs(z) <= 9) {
    return 'Vuurwerklaan';
  }
  return 'Nieuw-Oranjestad';
}

export function getSurfaceType(x: number, z: number): 'store' | 'pavement' | 'grass' {
  if (x >= SHOP_BOUNDS.minX && x <= SHOP_BOUNDS.maxX && z >= SHOP_BOUNDS.minZ && z <= SHOP_BOUNDS.maxZ) {
    return 'store';
  }
  if (
    (x >= -56 && x <= -11 && z >= -34 && z <= 34) ||
    Math.abs(x) <= 9 ||
    Math.abs(z) <= 9 ||
    Math.abs(x - 96) <= 7 ||
    Math.abs(x + 92) <= 7 ||
    Math.abs(z + 82) <= 7 ||
    Math.abs(z - 82) <= 7 ||
    (x >= 10 && x <= 88 && z >= -65 && z <= 65) ||
    (x >= 104 && z <= -92)
  ) {
    return 'pavement';
  }
  return 'grass';
}

export function buildWorld(scene: THREE.Scene, isSoftwareGl: boolean): WorldRefs {
  const colliders: AABB[] = [];
  const interactables: InteractableTarget[] = [];
  const streetLampMaterials: THREE.MeshStandardMaterial[] = [];
  const streetLampLights: { light: THREE.PointLight; x: number; z: number }[] = [];
  const volumetricCones: THREE.Mesh[] = [];
  const windowMaterials: THREE.MeshStandardMaterial[] = [];
  const reflectiveMaterials: (THREE.MeshStandardMaterial | THREE.MeshPhysicalMaterial)[] = [];
  const windUniforms = { uTime: { value: 0 }, uWind: { value: 1.0 } };
  const chunks: WorldChunk[] = [];
  const disposables: { dispose: () => void }[] = [];

  const track = <T extends { dispose: () => void }>(item: T): T => {
    disposables.push(item);
    return item;
  };

  // 1. Hyperrealistic Sky Dome Shader (Sun, Moon, Atmospheric Corona, Stars & FBM Volumetric Clouds)
  const skyDomeGeo = track(new THREE.SphereGeometry(340, 36, 22));
  const skyDomeMat = track(
    new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        topColor: { value: new THREE.Color(0x050814) },
        horizonColor: { value: new THREE.Color(0x131b2e) },
        starIntensity: { value: 1.0 },
        sunDir: { value: new THREE.Vector3(0.45, 0.35, -0.75).normalize() },
        moonDir: { value: new THREE.Vector3(-0.45, 0.52, -0.65).normalize() },
        sunIntensity: { value: 0.0 },
        moonIntensity: { value: 1.0 },
        cloudOpacity: { value: 0.55 },
        uTime: { value: 0.0 },
      },
      vertexShader: `
        varying vec3 vWorldPos;
        void main() {
          vec4 wp = modelMatrix * vec4(position, 1.0);
          vWorldPos = wp.xyz;
          gl_Position = projectionMatrix * viewMatrix * wp;
        }
      `,
      fragmentShader: `
        uniform vec3 topColor;
        uniform vec3 horizonColor;
        uniform float starIntensity;
        uniform vec3 sunDir;
        uniform vec3 moonDir;
        uniform float sunIntensity;
        uniform float moonIntensity;
        uniform float cloudOpacity;
        uniform float uTime;
        varying vec3 vWorldPos;

        float hash(vec3 p) {
          p = fract(p * 0.3183099 + 0.1);
          p *= 17.0;
          return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
        }

        float hash2(vec2 p) {
          return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
        }

        float noise2(vec2 p) {
          vec2 i = floor(p);
          vec2 f = fract(p);
          f = f * f * (3.0 - 2.0 * f);
          float a = hash2(i);
          float b = hash2(i + vec2(1.0, 0.0));
          float c = hash2(i + vec2(0.0, 1.0));
          float d = hash2(i + vec2(1.0, 1.0));
          return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
        }

        float fbm(vec2 p) {
          float v = 0.0;
          float a = 0.5;
          for (int i = 0; i < 4; i++) {
            v += a * noise2(p);
            p = p * 2.03 + vec2(13.1, 7.7);
            a *= 0.5;
          }
          return v;
        }

        void main() {
          vec3 dir = normalize(vWorldPos);
          float h = dir.y;
          float t = clamp(pow(max(h, 0.0), 0.52), 0.0, 1.0);
          vec3 col = mix(horizonColor, topColor, t);

          // Stars at night
          if (h > 0.04 && starIntensity > 0.01) {
            vec3 grid = floor(dir * 220.0);
            float n = hash(grid);
            if (n > 0.9942) {
              float twinkle = 0.72 + 0.28 * sin(uTime * 2.4 + n * 400.0);
              col += vec3(0.92, 0.95, 1.0) * starIntensity * twinkle * smoothstep(0.04, 0.28, h);
            }
          }

          // Sun disc + Mie atmospheric glow
          if (sunIntensity > 0.01 && h > -0.1) {
            float sunDot = max(dot(dir, normalize(sunDir)), 0.0);
            float sunDisc = smoothstep(0.99935, 0.99975, sunDot);
            float sunHalo = pow(sunDot, 22.0) * 0.52 + pow(sunDot, 5.0) * 0.16;
            vec3 sunCol = mix(vec3(1.0, 0.55, 0.22), vec3(1.0, 0.96, 0.88), clamp(sunDir.y * 2.5, 0.0, 1.0));
            col += sunCol * (sunDisc * 2.8 + sunHalo) * sunIntensity;
          }

          // Moon disc + silver night halo
          if (moonIntensity > 0.01 && h > 0.0) {
            float moonDot = max(dot(dir, normalize(moonDir)), 0.0);
            float moonDisc = smoothstep(0.99945, 0.99972, moonDot);
            float moonHalo = pow(moonDot, 48.0) * 0.28 + pow(moonDot, 8.0) * 0.06;
            col += vec3(0.84, 0.9, 1.0) * (moonDisc * 1.45 + moonHalo) * moonIntensity;
          }

          // Animated Multi-Octave Volumetric Cloud Layer
          if (h > 0.02 && cloudOpacity > 0.01) {
            vec2 cloudUv = dir.xz / (h + 0.18) * 1.35 + vec2(uTime * 0.012, uTime * 0.005);
            float c = fbm(cloudUv);
            float mask = smoothstep(0.46, 0.78, c) * smoothstep(0.02, 0.22, h);
            vec3 cloudBase = mix(horizonColor * 1.15, vec3(0.88, 0.92, 0.98), sunIntensity * 0.85);
            float rimLight = pow(max(dot(dir, normalize(sunDir)), 0.0), 6.0) * sunIntensity * 0.45;
            vec3 cloudLit = cloudBase + vec3(1.0, 0.82, 0.65) * rimLight;
            col = mix(col, cloudLit, mask * cloudOpacity);
          }

          gl_FragColor = vec4(col, 1.0);
        }
      `,
    }),
  );
  const skyDome = new THREE.Mesh(skyDomeGeo, skyDomeMat);
  scene.add(skyDome);

  // 2. Lighting Rig (Player-tracking Directional Shadow Frustum)
  const hemiLight = new THREE.HemisphereLight(0x465b8c, 0x1a1e26, 0.88);
  scene.add(hemiLight);

  const sunLight = new THREE.DirectionalLight(0xffeedd, 0.82);
  sunLight.position.set(55, 85, 45);
  scene.add(sunLight.target);
  if (!isSoftwareGl) {
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 5;
    sunLight.shadow.camera.far = 260;
    const d = 95;
    sunLight.shadow.camera.left = -d;
    sunLight.shadow.camera.right = d;
    sunLight.shadow.camera.top = d;
    sunLight.shadow.camera.bottom = -d;
    sunLight.shadow.bias = -0.00045;
    sunLight.shadow.normalBias = 0.02;
  }
  scene.add(sunLight);

  // 3. Base Terrain (360m x 360m seamless ground at y=0)
  const grassTex = track(createGrassTexture(48, 48));
  const grassMat = track(new THREE.MeshStandardMaterial({ map: grassTex, roughness: 0.94, metalness: 0.0 }));
  const ground = new THREE.Mesh(track(new THREE.PlaneGeometry(360, 360)), grassMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  const asphaltTex = track(createAsphaltTexture(2, 32));
  const asphaltBump = track(createSurfaceBumpTexture('asphalt', 2, 32));
  const asphaltRough = track(createAsphaltRoughnessTexture(2, 32));
  const asphaltMat = track(
    new THREE.MeshPhysicalMaterial({
      map: asphaltTex,
      bumpMap: asphaltBump,
      bumpScale: 0.032,
      roughnessMap: asphaltRough,
      roughness: 0.62,
      metalness: 0.14,
      clearcoat: 0.18,
      clearcoatRoughness: 0.42,
      envMapIntensity: 0.95,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
  );
  reflectiveMaterials.push(asphaltMat);

  const paveTex = track(createPavementTexture(6, 56));
  const paveBump = track(createSurfaceBumpTexture('pavement', 6, 56));
  const paveMat = track(
    new THREE.MeshStandardMaterial({
      map: paveTex,
      bumpMap: paveBump,
      bumpScale: 0.025,
      roughness: 0.82,
      metalness: 0.06,
      envMapIntensity: 0.55,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
  );

  // Red Dutch Bike Lanes (Fietspaden)
  const bikeLaneMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x7f2d28,
      roughness: 0.82,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    }),
  );

  // Split sidewalks & bike paths cleanly around cross-streets & roundabouts so zero coplanar geometry overlaps
  interface RoadCrossingGap {
    pos: number;
    gapHalf: number;
  }

  const splitSpanAroundCrossings = (
    spanMin: number,
    spanMax: number,
    crossings: RoadCrossingGap[],
  ): [number, number][] => {
    const sorted = [...crossings].sort((a, b) => a.pos - b.pos);
    const out: [number, number][] = [];
    let cursor = spanMin;
    for (const c of sorted) {
      const start = c.pos - c.gapHalf;
      const end = c.pos + c.gapHalf;
      if (start - cursor > 1.0) {
        out.push([cursor, Math.min(spanMax, start)]);
      }
      cursor = Math.max(cursor, end);
    }
    if (spanMax - cursor > 1.0) {
      out.push([cursor, spanMax]);
    }
    return out;
  };

  // Compact Primary & Ring Road Network (240m - 270m avenues)
  const addRoad = (
    cx: number,
    cz: number,
    length: number,
    vertical: boolean,
    crossings: RoadCrossingGap[],
  ) => {
    const road = new THREE.Mesh(track(new THREE.PlaneGeometry(10, length)), asphaltMat);
    road.rotation.x = -Math.PI / 2;
    if (!vertical) road.rotation.z = Math.PI / 2;
    // Distinct Y levels for vertical vs horizontal roads so crossings never Z-fight
    road.position.set(cx, vertical ? 0.042 : 0.054, cz);
    road.receiveShadow = true;
    scene.add(road);

    const originAxis = vertical ? cz : cx;
    const segments = splitSpanAroundCrossings(originAxis - length / 2, originAxis + length / 2, crossings);

    for (const [segMin, segMax] of segments) {
      const segLen = segMax - segMin;
      const segCenter = (segMin + segMax) / 2;
      for (const side of [-1, 1]) {
        const sw = new THREE.Mesh(
          track(new THREE.BoxGeometry(vertical ? 3.4 : segLen, 0.05, vertical ? segLen : 3.4)),
          paveMat,
        );
        sw.position.set(
          vertical ? cx + side * 6.7 : segCenter,
          0.075,
          vertical ? segCenter : cz + side * 6.7,
        );
        sw.receiveShadow = true;
        scene.add(sw);

        const bike = new THREE.Mesh(
          track(new THREE.PlaneGeometry(vertical ? 1.4 : segLen, vertical ? segLen : 1.4)),
          bikeLaneMat,
        );
        bike.rotation.x = -Math.PI / 2;
        bike.position.set(
          vertical ? cx + side * 5.7 : segCenter,
          0.105,
          vertical ? segCenter : cz + side * 5.7,
        );
        scene.add(bike);
      }
    }
  };

  addRoad(0, 0, 270, true, [
    { pos: -82, gapHalf: 12.8 },
    { pos: 0, gapHalf: 7.0 },
    { pos: 82, gapHalf: 12.8 },
  ]); // Oranjestraat (N-S)
  // Vuurwerklaan stops cleanly outside Afsteekzone (-56) and behind Vuurwerkpaleis (54)
  addRoad(-95.5, 0, 79, false, [{ pos: -92, gapHalf: 12.8 }]); // Vuurwerklaan West
  addRoad(94.5, 0, 81, false, [{ pos: 96, gapHalf: 12.8 }]);   // Vuurwerklaan East
  addRoad(96, 0, 240, true, [
    { pos: -82, gapHalf: 5.0 },
    { pos: 0, gapHalf: 12.8 },
    { pos: 82, gapHalf: 5.0 },
  ]); // Kroonlaan (East Ring)
  addRoad(-92, 0, 240, true, [
    { pos: -82, gapHalf: 5.0 },
    { pos: 0, gapHalf: 12.8 },
    { pos: 82, gapHalf: 5.0 },
  ]); // Vrijheidslaan (West Blvd)
  addRoad(0, -82, 240, false, [
    { pos: -92, gapHalf: 8.4 },
    { pos: 0, gapHalf: 12.8 },
    { pos: 96, gapHalf: 8.4 },
  ]); // Molenweg (North Industrial/Res)
  addRoad(0, 82, 240, false, [
    { pos: -92, gapHalf: 8.4 },
    { pos: 0, gapHalf: 12.8 },
    { pos: 96, gapHalf: 8.4 },
  ]); // Grachtensingel (South Park Blvd)

  // Clean paved pedestrian thresholds connecting Oranjestraat to Shop entrance and Afsteekzone
  const shopThreshold = new THREE.Mesh(track(new THREE.PlaneGeometry(7.0, 14)), paveMat);
  shopThreshold.rotation.x = -Math.PI / 2;
  shopThreshold.position.set(8.5, 0.048, 0);
  shopThreshold.receiveShadow = true;
  const plazaThreshold = new THREE.Mesh(track(new THREE.PlaneGeometry(6.0, 14)), paveMat);
  plazaThreshold.rotation.x = -Math.PI / 2;
  plazaThreshold.position.set(-8.0, 0.048, 0);
  plazaThreshold.receiveShadow = true;
  scene.add(shopThreshold, plazaThreshold);

  // 4 Dutch Roundabouts (Rotondes) at Ring Road Intersections (flat disc with polygonOffset to avoid road Z-fighting)
  const roundaboutSpots: [number, number][] = [
    [0, -82],
    [0, 82],
    [96, 0],
    [-92, 0],
  ];
  const rotondeAsphaltMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x222730,
      roughness: 0.72,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    }),
  );
  const rotondeCurbMat = track(new THREE.MeshStandardMaterial({ color: 0x9ca3af, roughness: 0.8 }));
  const rotondeCenterMat = track(new THREE.MeshStandardMaterial({ color: 0x265c2e, roughness: 0.9 }));

  const rotondeDiscGeo = track(new THREE.CircleGeometry(12.5, 28));
  for (const [rx, rz] of roundaboutSpots) {
    const outer = new THREE.Mesh(rotondeDiscGeo, rotondeAsphaltMat);
    outer.rotation.x = -Math.PI / 2;
    outer.position.set(rx, 0.068, rz);
    outer.receiveShadow = true;
    const curb = new THREE.Mesh(track(new THREE.CylinderGeometry(5.2, 5.4, 0.22, 24)), rotondeCurbMat);
    curb.position.set(rx, 0.14, rz);
    const island = new THREE.Mesh(track(new THREE.CylinderGeometry(4.5, 4.7, 0.34, 24)), rotondeCenterMat);
    island.position.set(rx, 0.2, rz);
    scene.add(outer, curb, island);
  }

  // Dutch Zebra Crossings & Authentic Street Signs
  const zebraTex = track(createZebraCrossingTexture());
  const zebraMat = track(
    new THREE.MeshStandardMaterial({
      map: zebraTex,
      transparent: true,
      roughness: 0.72,
      depthWrite: false,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
    }),
  );
  const zebraSpots: [number, number, number][] = [
    [0, -11, 0],
    [0, 11, 0],
    [0, -68, 0],
    [0, 68, 0],
    [82, 0, Math.PI / 2],
    [-76, 0, Math.PI / 2],
  ];
  const zebraGeo = track(new THREE.PlaneGeometry(8.5, 3.6));
  for (const [zx, zz, rot] of zebraSpots) {
    const zm = new THREE.Mesh(zebraGeo, zebraMat);
    zm.rotation.x = -Math.PI / 2;
    zm.rotation.z = rot;
    zm.position.set(zx, 0.072, zz);
    scene.add(zm);
  }

  const signPoleGeo = track(new THREE.CylinderGeometry(0.045, 0.055, 2.75, 8));
  const signPoleMat = track(new THREE.MeshStandardMaterial({ color: 0x94a3b8, metalness: 0.75, roughness: 0.3 }));
  const signKinds: ('30' | 'voorrang' | 'parkeren' | 'afsteekzone')[] = ['30', 'voorrang', 'parkeren', 'afsteekzone'];
  const signMats = Object.fromEntries(
    signKinds.map((k) => [
      k,
      track(
        new THREE.MeshStandardMaterial({
          map: track(createTrafficSignTexture(k)),
          transparent: true,
          alphaTest: 0.15,
          roughness: 0.35,
          metalness: 0.15,
          side: THREE.DoubleSide,
        }),
      ),
    ]),
  ) as Record<'30' | 'voorrang' | 'parkeren' | 'afsteekzone', THREE.MeshStandardMaterial>;

  const streetSigns: { x: number; z: number; rotY: number; kind: '30' | 'voorrang' | 'parkeren' | 'afsteekzone' }[] = [
    { x: -10.5, z: -13.5, rotY: Math.PI / 2, kind: 'afsteekzone' },
    { x: -10.5, z: 13.5, rotY: Math.PI / 2, kind: 'afsteekzone' },
    { x: 10.6, z: 24.5, rotY: -Math.PI / 2, kind: 'parkeren' },
    { x: 54.0, z: 25.0, rotY: Math.PI, kind: 'parkeren' },
    { x: 6.2, z: -26, rotY: 0, kind: '30' },
    { x: -6.2, z: 26, rotY: Math.PI, kind: '30' },
    { x: 6.2, z: -65, rotY: 0, kind: 'voorrang' },
    { x: -6.2, z: 65, rotY: Math.PI, kind: 'voorrang' },
    { x: 88, z: -6.5, rotY: -Math.PI / 2, kind: '30' },
    { x: -84, z: 6.5, rotY: Math.PI / 2, kind: '30' },
  ];
  const signFaceGeo = track(new THREE.PlaneGeometry(0.75, 0.75));
  for (const s of streetSigns) {
    const g = new THREE.Group();
    const pole = new THREE.Mesh(signPoleGeo, signPoleMat);
    pole.position.y = 1.375;
    pole.castShadow = true;
    const face = new THREE.Mesh(signFaceGeo, signMats[s.kind]);
    face.position.set(0, 2.55, 0.05);
    g.add(pole, face);
    g.position.set(s.x, 0.095, s.z);
    g.rotation.y = s.rotY;
    scene.add(g);
  }

  // 4. DESIGNATED FIREWORKS FIELD (Afsteekzone Vuurwerkplein)
  const plazaTex = track(createPavementTexture(18, 22));
  const plazaMat = track(
    new THREE.MeshStandardMaterial({
      map: plazaTex,
      bumpMap: paveBump,
      bumpScale: 0.025,
      color: 0x646b78,
      roughness: 0.82,
    }),
  );
  // Main paved display plaza (x: -56..-11, z: -34..34), top at y=0.095 (clear above Vuurwerklaan at y=0.054)
  const plaza = new THREE.Mesh(track(new THREE.BoxGeometry(45, 0.06, 68)), plazaMat);
  plaza.position.set(-33.5, 0.065, 0);
  plaza.receiveShadow = true;
  scene.add(plaza);

  // Outer event field gravel/turf apron (x: -83..-56, z: -44..44) below road & plaza
  const fieldApronMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x2a3b2c,
      roughness: 0.92,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
  );
  const fieldApron = new THREE.Mesh(track(new THREE.PlaneGeometry(27, 88)), fieldApronMat);
  fieldApron.rotation.x = -Math.PI / 2;
  fieldApron.position.set(-69.5, 0.025, 0);
  fieldApron.receiveShadow = true;
  scene.add(fieldApron);

  const zoneSignTex = track(
    createSignTexture(
      'AFSTEEKZONE VUURWERKPLEIN',
      'MULTIPLAYER EVENEMENTENVELD · 12 LANCEERPADS',
      '#1F2937',
      '#F97316',
      1024,
      256,
    ),
  );
  const zoneSignMat = track(
    new THREE.MeshStandardMaterial({
      map: zoneSignTex,
      roughness: 0.72,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    }),
  );
  const zoneSignMesh = new THREE.Mesh(track(new THREE.PlaneGeometry(18, 4.5)), zoneSignMat);
  zoneSignMesh.rotation.x = -Math.PI / 2;
  zoneSignMesh.rotation.z = Math.PI / 2;
  zoneSignMesh.position.set(-15.5, 0.108, 0);
  scene.add(zoneSignMesh);

  // 12 Numbered Launch Pads (Pads 0..6 at x=-30, Pads 7..11 at x=-46)
  const displayPads: THREE.Vector3[] = [];
  const padGeo = track(new THREE.CylinderGeometry(0.95, 1.05, 0.04, 16));
  const padMat = track(new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.55, metalness: 0.25 }));
  const padRingGeo = track(new THREE.RingGeometry(0.75, 0.92, 20));
  const padRingMat = track(
    new THREE.MeshBasicMaterial({
      color: 0xf59e0b,
      side: THREE.DoubleSide,
      polygonOffset: true,
      polygonOffsetFactor: -4,
      polygonOffsetUnits: -4,
    }),
  );
  for (let i = 0; i < 7; i++) {
    const pz = -15 + i * 5;
    const px = -30;
    displayPads.push(new THREE.Vector3(px, 0.135, pz));
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.position.set(px, 0.115, pz);
    pad.receiveShadow = true;
    const ring = new THREE.Mesh(padRingGeo, padRingMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(px, 0.142, pz);
    scene.add(pad, ring);
  }
  for (let i = 0; i < 5; i++) {
    const pz = -16 + i * 8;
    const px = -46;
    displayPads.push(new THREE.Vector3(px, 0.135, pz));
    const pad = new THREE.Mesh(padGeo, padMat);
    pad.position.set(px, 0.115, pz);
    pad.receiveShadow = true;
    const ring = new THREE.Mesh(padRingGeo, padRingMat);
    ring.rotation.x = -Math.PI / 2;
    ring.position.set(px, 0.142, pz);
    scene.add(pad, ring);
  }

  // Spectator Viewing Stand along North-East edge of Afsteekzone (x=-28, z=-36)
  const standMat = track(new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 }));
  const woodMat = track(new THREE.MeshStandardMaterial({ color: 0x7c4d2b, roughness: 0.85 }));
  const standGroup = new THREE.Group();
  for (let step = 0; step < 3; step++) {
    const bench = new THREE.Mesh(track(new THREE.BoxGeometry(16, 0.35, 1.1)), step === 0 ? standMat : woodMat);
    bench.position.set(-28, 0.25 + step * 0.45, -36 - step * 1.15);
    bench.castShadow = true;
    bench.receiveShadow = true;
    standGroup.add(bench);
  }
  scene.add(standGroup);
  colliders.push({ minX: -36.5, maxX: -19.5, minZ: -39.5, maxZ: -35.2 });

  // Safety Cones around Afsteekzone perimeter
  const coneGeo = track(new THREE.ConeGeometry(0.24, 0.65, 12));
  const coneMat = track(new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.45 }));
  const coneBaseGeo = track(new THREE.BoxGeometry(0.5, 0.05, 0.5));
  const coneBaseMat = track(new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.8 }));
  const conePositions: [number, number][] = [
    [-11.5, -30], [-11.5, -18], [-11.5, -9], [-11.5, 9], [-11.5, 18], [-11.5, 30],
    [-55.5, -30], [-55.5, -15], [-55.5, 15], [-55.5, 30],
  ];
  for (const [cx, cz] of conePositions) {
    const g = new THREE.Group();
    const b = new THREE.Mesh(coneBaseGeo, coneBaseMat);
    b.position.y = 0.025;
    const c = new THREE.Mesh(coneGeo, coneMat);
    c.position.y = 0.35;
    c.castShadow = true;
    g.add(b, c);
    g.position.set(cx, 0.095, cz);
    scene.add(g);
  }

  // 5. MEGA DUTCH FIREWORKS SUPERMARKET ("Vuurwerkpaleis De Gouden Pijl")
  const shopFloorTex = track(createShopFloorTexture(14, 16));
  const shopFloorBump = track(createSurfaceBumpTexture('tiles', 14, 16));
  const shopFloorMat = track(
    new THREE.MeshStandardMaterial({
      map: shopFloorTex,
      bumpMap: shopFloorBump,
      bumpScale: 0.015,
      roughness: 0.32,
      metalness: 0.16,
    }),
  );
  const shopFloor = new THREE.Mesh(track(new THREE.BoxGeometry(42, 0.07, 50)), shopFloorMat);
  shopFloor.position.set(33, 0.07, -1);
  shopFloor.receiveShadow = true;
  scene.add(shopFloor);

  const shopWallBrickTex = track(createBrickTexture('#2B2F3A', '#1B1E26', 8, 2));
  const brickBump = track(createSurfaceBumpTexture('brick', 8, 2));
  const shopWallMat = track(
    new THREE.MeshStandardMaterial({
      map: shopWallBrickTex,
      bumpMap: brickBump,
      bumpScale: 0.035,
      roughness: 0.76,
    }),
  );
  const interiorWallMat = track(new THREE.MeshStandardMaterial({ color: 0x141923, roughness: 0.72 }));
  const trimGoldMat = track(new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.25, metalness: 0.78 }));
  const glassMat = track(
    new THREE.MeshPhysicalMaterial({
      color: 0xa5d8ff,
      roughness: 0.05,
      metalness: 0.18,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      envMapIntensity: 1.4,
      transparent: true,
      opacity: isSoftwareGl ? 0.35 : 0.32,
      depthWrite: false,
    }),
  );
  reflectiveMaterials.push(glassMat);

  const addWall = (
    cx: number,
    cy: number,
    cz: number,
    w: number,
    h: number,
    d: number,
    mat: THREE.Material,
    addCollider = true,
  ) => {
    const m = new THREE.Mesh(track(new THREE.BoxGeometry(w, h, d)), mat);
    m.position.set(cx, cy, cz);
    m.castShadow = true;
    m.receiveShadow = true;
    scene.add(m);
    if (addCollider) {
      colliders.push({
        minX: cx - w / 2,
        maxX: cx + w / 2,
        minZ: cz - d / 2,
        maxZ: cz + d / 2,
      });
    }
    return m;
  };

  addWall(54, 3.3, -1, 0.45, 6.6, 50.4, shopWallMat);
  addWall(33, 3.3, -26, 42.4, 6.6, 0.45, shopWallMat);
  addWall(33, 3.3, 24, 42.4, 6.6, 0.45, shopWallMat);

  addWall(12, 0.55, -14.7, 0.45, 1.1, 22.6, shopWallMat, true);
  addWall(12, 3.1, -14.7, 0.15, 4.0, 21.8, glassMat, false);
  addWall(12, 5.8, -14.7, 0.45, 1.6, 22.6, shopWallMat, false);

  addWall(12, 0.55, 13.7, 0.45, 1.1, 20.6, shopWallMat, true);
  addWall(12, 3.1, 13.7, 0.15, 4.0, 19.8, glassMat, false);
  addWall(12, 5.8, 13.7, 0.45, 1.6, 20.6, shopWallMat, false);

  addWall(12, 5.4, 0, 0.55, 2.4, 7.2, shopWallMat, false);
  addWall(11.75, 4.25, 0, 0.16, 0.16, 7.2, trimGoldMat, false);

  const roof = new THREE.Mesh(track(new THREE.BoxGeometry(43, 0.35, 51)), interiorWallMat);
  roof.position.set(33, 6.75, -1);
  scene.add(roof);

  const mainSignTex = track(
    createSignTexture(
      'VUURWERKPALEIS DE GOUDEN PIJL',
      '220+ PRODUCTEN · ONBEPERKT SHOPPEN · MULTIPLAYER',
      '#0B0E14',
      '#F59E0B',
      1024,
      256,
    ),
  );
  const mainSignMat = track(
    new THREE.MeshStandardMaterial({
      map: mainSignTex,
      emissiveMap: mainSignTex,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0.85,
      roughness: 0.28,
    }),
  );
  const signBoard = new THREE.Mesh(track(new THREE.BoxGeometry(0.28, 2.5, 16)), mainSignMat);
  signBoard.position.set(11.6, 5.55, -0.5);
  scene.add(signBoard);

  // Interior Ceiling Lights
  const fixtureGeo = track(new THREE.BoxGeometry(2.6, 0.12, 0.75));
  const fixtureMat = track(new THREE.MeshBasicMaterial({ color: 0xfff5dc }));
  const shopLightCoords: [number, number][] = [
    [19, -15], [19, 0], [19, 14],
    [32, -15], [32, 0], [32, 14],
    [45, -15], [47, 1], [45, 14],
  ];
  for (const [lx, lz] of shopLightCoords) {
    const fix = new THREE.Mesh(fixtureGeo, fixtureMat);
    fix.position.set(lx, 6.5, lz);
    scene.add(fix);

    const pt = new THREE.PointLight(0xfff1d6, 26, 30, 1.3);
    pt.position.set(lx, 5.8, lz);
    scene.add(pt);
    streetLampLights.push({ light: pt, x: lx, z: lz });
  }

  // Shelving Aisles + 220 Interactive Products
  const shelfFrameMat = track(new THREE.MeshStandardMaterial({ color: 0x262c3a, roughness: 0.45, metalness: 0.6 }));
  const shelfBoardMat = track(new THREE.MeshStandardMaterial({ color: 0x1b202b, roughness: 0.6, metalness: 0.25 }));
  const priceTagMat = track(new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.35 }));
  const hitboxGeo = track(new THREE.BoxGeometry(0.75, 0.65, 0.75));
  const hitboxMat = track(new THREE.MeshBasicMaterial({ visible: false }));

  interface ShelfSlot {
    x: number;
    y: number;
    z: number;
    rotY: number;
  }
  const regularSlots: ShelfSlot[] = [];
  const premiumSlots: ShelfSlot[] = [];

  const shelfLocations: {
    x: number;
    zStart: number;
    zEnd: number;
    facing: 'east' | 'west' | 'both';
    label: string;
  }[] = [
    { x: 19.5, zStart: -21, zEnd: 11, facing: 'both', label: 'THUNDER KINGS & CAKES' },
    { x: 25.5, zStart: -21, zEnd: 11, facing: 'both', label: 'CAKES & COMPOUNDS' },
    { x: 31.5, zStart: -21, zEnd: 11, facing: 'both', label: 'AERIAL & SHELLS' },
    { x: 37.5, zStart: -21, zEnd: 11, facing: 'both', label: 'FONTEINEN & ROOK' },
    { x: 43.5, zStart: -21, zEnd: 11, facing: 'both', label: 'PIJLEN & KAARSEN' },
    { x: 52.0, zStart: -22, zEnd: 20, facing: 'west', label: 'MEGA FINALES & SHOWBOXES' },
  ];

  for (const sh of shelfLocations) {
    const len = sh.zEnd - sh.zStart;
    const cz = (sh.zStart + sh.zEnd) / 2;
    const width = sh.facing === 'both' ? 1.25 : 0.9;

    const spine = new THREE.Mesh(track(new THREE.BoxGeometry(0.1, 2.55, len)), shelfFrameMat);
    spine.position.set(sh.x, 1.275, cz);
    scene.add(spine);

    for (const ly of [0.55, 1.3, 2.05]) {
      const board = new THREE.Mesh(track(new THREE.BoxGeometry(width, 0.06, len)), shelfBoardMat);
      board.position.set(sh.x, ly, cz);
      board.castShadow = true;
      board.receiveShadow = true;
      scene.add(board);

      if (sh.facing === 'both' || sh.facing === 'west') {
        const rail = new THREE.Mesh(track(new THREE.BoxGeometry(0.02, 0.05, len)), priceTagMat);
        rail.position.set(sh.x - width / 2, ly - 0.01, cz);
        scene.add(rail);
      }
      if (sh.facing === 'both' || sh.facing === 'east') {
        const rail = new THREE.Mesh(track(new THREE.BoxGeometry(0.02, 0.05, len)), priceTagMat);
        rail.position.set(sh.x + width / 2, ly - 0.01, cz);
        scene.add(rail);
      }
    }

    const catSignTex = track(createSignTexture(sh.label, '', '#0B0E15', '#F59E0B', 512, 128));
    const catSignMat = track(
      new THREE.MeshStandardMaterial({
        map: catSignTex,
        emissiveMap: catSignTex,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: 0.45,
        roughness: 0.4,
      }),
    );
    const catSign = new THREE.Mesh(track(new THREE.BoxGeometry(0.12, 0.65, 3.2)), catSignMat);
    catSign.position.set(sh.x, 4.2, cz);
    scene.add(catSign);

    colliders.push({
      minX: sh.x - width / 2 - 0.15,
      maxX: sh.x + width / 2 + 0.15,
      minZ: sh.zStart - 0.15,
      maxZ: sh.zEnd + 0.15,
    });

    const step = 1.45;
    for (let z = sh.zStart + 0.8; z <= sh.zEnd - 0.7; z += step) {
      for (const ly of [0.58, 1.33]) {
        if (sh.facing === 'both' || sh.facing === 'west') {
          regularSlots.push({ x: sh.x - width * 0.25, y: ly, z, rotY: -Math.PI / 2 });
        }
        if (sh.facing === 'both' || sh.facing === 'east') {
          regularSlots.push({ x: sh.x + width * 0.25, y: ly, z, rotY: Math.PI / 2 });
        }
      }
    }
  }

  // Premium Collector Pavilion
  const pavBase = new THREE.Mesh(track(new THREE.BoxGeometry(2.4, 0.14, 12)), trimGoldMat);
  pavBase.position.set(47.8, 0.14, 0);
  pavBase.receiveShadow = true;
  scene.add(pavBase);

  const pavPedestal = new THREE.Mesh(track(new THREE.BoxGeometry(1.4, 0.85, 11.2)), shelfFrameMat);
  pavPedestal.position.set(47.8, 0.56, 0);
  pavPedestal.castShadow = true;
  pavPedestal.receiveShadow = true;
  scene.add(pavPedestal);

  const pavTop = new THREE.Mesh(track(new THREE.BoxGeometry(1.5, 0.08, 11.4)), trimGoldMat);
  pavTop.position.set(47.8, 1.0, 0);
  scene.add(pavTop);

  const pavHeaderTex = track(
    createSignTexture('COLLECTOR PAVILJOEN', 'EXCLUSIEVE PREMIUM SHOWBOXEN', '#140E05', '#FDE047', 1024, 256),
  );
  const pavHeaderMat = track(
    new THREE.MeshStandardMaterial({
      map: pavHeaderTex,
      emissiveMap: pavHeaderTex,
      emissive: new THREE.Color(0xffffff),
      emissiveIntensity: 0.75,
    }),
  );
  const pavHeader = new THREE.Mesh(track(new THREE.BoxGeometry(0.18, 1.0, 5.6)), pavHeaderMat);
  pavHeader.position.set(47.8, 3.8, 0);
  scene.add(pavHeader);

  const pavLight = new THREE.PointLight(0xfde047, 22, 18, 1.4);
  pavLight.position.set(47.8, 3.2, 0);
  scene.add(pavLight);
  streetLampLights.push({ light: pavLight, x: 47.8, z: 0 });

  colliders.push({ minX: 46.8, maxX: 48.8, minZ: -6.0, maxZ: 6.0 });

  for (let z = -5.0; z <= 5.0; z += 1.4) {
    premiumSlots.push({ x: 47.4, y: 1.04, z, rotY: -Math.PI / 2 });
    premiumSlots.push({ x: 48.2, y: 1.04, z, rotY: Math.PI / 2 });
  }

  let regIdx = 0;
  let premIdx = 0;
  PRODUCTS.forEach((product: FireworkProduct) => {
    const usePremium = product.tier === 'premium' && premIdx < premiumSlots.length;
    const slot = usePremium
      ? premiumSlots[premIdx++]
      : regularSlots[regIdx++ % regularSlots.length];
    if (!slot) return;

    const model = createFireworkModel(product);
    model.position.set(slot.x, slot.y, slot.z);
    model.rotation.y = slot.rotY;
    scene.add(model);
    track({ dispose: () => (model.userData.dispose as (() => void) | undefined)?.() });

    const proxy = new THREE.Mesh(hitboxGeo, hitboxMat);
    proxy.position.set(slot.x, slot.y + 0.3, slot.z);
    proxy.layers.enable(1);
    scene.add(proxy);

    interactables.push({
      mesh: proxy,
      type: 'shop_product',
      productId: product.id,
      label: product.name,
      sublabel: `€${product.price.toFixed(2)} · ${product.category} · [E] Inspecteren`,
    });
  });

  // Twin Checkouts & Basket Station
  const buildCheckoutCounter = (cx: number, cz: number) => {
    const counterGroup = new THREE.Group();
    const counterBase = new THREE.Mesh(track(new THREE.BoxGeometry(3.4, 1.05, 1.1)), shelfFrameMat);
    counterBase.position.y = 0.525;
    const counterTop = new THREE.Mesh(track(new THREE.BoxGeometry(3.55, 0.08, 1.25)), trimGoldMat);
    counterTop.position.y = 1.08;
    const registerBox = new THREE.Mesh(track(new THREE.BoxGeometry(0.55, 0.35, 0.45)), shelfBoardMat);
    registerBox.position.set(0.4, 1.29, 0);
    const posScreen = new THREE.Mesh(
      track(new THREE.BoxGeometry(0.42, 0.32, 0.05)),
      track(new THREE.MeshBasicMaterial({ color: 0xf59e0b })),
    );
    posScreen.position.set(0.4, 1.55, -0.1);
    posScreen.rotation.x = -0.2;
    counterGroup.add(counterBase, counterTop, registerBox, posScreen);
    counterGroup.position.set(cx, 0.08, cz);
    scene.add(counterGroup);

    colliders.push({ minX: cx - 1.9, maxX: cx + 1.9, minZ: cz - 0.7, maxZ: cz + 0.7 });

    const checkoutHitbox = new THREE.Mesh(track(new THREE.BoxGeometry(3.6, 1.8, 1.4)), hitboxMat);
    checkoutHitbox.position.set(cx, 1.0, cz);
    checkoutHitbox.layers.enable(1);
    scene.add(checkoutHitbox);
    interactables.push({
      mesh: checkoutHitbox,
      type: 'checkout',
      label: 'Kassa & Afrekenen',
      sublabel: '[E] Winkelmand bekijken & direct afrekenen',
    });
  };
  buildCheckoutCounter(16.5, 15.5);
  buildCheckoutCounter(23.0, 15.5);

  const basketStack = new THREE.Group();
  const basketMat = track(new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.4 }));
  for (let b = 0; b < 6; b++) {
    const bk = new THREE.Mesh(track(new THREE.BoxGeometry(0.5, 0.22, 0.36)), basketMat);
    bk.position.y = 0.12 + b * 0.07;
    basketStack.add(bk);
  }
  basketStack.position.set(14.2, 0.08, -6.5);
  scene.add(basketStack);

  const basketHitbox = new THREE.Mesh(track(new THREE.BoxGeometry(0.9, 1.2, 0.9)), hitboxMat);
  basketHitbox.position.set(14.2, 0.65, -6.5);
  basketHitbox.layers.enable(1);
  scene.add(basketHitbox);
  interactables.push({
    mesh: basketHitbox,
    type: 'basket_station',
    label: 'Winkelmandjes & Mega Catalogus',
    sublabel: '[E] Open supermarkt catalogus (220+ artikelen)',
  });

  const info1Tex = track(
    createInfoBoardTexture('VUURWERK SUPERMARKT', [
      '220+ Unieke Vuurwerkproducten!',
      'Multiplayer Vuurwerkshows (max 12)',
      'Onbeperkt Geld ingeschakeld (€∞)',
      'Open Testomgeving bovenin voor 3D preview',
      'Druk [T] voor Multiplayer Chat',
    ]),
  );
  const info1 = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.12, 2.2, 2.2)),
    track(new THREE.MeshStandardMaterial({ map: info1Tex, roughness: 0.45 })),
  );
  info1.position.set(12.35, 2.4, -14.5);
  scene.add(info1);

  const info2Tex = track(
    createInfoBoardTexture(
      'VEILIG AFSTEKEN (SIMULATIE)',
      [
        '1. Koop onbeperkt in de winkel',
        '2. Loop naar het Afsteekveld',
        '3. Druk [F] om te plaatsen, [R] draaien',
        '4. Pak Aansteker [1] & klik [E]',
        '5. Kijk samen met online spelers!',
      ],
      '#F97316',
    ),
  );
  const info2 = new THREE.Mesh(
    track(new THREE.BoxGeometry(0.12, 2.2, 2.2)),
    track(new THREE.MeshStandardMaterial({ map: info2Tex, roughness: 0.45 })),
  );
  info2.position.set(12.35, 2.4, 12.5);
  scene.add(info2);

  // Parking Lots around Supermarket & Winkelstraat
  const parkingLot = new THREE.Mesh(
    track(new THREE.BoxGeometry(44, 0.05, 22)),
    track(
      new THREE.MeshStandardMaterial({
        map: track(createPavementTexture(14, 8)),
        roughness: 0.82,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      }),
    ),
  );
  parkingLot.position.set(32, 0.065, 36);
  parkingLot.receiveShadow = true;
  scene.add(parkingLot);

  const stripeMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xe5e7eb,
      roughness: 0.7,
      polygonOffset: true,
      polygonOffsetFactor: -3,
      polygonOffsetUnits: -3,
    }),
  );
  for (let i = 0; i < 8; i++) {
    const stripe = new THREE.Mesh(track(new THREE.PlaneGeometry(0.14, 4.4)), stripeMat);
    stripe.rotation.x = -Math.PI / 2;
    stripe.position.set(14 + i * 4.5, 0.095, 42);
    scene.add(stripe);
  }

  // 6. COMMERCIAL DISTRICT (Winkelstraat, Restaurants & OranjeOlie Gas Station, west of Kroonlaan)
  const commercialChunk = new THREE.Group();
  const buildCommercialBuilding = (
    x: number,
    z: number,
    w: number,
    h: number,
    d: number,
    wallColor: number,
    signTitle: string,
    signSub: string,
    signAccent: string,
    facingZ: 1 | -1,
  ) => {
    const g = new THREE.Group();
    const bMat = track(new THREE.MeshStandardMaterial({ color: wallColor, roughness: 0.72 }));
    const body = new THREE.Mesh(track(new THREE.BoxGeometry(w, h, d)), bMat);
    body.position.y = h / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    g.add(body);

    const winM = track(
      new THREE.MeshStandardMaterial({
        color: 0xfef3c7,
        emissive: new THREE.Color(0xfbbf24),
        emissiveIntensity: 0.85,
        roughness: 0.2,
      }),
    );
    windowMaterials.push(winM);
    const shopFront = new THREE.Mesh(track(new THREE.BoxGeometry(w * 0.78, 2.2, 0.14)), winM);
    shopFront.position.set(0, 1.35, facingZ * (d / 2 + 0.02));
    g.add(shopFront);

    const sTex = track(createSignTexture(signTitle, signSub, '#0F131C', signAccent, 512, 128));
    const sMat = track(
      new THREE.MeshStandardMaterial({
        map: sTex,
        emissiveMap: sTex,
        emissive: new THREE.Color(0xffffff),
        emissiveIntensity: 0.75,
      }),
    );
    const sign = new THREE.Mesh(track(new THREE.BoxGeometry(w * 0.82, 1.05, 0.18)), sMat);
    sign.position.set(0, 3.35, facingZ * (d / 2 + 0.06));
    g.add(sign);

    g.position.set(x, 0, z);
    commercialChunk.add(g);
    colliders.push({ minX: x - w / 2 - 0.2, maxX: x + w / 2 + 0.2, minZ: z - d / 2 - 0.2, maxZ: z + d / 2 + 0.2 });
  };

  // Split commercial paved aprons cleanly north and south of Vuurwerklaan (z=-9..-62 and z=9..62)
  const commPlazaNorth = new THREE.Mesh(track(new THREE.PlaneGeometry(30, 53)), paveMat);
  commPlazaNorth.rotation.x = -Math.PI / 2;
  commPlazaNorth.position.set(71, 0.032, -35.5);
  commPlazaNorth.receiveShadow = true;
  const commPlazaSouth = new THREE.Mesh(track(new THREE.PlaneGeometry(30, 53)), paveMat);
  commPlazaSouth.rotation.x = -Math.PI / 2;
  commPlazaSouth.position.set(71, 0.032, 35.5);
  commPlazaSouth.receiveShadow = true;
  commercialChunk.add(commPlazaNorth, commPlazaSouth);

  buildCommercialBuilding(65, -22, 13, 5.2, 11, 0x334155, 'BAKKERIJ VAN ORANJE', 'OLIEBOLLEN & APPELFLAPPEN', '#F59E0B', 1);
  buildCommercialBuilding(80, -22, 13, 5.6, 11, 0x3f2e26, 'BRASSERIE DE KROON', 'EETCAFÉ & TERRAS', '#FB923C', 1);
  buildCommercialBuilding(65, -48, 14, 6.2, 12, 0x1e293b, 'ORANJE ELEKTRONICA', 'AUDIO & LICHTSHOWS', '#38BDF8', -1);
  buildCommercialBuilding(80, -48, 13, 5.8, 12, 0x292524, 'PIZZERIA VULKAAN', 'VERS GEBAKKEN', '#EF4444', -1);
  buildCommercialBuilding(65, 22, 13, 5.0, 10, 0x1e3a5f, 'ORANJE SPORT & MODE', 'WINTERCOLLECTIE', '#60A5FA', -1);

  // Café Terrace Tables outside Brasserie De Kroon
  for (const tx of [76, 80, 84]) {
    const tbl = new THREE.Mesh(track(new THREE.CylinderGeometry(0.6, 0.6, 0.78, 10)), woodMat);
    tbl.position.set(tx, 0.42, -14.2);
    commercialChunk.add(tbl);
  }

  // Dutch Gas Station ("ORANJE OLIE 24/7") at x: 76, z: 38
  const gsCanopy = new THREE.Mesh(
    track(new THREE.BoxGeometry(16, 0.55, 10)),
    track(new THREE.MeshStandardMaterial({ color: 0xf97316, roughness: 0.35 })),
  );
  gsCanopy.position.set(76, 4.6, 38);
  gsCanopy.castShadow = true;
  commercialChunk.add(gsCanopy);

  const gsShop = new THREE.Mesh(
    track(new THREE.BoxGeometry(10, 3.8, 7)),
    track(new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 })),
  );
  gsShop.position.set(76, 1.9, 51);
  gsShop.castShadow = true;
  commercialChunk.add(gsShop);
  colliders.push({ minX: 70.8, maxX: 81.2, minZ: 47.3, maxZ: 54.7 });

  const gsSignTex = track(createSignTexture('ORANJE OLIE 24/7', 'EURO 95 €1.98 · SHOP OPEN', '#0F172A', '#F97316', 512, 128));
  const gsSign = new THREE.Mesh(
    track(new THREE.BoxGeometry(15.8, 0.6, 0.2)),
    track(new THREE.MeshStandardMaterial({ map: gsSignTex, emissiveMap: gsSignTex, emissive: 0xffffff, emissiveIntensity: 0.85 })),
  );
  gsSign.position.set(76, 4.6, 32.9);
  commercialChunk.add(gsSign);

  const pillarGeo = track(new THREE.CylinderGeometry(0.24, 0.24, 4.6, 10));
  const metalDarkMat = track(new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.4, metalness: 0.7 }));
  for (const px of [70, 82]) {
    const p = new THREE.Mesh(pillarGeo, metalDarkMat);
    p.position.set(px, 2.3, 38);
    commercialChunk.add(p);
  }
  const pumpMat = track(new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.4 }));
  for (const px of [73, 76, 79]) {
    const pump = new THREE.Mesh(track(new THREE.BoxGeometry(0.9, 1.65, 0.65)), pumpMat);
    pump.position.set(px, 0.85, 38);
    commercialChunk.add(pump);
    colliders.push({ minX: px - 0.55, maxX: px + 0.55, minZ: 37.6, maxZ: 38.4 });
  }

  scene.add(commercialChunk);
  chunks.push({ group: commercialChunk, cx: 71, cz: 0, radius: 75 });

  // 7. INSTANCED RESIDENTIAL NEIGHBORHOODS (180+ Detailed Dutch Brick Houses with Roof Tiles, Chimneys & Window Frames)
  const brickRedTex = track(createBrickTexture('#7A2E20', '#A3998C', 3, 2));
  const brickBrownTex = track(createBrickTexture('#5C3A2E', '#8F8578', 3, 2));
  const houseBrickBump = track(createSurfaceBumpTexture('brick', 3, 2));
  const brickRedMat = track(
    new THREE.MeshStandardMaterial({ map: brickRedTex, bumpMap: houseBrickBump, bumpScale: 0.032, roughness: 0.84 }),
  );
  const brickBrownMat = track(
    new THREE.MeshStandardMaterial({ map: brickBrownTex, bumpMap: houseBrickBump, bumpScale: 0.032, roughness: 0.84 }),
  );
  const roofTileTex = track(createRoofTileTexture('#5E2C22', 4, 3));
  const roofTileBump = track(createSurfaceBumpTexture('rooftiles', 4, 3));
  const roofTileMat = track(
    new THREE.MeshStandardMaterial({ map: roofTileTex, bumpMap: roofTileBump, bumpScale: 0.04, roughness: 0.72 }),
  );
  const hedgeMat = track(new THREE.MeshStandardMaterial({ color: 0x1f4a27, roughness: 0.9 }));
  const houseWinTex = track(createHouseWindowTexture());
  const houseWinMat = track(
    new THREE.MeshStandardMaterial({
      map: houseWinTex,
      emissiveMap: houseWinTex,
      emissive: new THREE.Color(0xfbbf24),
      emissiveIntensity: 0.9,
      roughness: 0.16,
      metalness: 0.12,
    }),
  );
  windowMaterials.push(houseWinMat);
  const doorMat = track(new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.45, metalness: 0.1 }));

  interface HousePlacement {
    x: number;
    z: number;
    rotY: number;
    alt: boolean;
  }
  const houses: HousePlacement[] = [];

  // Oranjestraat North & South Row Houses
  for (let i = 0; i < 4; i++) {
    houses.push({ x: -16, z: -36 - i * 10, rotY: 0, alt: i % 2 === 1 });
    houses.push({ x: 16, z: -36 - i * 10, rotY: Math.PI, alt: i % 2 === 0 });
  }
  for (let i = 0; i < 2; i++) {
    houses.push({ x: 16, z: 58 + i * 10, rotY: Math.PI, alt: i % 2 === 1 });
  }
  // Oranjewijk Noord (z = -102..-124)
  for (const [rowIdx, rz] of [-102, -124].entries()) {
    for (let col = 0; col < 11; col++) {
      const rx = -74 + col * 14;
      if (Math.abs(rx) < 16) continue;
      houses.push({ x: rx, z: rz, rotY: rowIdx % 2 === 0 ? Math.PI / 2 : -Math.PI / 2, alt: (rowIdx + col) % 2 === 0 });
    }
  }
  // Bloemenbuurt Oost (x = 112..128, z = -60..120)
  for (const [rowIdx, rz] of [-60, -40, -22, 22, 42, 62, 102, 120].entries()) {
    for (let col = 0; col < 2; col++) {
      const rx = 112 + col * 16;
      houses.push({ x: rx, z: rz, rotY: rowIdx % 2 === 0 ? Math.PI / 2 : -Math.PI / 2, alt: (rowIdx + col) % 2 === 1 });
    }
  }
  // West Residential Strip behind Vrijheidslaan (x = -112..-128, z = -60..62)
  for (const [rowIdx, rz] of [-60, -38, -20, 20, 42, 62].entries()) {
    for (let col = 0; col < 2; col++) {
      houses.push({ x: -112 - col * 16, z: rz, rotY: -Math.PI / 2, alt: (rowIdx + col) % 2 === 0 });
    }
  }

  const hw = 8.4;
  const hh = 6.8;
  const hd = 7.4;

  const redHouses = houses.filter((h) => !h.alt);
  const brownHouses = houses.filter((h) => h.alt);

  const houseBodyGeo = track(new THREE.BoxGeometry(hw, hh, hd));
  const houseRoofGeo = track(new THREE.CylinderGeometry(0.1, hd * 0.74, hw + 0.45, 4));
  const houseChimneyGeo = track(new THREE.BoxGeometry(0.75, 1.9, 0.75));
  const houseDoorGeo = track(new THREE.BoxGeometry(0.16, 2.25, 1.15));
  const houseHedgeGeo = track(new THREE.BoxGeometry(0.6, 0.85, hd - 0.8));
  const houseWinStripGeo = track(new THREE.BoxGeometry(0.14, 3.6, 4.4));

  const redBodyInst = track(new THREE.InstancedMesh(houseBodyGeo, brickRedMat, Math.max(1, redHouses.length)));
  const brownBodyInst = track(new THREE.InstancedMesh(houseBodyGeo, brickBrownMat, Math.max(1, brownHouses.length)));
  const roofInst = track(new THREE.InstancedMesh(houseRoofGeo, roofTileMat, houses.length));
  const chimneyInst = track(new THREE.InstancedMesh(houseChimneyGeo, brickRedMat, houses.length));
  const doorInst = track(new THREE.InstancedMesh(houseDoorGeo, doorMat, houses.length));
  const hedgeInst = track(new THREE.InstancedMesh(houseHedgeGeo, hedgeMat, houses.length));
  const winInst = track(new THREE.InstancedMesh(houseWinStripGeo, houseWinMat, houses.length));

  redBodyInst.castShadow = true;
  redBodyInst.receiveShadow = true;
  brownBodyInst.castShadow = true;
  brownBodyInst.receiveShadow = true;
  roofInst.castShadow = true;
  chimneyInst.castShadow = true;

  const hDummy = new THREE.Object3D();
  let rCount = 0;
  let bCount = 0;

  houses.forEach((hp, idx) => {
    hDummy.position.set(hp.x, hh / 2, hp.z);
    hDummy.rotation.set(0, hp.rotY, 0);
    hDummy.scale.set(1, 1, 1);
    hDummy.updateMatrix();
    if (!hp.alt) {
      redBodyInst.setMatrixAt(rCount++, hDummy.matrix);
    } else {
      brownBodyInst.setMatrixAt(bCount++, hDummy.matrix);
    }

    // Pitched Roof
    hDummy.position.set(hp.x, hh + 1.5, hp.z);
    hDummy.scale.set(1, 1, 0.72);
    const qRotY = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), hp.rotY);
    const qRotZ = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.PI / 2);
    const qRot45 = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.PI / 4);
    hDummy.quaternion.copy(qRotY).multiply(qRotZ).multiply(qRot45);
    hDummy.updateMatrix();
    roofInst.setMatrixAt(idx, hDummy.matrix);

    const cosY = Math.cos(hp.rotY);
    const sinY = Math.sin(hp.rotY);

    // Chimney on roof ridge
    hDummy.position.set(hp.x - cosY * 1.4 + sinY * 1.8, hh + 2.55, hp.z + sinY * 1.4 + cosY * 1.8);
    hDummy.rotation.set(0, hp.rotY, 0);
    hDummy.scale.set(1, 1, 1);
    hDummy.updateMatrix();
    chimneyInst.setMatrixAt(idx, hDummy.matrix);

    // Front glowing window facade
    const frontOffset = hw / 2 + 0.05;
    hDummy.position.set(hp.x + cosY * frontOffset, 3.85, hp.z - sinY * frontOffset);
    hDummy.rotation.set(0, hp.rotY, 0);
    hDummy.scale.set(1, 1, 1);
    hDummy.updateMatrix();
    winInst.setMatrixAt(idx, hDummy.matrix);

    // Front door with frame offset
    hDummy.position.set(hp.x + cosY * frontOffset, 1.15, hp.z - sinY * frontOffset + cosY * 2.2);
    hDummy.updateMatrix();
    doorInst.setMatrixAt(idx, hDummy.matrix);

    // Front Hedge
    const hedgeOffset = hw / 2 + 1.6;
    hDummy.position.set(hp.x + cosY * hedgeOffset, 0.425, hp.z - sinY * hedgeOffset);
    hDummy.updateMatrix();
    hedgeInst.setMatrixAt(idx, hDummy.matrix);

    const halfX = Math.abs(cosY) > 0.7 ? hw / 2 : hd / 2;
    const halfZ = Math.abs(cosY) > 0.7 ? hd / 2 : hw / 2;
    colliders.push({
      minX: hp.x - halfX - 0.3,
      maxX: hp.x + halfX + 0.3,
      minZ: hp.z - halfZ - 0.3,
      maxZ: hp.z + halfZ + 0.3,
    });
  });

  redBodyInst.instanceMatrix.needsUpdate = true;
  brownBodyInst.instanceMatrix.needsUpdate = true;
  roofInst.instanceMatrix.needsUpdate = true;
  chimneyInst.instanceMatrix.needsUpdate = true;
  doorInst.instanceMatrix.needsUpdate = true;
  hedgeInst.instanceMatrix.needsUpdate = true;
  winInst.instanceMatrix.needsUpdate = true;
  scene.add(redBodyInst, brownBodyInst, roofInst, chimneyInst, doorInst, hedgeInst, winInst);

  // 8. COMPACT INDUSTRIAL DISTRICT ("Industrieterrein De Kruitmolen", x: 106..136, z: -134..-92)
  const indChunk = new THREE.Group();
  const indYard = new THREE.Mesh(
    track(new THREE.PlaneGeometry(30, 42)),
    track(
      new THREE.MeshStandardMaterial({
        color: 0x262b34,
        roughness: 0.85,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
      }),
    ),
  );
  indYard.rotation.x = -Math.PI / 2;
  indYard.position.set(121, 0.022, -113);
  indYard.receiveShadow = true;
  indChunk.add(indYard);

  const warehouseWallMat = track(new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.65, metalness: 0.35 }));
  const warehouseRoofMat = track(new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7, metalness: 0.4 }));
  const bayDoorMat = track(new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.5 }));

  const warehouses: [number, number, number, number, number, string][] = [
    [118, -104, 18, 8.5, 13, 'KRUITMOLEN LOGISTIEK'],
    [122, -125, 20, 9.0, 14, 'PYRO OPSLAG NEDERLAND'],
  ];

  for (const [wx, wz, ww, wh, wd, label] of warehouses) {
    const whBody = new THREE.Mesh(track(new THREE.BoxGeometry(ww, wh, wd)), warehouseWallMat);
    whBody.position.set(wx, wh / 2, wz);
    whBody.castShadow = true;
    whBody.receiveShadow = true;
    const whRoof = new THREE.Mesh(track(new THREE.BoxGeometry(ww + 0.6, 0.5, wd + 0.6)), warehouseRoofMat);
    whRoof.position.set(wx, wh + 0.25, wz);
    indChunk.add(whBody, whRoof);

    // Loading bay doors
    for (const d of [-0.75, 0.75]) {
      const door = new THREE.Mesh(track(new THREE.BoxGeometry(3.4, 4.0, 0.16)), bayDoorMat);
      door.position.set(wx + d * 5, 2.0, wz + wd / 2 + 0.05);
      indChunk.add(door);
    }

    const wSignTex = track(createSignTexture(label, 'LAAD- & LOSZONE', '#0F172A', '#F59E0B', 512, 128));
    const wSign = new THREE.Mesh(
      track(new THREE.BoxGeometry(11, 1.6, 0.2)),
      track(new THREE.MeshStandardMaterial({ map: wSignTex, emissiveMap: wSignTex, emissive: 0xffffff, emissiveIntensity: 0.6 })),
    );
    wSign.position.set(wx, wh - 1.5, wz + wd / 2 + 0.12);
    indChunk.add(wSign);

    colliders.push({ minX: wx - ww / 2 - 0.3, maxX: wx + ww / 2 + 0.3, minZ: wz - wd / 2 - 0.3, maxZ: wz + wd / 2 + 0.3 });
  }

  // Instanced Shipping Containers in Industrial Yard
  const containerGeo = track(new THREE.BoxGeometry(2.5, 2.6, 6.1));
  const containerMat = track(new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.6, metalness: 0.3 }));
  const containerPos: [number, number, number, number][] = [
    [132, 1.3, -102, 0],
    [132, 3.9, -102, 0],
    [109, 1.3, -124, Math.PI / 2],
  ];
  const containerInst = track(new THREE.InstancedMesh(containerGeo, containerMat, containerPos.length));
  const cDummy = new THREE.Object3D();
  const cPalette = [0xdc2626, 0x2563eb, 0x059669, 0xd97706];
  containerPos.forEach(([cx, cy, cz, ry], idx) => {
    cDummy.position.set(cx, cy, cz);
    cDummy.rotation.set(0, ry, 0);
    cDummy.updateMatrix();
    containerInst.setMatrixAt(idx, cDummy.matrix);
    containerInst.setColorAt(idx, new THREE.Color(cPalette[idx % cPalette.length]));
    colliders.push({ minX: cx - 2.2, maxX: cx + 2.2, minZ: cz - 3.2, maxZ: cz + 3.2 });
  });
  containerInst.instanceMatrix.needsUpdate = true;
  if (containerInst.instanceColor) containerInst.instanceColor.needsUpdate = true;
  indChunk.add(containerInst);

  scene.add(indChunk);
  chunks.push({ group: indChunk, cx: 121, cz: -113, radius: 55 });

  // 9. PARKS, CANALS & DUTCH WINDMILL ("Oranjepark & Molenveld")
  const parkChunk = new THREE.Group();
  const waterMat = track(
    new THREE.MeshPhysicalMaterial({
      color: 0x0b2538,
      roughness: 0.06,
      metalness: 0.38,
      clearcoat: 1.0,
      clearcoatRoughness: 0.04,
      envMapIntensity: 1.45,
      polygonOffset: true,
      polygonOffsetFactor: -1,
      polygonOffsetUnits: -1,
    }),
  );
  reflectiveMaterials.push(waterMat);

  // Two canal ponds with brick quays & wooden footbridges
  const buildCanalPond = (cx: number, cz: number, w: number, d: number) => {
    const pond = new THREE.Mesh(track(new THREE.PlaneGeometry(w, d)), waterMat);
    pond.rotation.x = -Math.PI / 2;
    pond.position.set(cx, 0.028, cz);
    parkChunk.add(pond);

    const qN = new THREE.Mesh(track(new THREE.BoxGeometry(w + 1.2, 0.25, 0.7)), brickBrownMat);
    qN.position.set(cx, 0.125, cz - d / 2 - 0.2);
    const qS = qN.clone();
    qS.position.z = cz + d / 2 + 0.2;
    parkChunk.add(qN, qS);

    const bridge = new THREE.Mesh(track(new THREE.BoxGeometry(3.2, 0.18, d + 2)), woodMat);
    bridge.position.set(cx, 0.35, cz);
    bridge.castShadow = true;
    parkChunk.add(bridge);
  };
  buildCanalPond(-36, 54, 34, 12);
  buildCanalPond(-50, 114, 40, 14);

  // Walking paths in South Oranjepark
  const pathMat = track(
    new THREE.MeshStandardMaterial({
      color: 0x78716c,
      roughness: 0.9,
      polygonOffset: true,
      polygonOffsetFactor: -2,
      polygonOffsetUnits: -2,
    }),
  );
  const path1 = new THREE.Mesh(track(new THREE.PlaneGeometry(3.0, 44)), pathMat);
  path1.rotation.x = -Math.PI / 2;
  path1.position.set(-25, 0.03, 114);
  const path2 = new THREE.Mesh(track(new THREE.PlaneGeometry(62, 3.0)), pathMat);
  path2.rotation.x = -Math.PI / 2;
  path2.position.set(-46, 0.036, 102);
  parkChunk.add(path1, path2);

  // Park Benches
  for (const [bx, bz] of [[-22, 46], [-42, 46], [-26, 98], [-62, 100], [-36, 128]]) {
    const bench = new THREE.Group();
    const seat = new THREE.Mesh(track(new THREE.BoxGeometry(2.1, 0.1, 0.6)), woodMat);
    seat.position.y = 0.45;
    const back = new THREE.Mesh(track(new THREE.BoxGeometry(2.1, 0.45, 0.1)), woodMat);
    back.position.set(0, 0.72, -0.25);
    const leg1 = new THREE.Mesh(track(new THREE.BoxGeometry(0.1, 0.45, 0.55)), metalDarkMat);
    leg1.position.set(-0.85, 0.225, 0);
    const leg2 = leg1.clone();
    leg2.position.x = 0.85;
    bench.add(seat, back, leg1, leg2);
    bench.position.set(bx, 0, bz);
    parkChunk.add(bench);
  }

  // Dutch Windmill Landmark ("Molen De Vuurpijl") at (-52, 128)
  const millGroup = new THREE.Group();
  const millTower = new THREE.Mesh(track(new THREE.CylinderGeometry(2.2, 3.6, 13, 12)), brickRedMat);
  millTower.position.y = 6.5;
  millTower.castShadow = true;
  const millCap = new THREE.Mesh(track(new THREE.ConeGeometry(2.6, 2.8, 12)), roofTileMat);
  millCap.position.y = 14.4;
  const windmillBlades = new THREE.Group();
  windmillBlades.position.set(0, 12.6, 2.45);
  const sailMat = track(new THREE.MeshStandardMaterial({ color: 0xfef3c7, roughness: 0.8 }));
  for (let b = 0; b < 4; b++) {
    const armGroup = new THREE.Group();
    armGroup.rotation.z = (b * Math.PI) / 2;
    const spar = new THREE.Mesh(track(new THREE.BoxGeometry(0.24, 8.2, 0.24)), woodMat);
    spar.position.y = 4.1;
    const cloth = new THREE.Mesh(track(new THREE.BoxGeometry(1.1, 6.2, 0.06)), sailMat);
    cloth.position.set(0.65, 4.8, 0);
    armGroup.add(spar, cloth);
    windmillBlades.add(armGroup);
  }
  millGroup.add(millTower, millCap, windmillBlades);
  millGroup.position.set(-52, 0, 128);
  parkChunk.add(millGroup);
  colliders.push({ minX: -55.8, maxX: -48.2, minZ: 124.2, maxZ: 131.8 });

  scene.add(parkChunk);
  chunks.push({ group: parkChunk, cx: -45, cz: 95, radius: 75 });

  // 10. STREET LIGHTS (Instanced Poles & Bulbs + Closest Dynamic PointLights)
  const lampCoords: [number, number, number][] = [];
  for (let z = -124; z <= 124; z += 24) {
    if (Math.abs(z) < 12 || Math.abs(Math.abs(z) - 82) < 12) continue;
    lampCoords.push([-8.2, z, 1], [8.2, z, -1]);
  }
  for (let x = -124; x <= 124; x += 28) {
    if (x > -58 && x < 56) continue;
    if (Math.abs(x - 96) < 12 || Math.abs(x + 92) < 12) continue;
    lampCoords.push([x, -8.2, 1], [x, 8.2, -1]);
  }
  lampCoords.push([-44, -22, 1], [-44, 22, 1], [86, -34, 1], [86, 34, 1]);

  const poleGeo = track(new THREE.CylinderGeometry(0.08, 0.12, 5.2, 8));
  const armGeo = track(new THREE.BoxGeometry(1.1, 0.08, 0.08));
  const bulbGeo = track(new THREE.SphereGeometry(0.2, 8, 8));
  const sharedBulbMat = track(
    new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      emissive: new THREE.Color(0xf59e0b),
      emissiveIntensity: 1.8,
      roughness: 0.2,
    }),
  );
  streetLampMaterials.push(sharedBulbMat);

  const poleInst = track(new THREE.InstancedMesh(poleGeo, metalDarkMat, lampCoords.length));
  const armInst = track(new THREE.InstancedMesh(armGeo, metalDarkMat, lampCoords.length));
  const bulbInst = track(new THREE.InstancedMesh(bulbGeo, sharedBulbMat, lampCoords.length));
  const lDummy = new THREE.Object3D();

  const volConeTex = track(createVolumetricConeTexture());
  const volConeGeo = track(new THREE.ConeGeometry(2.8, 5.2, 14, 1, true));
  const volConeMat = track(
    new THREE.MeshBasicMaterial({
      map: volConeTex,
      transparent: true,
      opacity: 0.24,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    }),
  );

  lampCoords.forEach(([lx, lz, dir], idx) => {
    lDummy.position.set(lx, 2.6, lz);
    lDummy.rotation.set(0, 0, 0);
    lDummy.updateMatrix();
    poleInst.setMatrixAt(idx, lDummy.matrix);

    lDummy.position.set(lx + dir * 0.45, 5.15, lz);
    lDummy.updateMatrix();
    armInst.setMatrixAt(idx, lDummy.matrix);

    lDummy.position.set(lx + dir * 0.9, 5.02, lz);
    lDummy.updateMatrix();
    bulbInst.setMatrixAt(idx, lDummy.matrix);

    // Add real PointLights + subtle Volumetric Cones on central lamps
    if (idx % 3 === 0 && Math.abs(lx) < 105 && Math.abs(lz) < 105) {
      const pLight = new THREE.PointLight(0xffb74d, 16, 28, 1.4);
      pLight.position.set(lx + dir * 0.9, 4.8, lz);
      scene.add(pLight);
      streetLampLights.push({ light: pLight, x: lx, z: lz });

      if (!isSoftwareGl && Math.abs(lx) < 65 && Math.abs(lz) < 65) {
        const cone = new THREE.Mesh(volConeGeo, volConeMat);
        cone.position.set(lx + dir * 0.9, 2.45, lz);
        scene.add(cone);
        volumetricCones.push(cone);
      }
    }
  });
  poleInst.instanceMatrix.needsUpdate = true;
  armInst.instanceMatrix.needsUpdate = true;
  bulbInst.instanceMatrix.needsUpdate = true;
  scene.add(poleInst, armInst, bulbInst);

  // 11. DETAILED COMPOSITE 3D CARS (Hood, Cabin, Glass, Alloys, Headlights & Taillights)
  const carPositions: [number, number, number, number][] = [
    [20.5, 42.0, 0, 0xb91c1c],
    [29.5, 42.0, Math.PI, 0x1d4ed8],
    [38.5, 42.0, 0, 0x047857],
    [47.5, 42.0, Math.PI, 0x334155],
    [70.0, 33.5, Math.PI / 2, 0xd97706],
    [80.0, 44.0, -Math.PI / 2, 0x0f172a],
    [64.0, -34.0, 0, 0x64748b],
    [74.0, -34.0, Math.PI, 0xe2e8f0],
    [112.0, -114.0, 0, 0xf8fafc],
    [-21.0, -40.0, Math.PI / 2, 0x1e3a8a],
  ];
  const tireMat = track(new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.92 }));
  const rimMat = track(new THREE.MeshStandardMaterial({ color: 0xd1d5db, metalness: 0.88, roughness: 0.22 }));
  const headlightMat = track(
    new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfef3c7, emissiveIntensity: 1.4 }),
  );
  const taillightMat = track(
    new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: 1.2 }),
  );
  const carGlassMat = track(
    new THREE.MeshPhysicalMaterial({
      color: 0x1e293b,
      roughness: 0.05,
      metalness: 0.25,
      clearcoat: 1.0,
      envMapIntensity: 1.5,
    }),
  );
  reflectiveMaterials.push(carGlassMat);

  carPositions.forEach(([cx, cz, ry, col]) => {
    const car = new THREE.Group();
    const paintMat = track(
      new THREE.MeshPhysicalMaterial({
        color: col,
        metalness: 0.72,
        roughness: 0.16,
        clearcoat: 1.0,
        clearcoatRoughness: 0.06,
        envMapIntensity: 1.35,
      }),
    );
    reflectiveMaterials.push(paintMat);

    // Main sculpted lower body + front bumper + rear bumper
    const chassis = new THREE.Mesh(track(new THREE.BoxGeometry(1.88, 0.54, 4.25)), paintMat);
    chassis.position.y = 0.5;
    chassis.castShadow = true;
    chassis.receiveShadow = true;

    const hood = new THREE.Mesh(track(new THREE.BoxGeometry(1.82, 0.16, 1.35)), paintMat);
    hood.position.set(0, 0.81, 1.35);
    hood.rotation.x = 0.07;

    const cabin = new THREE.Mesh(track(new THREE.BoxGeometry(1.62, 0.56, 2.05)), paintMat);
    cabin.position.set(0, 1.06, -0.22);
    cabin.castShadow = true;

    const windshields = new THREE.Mesh(track(new THREE.BoxGeometry(1.65, 0.45, 1.9)), carGlassMat);
    windshields.position.set(0, 1.05, -0.22);

    // Side mirrors
    const mirrorGeo = track(new THREE.BoxGeometry(0.18, 0.1, 0.14));
    const mL = new THREE.Mesh(mirrorGeo, paintMat);
    mL.position.set(-1.0, 0.88, 0.55);
    const mR = mL.clone();
    mR.position.x = 1.0;

    // Headlights & Taillights
    const hlGeo = track(new THREE.BoxGeometry(0.34, 0.16, 0.08));
    const hlL = new THREE.Mesh(hlGeo, headlightMat);
    hlL.position.set(-0.62, 0.56, 2.13);
    const hlR = hlL.clone();
    hlR.position.x = 0.62;

    const tlL = new THREE.Mesh(hlGeo, taillightMat);
    tlL.position.set(-0.64, 0.58, -2.13);
    const tlR = tlL.clone();
    tlR.position.x = 0.64;

    // Grille
    const grille = new THREE.Mesh(track(new THREE.BoxGeometry(0.86, 0.22, 0.06)), metalDarkMat);
    grille.position.set(0, 0.44, 2.13);

    // Wheels + Alloy Rims
    const wheelGeo = track(new THREE.CylinderGeometry(0.34, 0.34, 0.24, 16));
    const rimGeo = track(new THREE.CylinderGeometry(0.21, 0.21, 0.255, 12));
    for (const [wx, wz] of [[-0.92, 1.32], [0.92, 1.32], [-0.92, -1.32], [0.92, -1.32]]) {
      const w = new THREE.Mesh(wheelGeo, tireMat);
      w.rotation.z = Math.PI / 2;
      w.position.set(wx, 0.34, wz);
      w.castShadow = true;
      const rim = new THREE.Mesh(rimGeo, rimMat);
      rim.rotation.z = Math.PI / 2;
      rim.position.set(wx, 0.34, wz);
      car.add(w, rim);
    }

    car.add(chassis, hood, cabin, windshields, mL, mR, hlL, hlR, tlL, tlR, grille);
    car.position.set(cx, cz >= 25 && cz <= 47 && cx >= 10 && cx <= 54 ? 0.09 : 0.05, cz);
    car.rotation.y = ry;
    scene.add(car);
    const halfW = Math.abs(Math.cos(ry)) > 0.7 ? 1.3 : 2.3;
    const halfD = Math.abs(Math.cos(ry)) > 0.7 ? 2.3 : 1.3;
    colliders.push({ minX: cx - halfW, maxX: cx + halfW, minZ: cz - halfD, maxZ: cz + halfD });
  });

  // 12. INSTANCED TREES & BUSHES WITH GPU WIND SWAY (Compact Town Foliage)
  const treePositions: { x: number; z: number; scale: number }[] = [];
  for (let i = 0; i < 65; i++) {
    const tx = -82 + Math.random() * 68;
    const tz = 46 + Math.random() * 86;
    if (Math.abs(tz - 82) < 14 || Math.abs(tx) < 14) continue;
    if (Math.abs(tz - 54) < 12 && Math.abs(tx + 36) < 22) continue;
    if (Math.abs(tz - 114) < 14 && Math.abs(tx + 50) < 25) continue;
    if (Math.hypot(tx + 52, tz - 128) < 12) continue;
    treePositions.push({ x: tx, z: tz, scale: 0.9 + Math.random() * 0.5 });
  }
  for (let i = 0; i < 72; i++) {
    const angle = (i / 72) * Math.PI * 2;
    const dist = 128 + Math.random() * 14;
    const tx = Math.cos(angle) * dist;
    const tz = Math.sin(angle) * dist;
    if (Math.abs(tx) < 14 || Math.abs(tz) < 14) continue;
    if (Math.abs(tx - 96) < 14 || Math.abs(tx + 92) < 14 || Math.abs(tz - 82) < 14 || Math.abs(tz + 82) < 14) continue;
    if (tx > 100 && tz < -88) continue;
    treePositions.push({ x: tx, z: tz, scale: 1.0 + Math.random() * 0.55 });
  }

  const trunkGeo = track(new THREE.CylinderGeometry(0.22, 0.36, 3.2, 8));
  const trunkMat = track(new THREE.MeshStandardMaterial({ color: 0x4a3525, roughness: 0.95 }));
  const canopyGeo = track(new THREE.DodecahedronGeometry(2.15, 1));
  const canopyMat = track(new THREE.MeshStandardMaterial({ color: 0x20522b, roughness: 0.85 }));
  canopyMat.onBeforeCompile = (shader) => {
    shader.uniforms.uTime = windUniforms.uTime;
    shader.uniforms.uWind = windUniforms.uWind;
    shader.vertexShader =
      `uniform float uTime;\nuniform float uWind;\n` +
      shader.vertexShader.replace(
        '#include <begin_vertex>',
        `#include <begin_vertex>
         float swayPhase = uTime * (1.4 + uWind * 0.12) + position.x * 0.4 + position.z * 0.4;
         transformed.x += sin(swayPhase) * 0.12 * uWind * max(0.0, position.y + 1.5);`,
      );
  };

  const trunkInst = track(new THREE.InstancedMesh(trunkGeo, trunkMat, treePositions.length));
  const canopyInst = track(new THREE.InstancedMesh(canopyGeo, canopyMat, treePositions.length));
  trunkInst.castShadow = !isSoftwareGl;
  canopyInst.castShadow = !isSoftwareGl;
  const dummy = new THREE.Object3D();
  const cColor = new THREE.Color();
  treePositions.forEach((tp, idx) => {
    dummy.position.set(tp.x, 1.6 * tp.scale, tp.z);
    dummy.scale.set(tp.scale, tp.scale, tp.scale);
    dummy.rotation.y = Math.random() * Math.PI;
    dummy.updateMatrix();
    trunkInst.setMatrixAt(idx, dummy.matrix);

    dummy.position.set(tp.x, 4.1 * tp.scale, tp.z);
    dummy.scale.set(tp.scale * 1.18, tp.scale * 1.08, tp.scale * 1.18);
    dummy.updateMatrix();
    canopyInst.setMatrixAt(idx, dummy.matrix);

    cColor.setHSL(0.31 + (Math.random() - 0.5) * 0.06, 0.46, 0.22 + Math.random() * 0.08);
    canopyInst.setColorAt(idx, cColor);
  });
  trunkInst.instanceMatrix.needsUpdate = true;
  canopyInst.instanceMatrix.needsUpdate = true;
  if (canopyInst.instanceColor) canopyInst.instanceColor.needsUpdate = true;
  trunkInst.computeBoundingSphere();
  canopyInst.computeBoundingSphere();
  scene.add(trunkInst, canopyInst);

  const bushCoords: [number, number, number][] = [];
  for (let i = 0; i < 55; i++) {
    const bx = -82 + Math.random() * 162;
    const bz = 50 + Math.random() * 82;
    if (Math.abs(bx) < 14 || Math.abs(bx - 96) < 14 || Math.abs(bx + 92) < 14 || Math.abs(bz - 82) < 14) continue;
    if (Math.abs(bz - 54) < 11 && Math.abs(bx + 36) < 20) continue;
    if (Math.abs(bz - 114) < 12 && Math.abs(bx + 50) < 24) continue;
    bushCoords.push([bx, bz, 0.7 + Math.random() * 0.6]);
  }
  const bushGeo = track(new THREE.IcosahedronGeometry(0.75, 1));
  const bushMat = track(new THREE.MeshStandardMaterial({ color: 0x265c2e, roughness: 0.9 }));
  const bushInst = track(new THREE.InstancedMesh(bushGeo, bushMat, bushCoords.length));
  bushCoords.forEach(([bx, bz, sc], idx) => {
    dummy.position.set(bx, 0.4 * sc, bz);
    dummy.scale.set(sc * 1.3, sc * 0.85, sc * 1.3);
    dummy.rotation.y = Math.random() * Math.PI;
    dummy.updateMatrix();
    bushInst.setMatrixAt(idx, dummy.matrix);
  });
  bushInst.instanceMatrix.needsUpdate = true;
  bushInst.computeBoundingSphere();
  scene.add(bushInst);

  return {
    colliders,
    interactables,
    streetLampMaterials,
    streetLampLights,
    volumetricCones,
    windowMaterials,
    reflectiveMaterials,
    asphaltMat,
    paveMat,
    waterMat,
    skyDome,
    skyDomeMat,
    windUniforms,
    sunLight,
    hemiLight,
    displayPads,
    chunks,
    windmillBlades,
    dispose: () => {
      disposables.forEach((d) => d.dispose());
    },
  };
}

export function updateWorldLOD(
  world: WorldRefs,
  playerPos: THREE.Vector3,
  quality: GraphicsQuality,
  dt: number,
  windStrength = 1.0,
) {
  world.windUniforms.uTime.value += dt;
  world.windUniforms.uWind.value = THREE.MathUtils.damp(world.windUniforms.uWind.value, windStrength, 2.5, dt);

  // Rotate Dutch windmill sails smoothly (faster during strong wind!)
  if (world.windmillBlades) {
    world.windmillBlades.rotation.z -= dt * (0.35 + windStrength * 0.16);
  }

  // Keep sky dome centered on camera/player
  world.skyDome.position.set(playerPos.x, 0, playerPos.z);

  // Player-tracking directional shadow frustum snapped to 2m grid to prevent shadow swimming
  if (world.sunLight.castShadow) {
    const snapX = Math.round(playerPos.x * 0.5) * 2;
    const snapZ = Math.round(playerPos.z * 0.5) * 2;
    world.sunLight.target.position.set(snapX, 0, snapZ);
    world.sunLight.target.updateMatrixWorld();
    const sDir = world.skyDomeMat.uniforms.sunDir.value as THREE.Vector3;
    const isDayLike = (world.skyDomeMat.uniforms.sunIntensity.value as number) > 0.2;
    const activeDir = isDayLike ? sDir : (world.skyDomeMat.uniforms.moonDir.value as THREE.Vector3);
    world.sunLight.position.set(snapX + activeDir.x * 110, Math.max(35, activeDir.y * 110), snapZ + activeDir.z * 110);
  }

  // Distance-based chunk visibility culling
  const maxDist =
    quality === 'low'
      ? 125
      : quality === 'medium'
      ? 165
      : quality === 'high'
      ? 220
      : quality === 'ultra'
      ? 280
      : 340;

  for (const ch of world.chunks) {
    const dist = Math.hypot(playerPos.x - ch.cx, playerPos.z - ch.cz);
    ch.group.visible = dist <= maxDist + ch.radius;
  }

  // Distance-cull dynamic point lights so WebGL fragment budgets stay fast
  const maxLights = quality === 'low' ? 6 : quality === 'medium' ? 10 : quality === 'high' ? 15 : 22;
  const lightRange = quality === 'low' ? 45 : quality === 'cinematic' ? 95 : 75;
  let activeCount = 0;
  for (const item of world.streetLampLights) {
    const dSq =
      (playerPos.x - item.x) * (playerPos.x - item.x) +
      (playerPos.z - item.z) * (playerPos.z - item.z);
    if (dSq < lightRange * lightRange && activeCount < maxLights) {
      item.light.visible = true;
      activeCount++;
    } else {
      item.light.visible = false;
    }
  }

  // Keep volumetric cones hidden on 'low' quality so they never intersect ground when looking down
  if (quality === 'low') {
    for (const cone of world.volumetricCones) {
      cone.visible = false;
    }
  }
}

export function applyTimeOfDay(
  scene: THREE.Scene,
  world: WorldRefs,
  mode: 'night' | 'dusk' | 'day' | 'auto',
  elapsedAutoSec: number,
  weatherMode: 'clear' | 'rain' | 'mist' | 'wind' = 'clear',
) {
  let t = 0;
  if (mode === 'night') t = 0;
  else if (mode === 'dusk') t = 0.45;
  else if (mode === 'day') t = 1.0;
  else {
    t = (Math.sin(elapsedAutoSec * 0.035) + 1) * 0.48;
  }

  const nightTop = new THREE.Color(0x040711);
  const duskTop = new THREE.Color(0x1b2342);
  const dayTop = new THREE.Color(0x3b82f6);

  const nightHorizon = new THREE.Color(0x0d1323);
  const duskHorizon = new THREE.Color(0x884248);
  const dayHorizon = new THREE.Color(0x93c5fd);

  const top = t < 0.5 ? nightTop.clone().lerp(duskTop, t * 2) : duskTop.clone().lerp(dayTop, (t - 0.5) * 2);
  const horizon =
    t < 0.5 ? nightHorizon.clone().lerp(duskHorizon, t * 2) : duskHorizon.clone().lerp(dayHorizon, (t - 0.5) * 2);

  // Overcast tint during rain or mist
  if (weatherMode === 'rain') {
    top.lerp(new THREE.Color(0x1a2232), 0.55);
    horizon.lerp(new THREE.Color(0x283244), 0.55);
  } else if (weatherMode === 'mist') {
    horizon.lerp(new THREE.Color(0x64748b), 0.48);
  }

  world.skyDomeMat.uniforms.topColor.value.copy(top);
  world.skyDomeMat.uniforms.horizonColor.value.copy(horizon);
  world.skyDomeMat.uniforms.starIntensity.value =
    weatherMode === 'rain' ? 0.1 : Math.max(0, 1 - t * 2.2);
  world.skyDomeMat.uniforms.sunIntensity.value = weatherMode === 'rain' ? t * 0.25 : Math.max(0, (t - 0.2) * 1.25);
  world.skyDomeMat.uniforms.moonIntensity.value = weatherMode === 'rain' ? 0.15 : Math.max(0, 1 - t * 1.8);
  world.skyDomeMat.uniforms.cloudOpacity.value =
    weatherMode === 'rain' ? 0.85 : weatherMode === 'mist' ? 0.72 : 0.45;
  world.skyDomeMat.uniforms.uTime.value = elapsedAutoSec;

  // Dynamic sun arc
  const sunElev = -0.15 + t * 0.85;
  (world.skyDomeMat.uniforms.sunDir.value as THREE.Vector3).set(0.42, sunElev, -0.78).normalize();

  if (scene.fog instanceof THREE.FogExp2) {
    scene.fog.color.copy(horizon);
  }

  const weatherDim = weatherMode === 'rain' ? 0.7 : 1.0;
  world.sunLight.intensity = (0.36 + t * 1.48) * weatherDim;
  world.sunLight.color.setHex(t < 0.3 ? 0xc7d7f5 : t < 0.65 ? 0xffb38a : 0xfff4e0);
  world.hemiLight.intensity = (0.52 + t * 0.78) * weatherDim;

  const lampPower = Math.max(0.08, 1 - t * 1.3);
  for (const mat of world.streetLampMaterials) {
    mat.emissiveIntensity = lampPower * 1.9;
  }
  for (const item of world.streetLampLights) {
    item.light.intensity = lampPower * 18;
  }
  for (const cone of world.volumetricCones) {
    cone.visible = lampPower > 0.25;
  }
  for (const wMat of world.windowMaterials) {
    wMat.emissiveIntensity = Math.max(0.12, 0.95 - t * 0.8);
  }
}
