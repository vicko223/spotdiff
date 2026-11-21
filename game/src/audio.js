// audio.js — every sound is synthesized with WebAudio; the game ships no audio files.
// A soft two-note chime for a find, a low thud for a miss, a shimmer for a hint, a small
// arpeggio for a win, and a quiet pad underneath while playing. Muting is one flag.

export class SoundBank {
  constructor() {
    this.context = null;
    this.master = null;
    this.muted = false;
    this.padNodes = null;
  }

  /** Create the AudioContext on the first user gesture (browsers require one). */
  ensure() {
    if (this.context) {
      if (this.context.state === 'suspended') this.context.resume();
      return;
    }
    const AudioCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtor) return;
    this.context = new AudioCtor();
    this.master = this.context.createGain();
    this.master.gain.value = this.muted ? 0 : 0.5;
    this.master.connect(this.context.destination);
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.5;
  }

  /** One oscillator note with a gentle attack and decay. */
  tone(freq, { type = 'sine', at = 0, dur = 0.25, gain = 0.22, slideTo = null } = {}) {
    if (!this.context) return;
    const t0 = this.context.currentTime + at;
    const osc = this.context.createOscillator();
    const env = this.context.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    env.gain.setValueAtTime(0.0001, t0);
    env.gain.exponentialRampToValueAtTime(gain, t0 + 0.015);
    env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(env).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  /** A difference was found: a bright two-note chime, rising with each find in a row. */
  found(streak = 0) {
    const lift = Math.min(streak, 6) * 40;
    this.tone(880 + lift, { dur: 0.18, gain: 0.2 });
    this.tone(1318 + lift, { at: 0.07, dur: 0.3, gain: 0.18 });
  }

  /** A wrong click: a soft low thud. */
  wrong() {
    this.tone(150, { type: 'triangle', dur: 0.22, gain: 0.3, slideTo: 90 });
  }

  /** A hint was spent: a quick shimmer. */
  hint() {
    [1568, 2093, 2637].forEach((f, i) => this.tone(f, { at: i * 0.06, dur: 0.22, gain: 0.1 }));
  }

  /** A button or card was chosen. */
  click() {
    this.tone(620, { type: 'triangle', dur: 0.08, gain: 0.12 });
  }

  /** The clock is nearly out: one tick per second under ten. */
  tick() {
    this.tone(1050, { type: 'square', dur: 0.05, gain: 0.05 });
  }

  /** A level was cleared: a small rising arpeggio. */
  win() {
    [523, 659, 784, 1047].forEach((f, i) => this.tone(f, { at: i * 0.11, dur: 0.4, gain: 0.16 }));
  }

  /** The whole game was cleared: a longer fanfare. */
  fanfare() {
    [523, 659, 784, 1047, 784, 1047, 1319].forEach((f, i) => this.tone(f, { at: i * 0.13, dur: 0.5, gain: 0.16 }));
  }

  /** Time ran out: a falling two-note sigh. */
  lose() {
    this.tone(392, { type: 'triangle', dur: 0.3, gain: 0.18 });
    this.tone(262, { type: 'triangle', at: 0.22, dur: 0.5, gain: 0.18 });
  }

  /** Start the quiet background pad (two detuned triangles through a slow filter sweep). */
  startPad() {
    if (!this.context || this.padNodes) return;
    const gain = this.context.createGain();
    gain.gain.value = 0.035;
    const filter = this.context.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 700;
    const lfo = this.context.createOscillator();
    lfo.frequency.value = 0.07;
    const lfoGain = this.context.createGain();
    lfoGain.gain.value = 260;
    lfo.connect(lfoGain).connect(filter.frequency);
    const oscs = [196, 294].map((freq) => {
      const osc = this.context.createOscillator();
      osc.type = 'triangle';
      osc.frequency.value = freq;
      osc.connect(filter);
      osc.start();
      return osc;
    });
    filter.connect(gain).connect(this.master);
    lfo.start();
    this.padNodes = { gain, oscs, lfo };
  }

  /** Stop the background pad. */
  stopPad() {
    if (!this.padNodes) return;
    const { gain, oscs, lfo } = this.padNodes;
    const t = this.context.currentTime;
    gain.gain.setValueAtTime(gain.gain.value, t);
    gain.gain.linearRampToValueAtTime(0.0001, t + 0.4);
    oscs.forEach((osc) => osc.stop(t + 0.45));
    lfo.stop(t + 0.45);
    this.padNodes = null;
  }
}
