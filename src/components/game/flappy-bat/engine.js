/* ═══════════════════════════════════════════════
   FLAPPY BAT — game engine
   Owns all mutable game state and runs a fixed
   timestep loop. React only receives a small snapshot
   when something visible changes, so there is no
   per-frame re-render.
   ═══════════════════════════════════════════════ */

import * as C from './config.js'
import { drawSky, drawGround, drawPipe, drawCoin, drawBat } from './sprites.js'
import { burst, dust, updateParticles, drawParticles } from './particles.js'
import { AudioKit } from './audio.js'

const TAU = Math.PI * 2
const rand = (a, b) => a + Math.random() * (b - a)
const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v)

function readNum(key, fallback = 0) {
  try {
    const v = Number(localStorage.getItem(key))
    return Number.isFinite(v) ? v : fallback
  } catch {
    return fallback
  }
}

function writeNum(key, value) {
  try {
    localStorage.setItem(key, String(value))
  } catch {
    /* storage unavailable (private mode) — ignore */
  }
}

export function createGame({ canvas, onState }) {
  const ctx = canvas.getContext('2d', { alpha: false })
  const audio = new AudioKit()

  const s = {
    phase: 'ready', // ready | playing | dying | over | paused
    prevPhase: 'ready',
    y: C.PLAY_H * 0.45,
    vy: 0,
    tilt: 0,
    flapT: 99,
    t: 0,
    scroll: 0,
    pipes: [],
    particles: [],
    score: 0,
    coinsRun: 0,
    best: readNum(C.BEST_KEY, 0),
    coinsTotal: readNum(C.COINS_KEY, 0),
    spawnDist: 0,
    lastGapY: C.PLAY_H * 0.45,
    pipeId: 0,
    shake: 0,
    landT: 0,
    newBest: false,
  }

  let raf = 0
  let lastTs = 0
  let acc = 0
  let running = false
  let snapshot = {}

  /* ─── derived difficulty ─── */
  const speed = () =>
    Math.min(C.SPEED_MAX, C.SPEED_START + Math.floor(s.score / C.SPEED_EVERY) * C.SPEED_STEP)

  const gapSize = () =>
    Math.max(C.GAP_MIN, C.GAP_START - Math.floor(s.score / C.GAP_SHRINK_EVERY) * C.GAP_SHRINK_STEP)

  const spacing = () =>
    Math.max(
      C.SPACING_MIN,
      C.SPACING_START - Math.floor(s.score / C.SPACING_SHRINK_EVERY) * C.SPACING_SHRINK_STEP,
    )

  /* ─── state → React (only when it actually changes) ─── */
  function emit() {
    if (
      snapshot.phase === s.phase &&
      snapshot.score === s.score &&
      snapshot.coinsRun === s.coinsRun &&
      snapshot.best === s.best &&
      snapshot.coinsTotal === s.coinsTotal &&
      snapshot.newBest === s.newBest
    ) {
      return
    }
    snapshot = {
      phase: s.phase,
      score: s.score,
      coinsRun: s.coinsRun,
      best: s.best,
      coinsTotal: s.coinsTotal,
      newBest: s.newBest,
    }
    onState(snapshot)
  }

  /* ─── canvas sizing: logical 480x700, any CSS size ─── */
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    const rect = canvas.getBoundingClientRect()
    const w = Math.max(1, Math.round((rect.width || C.VIEW_W) * dpr))
    const h = Math.max(1, Math.round((rect.height || C.VIEW_H) * dpr))
    if (canvas.width !== w || canvas.height !== h) {
      canvas.width = w
      canvas.height = h
    }
    ctx.setTransform(canvas.width / C.VIEW_W, 0, 0, canvas.height / C.VIEW_H, 0, 0)
    ctx.imageSmoothingEnabled = true
  }

  /* ─── pipes ─── */
  function spawnPipe() {
    const gap = gapSize()
    const minY = C.GAP_EDGE_MARGIN
    const maxY = C.PLAY_H - gap - C.GAP_EDGE_MARGIN
    // keep consecutive gaps reachable, then clamp to the playfield
    let gapY = clamp(rand(minY, maxY), s.lastGapY - C.GAP_MAX_JUMP, s.lastGapY + C.GAP_MAX_JUMP)
    gapY = clamp(gapY, minY, maxY)
    s.lastGapY = gapY

    s.pipes.push({
      id: ++s.pipeId,
      x: C.PIPE_SPAWN_X,
      gapY,
      gap,
      scored: false,
      coin: null,
    })

    const p = s.pipes[s.pipes.length - 1]
    if (Math.random() < C.COIN_CHANCE) {
      p.coin = {
        y: gapY + gap / 2 + rand(-12, 12),
        spin: rand(0, TAU),
        taken: false,
      }
    }
  }

  function hitPipe() {
    const bl = C.BAT_X - C.BAT_HIT_W / 2
    const br = C.BAT_X + C.BAT_HIT_W / 2
    const bt = s.y - C.BAT_HIT_H / 2
    const bb = s.y + C.BAT_HIT_H / 2
    for (const p of s.pipes) {
      if (br <= p.x || bl >= p.x + C.PIPE_W) continue
      if (bt < p.gapY) return true // top pipe occupies [0, gapY]
      if (bb > p.gapY + p.gap) return true // bottom pipe occupies [gapY+gap, PLAY_H]
    }
    return false
  }

  /* ─── phases ─── */
  function start() {
    s.phase = 'playing'
    s.y = C.PLAY_H * 0.45
    s.vy = 0
    s.tilt = 0
    s.flapT = 99
    s.pipes = []
    s.particles = []
    s.score = 0
    s.coinsRun = 0
    s.spawnDist = 0
    s.lastGapY = C.PLAY_H * 0.45
    s.shake = 0
    s.landT = 0
    s.newBest = false
    s.scroll = 0
    spawnPipe()
    audio.unlock()
    emit()
  }

  function toReady() {
    s.phase = 'ready'
    s.y = C.PLAY_H * 0.45
    s.vy = 0
    s.tilt = 0
    s.flapT = 99
    s.pipes = []
    s.particles = []
    s.score = 0
    s.coinsRun = 0
    s.spawnDist = 0
    s.shake = 0
    s.landT = 0
    s.newBest = false
    s.scroll = 0
    s.lastGapY = C.PLAY_H * 0.45
    emit()
  }

  function die() {
    s.phase = 'dying'
    s.vy = Math.max(s.vy, C.DEATH_FALL_V * 0.2)
    s.shake = 1
    s.landT = 0
    audio.hit()
    burst(s.particles, C.BAT_X, s.y, 14, {
      colors: ['#c88cff', '#8a5cc9', '#ffffff'],
      speed: 190,
      size: 3.4,
      life: 0.5,
      gravity: 420,
    })
    emit()
  }

  function land() {
    s.phase = 'over'
    audio.thud()
    burst(s.particles, C.BAT_X, C.PLAY_H - 6, 16, {
      colors: ['#8b6bb0', '#5d4478', '#cbb6ff'],
      speed: 210,
      size: 3.6,
      life: 0.6,
      gravity: 520,
      dir: -Math.PI / 2,
      spread: Math.PI * 1.1,
    })
    if (s.score > s.best) {
      s.best = s.score
      s.newBest = true
      writeNum(C.BEST_KEY, s.best)
      setTimeout(() => audio.newBest(), 260)
    }
    if (s.coinsRun > 0) {
      s.coinsTotal += s.coinsRun
      writeNum(C.COINS_KEY, s.coinsTotal)
    }
    setTimeout(() => audio.gameOver(), 200)
    emit()
  }

  /* ─── input ─── */
  function flap() {
    s.vy = C.FLAP_V
    s.flapT = 0
    audio.flap()
    dust(s.particles, C.BAT_X - 10, s.y + 6, 1, 3)
  }

  /** the single "play" action, whatever phase we're in */
  function press() {
    audio.unlock()
    switch (s.phase) {
      case 'ready':
        start()
        flap()
        break
      case 'playing':
        flap()
        break
      case 'dying':
        break
      case 'over':
        start()
        flap()
        break
      case 'paused':
        resume()
        break
    }
  }

  function pause() {
    if (s.phase !== 'playing' && s.phase !== 'ready') return
    s.prevPhase = s.phase
    s.phase = 'paused'
    emit()
  }

  function resume() {
    if (s.phase !== 'paused') return
    s.phase = s.prevPhase
    lastTs = 0
    acc = 0
    emit()
  }

  function togglePause() {
    if (s.phase === 'paused') resume()
    else pause()
  }

  /* ─── simulation ─── */
  function step(dt) {
    s.t += dt
    s.flapT += dt
    s.shake = Math.max(0, s.shake - dt * 2.6)
    updateParticles(s.particles, dt)

    if (s.phase === 'playing') {
      /* physics */
      s.vy = Math.min(s.vy + C.GRAVITY * dt, C.MAX_FALL_V)
      s.y += s.vy * dt
      if (s.y < C.CEILING_Y) {
        s.y = C.CEILING_Y
        if (s.vy < 0) s.vy = 0
      }

      /* rotation follows velocity */
      const t = clamp(s.vy / C.MAX_FALL_V, -1, 1)
      const target = t < 0 ? C.TILT_UP * -t : C.TILT_DOWN * t
      s.tilt += (target - s.tilt) * Math.min(1, dt * C.TILT_LERP)

      /* pipes */
      const spd = speed()
      s.scroll += spd * dt
      for (const p of s.pipes) {
        p.x -= spd * dt
        if (p.coin) p.coin.spin += dt * TAU * C.COIN_SPIN_HZ
        if (!p.scored && p.x + C.PIPE_W < C.BAT_X - C.BAT_HIT_W / 2) {
          p.scored = true
          s.score += 1
          audio.score()
          burst(s.particles, C.BAT_X, s.y, 4, {
            colors: ['#ffffff', '#ffe680'],
            speed: 90,
            size: 2.4,
            life: 0.3,
            gravity: 60,
          })
          emit()
        }
        /* coin pickup */
        const coin = p.coin
        if (coin && !coin.taken) {
          const cx = p.x + C.PIPE_W / 2
          const dx = cx - C.BAT_X
          const dy = coin.y - s.y
          const r = C.COIN_R + C.BAT_HIT_H / 2
          if (dx * dx + dy * dy < r * r) {
            coin.taken = true
            s.coinsRun += 1
            audio.coin()
            burst(s.particles, cx, coin.y, 16, {
              colors: ['#ffe680', '#ffc93c', '#fff6d8', '#ff9f1c'],
              speed: 210,
              size: 3.2,
              life: 0.5,
              gravity: 300,
            })
            emit()
          }
        }
      }
      s.pipes = s.pipes.filter((p) => p.x + C.PIPE_W > -40)

      /* spawn on distance travelled, so spacing never depends on framerate */
      s.spawnDist += spd * dt
      if (s.spawnDist >= spacing()) {
        s.spawnDist -= spacing()
        spawnPipe()
      }

      /* death checks */
      if (s.y + C.BAT_HIT_H / 2 >= C.PLAY_H) {
        s.y = C.PLAY_H - C.BAT_HIT_H / 2
        die()
      } else if (hitPipe()) {
        die()
      }
    } else if (s.phase === 'dying') {
      s.vy = Math.min(s.vy + C.GRAVITY * 1.15 * dt, C.MAX_FALL_V)
      s.y += s.vy * dt
      s.tilt += (C.DEATH_TILT - s.tilt) * Math.min(1, dt * 4.5)
      s.scroll += speed() * 0.25 * dt
      if (s.y + C.BAT_HIT_H / 2 >= C.PLAY_H) {
        s.y = C.PLAY_H - C.BAT_HIT_H / 2
        s.landT += dt
        if (s.landT >= C.DEATH_LAND_PAUSE) land()
      }
    } else if (s.phase === 'ready') {
      /* gentle hover before the first flap */
      s.y = C.PLAY_H * 0.45 + Math.sin(s.t * 2.6) * 9
      s.tilt = Math.sin(s.t * 2.6) * 0.12
      s.flapT = 0.2 + (Math.sin(s.t * 2.6) * 0.5 + 0.5) * 0.22
      s.scroll += 42 * dt
    } else if (s.phase === 'over') {
      s.scroll += 26 * dt
    }
  }

  /* ─── render ─── */
  function render() {
    ctx.save()
    if (s.shake > 0) {
      const m = s.shake * 7
      ctx.translate(rand(-m, m), rand(-m, m))
    }

    drawSky(ctx, s.t, s.scroll)

    for (const p of s.pipes) {
      drawPipe(ctx, p)
      if (p.coin && !p.coin.taken) {
        drawCoin(ctx, p.x + C.PIPE_W / 2, p.coin.y, p.coin.spin)
      }
    }

    drawGround(ctx, s.scroll)

    drawBat(ctx, C.BAT_X, s.y, s.tilt, s.flapT, s.t, {
      dead: s.phase === 'dying' || s.phase === 'over',
      alpha: s.phase === 'over' ? 0.92 : 1,
    })

    drawParticles(ctx, s.particles)
    ctx.restore()
  }

  /* ─── loop ─── */
  function frame(ts) {
    if (!running) return
    raf = requestAnimationFrame(frame)
    if (!lastTs) lastTs = ts
    let dt = (ts - lastTs) / 1000
    lastTs = ts
    if (dt > C.MAX_FRAME_DT) dt = C.MAX_FRAME_DT

    if (s.phase !== 'paused') {
      acc += dt
      let steps = 0
      while (acc >= C.FIXED_DT && steps < C.MAX_STEPS) {
        step(C.FIXED_DT)
        acc -= C.FIXED_DT
        steps++
      }
      if (steps === C.MAX_STEPS) acc = 0 // give up on catching up
    }
    render()
  }

  function startLoop() {
    if (running) return
    running = true
    lastTs = 0
    acc = 0
    raf = requestAnimationFrame(frame)
  }

  /* ─── public api ─── */
  resize()
  emit()

  return {
    press,
    start,
    pause,
    resume,
    togglePause,
    reset: toReady,
    resize,
    get muted() {
      return audio.muted
    },
    setMuted(m) {
      audio.setMuted(m)
    },
    unlockAudio() {
      audio.unlock()
    },
    destroy() {
      running = false
      if (raf) cancelAnimationFrame(raf)
      raf = 0
    },
    startLoop,
  }
}
