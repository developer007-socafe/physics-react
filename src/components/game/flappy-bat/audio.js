/* ═══════════════════════════════════════════════
   AudioKit — tiny WebAudio synth. No asset files:
   the context is created on the first user gesture
   (browsers block it before that) and every sound is
   generated from oscillators + one noise buffer.
   ═══════════════════════════════════════════════ */

export class AudioKit {
  constructor() {
    this.ctx = null
    this.master = null
    this.noiseBuf = null
    this.muted = false
    this.volume = 0.3
  }

  /** call from a user gesture handler */
  unlock() {
    if (!this.ctx) {
      const AC = typeof window !== 'undefined' && (window.AudioContext || window.webkitAudioContext)
      if (!AC) return
      try {
        this.ctx = new AC()
      } catch {
        this.ctx = null
        return
      }
      this.master = this.ctx.createGain()
      this.master.gain.value = this.muted ? 0 : this.volume
      this.master.connect(this.ctx.destination)
      this.noiseBuf = this.makeNoise()
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {})
  }

  setMuted(m) {
    this.muted = m
    if (this.master) {
      const now = this.ctx.currentTime
      this.master.gain.cancelScheduledValues(now)
      this.master.gain.setTargetAtTime(m ? 0 : this.volume, now, 0.02)
    }
  }

  makeNoise() {
    const len = Math.floor(this.ctx.sampleRate * 0.5)
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1
    return buf
  }

  ready() {
    return this.ctx && !this.muted
  }

  /** pitched blip with an optional frequency sweep */
  tone({ freq = 440, to = null, type = 'square', dur = 0.12, vol = 0.5, delay = 0, curve = 'exp' }) {
    if (!this.ready()) return
    const t0 = this.ctx.currentTime + delay
    const osc = this.ctx.createOscillator()
    const g = this.ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, t0)
    if (to !== null) {
      if (curve === 'exp') osc.frequency.exponentialRampToValueAtTime(Math.max(1, to), t0 + dur)
      else osc.frequency.linearRampToValueAtTime(to, t0 + dur)
    }
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.008)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    osc.connect(g).connect(this.master)
    osc.start(t0)
    osc.stop(t0 + dur + 0.02)
  }

  /** filtered noise burst — used for the wing flap */
  noise({ dur = 0.12, vol = 0.25, from = 2600, to = 500, q = 1.2, delay = 0 }) {
    if (!this.ready()) return
    const t0 = this.ctx.currentTime + delay
    const src = this.ctx.createBufferSource()
    src.buffer = this.noiseBuf
    const bp = this.ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.Q.value = q
    bp.frequency.setValueAtTime(from, t0)
    bp.frequency.exponentialRampToValueAtTime(Math.max(60, to), t0 + dur)
    const g = this.ctx.createGain()
    g.gain.setValueAtTime(0.0001, t0)
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012)
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur)
    src.connect(bp).connect(g).connect(this.master)
    src.start(t0)
    src.stop(t0 + dur + 0.02)
  }

  /* ─── game sounds ─── */

  flap() {
    this.noise({ dur: 0.13, vol: 0.2, from: 2400, to: 420, q: 0.9 })
    this.tone({ freq: 620, to: 300, type: 'sine', dur: 0.1, vol: 0.16 })
  }

  score() {
    this.tone({ freq: 880, type: 'square', dur: 0.07, vol: 0.22 })
    this.tone({ freq: 1320, type: 'square', dur: 0.1, vol: 0.2, delay: 0.06 })
  }

  coin() {
    this.tone({ freq: 988, type: 'triangle', dur: 0.06, vol: 0.3 })
    this.tone({ freq: 1319, type: 'triangle', dur: 0.06, vol: 0.3, delay: 0.05 })
    this.tone({ freq: 1760, type: 'triangle', dur: 0.12, vol: 0.28, delay: 0.1 })
  }

  hit() {
    this.noise({ dur: 0.22, vol: 0.3, from: 1400, to: 120, q: 0.6 })
    this.tone({ freq: 260, to: 60, type: 'sawtooth', dur: 0.25, vol: 0.3 })
  }

  thud() {
    this.noise({ dur: 0.16, vol: 0.22, from: 700, to: 90, q: 0.5 })
    this.tone({ freq: 150, to: 48, type: 'square', dur: 0.18, vol: 0.24 })
  }

  gameOver() {
    const notes = [523, 440, 349, 262]
    notes.forEach((f, i) => {
      this.tone({ freq: f, type: 'square', dur: 0.2, vol: 0.24, delay: i * 0.13 })
    })
  }

  newBest() {
    ;[660, 880, 1175].forEach((f, i) =>
      this.tone({ freq: f, type: 'triangle', dur: 0.16, vol: 0.26, delay: 0.42 + i * 0.1 }),
    )
  }
}
