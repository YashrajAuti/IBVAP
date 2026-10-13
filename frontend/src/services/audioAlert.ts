/**
 * IBVAP Audio Alert Service
 * Provides robust, multi-layer audio playback for security alerts:
 * 1. Primary: HTML5 Audio loading `/static/audios/alarm.mp3`
 * 2. Fallback: Web Audio API synthesized high-pitch emergency siren (zero external file dependency)
 * 3. Browser Autoplay Unlocking: Listens for user gestures to unlock audio permissions.
 */

class AudioAlertService {
  private audioCtx: AudioContext | null = null;
  private audioElement: HTMLAudioElement | null = null;
  private isUnlocked: boolean = false;
  private isPlaying: boolean = false;
  private oscillatorNode: OscillatorNode | null = null;
  private gainNode: GainNode | null = null;
  private stopTimer: any = null;
  private volume: number = 0.85;

  constructor() {
    this.initAudioElement();
    this.setupUnlockListeners();
  }

  private initAudioElement() {
    if (typeof window === 'undefined') return;
    try {
      const host = window.location.hostname || 'localhost';
      const audioUrl = `http://${host}:8000/static/audios/alarm.mp3`;
      this.audioElement = new Audio(audioUrl);
      this.audioElement.preload = 'auto';
      this.audioElement.volume = this.volume;
    } catch (err) {
      console.warn('Failed to initialize HTMLAudioElement:', err);
    }
  }

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioCtxClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioCtxClass) {
        this.audioCtx = new AudioCtxClass();
      }
    }
    return this.audioCtx;
  }

  public setupUnlockListeners() {
    if (typeof window === 'undefined') return;
    const unlock = () => {
      this.unlock();
      window.removeEventListener('click', unlock);
      window.removeEventListener('keydown', unlock);
      window.removeEventListener('touchstart', unlock);
    };
    window.addEventListener('click', unlock, { once: true, passive: true });
    window.addEventListener('keydown', unlock, { once: true, passive: true });
    window.addEventListener('touchstart', unlock, { once: true, passive: true });
  }

  public unlock(): boolean {
    if (this.isUnlocked) return true;
    try {
      const ctx = this.getAudioContext();
      if (ctx && ctx.state === 'suspended') {
        ctx.resume();
      }
      if (this.audioElement) {
        // Silent unlock attempt
        const origVol = this.audioElement.volume;
        this.audioElement.volume = 0;
        const playPromise = this.audioElement.play();
        if (playPromise) {
          playPromise
            .then(() => {
              this.audioElement?.pause();
              this.audioElement!.currentTime = 0;
              this.audioElement!.volume = origVol;
            })
            .catch(() => {
              if (this.audioElement) this.audioElement.volume = origVol;
            });
        }
      }
      this.isUnlocked = true;
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Synthesize an attention-grabbing dual-tone emergency siren using Web Audio API
   */
  private playSynthesizedSiren(durationMs: number = 4000) {
    const ctx = this.getAudioContext();
    if (!ctx) return;

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {});
    }

    try {
      this.stopSynthesizedSiren();

      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(880, ctx.currentTime); // 880 Hz (A5)

      // Frequency modulation for police/perimeter siren effect (sweeping 750Hz <-> 1050Hz)
      const now = ctx.currentTime;
      const cycles = Math.ceil(durationMs / 400);
      for (let i = 0; i < cycles; i++) {
        const t = now + i * 0.4;
        osc.frequency.linearRampToValueAtTime(1050, t + 0.2);
        osc.frequency.linearRampToValueAtTime(750, t + 0.4);
      }

      // Gain pulsing
      gain.gain.setValueAtTime(0.3 * this.volume, ctx.currentTime);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      this.oscillatorNode = osc;
      this.gainNode = gain;

      setTimeout(() => {
        this.stopSynthesizedSiren();
      }, durationMs);
    } catch (err) {
      console.warn('Web Audio siren synthesis error:', err);
    }
  }

  private stopSynthesizedSiren() {
    if (this.oscillatorNode) {
      try {
        this.oscillatorNode.stop();
        this.oscillatorNode.disconnect();
      } catch {
        // Ignore errors if already stopped
      }
      this.oscillatorNode = null;
    }
    if (this.gainNode) {
      try {
        this.gainNode.disconnect();
      } catch {
        // Ignore
      }
      this.gainNode = null;
    }
  }

  /**
   * Play security alarm.
   * Tries MP3 first, immediately falls back to synthesized siren if blocked or unavailable.
   */
  public playAlarm(durationMs: number = 4000) {
    this.unlock();
    this.isPlaying = true;

    if (this.stopTimer) {
      clearTimeout(this.stopTimer);
    }

    if (this.audioElement) {
      this.audioElement.currentTime = 0;
      this.audioElement.volume = this.volume;
      const playPromise = this.audioElement.play();
      if (playPromise) {
        playPromise
          .catch((err) => {
            console.warn('MP3 playback blocked/failed, using Web Audio synthesizer siren:', err);
            this.playSynthesizedSiren(durationMs);
          });
      }
    } else {
      this.playSynthesizedSiren(durationMs);
    }

    // Auto-stop after durationMs
    this.stopTimer = setTimeout(() => {
      this.stopAlarm();
    }, durationMs);
  }

  /**
   * Immediately stops all ringing audio (both MP3 and synthesized tone)
   */
  public stopAlarm() {
    this.isPlaying = false;
    if (this.stopTimer) {
      clearTimeout(this.stopTimer);
      this.stopTimer = null;
    }

    if (this.audioElement) {
      try {
        this.audioElement.pause();
        this.audioElement.currentTime = 0;
      } catch {
        // Ignore
      }
    }

    this.stopSynthesizedSiren();
  }

  /**
   * Test alert sound (short 1.5s verification beep)
   */
  public testAlarm() {
    this.unlock();
    const ctx = this.getAudioContext();
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      try {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        const now = ctx.currentTime;
        osc.frequency.setValueAtTime(800, now);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.3);
        osc.frequency.exponentialRampToValueAtTime(800, now + 0.6);
        osc.frequency.exponentialRampToValueAtTime(1200, now + 0.9);

        gain.gain.setValueAtTime(0.35 * this.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.01, now + 1.2);

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + 1.2);
        return;
      } catch {
        // Fallback to normal playAlarm
      }
    }
    this.playAlarm(1500);
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.audioElement) {
      this.audioElement.volume = this.volume;
    }
  }

  public getIsPlaying(): boolean {
    return this.isPlaying;
  }
}

export const audioAlertService = new AudioAlertService();
