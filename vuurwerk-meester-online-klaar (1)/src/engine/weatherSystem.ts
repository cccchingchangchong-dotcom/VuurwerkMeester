import * as THREE from 'three';
import { GraphicsQuality, WeatherMode } from '../types';

export interface WeatherStateOutput {
  effectiveMode: 'clear' | 'rain' | 'mist' | 'wind';
  windX: number;
  windZ: number;
  wetness: number; // 0..1
  fogDensity: number;
}

export class WeatherSystem {
  private scene: THREE.Scene;
  private maxDrops = 2400;
  private positions: Float32Array;
  private speeds: Float32Array;
  private geo: THREE.BufferGeometry;
  private mat: THREE.LineBasicMaterial;
  private lines: THREE.LineSegments;
  private activeDrops = 0;
  private targetWetness = 0;
  private currentWetness = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.positions = new Float32Array(this.maxDrops * 2 * 3);
    this.speeds = new Float32Array(this.maxDrops);

    for (let i = 0; i < this.maxDrops; i++) {
      const rx = (Math.random() - 0.5) * 44;
      const ry = Math.random() * 24;
      const rz = (Math.random() - 0.5) * 44;
      const i6 = i * 6;
      this.positions[i6] = rx;
      this.positions[i6 + 1] = ry;
      this.positions[i6 + 2] = rz;
      this.positions[i6 + 3] = rx;
      this.positions[i6 + 4] = ry - 0.55;
      this.positions[i6 + 5] = rz;
      this.speeds[i] = 17 + Math.random() * 9;
    }

    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));

    this.mat = new THREE.LineBasicMaterial({
      color: 0xbcd4f5,
      transparent: true,
      opacity: 0.36,
      depthWrite: false,
    });

    this.lines = new THREE.LineSegments(this.geo, this.mat);
    this.lines.frustumCulled = false;
    this.lines.visible = false;
    this.scene.add(this.lines);
  }

  public update(
    dt: number,
    elapsed: number,
    mode: WeatherMode,
    quality: GraphicsQuality,
    performanceMode: boolean,
    anchorPos: THREE.Vector3,
  ): WeatherStateOutput {
    let effective: 'clear' | 'rain' | 'mist' | 'wind' = mode === 'auto' ? 'clear' : mode;
    if (mode === 'auto') {
      const cycle = Math.floor(elapsed / 65) % 4;
      effective = cycle === 0 ? 'clear' : cycle === 1 ? 'wind' : cycle === 2 ? 'rain' : 'mist';
    }

    // Smooth wind vector with organic gusts
    const gust = 1 + Math.sin(elapsed * 0.7) * 0.35 + Math.cos(elapsed * 1.9) * 0.2;
    const baseWindSpeed =
      effective === 'wind' ? 6.8 : effective === 'rain' ? 3.2 : effective === 'mist' ? 0.6 : 1.0;
    const windAngle = 0.4 + Math.sin(elapsed * 0.08) * 0.28;
    const windX = Math.cos(windAngle) * baseWindSpeed * gust;
    const windZ = Math.sin(windAngle) * baseWindSpeed * gust;

    this.targetWetness = effective === 'rain' ? 1.0 : effective === 'mist' ? 0.35 : 0.0;
    this.currentWetness = THREE.MathUtils.damp(this.currentWetness, this.targetWetness, 1.5, dt);

    const fogDensity =
      effective === 'mist'
        ? 0.0095
        : effective === 'rain'
        ? 0.0046
        : effective === 'wind'
        ? 0.0028
        : 0.0022;

    if (effective === 'rain' && !performanceMode) {
      const count =
        quality === 'low'
          ? 400
          : quality === 'medium'
          ? 850
          : quality === 'high'
          ? 1400
          : quality === 'ultra'
          ? 1950
          : 2400;
      this.activeDrops = count;
      this.geo.setDrawRange(0, count * 2);
      this.lines.visible = true;

      const span = 42;
      const half = span * 0.5;
      const streakDx = windX * 0.032;
      const streakDz = windZ * 0.032;

      for (let i = 0; i < count; i++) {
        const i6 = i * 6;
        let x = this.positions[i6] + windX * dt;
        let y = this.positions[i6 + 1] - this.speeds[i] * dt;
        let z = this.positions[i6 + 2] + windZ * dt;

        // Wrap around player/camera anchor
        if (y < 0.05) {
          y = 22 + Math.random() * 4;
          x = anchorPos.x + (Math.random() - 0.5) * span;
          z = anchorPos.z + (Math.random() - 0.5) * span;
        }
        if (x < anchorPos.x - half) x += span;
        else if (x > anchorPos.x + half) x -= span;
        if (z < anchorPos.z - half) z += span;
        else if (z > anchorPos.z + half) z -= span;

        this.positions[i6] = x;
        this.positions[i6 + 1] = y;
        this.positions[i6 + 2] = z;
        this.positions[i6 + 3] = x - streakDx;
        this.positions[i6 + 4] = y - 0.62;
        this.positions[i6 + 5] = z - streakDz;
      }
      this.geo.attributes.position.needsUpdate = true;
    } else {
      this.lines.visible = false;
      this.activeDrops = 0;
    }

    return {
      effectiveMode: effective,
      windX,
      windZ,
      wetness: this.currentWetness,
      fogDensity,
    };
  }

  public dispose() {
    this.geo.dispose();
    this.mat.dispose();
  }
}
