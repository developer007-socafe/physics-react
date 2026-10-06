import { useRef, useEffect, useCallback } from 'react'

/* ------------------------------------------------------------------
   Tunable constants — all tuned so the game feels good at ~800px
   logical width and scales cleanly to 320px.
   ------------------------------------------------------------------ */

const SHIP_THRUST      = 42     // px/s² acceleration when thruster on
const SHIP_TURN        = 4.2    // rad/s rotation rate
const SHIP_DAMPING     = 0.991  // per-frame velocity multiplier (drift feel)
const SHIP_RADIUS_R    = 0.028  // ship collision radius as fraction of W

const PARTICLE_COUNT   = 24
const PARTICLE_R_R     = 0.012  // particle draw radius as fraction of W
const PARTICLE_ORBIT_MIN = 0.14
const PARTICLE_ORBIT_MAX = 0.44
const PARTICLE_SPEED_MIN = 0.35
const PARTICLE_SPEED_MAX = 0.75
const PARTICLE_RESPAWN  = 2.4   // seconds before a collected particle respawns

const HORIZON_START_R  = 0.055  // fraction of W at game start
const HORIZON_END_R    = 0.44   // fraction of W at game end
const HORIZON_DURATION = 88     // seconds to go from start → end

/* ------------------------------------------------------------------
   Types
   ------------------------------------------------------------------ */

interface Particle {
  x: number; y: number
  angle: number; radius: number; speed: number
  respawn: number  // seconds until it reappears
}

interface Ship {
  x: number; y: number
  vx: number; vy: number
  angle: number; thrust: number
}

interface State {
  ship: Ship
  particles: Particle[]
  horizon: number          // current horizon radius in canvas px
  horizonRate: number      // px per frame at 60fps
  collected: number
  startTime: number
  over: boolean
  ctx: CanvasRenderingContext2D
  W: number; H: number
  reduced: boolean
}

/* ------------------------------------------------------------------
   Component
   ------------------------------------------------------------------ */

interface Props {
  onGameOver: (score: number, elapsed: number, collected: number) => void
  isActive: boolean
}

export default function GameCanvas({ onGameOver, isActive }: Props) {
  const canvasRef  = useRef<HTMLCanvasElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const S          = useRef<State | null>(null)   // mutable game state
  const frameId    = useRef(0)
  const prevTime   = useRef(0)
  const keys       = useRef<Set<string>>(new Set())
  const touch      = useRef<{ active: boolean; x: number; y: number }>({ active: false, x: 0, y: 0 })

  /* ---- initialise / re-initialise the game state ---- */
  const init = useCallback(() => {
    const canvas = canvasRef.current
    const cont   = containerRef.current
    if (!canvas || !cont) return

    const rect = cont.getBoundingClientRect()
    const dpr  = window.devicePixelRatio || 1
    const W    = rect.width
    const H    = rect.height

    canvas.width  = Math.round(W * dpr)
    canvas.height = Math.round(H * dpr)
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches

    const ship: Ship = {
      x: W / 2, y: H / 2,
      vx: 0, vy: 0,
      angle: Math.random() * Math.PI * 2,
      thrust: 0,
    }

    const particles: Particle[] = []
    for (let i = 0; i < PARTICLE_COUNT; i++) {
      const a     = Math.random() * Math.PI * 2
      const r     = W * (PARTICLE_ORBIT_MIN + Math.random() * (PARTICLE_ORBIT_MAX - PARTICLE_ORBIT_MIN))
      const speed = PARTICLE_SPEED_MIN + Math.random() * (PARTICLE_SPEED_MAX - PARTICLE_SPEED_MIN)
      particles.push({
        x: W / 2 + Math.cos(a) * r,
        y: H / 2 + Math.sin(a) * r,
        angle: a, radius: r, speed,
        respawn: 0,
      })
    }

    const startR = W * HORIZON_START_R
    const endR   = W * HORIZON_END_R
    const totalFrames = HORIZON_DURATION * 60
    const rate  = (endR - startR) / totalFrames

    S.current = {
      ship, particles,
      horizon: startR, horizonRate: rate,
      collected: 0,
      startTime: performance.now(),
      over: false,
      ctx, W, H, reduced,
    }
  }, [])

  /* ---- physics + collision update ---- */
  const update = useCallback((dt: number) => {
    const s = S.current
    if (!s || s.over) return
    const { ship, particles, W, H } = s

    // --- thrust accumulators ---
    let tx = 0; let ty = 0

    const forward = (dir: number) => {
      tx += Math.cos(ship.angle) * SHIP_THRUST * dir
      ty += Math.sin(ship.angle) * SHIP_THRUST * dir
      ship.thrust = Math.min(1, ship.thrust + 0.6)
    }

    if (keys.current.has('ArrowUp')    || keys.current.has('KeyW')) forward(1)
    if (keys.current.has('ArrowDown')  || keys.current.has('KeyS')) forward(-0.5)
    if (keys.current.has(' '))          forward(1)
    if (keys.current.has('KeyZ'))       forward(1)

    if (keys.current.has('ArrowLeft')  || keys.current.has('KeyA')) ship.angle -= SHIP_TURN * dt
    if (keys.current.has('ArrowRight') || keys.current.has('KeyD')) ship.angle += SHIP_TURN * dt

    // --- touch: thrust toward touch point ---
    if (touch.current.active) {
      const dx = touch.current.x - ship.x
      const dy = touch.current.y - ship.y
      const dist = Math.hypot(dx, dy)
      if (dist > 8) {
        const a = Math.atan2(dy, dx)
        const str = Math.min(1, dist / (W * 0.28))
        tx += Math.cos(a) * SHIP_THRUST * str
        ty += Math.sin(a) * SHIP_THRUST * str
        ship.angle = a
        ship.thrust = str
      }
    }

    // --- integrate ---
    ship.vx += tx * dt
    ship.vy += ty * dt
    ship.vx *= SHIP_DAMPING
    ship.vy *= SHIP_DAMPING
    ship.x  += ship.vx * dt * 60
    ship.y  += ship.vy * dt * 60

    // wrap around edges (toroidal)
    if (ship.x < -30) ship.x = W + 30
    if (ship.x > W + 30) ship.x = -30
    if (ship.y < -30) ship.y = H + 30
    if (ship.y > H + 30) ship.y = -30

    // --- horizon growth ---
    s.horizon += s.horizonRate * dt * 60
    if (s.horizon > W * HORIZON_END_R) s.horizon = W * HORIZON_END_R

    // --- particles ---
    const shipR   = Math.max(14, W * SHIP_RADIUS_R)
    const partR   = Math.max(4,  W * PARTICLE_R_R)

    for (const p of particles) {
      if (p.respawn > 0) { p.respawn -= dt; continue }
      p.angle += p.speed * dt
      p.x = W / 2 + Math.cos(p.angle) * p.radius
      p.y = H / 2 + Math.sin(p.angle) * p.radius

      const dx = ship.x - p.x
      const dy = ship.y - p.y
      if (Math.hypot(dx, dy) < shipR + partR) {
        s.collected++
        p.respawn = PARTICLE_RESPAWN
        const na  = Math.random() * Math.PI * 2
        const nr  = W * (PARTICLE_ORBIT_MIN + Math.random() * (PARTICLE_ORBIT_MAX - PARTICLE_ORBIT_MIN))
        const ns  = PARTICLE_SPEED_MIN + Math.random() * (PARTICLE_SPEED_MAX - PARTICLE_SPEED_MIN)
        p.angle = na; p.radius = nr; p.speed = ns
        p.x = W / 2 + Math.cos(na) * nr
        p.y = H / 2 + Math.sin(na) * nr
      }
    }

    // --- game-over check ---
    const cx = W / 2, cy = H / 2
    if (Math.hypot(ship.x - cx, ship.y - cy) < s.horizon - shipR * 0.6) {
      s.over = true
      const elapsed = (performance.now() - s.startTime) / 1000
      const score   = Math.floor(elapsed) + s.collected
      onGameOver(score, Math.floor(elapsed), s.collected)
    }
  }, [onGameOver])

  /* ---- render ---- */
  const render = useCallback(() => {
    const s = S.current
    if (!s) return
    const { ctx, W, H, ship, particles, horizon, reduced } = s
    const cx = W / 2, cy = H / 2

    ctx.clearRect(0, 0, W, H)

    // --- background ---
    ctx.fillStyle = '#070503'
    ctx.fillRect(0, 0, W, H)

    // --- star field ---
    if (!reduced) {
      const count = 130
      ctx.fillStyle = 'rgba(255,179,0,0.55)'
      for (let i = 0; i < count; i++) {
        const sx = (i * 137.508 + 42.7) % W
        const sy = (i * 97.311 + 13.3) % H
        const ss = 0.6 + (i % 3) * 0.6
        ctx.globalAlpha = 0.2 + (i % 7) * 0.1
        ctx.fillRect(sx, sy, ss, ss)
      }
      ctx.globalAlpha = 1
    }

    // --- accretion disk : chromatic aberration (3 offset channels) ---
    const diskIn  = Math.max(8, horizon * 1.18)
    const diskOut = Math.max(horizon * 3.4, W * 0.40)

    if (!reduced) {
      // Blue channel — offset left
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      const gB = ctx.createRadialGradient(cx - 5, cy, diskIn, cx - 5, cy, diskOut)
      gB.addColorStop(0,    'rgba(50,160,255,0)')
      gB.addColorStop(0.30, 'rgba(50,160,255,0.10)')
      gB.addColorStop(0.60, 'rgba(50,160,255,0.18)')
      gB.addColorStop(1,    'rgba(50,160,255,0)')
      ctx.fillStyle = gB
      ctx.fillRect(0, 0, W, H)
      ctx.restore()

      // Red channel — offset right
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      const gR = ctx.createRadialGradient(cx + 5, cy, diskIn, cx + 5, cy, diskOut)
      gR.addColorStop(0,    'rgba(255,70,50,0)')
      gR.addColorStop(0.30, 'rgba(255,70,50,0.09)')
      gR.addColorStop(0.60, 'rgba(255,70,50,0.16)')
      gR.addColorStop(1,    'rgba(255,70,50,0)')
      ctx.fillStyle = gR
      ctx.fillRect(0, 0, W, H)
      ctx.restore()

      // Cyan/green channel — centred
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      const gC = ctx.createRadialGradient(cx, cy, diskIn, cx, cy, diskOut)
      gC.addColorStop(0,    'rgba(80,220,200,0)')
      gC.addColorStop(0.25, 'rgba(80,220,200,0.12)')
      gC.addColorStop(0.55, 'rgba(80,220,200,0.22)')
      gC.addColorStop(0.82, 'rgba(80,220,200,0.08)')
      gC.addColorStop(1,    'rgba(80,220,200,0)')
      ctx.fillStyle = gC
      ctx.fillRect(0, 0, W, H)
      ctx.restore()

      // Disk orbit bands
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      for (let b = 0; b < 6; b++) {
        const t = b / 6
        const r = diskIn + t * (diskOut - diskIn)
        const alpha = 0.05 + Math.sin(t * Math.PI * 8 + performance.now() * 0.0004) * 0.035
        ctx.strokeStyle = `rgba(190,245,225,${alpha.toFixed(3)})`
        ctx.lineWidth = 1.8
        ctx.beginPath()
        ctx.arc(cx, cy, r, 0, Math.PI * 2)
        ctx.stroke()
      }
      ctx.restore()
    } else {
      // Reduced-motion: single flat disk, no animation
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      const g = ctx.createRadialGradient(cx, cy, diskIn, cx, cy, diskOut)
      g.addColorStop(0,    'rgba(80,220,200,0)')
      g.addColorStop(0.35, 'rgba(80,220,200,0.18)')
      g.addColorStop(0.65, 'rgba(80,220,200,0.12)')
      g.addColorStop(1,    'rgba(80,220,200,0)')
      ctx.fillStyle = g
      ctx.fillRect(0, 0, W, H)
      ctx.restore()
    }

    // --- event horizon glow (darkness creeping in) ---
    ctx.save()
    ctx.globalCompositeOperation = 'lighter'
    const hGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, horizon * 1.7)
    hGlow.addColorStop(0,    'rgba(0,0,0,0)')
    hGlow.addColorStop(0.65, 'rgba(0,0,0,0)')
    hGlow.addColorStop(0.88, 'rgba(0,0,0,0.35)')
    hGlow.addColorStop(1,    'rgba(0,0,0,0)')
    ctx.fillStyle = hGlow
    ctx.fillRect(0, 0, W, H)
    ctx.restore()

    // --- event horizon body ---
    ctx.save()
    const hGrad = ctx.createRadialGradient(
      cx - horizon * 0.15, cy - horizon * 0.15, 0,
      cx, cy, horizon,
    )
    hGrad.addColorStop(0,    '#000000')
    hGrad.addColorStop(0.65, '#030201')
    hGrad.addColorStop(0.90, '#150a04')
    hGrad.addColorStop(1,    '#3a1d0a')
    ctx.fillStyle = hGrad
    ctx.beginPath()
    ctx.arc(cx, cy, horizon, 0, Math.PI * 2)
    ctx.fill()

    // horizon ring — amber phosphor
    ctx.strokeStyle = 'rgba(255,179,0,0.30)'
    ctx.lineWidth = 1.6
    ctx.beginPath()
    ctx.arc(cx, cy, horizon, 0, Math.PI * 2)
    ctx.stroke()

    // secondary cyan ring
    ctx.strokeStyle = 'rgba(77,226,194,0.14)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(cx, cy, horizon + 3, 0, Math.PI * 2)
    ctx.stroke()
    ctx.restore()

    // --- particles ---
    for (const p of particles) {
      if (p.respawn > 0) continue
      const pr = Math.max(4, W * PARTICLE_R_R)
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      ctx.shadowColor = reduced
        ? 'rgba(77,226,194,0.5)'
        : 'rgba(77,226,194,0.9)'
      ctx.shadowBlur = reduced ? pr * 1.5 : pr * 3
      ctx.fillStyle = '#4de2c2'
      ctx.beginPath()
      ctx.arc(p.x, p.y, pr, 0, Math.PI * 2)
      ctx.fill()
      ctx.shadowBlur = reduced ? 0 : pr * 1.8
      ctx.fillStyle = 'rgba(255,255,255,0.75)'
      ctx.beginPath()
      ctx.arc(p.x - pr * 0.22, p.y - pr * 0.22, pr * 0.38, 0, Math.PI * 2)
      ctx.fill()
      ctx.restore()
    }

    // --- ship ---
    ctx.save()
    ctx.translate(ship.x, ship.y)
    ctx.rotate(ship.angle)

    const sz   = Math.max(14, W * SHIP_RADIUS_R * 1.7)
    const fl   = ship.thrust * sz * 0.95

    // thruster flame
    if (fl > 2) {
      ctx.save()
      ctx.globalCompositeOperation = 'lighter'
      const fg = ctx.createLinearGradient(0, 0, -fl, 0)
      fg.addColorStop(0,   'rgba(255,200,50,0.95)')
      fg.addColorStop(0.35, 'rgba(255,130,30,0.65)')
      fg.addColorStop(0.7,  'rgba(255,60,10,0.30)')
      fg.addColorStop(1,   'rgba(255,30,0,0)')
      ctx.fillStyle = fg
      ctx.beginPath()
      ctx.moveTo(-sz * 0.22, -sz * 0.26)
      ctx.lineTo(-sz * 0.22 - fl, 0)
      ctx.lineTo(-sz * 0.22,  sz * 0.26)
      ctx.closePath()
      ctx.fill()
      ctx.restore()
    }

    // hull glow
    ctx.shadowColor = reduced ? 'rgba(255,179,0,0.3)' : 'rgba(255,179,0,0.6)'
    ctx.shadowBlur  = reduced ? sz * 0.5 : sz * 1.1
    ctx.fillStyle   = '#ffb300'
    ctx.beginPath()
    ctx.moveTo(sz, 0)
    ctx.lineTo(-sz * 0.42, -sz * 0.52)
    ctx.lineTo(-sz * 0.22, 0)
    ctx.lineTo(-sz * 0.42,  sz * 0.52)
    ctx.closePath()
    ctx.fill()

    // cockpit
    ctx.shadowBlur = 0
    ctx.fillStyle = '#0a0501'
    ctx.beginPath()
    ctx.moveTo(sz * 0.52, 0)
    ctx.lineTo(-sz * 0.08, -sz * 0.28)
    ctx.lineTo(-sz * 0.08,  sz * 0.28)
    ctx.closePath()
    ctx.fill()

    // engine port
    ctx.fillStyle = '#4de2c2'
    ctx.beginPath()
    ctx.arc(-sz * 0.30, 0, sz * 0.09, 0, Math.PI * 2)
    ctx.fill()

    ctx.restore()
  }, [])

  /* ---- animation loop ---- */
  const loop = useCallback((t: number) => {
    if (!S.current) return
    const dt = Math.min((t - prevTime.current) / 1000, 0.05)
    prevTime.current = t
    update(dt)
    render()
    frameId.current = requestAnimationFrame(loop)
  }, [update, render])

  const stop = useCallback(() => {
    cancelAnimationFrame(frameId.current)
    S.current = null
  }, [])

  useEffect(() => () => stop(), [stop])

  // --- keyboard ---
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current.add(e.code)
      if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.code)) e.preventDefault()
    }
    const up   = (e: KeyboardEvent) => { keys.current.delete(e.code) }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup',   up)
    return () => { window.removeEventListener('keydown', down); window.removeEventListener('keyup', up) }
  }, [])

  // --- touch ---
  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const ts = (e: TouchEvent) => {
      e.preventDefault()
      const t = e.touches[0]
      const r = el.getBoundingClientRect()
      touch.current = { active: true, x: t.clientX - r.left, y: t.clientY - r.top }
    }
    const tm = (e: TouchEvent) => {
      e.preventDefault()
      const t = e.touches[0]
      const r = el.getBoundingClientRect()
      touch.current = { active: true, x: t.clientX - r.left, y: t.clientY - r.top }
    }
    const te = (e: TouchEvent) => {
      e.preventDefault()
      touch.current = { active: false, x: 0, y: 0 }
    }
    el.addEventListener('touchstart', ts, { passive: false })
    el.addEventListener('touchmove',  tm, { passive: false })
    el.addEventListener('touchend',   te, { passive: false })
    el.addEventListener('touchcancel',te, { passive: false })
    return () => {
      el.removeEventListener('touchstart', ts)
      el.removeEventListener('touchmove',  tm)
      el.removeEventListener('touchend',   te)
      el.removeEventListener('touchcancel',te)
    }
  }, [])

  // --- resize ---
  useEffect(() => {
    const onResize = () => { if (S.current && !S.current.over) init() }
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [init])

  // --- visibility: pause when tab hidden ---
  useEffect(() => {
    const onVis = () => {
      if (document.hidden && S.current && !S.current.over) {
        cancelAnimationFrame(frameId.current)
      } else if (!document.hidden && S.current && !S.current.over) {
        prevTime.current = performance.now()
        frameId.current  = requestAnimationFrame(loop)
      }
    }
    document.addEventListener('visibilitychange', onVis)
    return () => document.removeEventListener('visibilitychange', onVis)
  }, [loop])

  useEffect(() => () => stop(), [stop])

  // --- start/stop loop driven by isActive ---
  useEffect(() => {
    if (isActive) {
      if (!S.current || S.current.over) {
        init()
        prevTime.current = performance.now()
      }
      if (S.current && !S.current.over) {
        frameId.current = requestAnimationFrame(loop)
      }
    }
  }, [isActive])

  return (
    <div
      ref={containerRef}
      className="absolute inset-0 w-full h-full overflow-hidden"
      style={{ touchAction: 'none', cursor: 'crosshair' }}
    >
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ display: 'block', background: '#070503' }}
        aria-label="Black Hole Dive game canvas"
      />
    </div>
  )
}
