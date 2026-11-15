import * as THREE from 'three';
import { EffectStyle, FireworkProduct, GraphicsQuality } from '../types';
import { createSmokeSpriteTexture } from './textures';
import { soundEngine } from './audio';

const HIST_LEN = 10;
const VERTS_PER_STAR = HIST_LEN * 2;
const INDICES_PER_STAR = (HIST_LEN - 1) * 6;
const MAX_STARS = 2600;
const MAX_MICRO = 9000;
const MAX_SMOKE = 1400;
const MAX_CORONAS = 24;

interface ActiveStar {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  r: number;
  g: number;
  b: number;
  tr: number; // tail ember RGB
  tg: number;
  tb: number;
  life: number;
  maxLife: number;
  drag: number;
  gravity: number;
  trailWidth: number;
  headSize: number;
  strobe: boolean;
  glitter: boolean;
  phaseOffset: number;
  crackleAtEnd: boolean;
  splitAtEnd: boolean;
  shedRate: number; // micro-sparks per second
  shedAccum: number;
  histInterval: number;
  histTimer: number;
  histCount: number;
  histHead: number;
  histX: Float32Array;
  histY: Float32Array;
  histZ: Float32Array;
}

interface ActiveMicro {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  r: number;
  g: number;
  b: number;
  life: number;
  maxLife: number;
  drag: number;
  gravity: number;
  size: number;
  rot: number;
  flicker: boolean;
}

interface ActiveSmoke {
  active: boolean;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  r: number;
  g: number;
  b: number;
  life: number;
  maxLife: number;
}

interface RisingProjectile {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  fuseTime: number;
  product: FireworkProduct;
  shotIndex: number;
  isFinaleShot: boolean;
  trailAccum: number;
  cometStarIdx: number;
}

export interface ActiveFireworkJob {
  uid: string;
  product: FireworkProduct;
  meshGroup: THREE.Group | null;
  origin: THREE.Vector3;
  fuseLocalPos: THREE.Vector3;
  launchLocalPos: THREE.Vector3;
  rotationY: number;
  angleDeg: number;
  phase: 'fusing' | 'firing' | 'done';
  fuseRemaining: number;
  elapsedFiring: number;
  shotsFired: number;
  nextShotTime: number;
  fountainAccum: number;
  fountainSoundAccum: number;
  onComplete?: () => void;
}

interface FlashLightSlot {
  light: THREE.PointLight;
  life: number;
  maxLife: number;
  peakIntensity: number;
}

interface CoronaSlot {
  mesh: THREE.Mesh;
  mat: THREE.ShaderMaterial;
  active: boolean;
  life: number;
  maxLife: number;
  maxScale: number;
}

const _tmpColor = new THREE.Color();
const _tmpTailColor = new THREE.Color();
const _camForward = new THREE.Vector3();
const _camRight = new THREE.Vector3();
const _toEvent = new THREE.Vector3();
const _axisU = new THREE.Vector3();
const _axisV = new THREE.Vector3();
const _axisN = new THREE.Vector3();

function hashProductSeed(id: string): number {
  let h = 2166136261;
  for (let i = 0; i < id.length; i++) {
    h ^= id.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function seededRand(seed: number, salt: number): number {
  let x = (seed ^ Math.imul(salt + 1, 0x9e3779b1)) >>> 0;
  x ^= x >>> 16;
  x = Math.imul(x, 0x85ebca6b) >>> 0;
  x ^= x >>> 13;
  x = Math.imul(x, 0xc2b2ae35) >>> 0;
  x ^= x >>> 16;
  return (x >>> 0) / 4294967296;
}

const RIBBON_VERT = /* glsl */ `
  attribute vec3 aTangent;
  attribute float aSideWidth;
  attribute float aSideSign;
  attribute float aProgress;
  attribute vec3 aColor;
  attribute vec3 aTailColor;
  attribute float aAlpha;

  varying float vProgress;
  varying float vSide;
  varying vec3 vColor;
  varying vec3 vTailColor;
  varying float vAlpha;

  void main() {
    vec4 worldCenter = modelMatrix * vec4(position, 1.0);
    vec3 viewDir = cameraPosition - worldCenter.xyz;
    float vdLen = length(viewDir);
    vec3 viewNorm = vdLen > 0.0001 ? viewDir / vdLen : vec3(0.0, 0.0, 1.0);

    vec3 tang = aTangent;
    float tLen = length(tang);
    tang = tLen > 0.0001 ? tang / tLen : vec3(0.0, 1.0, 0.0);

    vec3 sideVec = cross(tang, viewNorm);
    float sLen = length(sideVec);
    if (sLen < 0.0005) {
      vec3 fallback = abs(viewNorm.y) < 0.9 ? vec3(0.0, 1.0, 0.0) : vec3(1.0, 0.0, 0.0);
      sideVec = normalize(cross(fallback, viewNorm));
    } else {
      sideVec /= sLen;
    }

    float minHalfW = max(0.038, vdLen * 0.0017);
    float taper = mix(1.0, 0.16, aProgress);
    float halfW = max(abs(aSideWidth), minHalfW) * taper;
    vec3 displaced = worldCenter.xyz + sideVec * (aSideSign * halfW);

    vProgress = aProgress;
    vSide = aSideSign;
    vColor = aColor;
    vTailColor = aTailColor;
    vAlpha = aAlpha;

    gl_Position = projectionMatrix * viewMatrix * vec4(displaced, 1.0);
  }
`;

const RIBBON_FRAG = /* glsl */ `
  varying float vProgress;
  varying float vSide;
  varying vec3 vColor;
  varying vec3 vTailColor;
  varying float vAlpha;

  void main() {
    float across = abs(vSide);
    float core = exp(-across * across * 6.8);
    float glow = exp(-across * across * 1.8) * 0.34;
    float radial = core + glow;

    float tailFade = pow(clamp(1.0 - vProgress, 0.0, 1.0), 1.32);
    float intensity = radial * tailFade * vAlpha;
    if (intensity < 0.004) discard;

    float hotTip = exp(-vProgress * 15.0) * core;
    vec3 bodyCol = mix(vColor, vTailColor, smoothstep(0.22, 0.95, vProgress));
    vec3 finalCol = mix(bodyCol * 1.38, vec3(1.48, 1.4, 1.28), clamp(hotTip * 0.88, 0.0, 1.0));

    gl_FragColor = vec4(finalCol * intensity, clamp(intensity, 0.0, 1.0));
  }
`;

const STAR_HEAD_VERT = /* glsl */ `
  attribute vec3 aColor;
  attribute float aSize;
  attribute float aAlpha;
  attribute float aRot;

  varying vec3 vColor;
  varying float vAlpha;
  varying float vRot;

  void main() {
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vColor = aColor;
    vAlpha = aAlpha;
    vRot = aRot;
    gl_PointSize = clamp(aSize * (290.0 / max(1.0, -mvPos.z)), 2.5, 52.0);
    gl_Position = projectionMatrix * mvPos;
  }
`;

const STAR_HEAD_FRAG = /* glsl */ `
  varying vec3 vColor;
  varying float vAlpha;
  varying float vRot;

  void main() {
    if (vAlpha <= 0.005) discard;
    vec2 uv = gl_PointCoord - 0.5;
    float c = cos(vRot);
    float s = sin(vRot);
    vec2 p = vec2(c * uv.x - s * uv.y, s * uv.x + c * uv.y);

    float dist = length(p);
    // Razor-sharp 4-point diffraction cross + subtle 45deg rays
    float ray1 = exp(-abs(p.y) * 32.0) * exp(-abs(p.x) * 6.5);
    float ray2 = exp(-abs(p.x) * 32.0) * exp(-abs(p.y) * 6.5);
    vec2 d = vec2(p.x + p.y, p.x - p.y) * 0.7071;
    float diag1 = exp(-abs(d.y) * 36.0) * exp(-abs(d.x) * 11.0) * 0.55;
    float diag2 = exp(-abs(d.x) * 36.0) * exp(-abs(d.y) * 11.0) * 0.55;

    float pinpoint = exp(-dist * dist * 58.0);
    float corona = exp(-dist * dist * 13.0) * 0.32;
    float mask = pinpoint + corona + (ray1 + ray2 + diag1 + diag2) * 0.85;
    float intensity = mask * vAlpha;
    if (intensity < 0.008) discard;

    vec3 col = mix(vColor * 1.4, vec3(1.5, 1.45, 1.35), clamp(pinpoint * 1.1, 0.0, 1.0));
    gl_FragColor = vec4(col * intensity, clamp(intensity, 0.0, 1.0));
  }
`;

const CORONA_VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const CORONA_FRAG = /* glsl */ `
  uniform float uProgress;
  uniform vec3 uColor;
  uniform float uIntensity;
  varying vec2 vUv;

  void main() {
    vec2 p = vUv - 0.5;
    float r = length(p) * 2.0;

    // Expanding thin pyrotechnic shock ring + center diffraction burst
    float ringR = mix(0.1, 0.92, uProgress);
    float ring = exp(-pow((r - ringR) * 14.0, 2.0)) * (1.0 - uProgress);
    float coreFlash = exp(-r * r * 14.0) * pow(1.0 - uProgress, 1.7);

    float rayX = exp(-abs(p.y) * 38.0) * exp(-abs(p.x) * 4.5);
    float rayY = exp(-abs(p.x) * 38.0) * exp(-abs(p.y) * 4.5);
    float flare = (rayX + rayY) * pow(1.0 - uProgress, 1.5);

    float val = (ring * 0.72 + coreFlash * 1.15 + flare * 0.75) * uIntensity;
    if (val < 0.004) discard;

    vec3 col = mix(uColor * 1.35, vec3(1.5, 1.45, 1.35), clamp(coreFlash, 0.0, 1.0));
    gl_FragColor = vec4(col * val, clamp(val, 0.0, 1.0));
  }
`;

export class FireworksEngine {
  private scene: THREE.Scene;

  // Star + Ribbon Trail Pool
  private stars: ActiveStar[] = [];
  private starCursor = 0;

  private rPositions: Float32Array;
  private rTangents: Float32Array;
  private rSideWidths: Float32Array;
  private rSideSigns: Float32Array;
  private rProgress: Float32Array;
  private rColors: Float32Array;
  private rTailColors: Float32Array;
  private rAlphas: Float32Array;
  private rGeo: THREE.BufferGeometry;
  private rMat: THREE.ShaderMaterial;
  private rMesh: THREE.Mesh;

  // Diffraction Starburst Head Pool
  private hPositions: Float32Array;
  private hColors: Float32Array;
  private hSizes: Float32Array;
  private hAlphas: Float32Array;
  private hRots: Float32Array;
  private hGeo: THREE.BufferGeometry;
  private hMat: THREE.ShaderMaterial;
  private hPoints: THREE.Points;

  // Shedding Micro-Spark & Crackle Pool
  private micros: ActiveMicro[] = [];
  private microCursor = 0;
  private mPositions: Float32Array;
  private mColors: Float32Array;
  private mSizes: Float32Array;
  private mAlphas: Float32Array;
  private mRots: Float32Array;
  private mGeo: THREE.BufferGeometry;
  private mMat: THREE.ShaderMaterial;
  private mPoints: THREE.Points;

  // Smoke Pool
  private smokes: ActiveSmoke[] = [];
  private smokeCursor = 0;
  private sPositions: Float32Array;
  private sColors: Float32Array;
  private sGeo: THREE.BufferGeometry;
  private sMat: THREE.PointsMaterial;
  private sPoints: THREE.Points;

  // Optical Shock-Corona Flash Pool
  private coronas: CoronaSlot[] = [];
  private coronaGeo: THREE.PlaneGeometry;
  private coronaCursor = 0;

  private projectiles: RisingProjectile[] = [];
  private jobs: ActiveFireworkJob[] = [];
  private flashLights: FlashLightSlot[] = [];

  private qualityMultiplier = 1.0;
  private performanceMode = false;
  public cameraShakeTrauma = 0;
  public onShotCounter?: () => void;

  private lastActiveStars = 0;
  private lastActiveMicros = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;

    // 1. Initialize Active Star Pool (Ribbon Trails + Starburst Heads)
    for (let i = 0; i < MAX_STARS; i++) {
      this.stars.push({
        active: false,
        x: 0,
        y: -999,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        r: 1,
        g: 1,
        b: 1,
        tr: 1,
        tg: 0.6,
        tb: 0.2,
        life: 0,
        maxLife: 1,
        drag: 0.96,
        gravity: 5.5,
        trailWidth: 0.24,
        headSize: 1.5,
        strobe: false,
        glitter: false,
        phaseOffset: (i * 1.618) % 6.28,
        crackleAtEnd: false,
        splitAtEnd: false,
        shedRate: 0,
        shedAccum: 0,
        histInterval: 0.025,
        histTimer: 0,
        histCount: 0,
        histHead: 0,
        histX: new Float32Array(HIST_LEN),
        histY: new Float32Array(HIST_LEN),
        histZ: new Float32Array(HIST_LEN),
      });
    }

    const totalRVerts = MAX_STARS * VERTS_PER_STAR;
    this.rPositions = new Float32Array(totalRVerts * 3);
    this.rTangents = new Float32Array(totalRVerts * 3);
    this.rSideWidths = new Float32Array(totalRVerts);
    this.rSideSigns = new Float32Array(totalRVerts);
    this.rProgress = new Float32Array(totalRVerts);
    this.rColors = new Float32Array(totalRVerts * 3);
    this.rTailColors = new Float32Array(totalRVerts * 3);
    this.rAlphas = new Float32Array(totalRVerts);

    const indices = new Uint32Array(MAX_STARS * INDICES_PER_STAR);
    let idxPtr = 0;
    for (let s = 0; s < MAX_STARS; s++) {
      const baseV = s * VERTS_PER_STAR;
      for (let k = 0; k < HIST_LEN - 1; k++) {
        const v0 = baseV + k * 2;
        const v1 = v0 + 1;
        const v2 = v0 + 2;
        const v3 = v0 + 3;
        indices[idxPtr++] = v0;
        indices[idxPtr++] = v1;
        indices[idxPtr++] = v2;
        indices[idxPtr++] = v1;
        indices[idxPtr++] = v3;
        indices[idxPtr++] = v2;
      }
    }

    this.rGeo = new THREE.BufferGeometry();
    this.rGeo.setIndex(new THREE.BufferAttribute(indices, 1));
    this.rGeo.setAttribute('position', new THREE.BufferAttribute(this.rPositions, 3));
    this.rGeo.setAttribute('aTangent', new THREE.BufferAttribute(this.rTangents, 3));
    this.rGeo.setAttribute('aSideWidth', new THREE.BufferAttribute(this.rSideWidths, 1));
    this.rGeo.setAttribute('aSideSign', new THREE.BufferAttribute(this.rSideSigns, 1));
    this.rGeo.setAttribute('aProgress', new THREE.BufferAttribute(this.rProgress, 1));
    this.rGeo.setAttribute('aColor', new THREE.BufferAttribute(this.rColors, 3));
    this.rGeo.setAttribute('aTailColor', new THREE.BufferAttribute(this.rTailColors, 3));
    this.rGeo.setAttribute('aAlpha', new THREE.BufferAttribute(this.rAlphas, 1));
    this.rGeo.setDrawRange(0, 0);

    this.rMat = new THREE.ShaderMaterial({
      vertexShader: RIBBON_VERT,
      fragmentShader: RIBBON_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
    });
    this.rMesh = new THREE.Mesh(this.rGeo, this.rMat);
    this.rMesh.frustumCulled = false;
    this.rMesh.renderOrder = 5;
    this.scene.add(this.rMesh);

    // 2. Initialize Diffraction Starburst Head Layer
    this.hPositions = new Float32Array(MAX_STARS * 3);
    this.hColors = new Float32Array(MAX_STARS * 3);
    this.hSizes = new Float32Array(MAX_STARS);
    this.hAlphas = new Float32Array(MAX_STARS);
    this.hRots = new Float32Array(MAX_STARS);

    this.hGeo = new THREE.BufferGeometry();
    this.hGeo.setAttribute('position', new THREE.BufferAttribute(this.hPositions, 3));
    this.hGeo.setAttribute('aColor', new THREE.BufferAttribute(this.hColors, 3));
    this.hGeo.setAttribute('aSize', new THREE.BufferAttribute(this.hSizes, 1));
    this.hGeo.setAttribute('aAlpha', new THREE.BufferAttribute(this.hAlphas, 1));
    this.hGeo.setAttribute('aRot', new THREE.BufferAttribute(this.hRots, 1));
    this.hGeo.setDrawRange(0, 0);

    this.hMat = new THREE.ShaderMaterial({
      vertexShader: STAR_HEAD_VERT,
      fragmentShader: STAR_HEAD_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.hPoints = new THREE.Points(this.hGeo, this.hMat);
    this.hPoints.frustumCulled = false;
    this.hPoints.renderOrder = 6;
    this.scene.add(this.hPoints);

    // 3. Initialize Micro-Spark & Crackle Snap Layer
    for (let i = 0; i < MAX_MICRO; i++) {
      this.micros.push({
        active: false,
        x: 0,
        y: -999,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        r: 1,
        g: 0.9,
        b: 0.6,
        life: 0,
        maxLife: 0.3,
        drag: 0.92,
        gravity: 6.5,
        size: 0.65,
        rot: (i * 0.73) % 3.14,
        flicker: false,
      });
    }
    this.mPositions = new Float32Array(MAX_MICRO * 3);
    this.mColors = new Float32Array(MAX_MICRO * 3);
    this.mSizes = new Float32Array(MAX_MICRO);
    this.mAlphas = new Float32Array(MAX_MICRO);
    this.mRots = new Float32Array(MAX_MICRO);

    this.mGeo = new THREE.BufferGeometry();
    this.mGeo.setAttribute('position', new THREE.BufferAttribute(this.mPositions, 3));
    this.mGeo.setAttribute('aColor', new THREE.BufferAttribute(this.mColors, 3));
    this.mGeo.setAttribute('aSize', new THREE.BufferAttribute(this.mSizes, 1));
    this.mGeo.setAttribute('aAlpha', new THREE.BufferAttribute(this.mAlphas, 1));
    this.mGeo.setAttribute('aRot', new THREE.BufferAttribute(this.mRots, 1));
    this.mGeo.setDrawRange(0, 0);

    this.mMat = new THREE.ShaderMaterial({
      vertexShader: STAR_HEAD_VERT,
      fragmentShader: STAR_HEAD_FRAG,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.mPoints = new THREE.Points(this.mGeo, this.mMat);
    this.mPoints.frustumCulled = false;
    this.mPoints.renderOrder = 6;
    this.scene.add(this.mPoints);

    // 4. Initialize Smoke Pool
    for (let i = 0; i < MAX_SMOKE; i++) {
      this.smokes.push({
        active: false,
        x: 0,
        y: -999,
        z: 0,
        vx: 0,
        vy: 0,
        vz: 0,
        r: 0.75,
        g: 0.78,
        b: 0.84,
        life: 0,
        maxLife: 3,
      });
    }
    this.sPositions = new Float32Array(MAX_SMOKE * 3);
    this.sColors = new Float32Array(MAX_SMOKE * 3);
    this.sGeo = new THREE.BufferGeometry();
    this.sGeo.setAttribute('position', new THREE.BufferAttribute(this.sPositions, 3));
    this.sGeo.setAttribute('color', new THREE.BufferAttribute(this.sColors, 3));

    const smokeSprite = createSmokeSpriteTexture();
    this.sMat = new THREE.PointsMaterial({
      size: 7.4,
      map: smokeSprite,
      vertexColors: true,
      transparent: true,
      opacity: 0.25,
      depthWrite: false,
      blending: THREE.NormalBlending,
      sizeAttenuation: true,
    });
    this.sPoints = new THREE.Points(this.sGeo, this.sMat);
    this.sPoints.frustumCulled = false;
    this.sPoints.renderOrder = 3;
    this.scene.add(this.sPoints);

    // 5. Optical Shock-Corona Flash Pool
    this.coronaGeo = new THREE.PlaneGeometry(1, 1);
    for (let i = 0; i < MAX_CORONAS; i++) {
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          uProgress: { value: 0 },
          uColor: { value: new THREE.Color(0xffffff) },
          uIntensity: { value: 1.0 },
        },
        vertexShader: CORONA_VERT,
        fragmentShader: CORONA_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(this.coronaGeo, mat);
      mesh.visible = false;
      mesh.frustumCulled = false;
      mesh.renderOrder = 7;
      this.scene.add(mesh);
      this.coronas.push({ mesh, mat, active: false, life: 0, maxLife: 0.25, maxScale: 16 });
    }

    // 6. Pool 10 Dynamic Flash Lights
    for (let i = 0; i < 10; i++) {
      const light = new THREE.PointLight(0xffaa44, 0, 145, 1.2);
      light.position.set(0, -100, 0);
      this.scene.add(light);
      this.flashLights.push({ light, life: 0, maxLife: 0.48, peakIntensity: 85 });
    }
  }

  public setQuality(quality: GraphicsQuality, performanceMode: boolean) {
    this.performanceMode = performanceMode;
    if (performanceMode) {
      this.qualityMultiplier = 0.6;
    } else {
      this.qualityMultiplier =
        quality === 'low'
          ? 0.9
          : quality === 'medium'
          ? 0.95
          : quality === 'high'
          ? 1.1
          : quality === 'ultra'
          ? 1.35
          : 1.55;
    }
  }

  public getActiveCounts() {
    return {
      activeStars: this.lastActiveStars,
      activeMicroSparks: this.lastActiveMicros,
      activeProjectiles: this.projectiles.length,
      activeJobs: this.jobs.length,
    };
  }

  public clearAllActive() {
    this.jobs.length = 0;
    this.projectiles.length = 0;
    for (let i = 0; i < MAX_STARS; i++) {
      this.stars[i].active = false;
    }
    for (let i = 0; i < MAX_MICRO; i++) {
      this.micros[i].active = false;
    }
    for (let i = 0; i < MAX_SMOKE; i++) {
      this.smokes[i].active = false;
      this.sPositions[i * 3 + 1] = -999;
    }
    for (const c of this.coronas) {
      c.active = false;
      c.mesh.visible = false;
    }
    for (const fl of this.flashLights) {
      fl.life = 0;
      fl.light.intensity = 0;
    }
    this.rGeo.setDrawRange(0, 0);
    this.hGeo.setDrawRange(0, 0);
    this.mGeo.setDrawRange(0, 0);
    this.sGeo.attributes.position.needsUpdate = true;
    this.lastActiveStars = 0;
    this.lastActiveMicros = 0;
  }

  private computeSpatialAudio(worldX: number, worldY: number, worldZ: number, camera: THREE.Camera) {
    camera.getWorldDirection(_camForward);
    _camRight.crossVectors(_camForward, camera.up).normalize();
    _toEvent.set(worldX - camera.position.x, worldY - camera.position.y, worldZ - camera.position.z);
    const dist = _toEvent.length();
    const atten = Math.max(0.08, Math.min(1.0, 42 / (dist + 26)));
    const pan = dist > 0.1 ? _toEvent.normalize().dot(_camRight) : 0;
    return { pan, atten, dist };
  }

  public igniteFirework(
    uid: string,
    product: FireworkProduct,
    worldOrigin: THREE.Vector3,
    rotationY: number,
    meshGroup: THREE.Group | null,
    camera: THREE.Camera,
    fuseDuration = 2.0,
    angleDeg = 0,
    onComplete?: () => void,
  ) {
    const fuseLocal =
      (meshGroup?.userData.fuseLocalPos as THREE.Vector3) || new THREE.Vector3(0.1, 0.2, 0.1);
    const launchLocal =
      (meshGroup?.userData.launchLocalPos as THREE.Vector3) || new THREE.Vector3(0, 0.25, 0);

    const { pan } = this.computeSpatialAudio(worldOrigin.x, worldOrigin.y, worldOrigin.z, camera);
    if (fuseDuration > 0.2) {
      soundEngine.playFuseHiss(fuseDuration, pan);
    }

    this.jobs.push({
      uid,
      product,
      meshGroup,
      origin: worldOrigin.clone(),
      fuseLocalPos: fuseLocal.clone(),
      launchLocalPos: launchLocal.clone(),
      rotationY,
      angleDeg,
      phase: fuseDuration > 0.05 ? 'fusing' : 'firing',
      fuseRemaining: fuseDuration,
      elapsedFiring: 0,
      shotsFired: 0,
      nextShotTime: 0,
      fountainAccum: 0,
      fountainSoundAccum: 0,
      onComplete,
    });
  }

  private spawnStar(opts: {
    x: number;
    y: number;
    z: number;
    vx: number;
    vy: number;
    vz: number;
    r: number;
    g: number;
    b: number;
    tr?: number;
    tg?: number;
    tb?: number;
    maxLife: number;
    drag?: number;
    gravity?: number;
    trailWidth?: number;
    headSize?: number;
    histInterval?: number;
    strobe?: boolean;
    glitter?: boolean;
    crackleAtEnd?: boolean;
    splitAtEnd?: boolean;
    shedRate?: number;
  }): number {
    const idx = this.starCursor;
    this.starCursor = (this.starCursor + 1) % MAX_STARS;
    const s = this.stars[idx];

    s.active = true;
    s.x = opts.x;
    s.y = opts.y;
    s.z = opts.z;
    s.vx = opts.vx;
    s.vy = opts.vy;
    s.vz = opts.vz;
    s.r = opts.r;
    s.g = opts.g;
    s.b = opts.b;
    s.tr = opts.tr ?? opts.r * 0.75 + 0.15;
    s.tg = opts.tg ?? opts.g * 0.55 + 0.08;
    s.tb = opts.tb ?? opts.b * 0.35 + 0.03;
    s.life = opts.maxLife;
    s.maxLife = opts.maxLife;
    s.drag = opts.drag ?? 0.962;
    s.gravity = opts.gravity ?? 5.4;
    s.trailWidth = opts.trailWidth ?? 0.24;
    s.headSize = opts.headSize ?? 1.55;
    s.histInterval = opts.histInterval ?? 0.026;
    s.histTimer = 0;
    s.strobe = opts.strobe ?? false;
    s.glitter = opts.glitter ?? false;
    s.crackleAtEnd = opts.crackleAtEnd ?? false;
    s.splitAtEnd = opts.splitAtEnd ?? false;
    s.shedRate = this.performanceMode ? (opts.shedRate ?? 0) * 0.35 : (opts.shedRate ?? 0);
    s.shedAccum = Math.random();

    // Seed ring buffer at spawn point so initial frames don't collapse
    s.histHead = 0;
    s.histCount = 2;
    for (let k = 0; k < HIST_LEN; k++) {
      s.histX[k] = opts.x;
      s.histY[k] = opts.y;
      s.histZ[k] = opts.z;
    }
    return idx;
  }

  private spawnMicro(
    x: number,
    y: number,
    z: number,
    vx: number,
    vy: number,
    vz: number,
    r: number,
    g: number,
    b: number,
    maxLife: number,
    size = 0.72,
    drag = 0.91,
    gravity = 6.2,
    flicker = false,
  ) {
    const m = this.micros[this.microCursor];
    this.microCursor = (this.microCursor + 1) % MAX_MICRO;
    m.active = true;
    m.x = x;
    m.y = y;
    m.z = z;
    m.vx = vx;
    m.vy = vy;
    m.vz = vz;
    m.r = r;
    m.g = g;
    m.b = b;
    m.life = maxLife;
    m.maxLife = maxLife;
    m.size = size;
    m.drag = drag;
    m.gravity = gravity;
    m.flicker = flicker;
  }

  private spawnSmoke(
    x: number,
    y: number,
    z: number,
    vx = 0,
    vy = 1.4,
    vz = 0,
    maxLife = 3.2,
    r = 0.75,
    g = 0.78,
    b = 0.85,
  ) {
    if (this.performanceMode && Math.random() < 0.65) return;
    const s = this.smokes[this.smokeCursor];
    this.smokeCursor = (this.smokeCursor + 1) % MAX_SMOKE;
    s.active = true;
    s.x = x;
    s.y = y;
    s.z = z;
    s.vx = vx + (Math.random() - 0.5) * 1.2;
    s.vy = vy + Math.random() * 0.9;
    s.vz = vz + (Math.random() - 0.5) * 1.2;
    s.r = r;
    s.g = g;
    s.b = b;
    s.life = maxLife;
    s.maxLife = maxLife;
  }

  private triggerCorona(
    x: number,
    y: number,
    z: number,
    hexColor: string,
    maxScale = 18,
    intensity = 1.0,
    maxLife = 0.24,
  ) {
    const c = this.coronas[this.coronaCursor];
    this.coronaCursor = (this.coronaCursor + 1) % MAX_CORONAS;
    c.active = true;
    c.life = maxLife;
    c.maxLife = maxLife;
    c.maxScale = maxScale;
    c.mesh.position.set(x, y, z);
    c.mesh.scale.setScalar(2.0);
    c.mesh.visible = true;
    c.mat.uniforms.uColor.value.set(hexColor);
    c.mat.uniforms.uProgress.value = 0;
    c.mat.uniforms.uIntensity.value = intensity;
  }

  private triggerFlashLight(x: number, y: number, z: number, hexColor: string, intensity = 65) {
    let slot = this.flashLights[0];
    for (const candidate of this.flashLights) {
      if (candidate.life <= 0) {
        slot = candidate;
        break;
      }
      if (candidate.life < slot.life) {
        slot = candidate;
      }
    }
    slot.light.position.set(x, y, z);
    slot.light.color.set(hexColor);
    slot.peakIntensity = intensity;
    slot.light.intensity = intensity;
    slot.life = 0.52;
    slot.maxLife = 0.52;
  }

  private fireSingleShot(job: ActiveFireworkJob, camera: THREE.Camera) {
    const p = job.product;
    const eff = p.effect;
    const idx = job.shotsFired;
    const progress = p.shots > 1 ? idx / Math.max(1, p.shots - 1) : 1;
    const isCompound = p.category === 'Compounds' || p.shapeType === 'compound';
    const isFinaleShot =
      p.shots >= 6 && (idx >= p.shots - Math.max(2, Math.round(p.shots * 0.14)) || (isCompound && progress > 0.85));

    if (p.shapeType === 'rocket' && job.meshGroup) {
      const projMesh = job.meshGroup.getObjectByName('rocketProjectile');
      if (projMesh) projMesh.visible = false;
    }

    const lx =
      job.origin.x +
      job.launchLocalPos.x * Math.cos(job.rotationY) +
      job.launchLocalPos.z * Math.sin(job.rotationY);
    const ly = job.origin.y + job.launchLocalPos.y;
    const lz =
      job.origin.z -
      job.launchLocalPos.x * Math.sin(job.rotationY) +
      job.launchLocalPos.z * Math.cos(job.rotationY);

    // Ground-launched fan wall mine ("comet_mine")
    if (eff.style === 'comet_mine') {
      const { pan, atten } = this.computeSpatialAudio(lx, ly, lz, camera);
      soundEngine.playLaunchWhoosh(1.25, pan, atten);
      soundEngine.playExplosion(0.65, pan, atten);
      const mineStars = Math.max(20, Math.round(38 * this.qualityMultiplier));
      for (let i = 0; i < mineStars; i++) {
        const fan = (i / (mineStars - 1) - 0.5) * 1.15;
        const depth = (Math.random() - 0.5) * 0.55;
        const speed = 18 + Math.random() * 12;
        _tmpColor.set(eff.colors[i % eff.colors.length]);
        this.spawnStar({
          x: lx,
          y: ly,
          z: lz,
          vx: Math.sin(fan) * speed,
          vy: Math.cos(fan * 0.62) * speed,
          vz: Math.sin(depth) * speed,
          r: _tmpColor.r,
          g: _tmpColor.g,
          b: _tmpColor.b,
          tr: 1.0,
          tg: 0.65,
          tb: 0.25,
          maxLife: 1.25 + Math.random() * 0.45,
          drag: 0.952,
          gravity: 9.2,
          trailWidth: 0.34,
          headSize: 1.9,
          histInterval: 0.022,
          glitter: true,
          crackleAtEnd: eff.hasCrackle && i % 3 === 0,
          shedRate: 14,
        });
      }
      this.triggerCorona(lx, ly + 0.8, lz, eff.colors[0] || '#F59E0B', 9, 0.9, 0.2);
      this.triggerFlashLight(lx, ly + 1.5, lz, eff.colors[0] || '#F59E0B', 46);
      this.spawnSmoke(lx, ly + 0.5, lz, 0, 1.8, 0, 2.4);
      this.onShotCounter?.();
      return;
    }

    // Determine launch angle pattern (Compounds escalate through stages)
    let activePattern = eff.pattern;
    if (isCompound) {
      if (progress < 0.35) activePattern = 'straight';
      else if (progress < 0.72) activePattern = eff.pattern === 'straight' ? 'z_sweep' : eff.pattern;
      else activePattern = 'w_shape';
    }

    let patternAngle = 0;
    if (activePattern === 'fan') {
      patternAngle = (((idx % 5) - 2) / 2) * 0.32;
    } else if (activePattern === 'v_shape') {
      patternAngle = (idx % 2 === 0 ? -1 : 1) * 0.25;
    } else if (activePattern === 'w_shape') {
      const mod = idx % 3;
      patternAngle = mod === 0 ? -0.28 : mod === 1 ? 0 : 0.28;
    } else if (activePattern === 'z_sweep') {
      const t = (idx % 7) / 6;
      const dir = Math.floor(idx / 7) % 2 === 0 ? 1 : -1;
      patternAngle = (t - 0.5) * 2 * 0.34 * dir;
    } else if (activePattern === 'salvo') {
      patternAngle = (Math.random() - 0.5) * 0.38;
    }

    const totalAngleX =
      THREE.MathUtils.degToRad(job.angleDeg) + patternAngle + (Math.random() - 0.5) * 0.05;
    const spreadZ = (Math.random() - 0.5) * 0.07;

    const targetH = eff.burstHeight * (isFinaleShot ? 1.08 : 0.93 + Math.random() * 0.14);
    const upSpeed = Math.sqrt(2 * 14 * targetH);
    const fuseTime = (upSpeed / 14) * 0.88;

    const vx = Math.sin(totalAngleX) * upSpeed * 0.85;
    const vy = Math.cos(totalAngleX) * upSpeed;
    const vz = Math.sin(spreadZ) * upSpeed * 0.85;

    // Muzzle flash sparks
    for (let i = 0; i < 10; i++) {
      this.spawnMicro(
        lx,
        ly,
        lz,
        vx * 0.18 + (Math.random() - 0.5) * 3.5,
        6 + Math.random() * 7,
        vz * 0.18 + (Math.random() - 0.5) * 3.5,
        1.0,
        0.78,
        0.38,
        0.24 + Math.random() * 0.14,
        0.95,
        0.91,
        12,
      );
    }
    this.spawnSmoke(lx, ly + 0.3, lz, vx * 0.05, 1.5, vz * 0.05, 1.8);

    const { pan, atten } = this.computeSpatialAudio(lx, ly, lz, camera);
    soundEngine.playLaunchWhoosh(p.caliberMm / 25, pan, atten);
    if (eff.isWhistle) {
      soundEngine.playWhistle(pan, atten);
    }

    // Luminous rising comet ribbon attached directly to projectile!
    const isRocketOrShell = eff.isRocket || p.category === 'Aerial Fireworks' || p.category === 'Finale';
    const isRomanCandle = p.category === 'Roman Candles';
    const cometColorHex = isRomanCandle
      ? eff.colors[idx % eff.colors.length]
      : eff.hasTail || isRocketOrShell
      ? '#FDE68A'
      : '#FDBA74';
    _tmpColor.set(cometColorHex);
    const cometIdx = this.spawnStar({
      x: lx,
      y: ly,
      z: lz,
      vx,
      vy,
      vz,
      r: _tmpColor.r,
      g: _tmpColor.g,
      b: _tmpColor.b,
      tr: 1.0,
      tg: 0.55,
      tb: 0.16,
      maxLife: fuseTime + 0.12,
      drag: 1.0,
      gravity: 14,
      trailWidth: isRocketOrShell ? 0.32 : isRomanCandle ? 0.28 : 0.2,
      headSize: isRomanCandle ? 2.4 : 1.75,
      histInterval: isRocketOrShell ? 0.022 : 0.016,
      glitter: isRocketOrShell,
      shedRate: 0,
    });

    this.projectiles.push({
      x: lx,
      y: ly,
      z: lz,
      vx,
      vy,
      vz,
      fuseTime,
      product: p,
      shotIndex: idx,
      isFinaleShot,
      trailAccum: 0,
      cometStarIdx: cometIdx,
    });

    this.onShotCounter?.();
  }

  private detonateProjectile(proj: RisingProjectile, camera: THREE.Camera) {
    // Extinguish the rising comet star cleanly at apex
    if (proj.cometStarIdx >= 0 && proj.cometStarIdx < MAX_STARS) {
      this.stars[proj.cometStarIdx].active = false;
    }

    const p = proj.product;
    const eff = p.effect;
    const seed = hashProductSeed(p.id);
    const isRomanCandle = p.category === 'Roman Candles';
    const isThunderKing = p.category === 'Thunder Kings';
    const isCompound = p.category === 'Compounds' || p.shapeType === 'compound';

    // Select style: alternate cleanly across shots for cakes/compounds or finale shots
    let activeStyle: EffectStyle = eff.style;
    if (eff.secondaryStyle) {
      if (isCompound) {
        const progress = p.shots > 1 ? proj.shotIndex / (p.shots - 1) : 1;
        activeStyle = progress > 0.42 && proj.shotIndex % 2 === 1 ? eff.secondaryStyle : eff.style;
      } else if (proj.isFinaleShot || proj.shotIndex % 3 === 2) {
        activeStyle = eff.secondaryStyle;
      }
    }
    if (proj.isFinaleShot && (p.category === 'Cakes' || isCompound) && seed % 2 === 0 && eff.hasCrackle) {
      activeStyle = eff.secondaryStyle || eff.style;
    }

    const baseCount = Math.max(
      26,
      Math.round(eff.starCount * this.qualityMultiplier * (proj.isFinaleShot ? 1.25 : 1.0)),
    );
    const baseSpeed =
      eff.burstRadius * 1.72 * (proj.isFinaleShot ? 1.12 : 0.94 + Math.random() * 0.14);

    const { pan, atten, dist } = this.computeSpatialAudio(proj.x, proj.y, proj.z, camera);
    const power = activeStyle === 'salute' || activeStyle === 'finale' || proj.isFinaleShot ? 1.4 : p.caliberMm / 25;
    soundEngine.playExplosion(power, pan, atten);

    if (eff.hasCrackle || activeStyle === 'crackling' || activeStyle === 'crackle_palm') {
      setTimeout(() => {
        soundEngine.playCrackleBurst(12, pan, atten);
      }, 280);
    }

    const distFactor = Math.max(0, 1 - dist / 95);
    this.cameraShakeTrauma = Math.min(1.0, this.cameraShakeTrauma + eff.shakeIntensity * distFactor * 0.6);

    const flashColor = eff.colors[proj.shotIndex % eff.colors.length] || '#FDE047';
    const flashPower =
      activeStyle === 'salute' || activeStyle === 'finale'
        ? 135
        : p.caliberMm >= 40
        ? 105
        : 80;
    this.triggerFlashLight(proj.x, proj.y, proj.z, flashColor, flashPower);

    // Optical shockwave corona at burst center
    this.triggerCorona(
      proj.x,
      proj.y,
      proj.z,
      activeStyle === 'salute' ? '#FFFFFF' : flashColor,
      activeStyle === 'salute' ? Math.max(16, eff.burstRadius * 1.35) : eff.burstRadius * 1.05,
      activeStyle === 'salute' ? 1.55 : proj.isFinaleShot ? 1.3 : 1.0,
      activeStyle === 'salute' ? 0.22 : 0.26,
    );

    if (proj.y < 52 && this.qualityMultiplier >= 1.0) {
      this.triggerFlashLight(proj.x, Math.max(4.5, proj.y * 0.25), proj.z, flashColor, flashPower * 0.38);
    }

    _tmpColor.set(flashColor);
    const sr = 0.6 + _tmpColor.r * 0.24;
    const sg = 0.63 + _tmpColor.g * 0.22;
    const sb = 0.7 + _tmpColor.b * 0.22;
    this.spawnSmoke(proj.x, proj.y, proj.z, 0, 1.1, 0, 4.4, sr, sg, sb);
    this.spawnSmoke(proj.x + 1.5, proj.y - 0.4, proj.z - 1.1, 0.35, 0.95, -0.3, 3.8, sr, sg, sb);

    // Helper for Fibonacci sphere points (symmetric crisp flower distribution)
    const goldenAngle = Math.PI * (3 - Math.sqrt(5));
    const shotColorA = eff.colors[proj.shotIndex % eff.colors.length] || '#F59E0B';
    const shotColorB = eff.colors[(proj.shotIndex + 1) % eff.colors.length] || shotColorA;

    // ==================== 1. SALUTE / THUNDER KING ====================
    if (activeStyle === 'salute') {
      const spikeCount = Math.max(24, Math.round(baseCount * 0.85));
      for (let i = 0; i < spikeCount; i++) {
        const y = 1 - (i / Math.max(1, spikeCount - 1)) * 2;
        const r = Math.sqrt(Math.max(0, 1 - y * y));
        const theta = goldenAngle * i + (Math.random() - 0.5) * 0.14;
        const spd = baseSpeed * (0.95 + Math.random() * 0.45);
        _tmpColor.set(i % 4 === 0 ? shotColorA : i % 2 === 0 ? '#FEF9C3' : '#FFFFFF');
        this.spawnStar({
          x: proj.x,
          y: proj.y,
          z: proj.z,
          vx: Math.cos(theta) * r * spd,
          vy: y * spd + 0.8,
          vz: Math.sin(theta) * r * spd,
          r: _tmpColor.r,
          g: _tmpColor.g,
          b: _tmpColor.b,
          tr: 0.95,
          tg: 0.9,
          tb: 0.78,
          maxLife: 0.46 + Math.random() * 0.22,
          drag: 0.925,
          gravity: 5.5,
          trailWidth: 0.32,
          headSize: 2.1,
          histInterval: 0.015,
          strobe: true,
          crackleAtEnd: eff.hasCrackle || isThunderKing,
          shedRate: 18,
        });
      }
      // Crisp colored inner pistil ring for Thunder Kings
      if (isThunderKing && eff.colors.length > 0) {
        const innerN = 18;
        _tmpColor.set(shotColorA);
        for (let i = 0; i < innerN; i++) {
          const ang = (i / innerN) * Math.PI * 2;
          const spd = baseSpeed * 0.52;
          this.spawnStar({
            x: proj.x,
            y: proj.y,
            z: proj.z,
            vx: Math.cos(ang) * spd,
            vy: 1.5,
            vz: Math.sin(ang) * spd,
            r: _tmpColor.r,
            g: _tmpColor.g,
            b: _tmpColor.b,
            maxLife: 0.65,
            drag: 0.94,
            gravity: 4.5,
            trailWidth: 0.26,
            headSize: 2.0,
            histInterval: 0.016,
          });
        }
      }
      return;
    }

    // ==================== 2. PALM & CRACKLE PALM ====================
    if (activeStyle === 'palm' || activeStyle === 'crackle_palm') {
      const arms = activeStyle === 'crackle_palm' ? 10 + (seed % 3) : 7 + (seed % 4);
      const tiltOffset = seededRand(seed, proj.shotIndex) * Math.PI * 2;
      for (let a = 0; a < arms; a++) {
        const phi = (a / arms) * Math.PI * 2 + tiltOffset + (Math.random() - 0.5) * 0.14;
        const theta = 0.42 + (a % 2 === 0 ? 0.22 : 0.48) + Math.random() * 0.22;
        const dirX = Math.sin(theta) * Math.cos(phi);
        const dirY = Math.cos(theta) * 0.78 + 0.28;
        const dirZ = Math.sin(theta) * Math.sin(phi);
        const cHex = eff.colors[a % eff.colors.length] || '#FBBF24';
        _tmpColor.set(cHex);
        const armSpeed = baseSpeed * (1.02 + Math.random() * 0.14);

        // Main thick luminous frond stem + staggered follower stars along exact arm vector
        const followers = 4;
        for (let k = 0; k < followers; k++) {
          const frac = 0.76 + k * 0.085;
          this.spawnStar({
            x: proj.x,
            y: proj.y,
            z: proj.z,
            vx: dirX * armSpeed * frac + (Math.random() - 0.5) * 0.5,
            vy: dirY * armSpeed * frac + (Math.random() - 0.5) * 0.5,
            vz: dirZ * armSpeed * frac + (Math.random() - 0.5) * 0.5,
            r: _tmpColor.r,
            g: _tmpColor.g,
            b: _tmpColor.b,
            tr: 1.0,
            tg: 0.62,
            tb: 0.18,
            maxLife: 2.0 + k * 0.12 + Math.random() * 0.25,
            drag: 0.955,
            gravity: 7.4,
            trailWidth: k === followers - 1 ? 0.46 : 0.34,
            headSize: k === followers - 1 ? 2.4 : 1.4,
            histInterval: 0.036,
            glitter: true,
            crackleAtEnd: activeStyle === 'crackle_palm' && k >= 2,
            shedRate: k === followers - 1 ? 24 : 8,
          });
        }
      }
      return;
    }

    // ==================== 3. RING BURST (CRISP 3D GEOMETRIC RINGS) ====================
    if (activeStyle === 'ring_burst') {
      // Build orthonormal tilted plane basis so ring is geometrically circular from all angles
      const yawTilt = (seededRand(seed, 10 + proj.shotIndex) - 0.5) * 1.3;
      const pitchTilt = 0.3 + seededRand(seed, 20 + proj.shotIndex) * 0.8;
      _axisN.set(Math.sin(yawTilt) * Math.cos(pitchTilt), Math.sin(pitchTilt), Math.cos(yawTilt) * Math.cos(pitchTilt)).normalize();
      _axisU.set(0, 1, 0);
      if (Math.abs(_axisN.dot(_axisU)) > 0.9) _axisU.set(1, 0, 0);
      _axisU.crossVectors(_axisN, _axisU).normalize();
      _axisV.crossVectors(_axisN, _axisU).normalize();

      const ringCount = Math.max(32, Math.round(baseCount * 0.72));
      for (let i = 0; i < ringCount; i++) {
        const ang = (i / ringCount) * Math.PI * 2;
        const ca = Math.cos(ang);
        const sa = Math.sin(ang);
        const vx = (_axisU.x * ca + _axisV.x * sa) * baseSpeed;
        const vy = (_axisU.y * ca + _axisV.y * sa) * baseSpeed + 1.1;
        const vz = (_axisU.z * ca + _axisV.z * sa) * baseSpeed;

        _tmpColor.set(eff.colors[i % eff.colors.length] || shotColorA);
        this.spawnStar({
          x: proj.x,
          y: proj.y,
          z: proj.z,
          vx,
          vy,
          vz,
          r: _tmpColor.r,
          g: _tmpColor.g,
          b: _tmpColor.b,
          maxLife: 1.55 + Math.random() * 0.25,
          drag: 0.964,
          gravity: 4.6,
          trailWidth: 0.28,
          headSize: 2.0,
          histInterval: 0.026,
          strobe: eff.hasStrobe,
          glitter: true,
          crackleAtEnd: eff.hasCrackle && i % 4 === 0,
          shedRate: eff.hasTail ? 8 : 0,
        });
      }

      // Seed-varied Double Ring or Inner Pistil Core
      const innerCount = Math.max(16, Math.round(ringCount * 0.48));
      const useCrossRing = seed % 3 === 1;
      _tmpColor.set(shotColorB !== shotColorA ? shotColorB : '#FFFFFF');
      for (let i = 0; i < innerCount; i++) {
        const ang = (i / innerCount) * Math.PI * 2;
        const ca = Math.cos(ang);
        const sa = Math.sin(ang);
        const radScale = useCrossRing ? 0.78 : 0.48;
        const vx = useCrossRing
          ? (_axisN.x * ca + _axisU.x * sa) * baseSpeed * radScale
          : (_axisU.x * ca + _axisV.x * sa) * baseSpeed * radScale;
        const vy = (useCrossRing
          ? (_axisN.y * ca + _axisU.y * sa) * baseSpeed * radScale
          : (_axisU.y * ca + _axisV.y * sa) * baseSpeed * radScale) + 1.1;
        const vz = useCrossRing
          ? (_axisN.z * ca + _axisU.z * sa) * baseSpeed * radScale
          : (_axisU.z * ca + _axisV.z * sa) * baseSpeed * radScale;

        this.spawnStar({
          x: proj.x,
          y: proj.y,
          z: proj.z,
          vx,
          vy,
          vz,
          r: _tmpColor.r,
          g: _tmpColor.g,
          b: _tmpColor.b,
          maxLife: 1.3 + Math.random() * 0.2,
          drag: 0.96,
          gravity: 4.5,
          trailWidth: 0.24,
          headSize: 1.75,
          histInterval: 0.022,
          strobe: true,
        });
      }
      return;
    }

    // ==================== 4. CROSSETTE (COMETS SPLITTING 4-WAY MID-FLIGHT) ====================
    if (activeStyle === 'crossette') {
      const cometN = Math.max(14, Math.round(baseCount * 0.36));
      for (let i = 0; i < cometN; i++) {
        const y = 1 - (i / Math.max(1, cometN - 1)) * 2;
        const rad = Math.sqrt(Math.max(0, 1 - y * y));
        const phi = goldenAngle * i + (Math.random() - 0.5) * 0.18;
        const spd = baseSpeed * (0.9 + Math.random() * 0.2);
        _tmpColor.set(eff.colors[i % eff.colors.length] || shotColorA);
        this.spawnStar({
          x: proj.x,
          y: proj.y,
          z: proj.z,
          vx: rad * Math.cos(phi) * spd,
          vy: y * spd + 1.4,
          vz: rad * Math.sin(phi) * spd,
          r: _tmpColor.r,
          g: _tmpColor.g,
          b: _tmpColor.b,
          tr: 1.0,
          tg: 0.72,
          tb: 0.35,
          maxLife: 0.58 + Math.random() * 0.18,
          drag: 0.972,
          gravity: 4.8,
          trailWidth: 0.36,
          headSize: 2.35,
          histInterval: 0.024,
          splitAtEnd: true,
          shedRate: 14,
        });
      }
      return;
    }

    // ==================== 5. SPHERICAL CHRYSANTHEMUM / PEONY / WILLOW / KAMURO / BROCADE / MULTI ====================
    const isKamuro = activeStyle === 'golden_kamuro';
    const isWillow = activeStyle === 'golden_willow' || isKamuro;
    const isBrocade = activeStyle === 'brocade_crown';
    const isChrys = activeStyle === 'chrysanthemum';
    const isPeony =
      activeStyle === 'red_peony' || activeStyle === 'blue_peony' || activeStyle === 'green_peony';
    const isMulti = activeStyle === 'multi_color' || activeStyle === 'finale';
    const isStrobe = activeStyle === 'white_strobe' || eff.hasStrobe;
    const isGlitter = activeStyle === 'silver_glitter' || isBrocade || isKamuro || isWillow;
    const isCrackle = activeStyle === 'crackling' || eff.hasCrackle;

    const starCount = isKamuro
      ? Math.round(baseCount * 1.25)
      : isChrys
      ? Math.round(baseCount * 1.15)
      : isRomanCandle
      ? Math.max(18, Math.round(baseCount * 0.65))
      : baseCount;

    const c1 = new THREE.Color(shotColorA);
    const c2 = new THREE.Color(shotColorB);
    const phaseRot = seededRand(seed, proj.shotIndex + 7) * Math.PI * 2;

    for (let i = 0; i < starCount; i++) {
      // Uniform Fibonacci sphere + slight organic jitter so petals look symmetric & crisp
      const u = 1 - (i / Math.max(1, starCount - 1)) * 2;
      const rad = Math.sqrt(Math.max(0, 1 - u * u));
      const phi = goldenAngle * i + phaseRot + (Math.random() - 0.5) * (isWillow ? 0.22 : 0.1);

      const dirX = rad * Math.cos(phi);
      const dirY = u;
      const dirZ = rad * Math.sin(phi);

      const speedVar =
        isWillow || isBrocade
          ? 0.78 + Math.random() * 0.34
          : isChrys
          ? 0.94 + Math.random() * 0.14
          : 0.9 + Math.random() * 0.2;
      const spd = baseSpeed * speedVar;

      if (isMulti) {
        // Intentional color zones / alternating petals rather than random noise
        const band =
          seed % 2 === 0
            ? Math.floor(((u + 1) * 0.5) * eff.colors.length)
            : i % eff.colors.length;
        _tmpColor.set(eff.colors[band % eff.colors.length]);
      } else if (isKamuro) {
        _tmpColor.set(i % 4 === 0 ? '#FEF08A' : '#FBBF24');
      } else if (isWillow) {
        _tmpColor.set(i % 5 === 0 ? '#FDE68A' : '#F59E0B');
      } else if (isBrocade) {
        _tmpColor.set(i % 3 === 0 ? '#FDE047' : i % 3 === 1 ? '#F59E0B' : c1.getStyle());
      } else {
        _tmpColor.copy(i % 3 === 0 ? c2 : c1);
      }

      // Tail ember color
      if (isWillow || isKamuro || isBrocade) {
        _tmpTailColor.setRGB(0.95, 0.48, 0.1);
      } else if (isChrys) {
        _tmpTailColor.copy(_tmpColor).lerp(new THREE.Color(1, 0.75, 0.4), 0.35);
      } else {
        _tmpTailColor.copy(_tmpColor).multiplyScalar(0.8);
      }

      const life = isKamuro
        ? 3.1 + Math.random() * 0.85
        : isWillow
        ? 2.65 + Math.random() * 0.85
        : isBrocade
        ? 2.15 + Math.random() * 0.65
        : isChrys
        ? 1.75 + Math.random() * 0.35
        : isPeony
        ? 1.45 + Math.random() * 0.35
        : 1.55 + Math.random() * 0.45;

      const drag = isKamuro ? 0.942 : isWillow ? 0.946 : isBrocade ? 0.955 : isChrys ? 0.962 : 0.966;
      const gravity = isKamuro ? 5.8 : isWillow ? 6.5 : isBrocade ? 6.4 : 5.1;

      // Persistent long trail interval for weeping willows/kamuro/chrysanthemum, crisp streak for peonies
      const histInterval = isKamuro
        ? 0.048
        : isWillow
        ? 0.044
        : isBrocade
        ? 0.038
        : isChrys
        ? 0.034
        : isPeony
        ? 0.02
        : 0.028;

      const trailWidth = isKamuro
        ? 0.34
        : isBrocade
        ? 0.36
        : isWillow
        ? 0.3
        : isChrys
        ? 0.24
        : 0.22;

      const headSize = isPeony ? 2.15 : isChrys ? 1.85 : isWillow || isKamuro ? 1.45 : 1.75;
      const shedRate = isKamuro || isWillow ? 10 : isBrocade ? 14 : eff.hasTail ? 6 : 0;

      this.spawnStar({
        x: proj.x,
        y: proj.y,
        z: proj.z,
        vx: dirX * spd,
        vy: dirY * spd + 1.25,
        vz: dirZ * spd,
        r: _tmpColor.r,
        g: _tmpColor.g,
        b: _tmpColor.b,
        tr: _tmpTailColor.r,
        tg: _tmpTailColor.g,
        tb: _tmpTailColor.b,
        maxLife: life,
        drag,
        gravity,
        trailWidth,
        headSize,
        histInterval,
        strobe: isStrobe && i % 2 === 0,
        glitter: isGlitter,
        crackleAtEnd: isCrackle && (activeStyle === 'crackling' ? i % 2 === 0 : i % 3 === 0),
        shedRate,
      });
    }

    // Inner Pistil / Strobe Core for Chrysanthemum, Peony, Brocade, Kamuro & Finale
    const hasPistil =
      activeStyle === 'finale' ||
      isBrocade ||
      isKamuro ||
      (isChrys && seed % 2 === 0) ||
      (isPeony && eff.colors.length > 1 && seed % 3 !== 0);

    if (hasPistil && !isRomanCandle) {
      const innerCount = Math.max(16, Math.round(starCount * 0.34));
      const pistilHex =
        eff.colors.length > 1 ? eff.colors[(proj.shotIndex + 1) % eff.colors.length] : '#FFFFFF';
      _tmpColor.set(pistilHex);
      for (let i = 0; i < innerCount; i++) {
        const u = 1 - (i / Math.max(1, innerCount - 1)) * 2;
        const rad = Math.sqrt(Math.max(0, 1 - u * u));
        const phi = goldenAngle * i + 1.1;
        const spd = baseSpeed * 0.48 * (0.9 + Math.random() * 0.16);
        this.spawnStar({
          x: proj.x,
          y: proj.y,
          z: proj.z,
          vx: rad * Math.cos(phi) * spd,
          vy: u * spd + 1.1,
          vz: rad * Math.sin(phi) * spd,
          r: _tmpColor.r,
          g: _tmpColor.g,
          b: _tmpColor.b,
          maxLife: 1.15 + Math.random() * 0.25,
          drag: 0.958,
          gravity: 4.5,
          trailWidth: 0.2,
          headSize: 1.85,
          histInterval: 0.02,
          strobe: isStrobe || activeStyle === 'finale',
          glitter: true,
        });
      }
    }
  }

  public update(dt: number, camera: THREE.Camera, windX = 0, windZ = 0) {
    const safeDt = Math.min(dt, 0.05);
    this.cameraShakeTrauma = Math.max(0, this.cameraShakeTrauma - safeDt * 1.45);

    // 1. Update Active Firework Jobs
    for (let i = this.jobs.length - 1; i >= 0; i--) {
      const job = this.jobs[i];

      if (job.phase === 'fusing') {
        job.fuseRemaining -= safeDt;

        const fx =
          job.origin.x +
          job.fuseLocalPos.x * Math.cos(job.rotationY) +
          job.fuseLocalPos.z * Math.sin(job.rotationY);
        const fy = job.origin.y + job.fuseLocalPos.y;
        const fz =
          job.origin.z -
          job.fuseLocalPos.x * Math.sin(job.rotationY) +
          job.fuseLocalPos.z * Math.cos(job.rotationY);

        if (Math.random() < 0.9) {
          this.spawnMicro(
            fx,
            fy,
            fz,
            (Math.random() - 0.5) * 2.4,
            1.1 + Math.random() * 2.4,
            (Math.random() - 0.5) * 2.4,
            1.0,
            0.78,
            0.25,
            0.22 + Math.random() * 0.14,
            0.85,
            0.94,
            9.5,
            true,
          );
        }

        if (job.fuseRemaining <= 0) {
          job.phase = 'firing';
          job.nextShotTime = 0;
        }
      } else if (job.phase === 'firing') {
        job.elapsedFiring += safeDt;

        const lx =
          job.origin.x +
          job.launchLocalPos.x * Math.cos(job.rotationY) +
          job.launchLocalPos.z * Math.sin(job.rotationY);
        const ly = job.origin.y + job.launchLocalPos.y;
        const lz =
          job.origin.z -
          job.launchLocalPos.x * Math.sin(job.rotationY) +
          job.launchLocalPos.z * Math.cos(job.rotationY);

        if (job.product.effect.isSmoke) {
          const dur = job.product.durationSec;
          const colors = job.product.effect.colors;
          const cHex =
            colors[Math.floor((job.elapsedFiring / dur) * colors.length) % colors.length] || '#F97316';
          _tmpColor.set(cHex);

          job.fountainAccum += safeDt * 24 * this.qualityMultiplier;
          while (job.fountainAccum >= 1) {
            job.fountainAccum -= 1;
            this.spawnSmoke(
              lx + (Math.random() - 0.5) * 0.3,
              ly + 0.15,
              lz + (Math.random() - 0.5) * 0.3,
              (Math.random() - 0.5) * 1.4,
              2.6 + Math.random() * 1.8,
              (Math.random() - 0.5) * 1.4,
              3.5 + Math.random() * 1.5,
              _tmpColor.r,
              _tmpColor.g,
              _tmpColor.b,
            );
          }
          if (Math.random() < 0.7) {
            this.spawnMicro(
              lx,
              ly,
              lz,
              (Math.random() - 0.5) * 1.6,
              1.8 + Math.random() * 1.5,
              (Math.random() - 0.5) * 1.6,
              _tmpColor.r,
              _tmpColor.g,
              _tmpColor.b,
              0.26,
              0.9,
              0.92,
              6.0,
            );
          }
          job.fountainSoundAccum += safeDt;
          if (job.fountainSoundAccum >= 0.32) {
            job.fountainSoundAccum = 0;
            const { pan, atten } = this.computeSpatialAudio(lx, ly, lz, camera);
            soundEngine.playFountainBurst(pan, atten * 0.55);
          }

          if (job.elapsedFiring >= dur) {
            job.phase = 'done';
            job.onComplete?.();
            this.jobs.splice(i, 1);
          }
        } else if (job.product.effect.isSpinner) {
          // Whirling Ground Spinner with curved spiral ribbon sparks
          const dur = job.product.durationSec;
          if (job.meshGroup) {
            job.meshGroup.rotation.y += safeDt * 26;
          }
          const colors = job.product.effect.colors;
          const colorIdx = Math.floor((job.elapsedFiring / dur) * colors.length * 3) % colors.length;
          _tmpColor.set(colors[colorIdx]);

          job.fountainAccum += safeDt * 68 * this.qualityMultiplier;
          const spinAng = job.elapsedFiring * 26;
          while (job.fountainAccum >= 1) {
            job.fountainAccum -= 1;
            const jetAng = spinAng + (Math.random() < 0.5 ? 0 : Math.PI);
            const spd = job.product.effect.burstRadius * (1.25 + Math.random() * 0.75);
            this.spawnStar({
              x: lx,
              y: ly + 0.06,
              z: lz,
              vx: Math.cos(jetAng) * spd,
              vy: 1.0 + Math.random() * 2.2,
              vz: Math.sin(jetAng) * spd,
              r: _tmpColor.r,
              g: _tmpColor.g,
              b: _tmpColor.b,
              maxLife: 0.42 + Math.random() * 0.25,
              drag: 0.94,
              gravity: 9.5,
              trailWidth: 0.16,
              headSize: 1.25,
              histInterval: 0.014,
              strobe: job.product.effect.hasStrobe,
              glitter: true,
              crackleAtEnd: job.product.effect.hasCrackle && Math.random() < 0.14,
            });
          }
          job.fountainSoundAccum += safeDt;
          if (job.fountainSoundAccum >= 0.25) {
            job.fountainSoundAccum = 0;
            const { pan, atten } = this.computeSpatialAudio(lx, ly, lz, camera);
            soundEngine.playFountainBurst(pan, atten * 0.9);
            this.triggerFlashLight(lx, ly + 0.5, lz, colors[colorIdx], 18);
          }

          if (job.elapsedFiring >= dur) {
            job.phase = 'done';
            job.onComplete?.();
            this.jobs.splice(i, 1);
          }
        } else if (job.product.effect.isFountain) {
          // Fountain / Sparkler with roaring luminous vertical ribbon jets + crackle embers
          const dur = job.product.durationSec;
          const isSparkler = job.product.effect.style === 'sparkler_shower';
          job.fountainAccum += safeDt * (isSparkler ? 76 : 64) * this.qualityMultiplier;
          const colors = job.product.effect.colors;
          const colorIdx = Math.floor((job.elapsedFiring / dur) * colors.length) % colors.length;
          _tmpColor.set(colors[colorIdx]);

          while (job.fountainAccum >= 1) {
            job.fountainAccum -= 1;
            const spread = job.product.effect.burstRadius * (isSparkler ? 0.82 : 0.55);
            const vy = job.product.effect.burstHeight * (1.85 + Math.random() * 0.55);
            this.spawnStar({
              x: lx,
              y: ly,
              z: lz,
              vx: (Math.random() - 0.5) * spread,
              vy,
              vz: (Math.random() - 0.5) * spread,
              r: _tmpColor.r,
              g: _tmpColor.g,
              b: _tmpColor.b,
              tr: 1.0,
              tg: 0.62,
              tb: 0.2,
              maxLife: 0.65 + Math.random() * 0.38,
              drag: 0.96,
              gravity: 11.5,
              trailWidth: isSparkler ? 0.13 : 0.18,
              headSize: 1.35,
              histInterval: 0.016,
              strobe: job.product.effect.hasStrobe || isSparkler,
              glitter: true,
              crackleAtEnd: job.product.effect.hasCrackle && Math.random() < 0.18,
              shedRate: 6,
            });
          }

          if (Math.random() < 0.12) {
            this.spawnSmoke(lx, ly + 0.6, lz, 0, 1.8, 0, 2.2);
          }

          job.fountainSoundAccum += safeDt;
          if (job.fountainSoundAccum >= 0.25) {
            job.fountainSoundAccum = 0;
            const { pan, atten } = this.computeSpatialAudio(lx, ly, lz, camera);
            soundEngine.playFountainBurst(pan, atten);
            this.triggerFlashLight(lx, ly + 1.2, lz, colors[colorIdx], 16);
          }

          if (job.elapsedFiring >= dur) {
            job.phase = 'done';
            job.onComplete?.();
            this.jobs.splice(i, 1);
          }
        } else {
          // Multi-shot / Single-shot Aerial Projectiles
          while (job.shotsFired < job.product.shots && job.elapsedFiring >= job.nextShotTime) {
            if (job.product.effect.pattern === 'salvo') {
              const salvoCount = Math.min(5, job.product.shots - job.shotsFired);
              for (let s = 0; s < salvoCount; s++) {
                this.fireSingleShot(job, camera);
                job.shotsFired++;
              }
              job.nextShotTime += job.product.effect.shotInterval * 3.5;
            } else {
              this.fireSingleShot(job, camera);
              job.shotsFired++;
              job.nextShotTime += job.product.effect.shotInterval;
            }
          }

          if (job.shotsFired >= job.product.shots) {
            job.phase = 'done';
            job.onComplete?.();
            this.jobs.splice(i, 1);
          }
        }
      }
    }

    // 2. Update Rising Projectiles (syncing attached comet ribbon + shedding spark flecks)
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      pr.fuseTime -= safeDt;
      pr.vx += windX * 0.08 * safeDt;
      pr.vz += windZ * 0.08 * safeDt;
      pr.vy -= 14 * safeDt;
      pr.x += pr.vx * safeDt;
      pr.y += pr.vy * safeDt;
      pr.z += pr.vz * safeDt;

      if (pr.cometStarIdx >= 0 && pr.cometStarIdx < MAX_STARS) {
        const cs = this.stars[pr.cometStarIdx];
        if (cs.active) {
          cs.x = pr.x;
          cs.y = pr.y;
          cs.z = pr.z;
          cs.vx = pr.vx;
          cs.vy = pr.vy;
          cs.vz = pr.vz;
        }
      }

      pr.trailAccum += safeDt * (pr.product.effect.isRocket ? 42 : 22) * this.qualityMultiplier;
      while (pr.trailAccum >= 1) {
        pr.trailAccum -= 1;
        this.spawnMicro(
          pr.x + (Math.random() - 0.5) * 0.14,
          pr.y,
          pr.z + (Math.random() - 0.5) * 0.14,
          (Math.random() - 0.5) * 1.8,
          -2.0 + Math.random() * 0.8,
          (Math.random() - 0.5) * 1.8,
          1.0,
          0.76,
          0.32,
          0.22 + Math.random() * 0.18,
          0.72,
          0.91,
          6.5,
          true,
        );
      }

      if (pr.fuseTime <= 0 || pr.vy <= 1.2) {
        this.detonateProjectile(pr, camera);
        this.projectiles.splice(i, 1);
      }
    }

    // 3. Update Active Stars + Build Continuous Ribbon & Head Buffers (Zero-GC)
    const damp60 = safeDt * 60;
    let activeStarCount = 0;

    for (let i = 0; i < MAX_STARS; i++) {
      const s = this.stars[i];
      if (!s.active) continue;

      s.life -= safeDt;
      if (s.life <= 0) {
        if (s.splitAtEnd) {
          // Crossette 4-way perpendicular comet split!
          const vLen = Math.hypot(s.vx, s.vy, s.vz);
          if (vLen > 0.1) {
            _axisN.set(s.vx / vLen, s.vy / vLen, s.vz / vLen);
            _axisU.set(0, 1, 0);
            if (Math.abs(_axisN.dot(_axisU)) > 0.9) _axisU.set(1, 0, 0);
            _axisU.crossVectors(_axisN, _axisU).normalize();
            _axisV.crossVectors(_axisN, _axisU).normalize();

            const splitSpd = 9.2;
            const fwdKeep = 0.25;
            const dirs = [
              [_axisU.x * splitSpd, _axisU.y * splitSpd, _axisU.z * splitSpd],
              [-_axisU.x * splitSpd, -_axisU.y * splitSpd, -_axisU.z * splitSpd],
              [_axisV.x * splitSpd, _axisV.y * splitSpd, _axisV.z * splitSpd],
              [-_axisV.x * splitSpd, -_axisV.y * splitSpd, -_axisV.z * splitSpd],
            ];
            for (const [dx, dy, dz] of dirs) {
              this.spawnStar({
                x: s.x,
                y: s.y,
                z: s.z,
                vx: s.vx * fwdKeep + dx,
                vy: s.vy * fwdKeep + dy + 1.4,
                vz: s.vz * fwdKeep + dz,
                r: s.r,
                g: s.g,
                b: s.b,
                maxLife: 0.78 + Math.random() * 0.22,
                drag: 0.955,
                gravity: 5.4,
                trailWidth: 0.24,
                headSize: 1.75,
                histInterval: 0.02,
                glitter: true,
                shedRate: 8,
              });
            }
          }
        } else if (s.crackleAtEnd) {
          // Sharp crackling snap bursts
          for (let k = 0; k < 4; k++) {
            this.spawnMicro(
              s.x,
              s.y,
              s.z,
              (Math.random() - 0.5) * 9.5,
              (Math.random() - 0.5) * 9.5,
              (Math.random() - 0.5) * 9.5,
              1.0,
              0.94,
              0.74,
              0.11 + Math.random() * 0.08,
              1.45,
              0.88,
              4.0,
              true,
            );
          }
        }
        s.active = false;
        continue;
      }

      // Physics integration (avoid double-updating rising comet projectiles that are driven by projectile loop)
      const dragPow = s.drag === 1.0 ? 1.0 : Math.pow(s.drag, damp60);
      if (s.drag !== 1.0) {
        s.vx = s.vx * dragPow + windX * 0.25 * safeDt;
        s.vy = s.vy * dragPow - s.gravity * safeDt;
        s.vz = s.vz * dragPow + windZ * 0.25 * safeDt;
        s.x += s.vx * safeDt;
        s.y += s.vy * safeDt;
        s.z += s.vz * safeDt;

        if (s.y < 0.06) {
          s.y = 0.06;
          s.vy = Math.abs(s.vy) * 0.22;
          s.vx *= 0.62;
          s.vz *= 0.62;
        }
      }

      // Shed fine secondary embers along curved trajectory
      if (s.shedRate > 0) {
        s.shedAccum += s.shedRate * safeDt;
        while (s.shedAccum >= 1) {
          s.shedAccum -= 1;
          this.spawnMicro(
            s.x,
            s.y,
            s.z,
            s.vx * 0.12 + (Math.random() - 0.5) * 1.4,
            s.vy * 0.12 - 0.6,
            s.vz * 0.12 + (Math.random() - 0.5) * 1.4,
            s.tr,
            s.tg,
            s.tb,
            0.22 + Math.random() * 0.16,
            0.62,
            0.9,
            4.5,
            true,
          );
        }
      }

      // Record curved trajectory ring buffer
      s.histTimer += safeDt;
      if (s.histTimer >= s.histInterval) {
        s.histTimer = 0;
        s.histHead = (s.histHead + 1) % HIST_LEN;
        s.histX[s.histHead] = s.x;
        s.histY[s.histHead] = s.y;
        s.histZ[s.histHead] = s.z;
        if (s.histCount < HIST_LEN) s.histCount++;
      } else {
        // Keep newest ring node pinned to live head for gapless ribbon
        s.histX[s.histHead] = s.x;
        s.histY[s.histHead] = s.y;
        s.histZ[s.histHead] = s.z;
      }

      const lifeFrac = s.life / s.maxLife;
      let alpha = Math.min(1.0, lifeFrac * 1.45);
      if (s.strobe) {
        alpha *= Math.sin(s.life * 40 + s.phaseOffset) > 0 ? 1.2 : 0.08;
      } else if (s.glitter) {
        alpha *= 0.65 + 0.45 * Math.abs(Math.sin(s.life * 26 + s.phaseOffset));
      }

      // Pack into contiguous Ribbon + Head GPU buffers
      const slot = activeStarCount++;
      const h3 = slot * 3;
      this.hPositions[h3] = s.x;
      this.hPositions[h3 + 1] = s.y;
      this.hPositions[h3 + 2] = s.z;
      this.hColors[h3] = s.r;
      this.hColors[h3 + 1] = s.g;
      this.hColors[h3 + 2] = s.b;
      this.hSizes[slot] = s.headSize * (0.45 + 0.55 * lifeFrac);
      this.hAlphas[slot] = alpha;
      this.hRots[slot] = s.phaseOffset;

      const baseVert = slot * VERTS_PER_STAR;
      const denom = Math.max(1, HIST_LEN - 1);

      for (let k = 0; k < HIST_LEN; k++) {
        // Walk backwards from head (k=0) to tail (k=HIST_LEN-1)
        const clampedK = k < s.histCount ? k : s.histCount - 1;
        const ringIdx = (s.histHead - clampedK + HIST_LEN) % HIST_LEN;
        const px = k === 0 ? s.x : s.histX[ringIdx];
        const py = k === 0 ? s.y : s.histY[ringIdx];
        const pz = k === 0 ? s.z : s.histZ[ringIdx];

        // Compute tangent along trail spine
        let tx = s.vx;
        let ty = s.vy;
        let tz = s.vz;
        if (s.histCount >= 2) {
          const prevK = Math.max(0, clampedK - 1);
          const nextK = Math.min(s.histCount - 1, clampedK + 1);
          const prevIdx = (s.histHead - prevK + HIST_LEN) % HIST_LEN;
          const nextIdx = (s.histHead - nextK + HIST_LEN) % HIST_LEN;
          const dx = s.histX[prevIdx] - s.histX[nextIdx];
          const dy = s.histY[prevIdx] - s.histY[nextIdx];
          const dz = s.histZ[prevIdx] - s.histZ[nextIdx];
          if (dx * dx + dy * dy + dz * dz > 1e-6) {
            tx = dx;
            ty = dy;
            tz = dz;
          }
        }

        const prog = k / denom;
        const halfW = s.trailWidth * 0.5;
        const vL = baseVert + k * 2;
        const vR = vL + 1;

        for (let side = 0; side < 2; side++) {
          const vi = vL + side;
          const vi3 = vi * 3;
          this.rPositions[vi3] = px;
          this.rPositions[vi3 + 1] = py;
          this.rPositions[vi3 + 2] = pz;

          this.rTangents[vi3] = tx;
          this.rTangents[vi3 + 1] = ty;
          this.rTangents[vi3 + 2] = tz;

          this.rColors[vi3] = s.r;
          this.rColors[vi3 + 1] = s.g;
          this.rColors[vi3 + 2] = s.b;

          this.rTailColors[vi3] = s.tr;
          this.rTailColors[vi3 + 1] = s.tg;
          this.rTailColors[vi3 + 2] = s.tb;

          this.rSideWidths[vi] = halfW;
          this.rSideSigns[vi] = side === 0 ? -1.0 : 1.0;
          this.rProgress[vi] = prog;
          this.rAlphas[vi] = alpha;
        }
        // Keep vR compiler-used cleanly
        void vR;
      }
    }

    this.lastActiveStars = activeStarCount;
    this.rGeo.setDrawRange(0, activeStarCount * INDICES_PER_STAR);
    this.hGeo.setDrawRange(0, activeStarCount);
    if (activeStarCount > 0 || this.jobs.length > 0) {
      this.rGeo.attributes.position.needsUpdate = true;
      this.rGeo.attributes.aTangent.needsUpdate = true;
      this.rGeo.attributes.aSideWidth.needsUpdate = true;
      this.rGeo.attributes.aSideSign.needsUpdate = true;
      this.rGeo.attributes.aProgress.needsUpdate = true;
      this.rGeo.attributes.aColor.needsUpdate = true;
      this.rGeo.attributes.aTailColor.needsUpdate = true;
      this.rGeo.attributes.aAlpha.needsUpdate = true;

      this.hGeo.attributes.position.needsUpdate = true;
      this.hGeo.attributes.aColor.needsUpdate = true;
      this.hGeo.attributes.aSize.needsUpdate = true;
      this.hGeo.attributes.aAlpha.needsUpdate = true;
      this.hGeo.attributes.aRot.needsUpdate = true;
    }

    // 4. Update Micro-Sparks & Crackling Flecks
    let activeMicroCount = 0;
    for (let i = 0; i < MAX_MICRO; i++) {
      const m = this.micros[i];
      if (!m.active) continue;
      m.life -= safeDt;
      if (m.life <= 0) {
        m.active = false;
        continue;
      }

      const dragPow = Math.pow(m.drag, damp60);
      m.vx = m.vx * dragPow + windX * 0.25 * safeDt;
      m.vy = m.vy * dragPow - m.gravity * safeDt;
      m.vz = m.vz * dragPow + windZ * 0.25 * safeDt;
      m.x += m.vx * safeDt;
      m.y += m.vy * safeDt;
      m.z += m.vz * safeDt;

      if (m.y < 0.04) {
        m.y = 0.04;
        m.vy = Math.abs(m.vy) * 0.2;
      }

      const t = m.life / m.maxLife;
      const alpha = m.flicker ? t * (0.55 + 0.55 * Math.abs(Math.sin(m.life * 45 + i))) : t;

      const slot = activeMicroCount++;
      const s3 = slot * 3;
      this.mPositions[s3] = m.x;
      this.mPositions[s3 + 1] = m.y;
      this.mPositions[s3 + 2] = m.z;
      this.mColors[s3] = m.r;
      this.mColors[s3 + 1] = m.g;
      this.mColors[s3 + 2] = m.b;
      this.mSizes[slot] = m.size * (0.4 + 0.6 * t);
      this.mAlphas[slot] = alpha;
      this.mRots[slot] = m.rot;
    }

    this.lastActiveMicros = activeMicroCount;
    this.mGeo.setDrawRange(0, activeMicroCount);
    if (activeMicroCount > 0) {
      this.mGeo.attributes.position.needsUpdate = true;
      this.mGeo.attributes.aColor.needsUpdate = true;
      this.mGeo.attributes.aSize.needsUpdate = true;
      this.mGeo.attributes.aAlpha.needsUpdate = true;
      this.mGeo.attributes.aRot.needsUpdate = true;
    }

    // 5. Update Optical Shock-Coronas
    for (const c of this.coronas) {
      if (!c.active) continue;
      c.life -= safeDt;
      if (c.life <= 0) {
        c.active = false;
        c.mesh.visible = false;
        continue;
      }
      const prog = 1 - c.life / c.maxLife;
      c.mat.uniforms.uProgress.value = prog;
      c.mesh.scale.setScalar(THREE.MathUtils.lerp(2.2, c.maxScale, Math.sqrt(prog)));
      c.mesh.quaternion.copy(camera.quaternion);
    }

    // 6. Update Pooled Smoke Particles
    let anySmoke = false;
    for (let i = 0; i < MAX_SMOKE; i++) {
      const s = this.smokes[i];
      const i3 = i * 3;
      if (!s.active) {
        this.sPositions[i3 + 1] = -999;
        continue;
      }
      anySmoke = true;
      s.life -= safeDt;
      if (s.life <= 0) {
        s.active = false;
        this.sPositions[i3 + 1] = -999;
        continue;
      }
      s.vx += (windX * 0.48 - s.vx * 0.12) * safeDt;
      s.vz += (windZ * 0.48 - s.vz * 0.12) * safeDt;
      s.x += s.vx * safeDt;
      s.y += s.vy * safeDt;
      s.z += s.vz * safeDt;
      const fade = (s.life / s.maxLife) * 0.72;
      this.sPositions[i3] = s.x;
      this.sPositions[i3 + 1] = s.y;
      this.sPositions[i3 + 2] = s.z;
      this.sColors[i3] = s.r * fade;
      this.sColors[i3 + 1] = s.g * fade;
      this.sColors[i3 + 2] = s.b * fade;
    }
    if (anySmoke) {
      this.sGeo.attributes.position.needsUpdate = true;
      this.sGeo.attributes.color.needsUpdate = true;
    }

    // 7. Update Dynamic Burst Flash Lights
    for (const slot of this.flashLights) {
      if (slot.life > 0) {
        slot.life -= safeDt;
        const k = Math.max(0, slot.life / slot.maxLife);
        slot.light.intensity = k * k * slot.peakIntensity;
        if (slot.life <= 0) {
          slot.light.intensity = 0;
          slot.light.position.y = -100;
        }
      }
    }
  }

  public dispose() {
    this.rGeo.dispose();
    this.rMat.dispose();
    this.hGeo.dispose();
    this.hMat.dispose();
    this.mGeo.dispose();
    this.mMat.dispose();
    this.sGeo.dispose();
    this.sMat.dispose();
    this.coronaGeo.dispose();
    for (const c of this.coronas) {
      c.mat.dispose();
    }
  }
}
