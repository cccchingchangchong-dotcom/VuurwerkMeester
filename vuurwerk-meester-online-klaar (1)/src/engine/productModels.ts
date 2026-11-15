import * as THREE from 'three';
import { FireworkProduct } from '../types';
import { createProductLabelTexture } from './textures';

const sharedDarkCardboardMat = new THREE.MeshStandardMaterial({
  color: 0x1a1c23,
  roughness: 0.85,
  metalness: 0.05,
});

const sharedWoodMat = new THREE.MeshStandardMaterial({
  color: 0x8b6239,
  roughness: 0.82,
  metalness: 0.02,
});

const sharedFuseMat = new THREE.MeshStandardMaterial({
  color: 0x22c55e,
  roughness: 0.7,
  metalness: 0.05,
});

const sharedFuseTipMat = new THREE.MeshStandardMaterial({
  color: 0xf97316,
  emissive: 0x451a03,
  roughness: 0.5,
  metalness: 0.1,
});

const sharedFoilMat = new THREE.MeshStandardMaterial({
  color: 0xd97706,
  roughness: 0.25,
  metalness: 0.78,
});

const sharedBrushedMetalMat = new THREE.MeshStandardMaterial({
  color: 0xcbd5e1,
  roughness: 0.22,
  metalness: 0.88,
});

const sharedTubeMat = new THREE.MeshStandardMaterial({
  color: 0x3b2f24,
  roughness: 0.9,
  metalness: 0.0,
});

function addFuseToGroup(
  group: THREE.Group,
  x: number,
  y: number,
  z: number,
  trackGeo: <T extends THREE.BufferGeometry>(g: T) => T,
) {
  const curve = new THREE.CatmullRomCurve3([
    new THREE.Vector3(x, y, z),
    new THREE.Vector3(x + 0.04, y + 0.03, z + 0.03),
    new THREE.Vector3(x + 0.08, y + 0.05, z + 0.01),
  ]);
  const fuseGeo = trackGeo(new THREE.TubeGeometry(curve, 8, 0.006, 6, false));
  const fuseMesh = new THREE.Mesh(fuseGeo, sharedFuseMat);
  group.add(fuseMesh);

  const tipGeo = trackGeo(new THREE.SphereGeometry(0.01, 8, 8));
  const tipMesh = new THREE.Mesh(tipGeo, sharedFuseTipMat);
  tipMesh.position.set(x + 0.08, y + 0.05, z + 0.01);
  tipMesh.name = 'fuseTip';
  group.add(tipMesh);

  group.userData.fuseLocalPos = new THREE.Vector3(x + 0.08, y + 0.05, z + 0.01);
}

export function createFireworkModel(product: FireworkProduct): THREE.Group {
  const group = new THREE.Group();
  const geos: THREE.BufferGeometry[] = [];
  const trackGeo = <T extends THREE.BufferGeometry>(g: T): T => {
    geos.push(g);
    return g;
  };

  const labelTex = createProductLabelTexture(product);
  const labelMat = new THREE.MeshStandardMaterial({
    map: labelTex,
    roughness: 0.4,
    metalness: product.tier === 'premium' ? 0.24 : 0.12,
  });

  const accentMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(product.accentColor),
    roughness: 0.3,
    metalness: 0.5,
  });

  const primaryMat = new THREE.MeshStandardMaterial({
    color: new THREE.Color(product.primaryColor),
    roughness: 0.58,
    metalness: 0.15,
  });

  const shape = product.shapeType;

  if (shape === 'cake' || shape === 'compound' || shape === 'finale' || shape === 'premium_box') {
    const isCompound = shape === 'compound';
    const isFinale = shape === 'finale';
    const isPremium = shape === 'premium_box';

    // Scale cake size meaningfully by shot count (small/medium/large cakes look distinct)
    const cakeScale = shape === 'cake' ? THREE.MathUtils.clamp(0.8 + product.shots / 120, 0.85, 1.35) : 1.0;

    const w = (isPremium ? 0.76 : isCompound ? 0.66 : isFinale ? 0.56 : 0.36) * cakeScale;
    const h = (isPremium ? 0.34 : isCompound ? 0.30 : isFinale ? 0.28 : 0.24) * (0.9 + cakeScale * 0.1);
    const d = (isPremium ? 0.52 : isCompound ? 0.46 : isFinale ? 0.42 : 0.34) * cakeScale;

    // 1. Wooden/Reinforced Stabilizer Base
    const base = new THREE.Mesh(
      new THREE.BoxGeometry(w + 0.04, 0.025, d + 0.04),
      isPremium ? sharedDarkCardboardMat : sharedWoodMat,
    );
    base.position.y = 0.0125;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    // 2. Main Wrapped Cake Box (side label panels + dark top/bottom)
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(w, h, d),
      [labelMat, labelMat, sharedDarkCardboardMat, sharedDarkCardboardMat, labelMat, labelMat],
    );
    body.position.y = 0.025 + h / 2;
    body.castShadow = true;
    body.receiveShadow = true;
    group.add(body);

    // 3. Top Protective Rim & Foil Sheet
    const foil = new THREE.Mesh(
      new THREE.BoxGeometry(w - 0.03, 0.008, d - 0.03),
      isPremium ? accentMat : sharedFoilMat,
    );
    foil.position.y = 0.025 + h + 0.002;
    group.add(foil);

    // 4. Mortar Tube Grid Cutouts on top
    const cols = isPremium ? 7 : isCompound ? 6 : 4;
    const rows = isPremium ? 5 : isCompound ? 4 : 3;
    const tubeRadius = Math.min(w / (cols * 2.6), d / (rows * 2.6));
    const tubeGeo = new THREE.CylinderGeometry(tubeRadius, tubeRadius, 0.02, 10);
    for (let c = 0; c < cols; c++) {
      for (let r = 0; r < rows; r++) {
        const tx = -w * 0.36 + (c / Math.max(1, cols - 1)) * w * 0.72;
        const tz = -d * 0.32 + (r / Math.max(1, rows - 1)) * d * 0.64;
        const tube = new THREE.Mesh(tubeGeo, sharedTubeMat);
        tube.position.set(tx, 0.025 + h + 0.004, tz);
        group.add(tube);
      }
    }

    // 5. Carry handles / Corner Brackets / Collector Latches
    if (isCompound || isFinale || isPremium) {
      const stripGeo = new THREE.BoxGeometry(w + 0.01, 0.03, 0.02);
      const frontStrip = new THREE.Mesh(stripGeo, isPremium ? sharedFoilMat : accentMat);
      frontStrip.position.set(0, 0.04, d / 2 + 0.006);
      group.add(frontStrip);

      const handleGeo = new THREE.BoxGeometry(0.02, 0.04, 0.14);
      const leftHandle = new THREE.Mesh(handleGeo, accentMat);
      leftHandle.position.set(-w / 2 - 0.012, 0.025 + h * 0.55, 0);
      const rightHandle = new THREE.Mesh(handleGeo, accentMat);
      rightHandle.position.set(w / 2 + 0.012, 0.025 + h * 0.55, 0);
      group.add(leftHandle, rightHandle);
    }

    if (isPremium) {
      // Gold/Chrome corner guards & front latches
      const cornerGeo = new THREE.BoxGeometry(0.035, h + 0.015, 0.035);
      for (const sx of [-1, 1]) {
        for (const sz of [-1, 1]) {
          const corner = new THREE.Mesh(cornerGeo, sharedFoilMat);
          corner.position.set(sx * (w / 2 - 0.005), 0.025 + h / 2, sz * (d / 2 - 0.005));
          group.add(corner);
        }
      }
      const latchGeo = new THREE.BoxGeometry(0.06, 0.05, 0.025);
      const l1 = new THREE.Mesh(latchGeo, sharedBrushedMetalMat);
      l1.position.set(-w * 0.22, 0.025 + h * 0.85, d / 2 + 0.008);
      const l2 = l1.clone();
      l2.position.x = w * 0.22;
      group.add(l1, l2);
    }

    addFuseToGroup(group, w * 0.42, 0.025 + h * 0.85, d * 0.44, trackGeo);
    group.userData.launchLocalPos = new THREE.Vector3(0, 0.025 + h, 0);
  } else if (shape === 'thunderking') {
    const sizeScale = THREE.MathUtils.clamp(product.caliberMm / 24, 0.85, 1.32);
    const foot = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(0.075 * sizeScale, 0.085 * sizeScale, 0.018, 12)),
      sharedDarkCardboardMat,
    );
    foot.position.y = 0.009;
    foot.castShadow = true;
    group.add(foot);

    const tubeH = 0.22 * sizeScale;
    const tubeR = 0.036 * sizeScale;
    const tube = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(tubeR, tubeR, tubeH, 16)), labelMat);
    tube.position.y = 0.018 + tubeH / 2;
    tube.castShadow = true;
    group.add(tube);

    const cap = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(tubeR * 0.97, 0.006, 8, 16)), accentMat);
    cap.rotation.x = Math.PI / 2;
    cap.position.y = 0.018 + tubeH;
    group.add(cap);

    const bore = new THREE.Mesh(
      trackGeo(new THREE.CylinderGeometry(tubeR * 0.78, tubeR * 0.78, 0.02, 12)),
      sharedTubeMat,
    );
    bore.position.y = 0.018 + tubeH - 0.008;
    group.add(bore);

    addFuseToGroup(group, tubeR, 0.07, 0, trackGeo);
    group.userData.launchLocalPos = new THREE.Vector3(0, 0.02 + tubeH, 0);
  } else if (shape === 'fountain') {
    const foot = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.11, 0.12, 0.02, 16)), sharedDarkCardboardMat);
    foot.position.y = 0.01;
    foot.castShadow = true;
    group.add(foot);

    const cone = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.032, 0.105, 0.25, 18)), labelMat);
    cone.position.y = 0.02 + 0.125;
    cone.castShadow = true;
    group.add(cone);

    const nozzle = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.022, 0.03, 0.028, 12)), sharedFoilMat);
    nozzle.position.y = 0.275;
    group.add(nozzle);

    const bore = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.012, 0.012, 0.015, 10)), sharedTubeMat);
    bore.position.y = 0.285;
    group.add(bore);

    addFuseToGroup(group, 0.025, 0.275, 0, trackGeo);
    group.userData.launchLocalPos = new THREE.Vector3(0, 0.29, 0);
  } else if (shape === 'candle') {
    const base = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.055, 0.065, 0.02, 12)), sharedWoodMat);
    base.position.y = 0.01;
    base.castShadow = true;
    group.add(base);

    const tube = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.022, 0.022, 0.56, 14)), labelMat);
    tube.position.y = 0.02 + 0.28;
    tube.castShadow = true;
    group.add(tube);

    const ringGeo = trackGeo(new THREE.TorusGeometry(0.023, 0.004, 6, 14));
    const ring1 = new THREE.Mesh(ringGeo, accentMat);
    ring1.rotation.x = Math.PI / 2;
    ring1.position.y = 0.16;
    const ring2 = new THREE.Mesh(ringGeo, accentMat);
    ring2.rotation.x = Math.PI / 2;
    ring2.position.y = 0.48;
    group.add(ring1, ring2);

    const plug = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.018, 0.018, 0.015, 10)), sharedFoilMat);
    plug.position.y = 0.58;
    group.add(plug);

    addFuseToGroup(group, 0.01, 0.585, 0, trackGeo);
    group.userData.launchLocalPos = new THREE.Vector3(0, 0.59, 0);
  } else if (shape === 'rocket') {
    const stand = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.06, 0.075, 0.025, 12)), sharedDarkCardboardMat);
    stand.position.y = 0.0125;
    stand.castShadow = true;
    group.add(stand);

    const guide = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.02, 0.024, 0.26, 10)), sharedTubeMat);
    guide.position.y = 0.025 + 0.13;
    group.add(guide);

    const rocketBody = new THREE.Group();
    rocketBody.name = 'rocketProjectile';

    const stick = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.01, 0.62, 0.01)), sharedWoodMat);
    stick.position.set(0.022, 0.33, 0);
    rocketBody.add(stick);

    const motor = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.026, 0.026, 0.24, 14)), labelMat);
    motor.position.y = 0.44;
    motor.castShadow = true;
    rocketBody.add(motor);

    const collar = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.032, 0.027, 0.04, 14)), accentMat);
    collar.position.y = 0.57;
    rocketBody.add(collar);

    const cone = new THREE.Mesh(trackGeo(new THREE.ConeGeometry(0.033, 0.11, 14)), primaryMat);
    cone.position.y = 0.645;
    cone.castShadow = true;
    rocketBody.add(cone);

    group.add(rocketBody);
    addFuseToGroup(group, 0.0, 0.31, 0.02, trackGeo);
    group.userData.launchLocalPos = new THREE.Vector3(0, 0.55, 0);
  } else if (shape === 'shell') {
    const base = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.26, 0.03, 0.26)), sharedWoodMat);
    base.position.y = 0.015;
    base.castShadow = true;
    base.receiveShadow = true;
    group.add(base);

    const tube = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.068, 0.068, 0.38, 18)), labelMat);
    tube.position.y = 0.03 + 0.19;
    tube.castShadow = true;
    group.add(tube);

    const rim = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.068, 0.01, 8, 18)), accentMat);
    rim.rotation.x = Math.PI / 2;
    rim.position.y = 0.41;
    group.add(rim);

    const spareShell = new THREE.Mesh(trackGeo(new THREE.SphereGeometry(0.042, 14, 14)), primaryMat);
    spareShell.position.set(0.085, 0.072, 0.075);
    spareShell.castShadow = true;
    group.add(spareShell);

    const shellBand = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.042, 0.005, 6, 14)), accentMat);
    shellBand.position.copy(spareShell.position);
    group.add(shellBand);

    addFuseToGroup(group, 0.065, 0.38, 0, trackGeo);
    group.userData.launchLocalPos = new THREE.Vector3(0, 0.42, 0);
  } else if (shape === 'smoke') {
    // Cylindrical Smoke Canister with perforated top vent ring & safety collar
    const base = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.062, 0.065, 0.018, 16)), sharedDarkCardboardMat);
    base.position.y = 0.009;
    base.castShadow = true;
    group.add(base);

    const canister = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.056, 0.056, 0.19, 18)), labelMat);
    canister.position.y = 0.018 + 0.095;
    canister.castShadow = true;
    group.add(canister);

    const topCap = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.058, 0.058, 0.02, 16)), sharedBrushedMetalMat);
    topCap.position.y = 0.218;
    group.add(topCap);

    const vent = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.022, 0.022, 0.026, 12)), sharedTubeMat);
    vent.position.y = 0.222;
    group.add(vent);

    const pullRing = new THREE.Mesh(trackGeo(new THREE.TorusGeometry(0.018, 0.004, 6, 12)), accentMat);
    pullRing.position.set(0.045, 0.225, 0);
    group.add(pullRing);

    addFuseToGroup(group, 0.022, 0.225, 0, trackGeo);
    group.userData.launchLocalPos = new THREE.Vector3(0, 0.24, 0);
  } else if (shape === 'spinner') {
    // Hexagonal ground bloom / spinner disc with side exhaust jets
    const base = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.095, 0.105, 0.018, 6)), sharedDarkCardboardMat);
    base.position.y = 0.009;
    base.castShadow = true;
    group.add(base);

    const disc = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.088, 0.088, 0.05, 16)), labelMat);
    disc.position.y = 0.043;
    disc.castShadow = true;
    group.add(disc);

    const hub = new THREE.Mesh(trackGeo(new THREE.CylinderGeometry(0.032, 0.04, 0.025, 12)), accentMat);
    hub.position.y = 0.075;
    group.add(hub);

    const nozzleGeo = trackGeo(new THREE.CylinderGeometry(0.01, 0.012, 0.04, 8));
    for (let i = 0; i < 4; i++) {
      const ang = (i / 4) * Math.PI * 2;
      const jet = new THREE.Mesh(nozzleGeo, sharedFoilMat);
      jet.rotation.z = Math.PI / 2;
      jet.rotation.y = ang + 0.45;
      jet.position.set(Math.cos(ang) * 0.092, 0.045, Math.sin(ang) * 0.092);
      group.add(jet);
    }

    addFuseToGroup(group, 0.06, 0.07, 0, trackGeo);
    group.userData.launchLocalPos = new THREE.Vector3(0, 0.08, 0);
  } else if (shape === 'novelty') {
    // Multi-tube miniature novelty tray / sparkler pack
    const tray = new THREE.Mesh(trackGeo(new THREE.BoxGeometry(0.28, 0.025, 0.18)), sharedDarkCardboardMat);
    tray.position.y = 0.0125;
    tray.castShadow = true;
    tray.receiveShadow = true;
    group.add(tray);

    const bodyBox = new THREE.Mesh(
      trackGeo(new THREE.BoxGeometry(0.24, 0.12, 0.14)),
      [labelMat, labelMat, accentMat, sharedDarkCardboardMat, labelMat, labelMat],
    );
    bodyBox.position.y = 0.085;
    bodyBox.castShadow = true;
    group.add(bodyBox);

    const miniTubeGeo = trackGeo(new THREE.CylinderGeometry(0.016, 0.016, 0.09, 10));
    for (let c = 0; c < 4; c++) {
      const mt = new THREE.Mesh(miniTubeGeo, c % 2 === 0 ? accentMat : primaryMat);
      mt.position.set(-0.075 + c * 0.05, 0.185, 0);
      mt.castShadow = true;
      group.add(mt);
    }

    addFuseToGroup(group, 0.1, 0.15, 0.05, trackGeo);
    group.userData.launchLocalPos = new THREE.Vector3(0, 0.23, 0);
  }

  // Collect any cake/compound geometries attached directly via child traversal as well
  group.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const g = (child as THREE.Mesh).geometry;
      if (g && !geos.includes(g)) geos.push(g);
    }
  });

  group.userData.dispose = () => {
    for (const g of geos) g.dispose();
    labelMat.dispose();
    accentMat.dispose();
    primaryMat.dispose();
    labelTex.dispose();
  };

  return group;
}

export function createLighterModel(): { group: THREE.Group; flame: THREE.Mesh } {
  const group = new THREE.Group();

  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0xd97706,
    metalness: 0.9,
    roughness: 0.2,
  });
  const gripMat = new THREE.MeshStandardMaterial({
    color: 0x111827,
    metalness: 0.2,
    roughness: 0.8,
  });
  const metalMat = new THREE.MeshStandardMaterial({
    color: 0xe5e7eb,
    metalness: 0.95,
    roughness: 0.15,
  });

  const lowerGeo = new THREE.BoxGeometry(0.052, 0.085, 0.022);
  const lower = new THREE.Mesh(lowerGeo, bodyMat);
  lower.position.y = 0.042;
  group.add(lower);

  const gripGeo = new THREE.BoxGeometry(0.054, 0.05, 0.024);
  const grip = new THREE.Mesh(gripGeo, gripMat);
  grip.position.y = 0.032;
  group.add(grip);

  const lidGeo = new THREE.BoxGeometry(0.052, 0.035, 0.022);
  const lid = new THREE.Mesh(lidGeo, bodyMat);
  lid.position.set(-0.032, 0.1, 0);
  lid.rotation.z = 1.2;
  group.add(lid);

  const chimneyGeo = new THREE.CylinderGeometry(0.009, 0.009, 0.024, 10);
  const chimney = new THREE.Mesh(chimneyGeo, metalMat);
  chimney.position.set(0.006, 0.095, 0);
  group.add(chimney);

  const wheelGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.008, 12);
  const wheel = new THREE.Mesh(wheelGeo, metalMat);
  wheel.rotation.x = Math.PI / 2;
  wheel.position.set(-0.012, 0.092, 0);
  group.add(wheel);

  const flameGeo = new THREE.ConeGeometry(0.009, 0.036, 10);
  const flameMat = new THREE.MeshBasicMaterial({
    color: 0xfb923c,
    transparent: true,
    opacity: 0.92,
  });
  const flame = new THREE.Mesh(flameGeo, flameMat);
  flame.position.set(0.006, 0.125, 0);
  group.add(flame);

  group.userData.dispose = () => {
    lowerGeo.dispose();
    gripGeo.dispose();
    lidGeo.dispose();
    chimneyGeo.dispose();
    wheelGeo.dispose();
    flameGeo.dispose();
    bodyMat.dispose();
    gripMat.dispose();
    metalMat.dispose();
    flameMat.dispose();
  };

  return { group, flame };
}
