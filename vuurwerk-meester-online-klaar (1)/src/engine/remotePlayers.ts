import * as THREE from 'three';
import { PRODUCT_MAP } from '../data/products';
import { RemotePlayerState } from '../types';
import { createFireworkModel, createLighterModel } from './productModels';

interface RemoteAvatarEntry {
  state: RemotePlayerState;
  root: THREE.Group;
  head: THREE.Group;
  leftArm: THREE.Group;
  rightArm: THREE.Group;
  leftLeg: THREE.Group;
  rightLeg: THREE.Group;
  handItemSlot: THREE.Group;
  lighterMesh: THREE.Group;
  nametagSprite: THREE.Sprite;
  nametagTex: THREE.CanvasTexture;
  lastTagKey: string;
  lastEquipKey: string;
  targetPos: THREE.Vector3;
  targetYaw: number;
  targetPitch: number;
  walkPhase: number;
  disposables: { dispose: () => void }[];
}

function drawNametagTexture(
  name: string,
  color: string,
  badge: string,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  ctx.clearRect(0, 0, 512, 128);
  ctx.fillStyle = 'rgba(10, 13, 20, 0.82)';
  ctx.beginPath();
  ctx.roundRect(24, 20, 464, 88, 18);
  ctx.fill();

  ctx.strokeStyle = color;
  ctx.lineWidth = 4;
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(62, 64, 12, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 32px Outfit, sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const displayName = name.length > 16 ? name.slice(0, 15) + '…' : name;
  ctx.fillText(displayName, 88, badge ? 50 : 64);

  if (badge) {
    ctx.fillStyle = '#FBBF24';
    ctx.font = '700 20px "JetBrains Mono", monospace';
    ctx.fillText(badge, 88, 84);
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export class RemotePlayerManager {
  private scene: THREE.Scene;
  private entries = new Map<string, RemoteAvatarEntry>();

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  private createAvatar(player: RemotePlayerState): RemoteAvatarEntry {
    const root = new THREE.Group();
    root.position.set(player.x, Math.max(0, player.y - 1.72), player.z);
    root.rotation.y = player.yaw;

    const disposables: { dispose: () => void }[] = [];
    const track = <T extends { dispose: () => void }>(item: T): T => {
      disposables.push(item);
      return item;
    };

    const jacketMat = track(
      new THREE.MeshStandardMaterial({
        color: new THREE.Color(player.color || '#F59E0B'),
        roughness: 0.65,
        metalness: 0.08,
      }),
    );
    const pantsMat = track(
      new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        roughness: 0.85,
      }),
    );
    const skinMat = track(
      new THREE.MeshStandardMaterial({
        color: 0xd9a88a,
        roughness: 0.65,
      }),
    );
    const hairMat = track(
      new THREE.MeshStandardMaterial({
        color: 0x292524,
        roughness: 0.85,
      }),
    );

    // Legs (pivoted at hip y = 0.82)
    const legGeo = track(new THREE.BoxGeometry(0.18, 0.82, 0.2));
    const leftLeg = new THREE.Group();
    leftLeg.position.set(-0.12, 0.82, 0);
    const lLegMesh = new THREE.Mesh(legGeo, pantsMat);
    lLegMesh.position.y = -0.41;
    lLegMesh.castShadow = true;
    leftLeg.add(lLegMesh);

    const rightLeg = new THREE.Group();
    rightLeg.position.set(0.12, 0.82, 0);
    const rLegMesh = new THREE.Mesh(legGeo, pantsMat);
    rLegMesh.position.y = -0.41;
    rLegMesh.castShadow = true;
    rightLeg.add(rLegMesh);

    // Torso (y = 0.82..1.44)
    const torso = new THREE.Mesh(track(new THREE.BoxGeometry(0.46, 0.62, 0.26)), jacketMat);
    torso.position.y = 1.13;
    torso.castShadow = true;
    root.add(torso, leftLeg, rightLeg);

    // Head (pivoted at neck y = 1.46)
    const head = new THREE.Group();
    head.position.set(0, 1.46, 0);
    const skull = new THREE.Mesh(track(new THREE.BoxGeometry(0.32, 0.34, 0.32)), skinMat);
    skull.position.y = 0.17;
    skull.castShadow = true;
    const cap = new THREE.Mesh(track(new THREE.BoxGeometry(0.34, 0.12, 0.34)), hairMat);
    cap.position.y = 0.32;
    // Eyes facing -Z (Three.js camera forward direction)
    const eyeMat = track(new THREE.MeshBasicMaterial({ color: 0x0f172a }));
    const eyeL = new THREE.Mesh(track(new THREE.BoxGeometry(0.05, 0.05, 0.03)), eyeMat);
    eyeL.position.set(-0.07, 0.18, -0.16);
    const eyeR = eyeL.clone();
    eyeR.position.x = 0.07;
    head.add(skull, cap, eyeL, eyeR);
    root.add(head);

    // Left Arm (pivoted at shoulder y = 1.40)
    const armGeo = track(new THREE.BoxGeometry(0.15, 0.56, 0.16));
    const leftArm = new THREE.Group();
    leftArm.position.set(-0.32, 1.4, 0);
    const lArmMesh = new THREE.Mesh(armGeo, jacketMat);
    lArmMesh.position.y = -0.26;
    lArmMesh.castShadow = true;
    leftArm.add(lArmMesh);

    // Right Arm + Held Item Slot
    const rightArm = new THREE.Group();
    rightArm.position.set(0.32, 1.4, 0);
    const rArmMesh = new THREE.Mesh(armGeo, jacketMat);
    rArmMesh.position.y = -0.26;
    rArmMesh.castShadow = true;
    rightArm.add(rArmMesh);

    const handItemSlot = new THREE.Group();
    handItemSlot.position.set(0, -0.52, -0.18);
    rightArm.add(handItemSlot);

    const { group: lighterMesh } = createLighterModel();
    lighterMesh.scale.setScalar(1.3);
    lighterMesh.visible = false;
    handItemSlot.add(lighterMesh);

    root.add(leftArm, rightArm);

    // Floating Nametag Sprite
    const badge = player.isShopping ? 'IN WINKEL' : player.zone.split(' ')[0];
    const nametagTex = drawNametagTexture(player.name, player.color, badge);
    const spriteMat = track(
      new THREE.SpriteMaterial({
        map: nametagTex,
        transparent: true,
        depthTest: true,
      }),
    );
    const nametagSprite = new THREE.Sprite(spriteMat);
    nametagSprite.position.set(0, 2.15, 0);
    nametagSprite.scale.set(1.6, 0.4, 1);
    root.add(nametagSprite);

    this.scene.add(root);

    const entry: RemoteAvatarEntry = {
      state: player,
      root,
      head,
      leftArm,
      rightArm,
      leftLeg,
      rightLeg,
      handItemSlot,
      lighterMesh,
      nametagSprite,
      nametagTex,
      lastTagKey: `${player.name}|${player.color}|${badge}`,
      lastEquipKey: '',
      targetPos: new THREE.Vector3(player.x, Math.max(0, player.y - 1.72), player.z),
      targetYaw: player.yaw,
      targetPitch: player.pitch,
      walkPhase: 0,
      disposables,
    };
    this.syncEquippedVisual(entry);
    return entry;
  }

  private syncEquippedVisual(entry: RemoteAvatarEntry) {
    const p = entry.state;
    const key = `${p.equippedTool}:${p.equippedProductId || ''}`;
    if (key === entry.lastEquipKey) return;
    entry.lastEquipKey = key;

    // Remove and dispose previous firework child (keep lighterMesh at index 0)
    while (entry.handItemSlot.children.length > 1) {
      const oldChild = entry.handItemSlot.children[1];
      entry.handItemSlot.remove(oldChild);
      (oldChild.userData.dispose as (() => void) | undefined)?.();
    }

    if (p.equippedTool === 'lighter') {
      entry.lighterMesh.visible = true;
    } else {
      entry.lighterMesh.visible = false;
      if (p.equippedTool === 'product' && p.equippedProductId) {
        const prod = PRODUCT_MAP.get(p.equippedProductId);
        if (prod) {
          const fwModel = createFireworkModel(prod);
          fwModel.scale.setScalar(0.55);
          entry.handItemSlot.add(fwModel);
        }
      }
    }
  }

  public syncPlayers(players: RemotePlayerState[], localPlayerId: string) {
    const seen = new Set<string>();
    for (const p of players) {
      if (p.id === localPlayerId) continue;
      seen.add(p.id);
      this.upsertPlayer(p);
    }
    for (const [id] of this.entries) {
      if (!seen.has(id)) {
        this.removePlayer(id);
      }
    }
  }

  public upsertPlayer(p: RemotePlayerState) {
    const existing = this.entries.get(p.id);
    if (!existing) {
      this.entries.set(p.id, this.createAvatar(p));
      return;
    }
    existing.state = p;
    existing.targetPos.set(p.x, Math.max(0, p.y - 1.72), p.z);
    existing.targetYaw = p.yaw;
    existing.targetPitch = p.pitch;

    const badge = p.isShopping ? 'IN WINKEL' : p.ready ? 'KLAAR' : '';
    const tagKey = `${p.name}|${p.color}|${badge}`;
    if (tagKey !== existing.lastTagKey) {
      existing.lastTagKey = tagKey;
      existing.nametagTex.dispose();
      existing.nametagTex = drawNametagTexture(p.name, p.color, badge);
      (existing.nametagSprite.material as THREE.SpriteMaterial).map = existing.nametagTex;
      (existing.nametagSprite.material as THREE.SpriteMaterial).needsUpdate = true;
    }
    this.syncEquippedVisual(existing);
  }

  public removePlayer(playerId: string) {
    const entry = this.entries.get(playerId);
    if (!entry) return;
    this.scene.remove(entry.root);
    while (entry.handItemSlot.children.length > 1) {
      const child = entry.handItemSlot.children[1];
      entry.handItemSlot.remove(child);
      (child.userData.dispose as (() => void) | undefined)?.();
    }
    (entry.lighterMesh.userData.dispose as (() => void) | undefined)?.();
    entry.nametagTex.dispose();
    for (const d of entry.disposables) d.dispose();
    this.entries.delete(playerId);
  }

  public clearAll() {
    for (const id of Array.from(this.entries.keys())) {
      this.removePlayer(id);
    }
  }

  public update(dt: number) {
    const safeDt = Math.min(dt, 0.05);
    for (const entry of this.entries.values()) {
      // Smooth position & rotation interpolation
      entry.root.position.x = THREE.MathUtils.damp(entry.root.position.x, entry.targetPos.x, 12, safeDt);
      entry.root.position.y = THREE.MathUtils.damp(entry.root.position.y, entry.targetPos.y, 14, safeDt);
      entry.root.position.z = THREE.MathUtils.damp(entry.root.position.z, entry.targetPos.z, 12, safeDt);

      // Shortest-angle yaw interpolation
      let dyaw = entry.targetYaw - entry.root.rotation.y;
      while (dyaw > Math.PI) dyaw -= Math.PI * 2;
      while (dyaw < -Math.PI) dyaw += Math.PI * 2;
      entry.root.rotation.y += dyaw * Math.min(1, safeDt * 12);

      entry.head.rotation.x = THREE.MathUtils.damp(entry.head.rotation.x, entry.targetPitch * 0.65, 12, safeDt);

      const anim = entry.state.animState;
      const holding = entry.state.equippedTool !== 'none';

      if (anim === 'walk' || anim === 'run') {
        entry.walkPhase += safeDt * (anim === 'run' ? 14 : 9);
        const swing = Math.sin(entry.walkPhase) * (anim === 'run' ? 0.65 : 0.45);
        entry.leftLeg.rotation.x = swing;
        entry.rightLeg.rotation.x = -swing;
        entry.leftArm.rotation.x = -swing * 0.7;
        entry.rightArm.rotation.x = holding ? 0.75 + swing * 0.15 : swing * 0.7;
      } else if (anim === 'jump') {
        entry.leftLeg.rotation.x = 0.25;
        entry.rightLeg.rotation.x = -0.25;
        entry.leftArm.rotation.x = -0.4;
        entry.rightArm.rotation.x = holding ? 0.85 : -0.4;
      } else {
        entry.leftLeg.rotation.x = THREE.MathUtils.damp(entry.leftLeg.rotation.x, 0, 10, safeDt);
        entry.rightLeg.rotation.x = THREE.MathUtils.damp(entry.rightLeg.rotation.x, 0, 10, safeDt);
        entry.leftArm.rotation.x = THREE.MathUtils.damp(entry.leftArm.rotation.x, 0, 10, safeDt);
        entry.rightArm.rotation.x = THREE.MathUtils.damp(
          entry.rightArm.rotation.x,
          holding ? 0.72 : 0,
          10,
          safeDt,
        );
      }
    }
  }
}
