// The Unwritten Map - Web Audio Synthesizer Engine
// Generates ambient soundscapes and tactile sonic feedback without external audio files

class MysticalAudioEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.ambientRunning = false;
    this.ambientNodes = [];
    this.ambientTimer = null;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  // Toggle ambient music
  toggleAmbient() {
    this.init();
    if (this.ambientRunning) {
      this.stopAmbient();
      return false;
    } else {
      this.startAmbient();
      return true;
    }
  }

  startAmbient() {
    if (!this.ctx || this.ambientRunning) return;
    this.ambientRunning = true;

    // Master ambient gain
    const masterGain = this.ctx.createGain();
    masterGain.gain.setValueAtTime(0.01, this.ctx.currentTime);
    masterGain.gain.exponentialRampToValueAtTime(0.12, this.ctx.currentTime + 3);
    masterGain.connect(this.ctx.destination);
    this.ambientNodes.push(masterGain);

    // Warm, soothing mystic drones (Roots: D2, A2, F3)
    const freqs = [73.42, 110.0, 174.61, 220.0];
    freqs.forEach(freq => {
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, this.ctx.currentTime);

      // Slow mystical shimmer (LFO)
      const lfo = this.ctx.createOscillator();
      const lfoGain = this.ctx.createGain();
      lfo.frequency.value = 0.15 + Math.random() * 0.1;
      lfoGain.gain.value = 1.5;
      lfo.connect(osc.frequency);
      lfo.start();

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(320, this.ctx.currentTime);

      gain.gain.value = 0.08 / freqs.length;

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(masterGain);

      osc.start();
      this.ambientNodes.push(osc, lfo, gain, filter);
    });

    // Random gentle ethereal bell chimes in pentatonic scale
    const pentatonicNotes = [293.66, 329.63, 349.23, 440.0, 523.25, 587.33, 659.25, 880.0];
    const playRandomChime = () => {
      if (!this.ambientRunning || !this.ctx) return;
      const note = pentatonicNotes[Math.floor(Math.random() * pentatonicNotes.length)];
      this.playSoftBell(note, 0.04);
      const nextInterval = 4000 + Math.random() * 6000;
      this.ambientTimer = setTimeout(playRandomChime, nextInterval);
    };

    this.ambientTimer = setTimeout(playRandomChime, 2500);
  }

  stopAmbient() {
    this.ambientRunning = false;
    if (this.ambientTimer) clearTimeout(this.ambientTimer);
    this.ambientNodes.forEach(node => {
      try {
        if (node.stop) node.stop();
        if (node.disconnect) node.disconnect();
      } catch (e) {}
    });
    this.ambientNodes = [];
  }

  playSoftBell(freq, volume = 0.08) {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(0.001, now);
    gain.gain.exponentialRampToValueAtTime(volume, now + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 3.5);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 3.6);
  }

  // Card draw shimmer sound
  playCardDraw() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const chords = [392.0, 493.88, 587.33, 783.99, 987.77];
    chords.forEach((freq, idx) => {
      setTimeout(() => {
        this.playSoftBell(freq, 0.05);
      }, idx * 60);
    });
    this.vibrate([20, 40, 20]);
  }

  // Heart & Reaction sounds
  playReaction(type = 'heart') {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    if (type === 'heart' || type === 'blush') {
      const notes = [523.25, 659.25, 783.99, 1046.5];
      notes.forEach((freq, idx) => {
        setTimeout(() => {
          this.playSoftBell(freq, 0.04);
        }, idx * 75);
      });
      this.vibrate([35, 60]);
    } else if (type === 'spark' || type === 'firefly') {
      const notes = [880, 1174.66, 1318.51];
      notes.forEach((freq, idx) => {
        setTimeout(() => {
          this.playSoftBell(freq, 0.035);
        }, idx * 40);
      });
      this.vibrate([15, 30, 15]);
    } else {
      // Gentle warm chord
      this.playSoftBell(440, 0.06);
      this.playSoftBell(554.37, 0.05);
      this.vibrate(25);
    }
  }

  // Singing bowl gong for confessions & milestones
  playGong() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;

    const now = this.ctx.currentTime;
    const baseFreqs = [146.83, 293.66, 440.0, 587.33];
    baseFreqs.forEach((freq, i) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = i === 0 ? 'sine' : 'triangle';
      osc.frequency.setValueAtTime(freq + (Math.random() * 2 - 1), now);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.exponentialRampToValueAtTime(0.12 / (i + 1), now + 0.08);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 5.0);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 5.2);
    });
    this.vibrate([60, 100, 60]);
  }

  // Token pass sound
  playTokenPass() {
    if (this.isMuted) return;
    this.init();
    if (!this.ctx) return;
    this.playSoftBell(329.63, 0.06);
    this.playSoftBell(261.63, 0.05);
    this.vibrate(40);
  }

  // Mobile vibration helper
  vibrate(pattern) {
    if (typeof navigator !== 'undefined' && navigator.vibrate) {
      try {
        navigator.vibrate(pattern);
      } catch (e) {}
    }
  }
}

window.mysticAudio = new MysticalAudioEngine();
