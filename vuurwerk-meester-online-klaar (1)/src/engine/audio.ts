class SoundEngine {
  private ctx: AudioContext | null = null;
  private noiseBuffer: AudioBuffer | null = null;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private ambientGain: GainNode | null = null;
  private ambientStarted = false;
  private ambientFilter: BiquadFilterNode | null = null;
  private rainFilter: BiquadFilterNode | null = null;
  private rainGain: GainNode | null = null;

  private soundVolume = 0.8;
  private musicVolume = 0.45;
  private muted = false;

  public unlock() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.connect(this.masterGain);

      this.ambientGain = this.ctx.createGain();
      this.ambientGain.connect(this.masterGain);

      this.createNoiseBuffer();
      this.applyVolumes();
      this.startAmbientBed();
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
  }

  public setVolumes(soundVol: number, musicVol: number, muted: boolean) {
    this.soundVolume = soundVol;
    this.musicVolume = musicVol;
    this.muted = muted;
    this.applyVolumes();
  }

  private applyVolumes() {
    if (!this.ctx || !this.masterGain || !this.sfxGain || !this.ambientGain) return;
    const now = this.ctx.currentTime;
    this.masterGain.gain.setTargetAtTime(this.muted ? 0 : 1, now, 0.04);
    this.sfxGain.gain.setTargetAtTime(this.soundVolume, now, 0.04);
    this.ambientGain.gain.setTargetAtTime(this.musicVolume * 0.25, now, 0.08);
  }

  private createNoiseBuffer() {
    if (!this.ctx) return;
    const length = this.ctx.sampleRate * 2.5;
    const buffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      // Blend white and brown noise for punchy pyrotechnics
      lastOut = (lastOut + 0.04 * white) / 1.04;
      data[i] = white * 0.72 + lastOut * 1.1;
    }
    this.noiseBuffer = buffer;
  }

  private startAmbientBed() {
    if (!this.ctx || !this.noiseBuffer || !this.ambientGain || this.ambientStarted) return;
    this.ambientStarted = true;

    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 340;
    this.ambientFilter = filter;

    src.connect(filter);
    filter.connect(this.ambientGain);
    src.start();

    // Dedicated rain shimmer layer
    const rainSrc = this.ctx.createBufferSource();
    rainSrc.buffer = this.noiseBuffer;
    rainSrc.loop = true;

    const rainFilter = this.ctx.createBiquadFilter();
    rainFilter.type = 'bandpass';
    rainFilter.frequency.value = 1850;
    rainFilter.Q.value = 0.55;
    this.rainFilter = rainFilter;

    const rainGain = this.ctx.createGain();
    rainGain.gain.value = 0;
    this.rainGain = rainGain;

    rainSrc.connect(rainFilter);
    rainFilter.connect(rainGain);
    rainGain.connect(this.ambientGain);
    rainSrc.start(0, 0.35);
  }

  public setEnvironmentAmbience(inShop: boolean, isRaining = false, windStrength = 1.0) {
    if (!this.ctx || !this.ambientFilter) return;
    const now = this.ctx.currentTime;
    const windBoost = Math.min(280, windStrength * 36);
    const targetFreq = inShop ? 190 : 380 + windBoost;
    this.ambientFilter.frequency.setTargetAtTime(targetFreq, now, 0.4);

    if (this.rainGain && this.rainFilter) {
      this.rainFilter.frequency.setTargetAtTime(inShop ? 620 : 1950, now, 0.35);
      this.rainGain.gain.setTargetAtTime(isRaining ? (inShop ? 0.35 : 0.95) : 0, now, 0.45);
    }
  }

  private createPanner(pan = 0): AudioNode | null {
    if (!this.ctx || !this.sfxGain) return null;
    if (typeof this.ctx.createStereoPanner === 'function') {
      const panner = this.ctx.createStereoPanner();
      panner.pan.value = Math.max(-0.95, Math.min(0.95, pan));
      panner.connect(this.sfxGain);
      return panner;
    }
    return this.sfxGain;
  }

  public playUiClick() {
    this.unlock();
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(640, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.06);
    gain.gain.setValueAtTime(0.14, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.07);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.08);
  }

  public playPickup() {
    this.unlock();
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(360, now);
    osc.frequency.exponentialRampToValueAtTime(590, now + 0.09);
    gain.gain.setValueAtTime(0.18, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.11);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(now);
    osc.stop(now + 0.12);
  }

  public playCashRegister() {
    this.unlock();
    if (!this.ctx || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;
    [1046.5, 1318.5].forEach((freq, idx) => {
      if (!this.ctx || !this.sfxGain) return;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, now + idx * 0.07);
      gain.gain.setValueAtTime(0.2, now + idx * 0.07);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.07 + 0.25);
      osc.connect(gain);
      gain.connect(this.sfxGain);
      osc.start(now + idx * 0.07);
      osc.stop(now + idx * 0.07 + 0.26);
    });
  }

  public playLighterFlick() {
    this.unlock();
    if (!this.ctx || !this.noiseBuffer || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(3200, now);
    filter.Q.value = 3.5;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.28, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.09);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    src.start(now);
    src.stop(now + 0.1);
  }

  public playFootstep(surface: 'store' | 'pavement' | 'grass') {
    if (!this.ctx || !this.noiseBuffer || !this.sfxGain || this.muted) return;
    const now = this.ctx.currentTime;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = surface === 'store' ? 520 : surface === 'pavement' ? 880 : 1600;
    filter.Q.value = surface === 'grass' ? 1.2 : 2.5;

    const gain = this.ctx.createGain();
    const vol = surface === 'grass' ? 0.07 : 0.1;
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.075);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    src.start(now, Math.random() * 1.2, 0.09);
  }

  public playFuseHiss(duration = 2.0, pan = 0) {
    this.unlock();
    const dest = this.createPanner(pan);
    if (!this.ctx || !this.noiseBuffer || !dest || this.muted) return;
    const now = this.ctx.currentTime;
    const safeDur = Math.max(0.12, duration);
    const rampInEnd = now + Math.min(0.08, safeDur * 0.35);
    const holdEnd = now + Math.max(Math.min(0.08, safeDur * 0.35) + 0.02, safeDur - 0.08);

    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    src.loop = true;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = 3400;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.01, now);
    gain.gain.linearRampToValueAtTime(0.14, rampInEnd);
    gain.gain.setValueAtTime(0.14, holdEnd);
    gain.gain.exponentialRampToValueAtTime(0.001, now + safeDur);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    src.start(now);
    src.stop(now + safeDur + 0.04);
  }

  public playLaunchWhoosh(power = 1, pan = 0, distanceAtten = 1) {
    const dest = this.createPanner(pan);
    if (!this.ctx || !this.noiseBuffer || !dest || this.muted) return;
    const now = this.ctx.currentTime;
    const vol = Math.min(0.6, 0.35 * power * distanceAtten);

    // Thump
    const osc = this.ctx.createOscillator();
    const oscGain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(42, now + 0.14);
    oscGain.gain.setValueAtTime(vol * 0.9, now);
    oscGain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);
    osc.connect(oscGain);
    oscGain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.17);

    // Rising whoosh noise
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(600, now);
    filter.frequency.exponentialRampToValueAtTime(2200, now + 0.35);
    filter.Q.value = 1.6;

    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(vol * 0.7, now);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);

    src.connect(filter);
    filter.connect(nGain);
    nGain.connect(dest);
    src.start(now, Math.random(), 0.45);
  }

  public playWhistle(pan = 0, distanceAtten = 1) {
    const dest = this.createPanner(pan);
    if (!this.ctx || !dest || this.muted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    const base = 1800 + Math.random() * 400;
    osc.frequency.setValueAtTime(base, now);
    osc.frequency.exponentialRampToValueAtTime(base * 1.55, now + 0.35);
    osc.frequency.exponentialRampToValueAtTime(base * 0.9, now + 0.75);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(0.14 * distanceAtten, now + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.78);

    osc.connect(gain);
    gain.connect(dest);
    osc.start(now);
    osc.stop(now + 0.8);
  }

  public playExplosion(size = 1, pan = 0, distanceAtten = 1) {
    const dest = this.createPanner(pan);
    if (!this.ctx || !this.noiseBuffer || !dest || this.muted) return;
    const now = this.ctx.currentTime;
    const vol = Math.min(1.0, (0.55 + size * 0.35) * distanceAtten);

    // 1. Sub-bass chest punch
    const sub = this.ctx.createOscillator();
    const subGain = this.ctx.createGain();
    sub.type = 'sine';
    sub.frequency.setValueAtTime(95 + Math.random() * 25, now);
    sub.frequency.exponentialRampToValueAtTime(24, now + 0.35);
    subGain.gain.setValueAtTime(vol * 0.9, now);
    subGain.gain.exponentialRampToValueAtTime(0.001, now + 0.42);
    sub.connect(subGain);
    subGain.connect(dest);
    sub.start(now);
    sub.stop(now + 0.44);

    // 2. Sharp crack + reverberant echo tail
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(3200, now);
    filter.frequency.exponentialRampToValueAtTime(220, now + 0.95);

    const nGain = this.ctx.createGain();
    nGain.gain.setValueAtTime(vol, now);
    nGain.gain.exponentialRampToValueAtTime(vol * 0.28, now + 0.14);
    nGain.gain.exponentialRampToValueAtTime(0.001, now + 1.15);

    src.connect(filter);
    filter.connect(nGain);
    nGain.connect(dest);
    src.start(now, Math.random() * 0.4, 1.2);

    // 3. Subtle urban echo slapback tail on larger aerial shells
    if (size >= 1.0) {
      const echoSrc = this.ctx.createBufferSource();
      echoSrc.buffer = this.noiseBuffer;
      const echoFilter = this.ctx.createBiquadFilter();
      echoFilter.type = 'lowpass';
      echoFilter.frequency.value = 520;
      const echoGain = this.ctx.createGain();
      echoGain.gain.setValueAtTime(0.001, now + 0.24);
      echoGain.gain.linearRampToValueAtTime(vol * 0.22, now + 0.34);
      echoGain.gain.exponentialRampToValueAtTime(0.001, now + 1.45);
      echoSrc.connect(echoFilter);
      echoFilter.connect(echoGain);
      echoGain.connect(dest);
      echoSrc.start(now + 0.22, Math.random() * 0.5, 1.3);
    }
  }

  public playCrackleBurst(count = 8, pan = 0, distanceAtten = 1) {
    const dest = this.createPanner(pan);
    if (!this.ctx || !this.noiseBuffer || !dest || this.muted) return;
    const now = this.ctx.currentTime;
    const clicks = Math.min(14, count);

    for (let i = 0; i < clicks; i++) {
      const delay = Math.random() * 0.55;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuffer;

      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.value = 2400 + Math.random() * 2600;
      filter.Q.value = 3.2;

      const gain = this.ctx.createGain();
      const v = (0.14 + Math.random() * 0.14) * distanceAtten;
      gain.gain.setValueAtTime(v, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.035);

      src.connect(filter);
      filter.connect(gain);
      gain.connect(dest);
      src.start(now + delay, Math.random() * 1.5, 0.04);
    }
  }

  public playFountainBurst(pan = 0, distanceAtten = 1) {
    const dest = this.createPanner(pan);
    if (!this.ctx || !this.noiseBuffer || !dest || this.muted) return;
    const now = this.ctx.currentTime;

    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 2100;
    filter.Q.value = 0.8;

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.08 * distanceAtten, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    src.connect(filter);
    filter.connect(gain);
    gain.connect(dest);
    src.start(now, Math.random(), 0.38);
  }
}

export const soundEngine = new SoundEngine();
