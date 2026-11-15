import * as THREE from 'three';
import { FireworkProduct } from '../types';

const labelCache = new Map<string, THREE.CanvasTexture>();
let maxAnisotropy = 4;

export function setTextureMaxAnisotropy(val: number) {
  maxAnisotropy = Math.max(1, val);
}

function configureColorTexture(canvas: HTMLCanvasElement, repeatX = 1, repeatY = 1): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = maxAnisotropy;
  if (repeatX !== 1 || repeatY !== 1) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
  }
  tex.needsUpdate = true;
  return tex;
}

function configureDataTexture(canvas: HTMLCanvasElement, repeatX = 1, repeatY = 1): THREE.CanvasTexture {
  const tex = new THREE.CanvasTexture(canvas);
  // Linear/NoColorSpace for bump & roughness maps
  tex.anisotropy = maxAnisotropy;
  if (repeatX !== 1 || repeatY !== 1) {
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.repeat.set(repeatX, repeatY);
  }
  tex.needsUpdate = true;
  return tex;
}

export function createSurfaceBumpTexture(
  kind: 'brick' | 'pavement' | 'asphalt' | 'tiles' | 'rooftiles',
  repeatX = 4,
  repeatY = 4,
): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  if (kind === 'brick') {
    ctx.fillStyle = '#383838'; // recessed mortar
    ctx.fillRect(0, 0, size, size);
    const rows = 8;
    const cols = 4;
    const bh = size / rows;
    const bw = size / cols;
    for (let r = 0; r < rows; r++) {
      const off = (r % 2) * (bw * 0.5);
      for (let c = -1; c <= cols; c++) {
        const v = 185 + Math.floor(Math.random() * 45);
        ctx.fillStyle = `rgb(${v},${v},${v})`;
        ctx.fillRect(c * bw + off + 2, r * bh + 2, bw - 4, bh - 4);
      }
    }
  } else if (kind === 'rooftiles') {
    ctx.fillStyle = '#303030';
    ctx.fillRect(0, 0, size, size);
    const rows = 8;
    const cols = 8;
    const w = size / cols;
    const h = size / rows;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const grad = ctx.createLinearGradient(c * w, 0, (c + 1) * w, 0);
        grad.addColorStop(0, '#505050');
        grad.addColorStop(0.5, '#E5E5E5');
        grad.addColorStop(1, '#505050');
        ctx.fillStyle = grad;
        ctx.fillRect(c * w + 1, r * h + 2, w - 2, h - 4);
      }
    }
  } else if (kind === 'pavement') {
    ctx.fillStyle = '#404040';
    ctx.fillRect(0, 0, size, size);
    const rows = 8;
    const cols = 8;
    const w = size / cols;
    const h = size / rows;
    for (let r = 0; r < rows; r++) {
      const off = (r % 2) * (w * 0.5);
      for (let c = -1; c <= cols; c++) {
        const v = 175 + Math.floor(Math.random() * 55);
        ctx.fillStyle = `rgb(${v},${v},${v})`;
        ctx.fillRect(c * w + off + 1.5, r * h + 1.5, w - 3, h - 3);
      }
    }
  } else if (kind === 'tiles') {
    ctx.fillStyle = '#A0A0A0';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = '#303030';
    ctx.lineWidth = 3;
    for (let i = 0; i <= size; i += 64) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i, size);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i);
      ctx.lineTo(size, i);
      ctx.stroke();
    }
  } else {
    // asphalt micro-grain
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, size, size);
    for (let i = 0; i < 4500; i++) {
      const v = 95 + Math.floor(Math.random() * 110);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
    }
  }

  return configureDataTexture(canvas, repeatX, repeatY);
}

export function createAsphaltRoughnessTexture(repeatX = 4, repeatY = 20): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#D8D8D8';
  ctx.fillRect(0, 0, size, size);

  // Tire tracks slightly smoother
  const grad = ctx.createLinearGradient(0, 0, size, 0);
  grad.addColorStop(0.18, 'rgba(200,200,200,0)');
  grad.addColorStop(0.32, 'rgba(95,95,95,0.65)');
  grad.addColorStop(0.46, 'rgba(200,200,200,0)');
  grad.addColorStop(0.54, 'rgba(200,200,200,0)');
  grad.addColorStop(0.68, 'rgba(95,95,95,0.65)');
  grad.addColorStop(0.82, 'rgba(200,200,200,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  // Subtle damp patches for specular variation
  for (let i = 0; i < 18; i++) {
    const px = Math.random() * size;
    const py = Math.random() * size;
    const r = 16 + Math.random() * 28;
    const rg = ctx.createRadialGradient(px, py, 2, px, py, r);
    rg.addColorStop(0, 'rgba(55,55,55,0.75)');
    rg.addColorStop(1, 'rgba(180,180,180,0)');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(px, py, r, 0, Math.PI * 2);
    ctx.fill();
  }
  return configureDataTexture(canvas, repeatX, repeatY);
}

export function createRoofTileTexture(baseColor = '#5E2C22', repeatX = 4, repeatY = 3): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.fillStyle = '#241411';
  ctx.fillRect(0, 0, size, size);

  const rows = 8;
  const cols = 8;
  const w = size / cols;
  const h = size / rows;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = c * w;
      const y = r * h;
      ctx.fillStyle = baseColor;
      ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
      const wave = ctx.createLinearGradient(x, y, x + w, y);
      wave.addColorStop(0, 'rgba(0,0,0,0.38)');
      wave.addColorStop(0.45, 'rgba(255,215,190,0.16)');
      wave.addColorStop(1, 'rgba(0,0,0,0.42)');
      ctx.fillStyle = wave;
      ctx.fillRect(x + 1, y + 1, w - 2, h - 2);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fillRect(x, y + h - 3, w, 3);
    }
  }
  return configureColorTexture(canvas, repeatX, repeatY);
}

export function createHouseWindowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Warm interior glow gradient + faint curtain silhouettes
  const g = ctx.createLinearGradient(0, 0, 0, size);
  g.addColorStop(0, '#F59E0B');
  g.addColorStop(0.45, '#FDE68A');
  g.addColorStop(1, '#D97706');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  // Subtle curtains along edges
  ctx.fillStyle = 'rgba(40, 24, 16, 0.42)';
  ctx.fillRect(0, 0, 34, size);
  ctx.fillRect(size - 34, 0, 34, size);

  // Crisp white Dutch window muntins / frames (kozijnen)
  ctx.fillStyle = '#E5E7EB';
  ctx.fillRect(0, 0, size, 12);
  ctx.fillRect(0, size - 12, size, 12);
  ctx.fillRect(0, 0, 12, size);
  ctx.fillRect(size - 12, 0, 12, size);
  ctx.fillRect(size / 2 - 5, 0, 10, size);
  ctx.fillRect(0, size / 2 - 5, size, 10);

  return configureColorTexture(canvas);
}

export function createTrafficSignTexture(kind: '30' | 'voorrang' | 'parkeren' | 'afsteekzone'): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, size, size);

  if (kind === '30') {
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(128, 128, 118, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#DC2626';
    ctx.lineWidth = 26;
    ctx.beginPath();
    ctx.arc(128, 128, 102, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = '#111827';
    ctx.font = '800 96px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('30', 128, 134);
  } else if (kind === 'parkeren') {
    ctx.fillStyle = '#1D4ED8';
    ctx.fillRect(16, 16, 224, 224);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 10;
    ctx.strokeRect(24, 24, 208, 208);
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '800 148px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('P', 128, 136);
  } else if (kind === 'voorrang') {
    ctx.save();
    ctx.translate(128, 128);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(-84, -84, 168, 168);
    ctx.fillStyle = '#FACC15';
    ctx.fillRect(-58, -58, 116, 116);
    ctx.strokeStyle = '#111827';
    ctx.lineWidth = 6;
    ctx.strokeRect(-82, -82, 164, 164);
    ctx.restore();
  } else {
    ctx.fillStyle = '#0F172A';
    ctx.fillRect(10, 32, 236, 192);
    ctx.strokeStyle = '#F97316';
    ctx.lineWidth = 10;
    ctx.strokeRect(16, 38, 224, 180);
    ctx.fillStyle = '#F97316';
    ctx.font = '800 32px Outfit, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('AFSTEEKZONE', 128, 106);
    ctx.fillStyle = '#F8FAFC';
    ctx.font = '700 22px "Plus Jakarta Sans", sans-serif';
    ctx.fillText('VUURWERKPLEIN', 128, 152);
  }
  return configureColorTexture(canvas);
}

export function createZebraCrossingTexture(): THREE.CanvasTexture {
  const w = 256;
  const h = 256;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = 'rgba(241, 245, 249, 0.9)';
  for (let i = 0; i < 6; i++) {
    ctx.fillRect(i * 44 + 8, 16, 26, h - 32);
  }
  return configureColorTexture(canvas);
}

export function createVolumetricConeTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 0, 128);
  grad.addColorStop(0, 'rgba(255, 225, 165, 0.42)');
  grad.addColorStop(0.5, 'rgba(255, 210, 140, 0.14)');
  grad.addColorStop(1, 'rgba(255, 200, 120, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 64, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createBrickTexture(
  baseColor = '#7C3224',
  mortarColor = '#9A8E80',
  repeatX = 4,
  repeatY = 4,
): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = mortarColor;
  ctx.fillRect(0, 0, size, size);

  const rows = 16;
  const cols = 8;
  const brickH = size / rows;
  const brickW = size / cols;

  for (let r = 0; r < rows; r++) {
    const offset = (r % 2) * (brickW * 0.5);
    for (let c = -1; c <= cols; c++) {
      const shade = (Math.random() - 0.5) * 32;
      const x = c * brickW + offset + 2.5;
      const y = r * brickH + 2.5;
      const w = brickW - 5;
      const h = brickH - 5;
      ctx.fillStyle = baseColor;
      ctx.fillRect(x, y, w, h);
      ctx.fillStyle = shade > 0 ? `rgba(255,210,165,${shade / 220})` : `rgba(0,0,0,${-shade / 170})`;
      ctx.fillRect(x, y, w, h);
      // Subtle top highlight & bottom weathering
      ctx.fillStyle = 'rgba(255,255,255,0.06)';
      ctx.fillRect(x, y, w, 2);
      ctx.fillStyle = 'rgba(0,0,0,0.12)';
      ctx.fillRect(x, y + h - 2, w, 2);
    }
  }

  return configureColorTexture(canvas, repeatX, repeatY);
}

export function createPavementTexture(repeatX = 10, repeatY = 10): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#3E444F';
  ctx.fillRect(0, 0, size, size);

  const rows = 16;
  const cols = 16;
  const w = size / cols;
  const h = size / rows;

  for (let r = 0; r < rows; r++) {
    const off = (r % 2) * (w * 0.5);
    for (let c = -1; c <= cols; c++) {
      const v = 64 + Math.floor(Math.random() * 26);
      const warmShift = Math.random() < 0.25 ? 8 : 0;
      ctx.fillStyle = `rgb(${v + warmShift}, ${v + 3}, ${v + 9})`;
      ctx.fillRect(c * w + off + 1.5, r * h + 1.5, w - 3, h - 3);
      ctx.fillStyle = 'rgba(255,255,255,0.04)';
      ctx.fillRect(c * w + off + 1.5, r * h + 1.5, w - 3, 2);
    }
  }

  return configureColorTexture(canvas, repeatX, repeatY);
}

export function createAsphaltTexture(repeatX = 4, repeatY = 20): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#20242C';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 9000; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const g = 24 + Math.floor(Math.random() * 34);
    ctx.fillStyle = `rgb(${g},${g + 1},${g + 6})`;
    ctx.fillRect(x, y, 2, 2);
  }

  // Subtle wet tire tracks
  const trackGrad = ctx.createLinearGradient(0, 0, size, 0);
  trackGrad.addColorStop(0.2, 'rgba(0,0,0,0)');
  trackGrad.addColorStop(0.32, 'rgba(10,14,22,0.28)');
  trackGrad.addColorStop(0.45, 'rgba(0,0,0,0)');
  trackGrad.addColorStop(0.55, 'rgba(0,0,0,0)');
  trackGrad.addColorStop(0.68, 'rgba(10,14,22,0.28)');
  trackGrad.addColorStop(0.8, 'rgba(0,0,0,0)');
  ctx.fillStyle = trackGrad;
  ctx.fillRect(0, 0, size, size);

  // Dutch dashed center line
  ctx.fillStyle = '#E5E7EB';
  ctx.fillRect(248, 28, 16, 180);
  ctx.fillRect(248, 284, 16, 180);

  return configureColorTexture(canvas, repeatX, repeatY);
}

export function createGrassTexture(repeatX = 30, repeatY = 30): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#223924';
  ctx.fillRect(0, 0, size, size);

  for (let i = 0; i < 8500; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const g = 48 + Math.floor(Math.random() * 44);
    ctx.fillStyle = `rgb(${Math.floor(g * 0.52)}, ${g}, ${Math.floor(g * 0.48)})`;
    ctx.fillRect(x, y, 2, 4);
  }

  return configureColorTexture(canvas, repeatX, repeatY);
}

export function createShopFloorTexture(repeatX = 12, repeatY = 12): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#161A24';
  ctx.fillRect(0, 0, size, size);

  // Alternating polished dark slate tiles
  for (let y = 0; y < 4; y++) {
    for (let x = 0; x < 4; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? '#181D28' : '#151923';
      ctx.fillRect(x * 128 + 2, y * 128 + 2, 124, 124);
    }
  }

  ctx.strokeStyle = '#2A3142';
  ctx.lineWidth = 4;
  for (let i = 0; i <= size; i += 128) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, size);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(size, i);
    ctx.stroke();
  }

  // Subtle terrazzo / mineral speckle
  for (let i = 0; i < 1600; i++) {
    ctx.fillStyle = Math.random() < 0.2 ? 'rgba(245,158,11,0.04)' : 'rgba(255,255,255,0.03)';
    ctx.fillRect(Math.random() * size, Math.random() * size, 2, 2);
  }

  return configureColorTexture(canvas, repeatX, repeatY);
}

export function createSignTexture(
  title: string,
  subtitle: string,
  bgColor = '#0F131C',
  accentColor = '#F59E0B',
  width = 1024,
  height = 256,
): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;

  const bgGrad = ctx.createLinearGradient(0, 0, width, height);
  bgGrad.addColorStop(0, bgColor);
  bgGrad.addColorStop(0.5, '#131926');
  bgGrad.addColorStop(1, bgColor);
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = accentColor;
  ctx.lineWidth = 8;
  ctx.strokeRect(12, 12, width - 24, height - 24);

  ctx.fillStyle = accentColor;
  ctx.font = `800 ${Math.floor(height * 0.34)}px Outfit, sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(title, width / 2, subtitle ? height * 0.41 : height * 0.5);

  if (subtitle) {
    ctx.fillStyle = '#F3F4F6';
    ctx.font = `600 ${Math.floor(height * 0.16)}px "Plus Jakarta Sans", sans-serif`;
    ctx.fillText(subtitle, width / 2, height * 0.76);
  }

  return configureColorTexture(canvas);
}

export function createInfoBoardTexture(title: string, lines: string[], accent = '#F59E0B'): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  ctx.fillStyle = '#111520';
  ctx.fillRect(0, 0, 512, 512);

  ctx.fillStyle = accent;
  ctx.fillRect(0, 0, 512, 74);

  ctx.fillStyle = '#0B0E14';
  ctx.font = '800 30px Outfit, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, 256, 48);

  ctx.textAlign = 'left';
  ctx.fillStyle = '#E5E7EB';
  ctx.font = '500 22px "Plus Jakarta Sans", sans-serif';
  let y = 120;
  for (const line of lines) {
    ctx.fillStyle = accent;
    ctx.fillRect(28, y - 14, 8, 8);
    ctx.fillStyle = '#F3F4F6';
    ctx.fillText(line, 48, y);
    y += 46;
  }

  ctx.strokeStyle = 'rgba(245,158,11,0.45)';
  ctx.lineWidth = 4;
  ctx.strokeRect(6, 6, 500, 500);

  return configureColorTexture(canvas);
}

export function createProductLabelTexture(product: FireworkProduct): THREE.CanvasTexture {
  const cached = labelCache.get(product.id);
  if (cached) return cached;

  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d')!;

  // Rich gradient backdrop
  const grad = ctx.createLinearGradient(0, 0, 512, 512);
  grad.addColorStop(0, product.primaryColor);
  grad.addColorStop(0.65, '#111622');
  grad.addColorStop(1, '#07090F');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 512);

  // Diagonal burst pattern
  ctx.save();
  ctx.translate(256, 200);
  const rays = product.tier === 'premium' ? 24 : 16;
  for (let i = 0; i < rays; i++) {
    ctx.rotate((Math.PI * 2) / rays);
    ctx.fillStyle = i % 2 === 0 ? `${product.accentColor}33` : 'rgba(255,255,255,0.05)';
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-16, -245);
    ctx.lineTo(16, -245);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();

  // Top Brand Stripe
  ctx.fillStyle = '#090B10';
  ctx.fillRect(0, 0, 512, 74);
  ctx.fillStyle = product.accentColor;
  ctx.fillRect(0, 72, 512, 6);

  ctx.fillStyle = product.accentColor;
  ctx.font = '800 26px Outfit, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(product.brand.toUpperCase(), 256, 42);

  if (product.tier === 'premium' || product.tier === 'pro') {
    ctx.fillStyle = product.tier === 'premium' ? '#FDE047' : '#38BDF8';
    ctx.font = '700 16px "JetBrains Mono", monospace';
    ctx.fillText(
      product.tier === 'premium' ? '★ COLLECTOR EDITION ★' : 'PRO SERIES',
      256,
      64,
    );
  }

  // Effect Burst Star Graphic
  ctx.save();
  ctx.translate(256, 188);
  const starColors = product.effect.colors;
  for (let i = 0; i < 24; i++) {
    const angle = (i / 24) * Math.PI * 2;
    const len = 54 + (i % 3) * 26;
    ctx.strokeStyle = starColors[i % starColors.length];
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(Math.cos(angle) * len, Math.sin(angle) * len);
    ctx.stroke();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(Math.cos(angle) * len, Math.sin(angle) * len, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();

  // Product Title Band
  ctx.fillStyle = 'rgba(9, 11, 16, 0.90)';
  ctx.fillRect(20, 282, 472, 138);
  ctx.strokeStyle = product.tier === 'premium' ? '#FBBF24' : product.accentColor;
  ctx.lineWidth = product.tier === 'premium' ? 6 : 4;
  ctx.strokeRect(20, 282, 472, 138);

  // Category tag inside title band
  ctx.fillStyle = product.accentColor;
  ctx.font = '700 17px "JetBrains Mono", monospace';
  ctx.textAlign = 'center';
  ctx.fillText(product.category.toUpperCase(), 256, 308);

  // Wrap title into 1 or 2 lines
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '800 32px Outfit, sans-serif';
  const words = product.name.split(' ');
  let line1 = '';
  let line2 = '';
  for (const w of words) {
    if ((line1 + ' ' + w).trim().length <= 18) {
      line1 = (line1 + ' ' + w).trim();
    } else {
      line2 = (line2 + ' ' + w).trim();
    }
  }
  if (line2) {
    ctx.fillText(line1, 256, 352);
    ctx.fillText(line2, 256, 392);
  } else {
    ctx.fillText(line1, 256, 372);
  }

  // Bottom Spec Bar
  ctx.fillStyle = product.accentColor;
  ctx.fillRect(0, 444, 512, 68);
  ctx.fillStyle = '#090B10';
  ctx.font = '800 24px "JetBrains Mono", monospace';
  ctx.fillText(product.badgeText, 256, 486);

  // Outer gold frame for Collector / Premium items
  if (product.tier === 'premium') {
    ctx.strokeStyle = '#FDE047';
    ctx.lineWidth = 10;
    ctx.strokeRect(5, 5, 502, 502);
  }

  const tex = configureColorTexture(canvas);
  labelCache.set(product.id, tex);
  return tex;
}

export function createSparkSpriteTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const cx = 64;
  const cy = 64;

  // Tight optical corona
  const corona = ctx.createRadialGradient(cx, cy, 0, cx, cy, 42);
  corona.addColorStop(0, 'rgba(255,255,255,0.95)');
  corona.addColorStop(0.14, 'rgba(255,245,225,0.55)');
  corona.addColorStop(0.42, 'rgba(255,220,170,0.12)');
  corona.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = corona;
  ctx.fillRect(0, 0, 128, 128);

  // Primary 4-point diffraction cross rays
  const drawRay = (angleRad: number, length: number, thickness: number, alpha: number) => {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(angleRad);
    const grad = ctx.createLinearGradient(-length, 0, length, 0);
    grad.addColorStop(0, 'rgba(255,255,255,0)');
    grad.addColorStop(0.38, `rgba(255,250,235,${alpha * 0.45})`);
    grad.addColorStop(0.5, `rgba(255,255,255,${alpha})`);
    grad.addColorStop(0.62, `rgba(255,250,235,${alpha * 0.45})`);
    grad.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.ellipse(0, 0, length, thickness, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  drawRay(0, 60, 2.4, 0.92);
  drawRay(Math.PI / 2, 60, 2.4, 0.92);
  drawRay(Math.PI / 4, 38, 1.5, 0.55);
  drawRay(-Math.PI / 4, 38, 1.5, 0.55);

  // Pinpoint white-hot core
  const core = ctx.createRadialGradient(cx, cy, 0, cx, cy, 10);
  core.addColorStop(0, 'rgba(255,255,255,1)');
  core.addColorStop(0.45, 'rgba(255,255,255,0.95)');
  core.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = core;
  ctx.beginPath();
  ctx.arc(cx, cy, 10, 0, Math.PI * 2);
  ctx.fill();

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}

export function createSmokeSpriteTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;

  // Layered soft lobes for richer volumetric smoke look
  const lobes = [
    [64, 64, 60, 0.42],
    [48, 56, 36, 0.25],
    [80, 58, 36, 0.25],
    [62, 76, 38, 0.22],
  ];
  for (const [cx, cy, r, a] of lobes) {
    const grad = ctx.createRadialGradient(cx, cy, 4, cx, cy, r);
    grad.addColorStop(0, `rgba(225,230,240,${a})`);
    grad.addColorStop(0.55, `rgba(180,185,200,${a * 0.45})`);
    grad.addColorStop(1, 'rgba(140,145,160,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.needsUpdate = true;
  return tex;
}
