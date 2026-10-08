/* ═══════════════════════════════════════════════
   FLAPPY BAT — sprite drawing
   Everything is drawn procedurally on the canvas in
   the shared 480x700 logical space (see config.js).
   ═══════════════════════════════════════════════ */

import {
  VIEW_W,
  VIEW_H,
  PLAY_H,
  PIPE_W,
  PIPE_CAP_H,
  PIPE_CAP_OVERHANG,
  BAT_W,
  BAT_HIT_W,
  COIN_R,
  WING_UP,
  WING_DOWN,
  WING_IDLE,
  WING_IDLE_AMP,
  WING_IDLE_FREQ,
  WING_FORESHORTEN,
  FLAP_WING_TIME,
  SQUASH_TIME,
  SQUASH_SQUASH_Y,
  SQUASH_STRETCH_X,
} from './config.js'

const TAU = Math.PI * 2
const rand = (a, b) => a + Math.random() * (b - a)
const lerp = (a, b, t) => a + (b - a) * t

/* the bat is drawn inside a 52x40 authoring box; scale it so the
   on-screen sprite matches BAT_W from the config */
const BAT_ART_W = 52
const BAT_SCALE = BAT_W / BAT_ART_W

/* ─── background layers (generated once) ─── */

export const STARS = Array.from({ length: 90 }, () => ({
  x: rand(0, VIEW_W),
  y: rand(0, PLAY_H * 0.82),
  r: rand(0.4, 1.7),
  a: rand(0.12, 0.55),
  ph: rand(0, TAU),
  sp: rand(0.5, 2),
}))

const CLOUDS = Array.from({ length: 7 }, () => ({
  x: rand(0, VIEW_W),
  y: rand(30, PLAY_H * 0.5),
  s: rand(0.55, 1.15),
  sp: rand(4, 11),
  a: rand(0.05, 0.12),
}))

const HILLS = [
  { sp: 0.05, amp: 30, step: 150, y: PLAY_H - 104, col: '#2a1854' },
  { sp: 0.11, amp: 22, step: 104, y: PLAY_H - 74, col: '#1c0f3c' },
]

/* ═══════════════════════════════════════════════
   SKY
   ═══════════════════════════════════════════════ */
export function drawSky(ctx, t, scroll) {
  const g = ctx.createLinearGradient(0, 0, 0, PLAY_H)
  g.addColorStop(0, '#08061f')
  g.addColorStop(0.3, '#161145')
  g.addColorStop(0.62, '#331a5e')
  g.addColorStop(1, '#5d2a6b')
  ctx.fillStyle = g
  ctx.fillRect(0, 0, VIEW_W, PLAY_H)

  drawMoon(ctx)

  // stars
  for (const s of STARS) {
    const a = s.a * (0.45 + 0.55 * Math.sin(t * s.sp + s.ph))
    ctx.globalAlpha = a
    ctx.fillStyle = '#fff'
    ctx.fillRect(s.x, s.y, s.r, s.r)
  }
  ctx.globalAlpha = 1

  // clouds
  for (const c of CLOUDS) {
    const span = VIEW_W + 220
    let x = (c.x - t * c.sp) % span
    if (x < -110) x += span
    cloud(ctx, x, c.y, c.s, c.a)
  }

  // parallax hills
  for (const h of HILLS) {
    ctx.fillStyle = h.col
    const off = (scroll * h.sp) % h.step
    ctx.beginPath()
    ctx.moveTo(-h.step, h.y)
    for (let x = -h.step; x <= VIEW_W + h.step; x += h.step) {
      ctx.quadraticCurveTo(x - off + h.step / 2, h.y - h.amp, x - off + h.step, h.y)
    }
    ctx.lineTo(VIEW_W + h.step, PLAY_H)
    ctx.lineTo(0, PLAY_H)
    ctx.closePath()
    ctx.fill()
  }
}

function drawMoon(ctx) {
  const x = VIEW_W - 82
  const y = 96
  ctx.save()
  const glow = ctx.createRadialGradient(x, y, 6, x, y, 74)
  glow.addColorStop(0, 'rgba(255,244,214,0.30)')
  glow.addColorStop(0.45, 'rgba(255,238,200,0.08)')
  glow.addColorStop(1, 'rgba(255,238,200,0)')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(x, y, 74, 0, TAU)
  ctx.fill()

  ctx.fillStyle = '#fdf3d0'
  ctx.beginPath()
  ctx.arc(x, y, 26, 0, TAU)
  ctx.fill()

  ctx.fillStyle = 'rgba(214,196,150,0.55)'
  for (const [cx, cy, cr] of [
    [-8, -5, 5],
    [7, 4, 7],
    [-3, 10, 3.5],
    [9, -11, 3],
  ]) {
    ctx.beginPath()
    ctx.arc(x + cx, y + cy, cr, 0, TAU)
    ctx.fill()
  }
  ctx.restore()
}

function cloud(ctx, x, y, s, a) {
  ctx.save()
  ctx.globalAlpha = a * 6
  ctx.fillStyle = '#cbb6ff'
  ctx.beginPath()
  ctx.ellipse(x, y, 46 * s, 15 * s, 0, 0, TAU)
  ctx.ellipse(x + 26 * s, y + 4 * s, 30 * s, 11 * s, 0, 0, TAU)
  ctx.ellipse(x - 27 * s, y + 5 * s, 26 * s, 10 * s, 0, 0, TAU)
  ctx.fill()
  ctx.restore()
}

/* ═══════════════════════════════════════════════
   GROUND
   ═══════════════════════════════════════════════ */
export function drawGround(ctx, scroll) {
  const top = PLAY_H
  ctx.save()

  // dirt
  const g = ctx.createLinearGradient(0, top, 0, VIEW_H)
  g.addColorStop(0, '#3b2a55')
  g.addColorStop(0.35, '#2a1c40')
  g.addColorStop(1, '#170f28')
  ctx.fillStyle = g
  ctx.fillRect(0, top, VIEW_W, GROUND_H_H())

  // scrolling hatch
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, top, VIEW_W, GROUND_H_H())
  ctx.clip()
  const step = 26
  const off = (scroll * 0.55) % step
  ctx.strokeStyle = 'rgba(255,255,255,0.045)'
  ctx.lineWidth = 7
  for (let x = -step; x <= VIEW_W + step; x += step) {
    ctx.beginPath()
    ctx.moveTo(x - off, top)
    ctx.lineTo(x - off + 20, VIEW_H)
    ctx.stroke()
  }
  // pebbles
  const pstep = 46
  const poff = (scroll * 0.55) % pstep
  for (let x = -pstep; x <= VIEW_W + pstep; x += pstep) {
    for (let k = 0; k < 3; k++) {
      const px = x - poff + ((k * 17) % pstep)
      const py = top + 26 + ((k * 23) % 40)
      ctx.fillStyle = 'rgba(0,0,0,0.22)'
      ctx.beginPath()
      ctx.ellipse(px, py, 4, 2.4, 0.4, 0, TAU)
      ctx.fill()
    }
  }
  ctx.restore()

  // grass cap
  const gg = ctx.createLinearGradient(0, top - 3, 0, top + 16)
  gg.addColorStop(0, '#5fd07a')
  gg.addColorStop(1, '#2c7d46')
  ctx.fillStyle = gg
  ctx.fillRect(0, top, VIEW_W, 16)
  ctx.fillStyle = '#9dfbb0'
  ctx.fillRect(0, top, VIEW_W, 3)

  // grass blades scrolling
  const bstep = 14
  const boff = (scroll * 0.55) % bstep
  ctx.fillStyle = 'rgba(0,0,0,0.18)'
  for (let x = -bstep; x <= VIEW_W + bstep; x += bstep) {
    ctx.fillRect(x - boff, top + 13, 6, 4)
  }
  ctx.fillStyle = 'rgba(255,255,255,0.25)'
  for (let x = -bstep; x <= VIEW_W + bstep; x += bstep) {
    ctx.fillRect(x - boff + 3, top + 3, 2, 8)
  }

  // horizon glow line
  ctx.fillStyle = 'rgba(255,215,140,0.25)'
  ctx.fillRect(0, top - 1, VIEW_W, 1)

  ctx.restore()
}

function GROUND_H_H() {
  return VIEW_H - PLAY_H
}

/* ═══════════════════════════════════════════════
   PIPE  (body + wider cap; the cap is part of the
   solid shape, so the collision box matches exactly
   what is drawn — no more 80px mismatch)
   ═══════════════════════════════════════════════ */
export function drawPipe(ctx, p) {
  drawPipePart(ctx, p.x, 0, p.gapY, false)
  drawPipePart(ctx, p.x, p.gapY + p.gap, PLAY_H - (p.gapY + p.gap), true)
}

function drawPipePart(ctx, x, y, h, capAtTop = false) {
  if (h <= 0) return
  const capH = Math.min(PIPE_CAP_H, h)
  const bodyH = h - capH

  if (capAtTop) {
    if (bodyH > 0) pipeRect(ctx, x, y + capH, PIPE_W, bodyH, false)
    pipeRect(ctx, x - PIPE_CAP_OVERHANG, y, PIPE_W + PIPE_CAP_OVERHANG * 2, capH, true)
  } else {
    if (bodyH > 0) pipeRect(ctx, x, y, PIPE_W, bodyH, false)
    pipeRect(ctx, x - PIPE_CAP_OVERHANG, y + bodyH, PIPE_W + PIPE_CAP_OVERHANG * 2, capH, true)
  }
}

function pipeRect(ctx, x, y, w, h, isCap) {
  if (h <= 0) return
  const g = ctx.createLinearGradient(x, 0, x + w, 0)
  g.addColorStop(0, '#1d5c2a')
  g.addColorStop(0.18, '#3f9e46')
  g.addColorStop(0.42, '#7ede6a')
  g.addColorStop(0.62, '#4fae4b')
  g.addColorStop(1, '#14401f')
  ctx.fillStyle = g
  ctx.fillRect(x, y, w, h)

  // top rim light
  ctx.fillStyle = 'rgba(255,255,255,0.22)'
  ctx.fillRect(x + 2, y, w - 4, isCap ? 3 : 2)
  // bottom shade
  ctx.fillStyle = 'rgba(0,0,0,0.28)'
  ctx.fillRect(x, y + h - 3, w, 3)
  // outline
  ctx.strokeStyle = '#0b2a13'
  ctx.lineWidth = 2
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2)

  // rivets on the cap
  if (isCap && w > 40 && h > 12) {
    ctx.fillStyle = 'rgba(0,0,0,0.22)'
    for (let i = 0; i < 3; i++) {
      ctx.fillRect(x + 6 + i * ((w - 12) / 2) - 1, y + h / 2 - 1, 2, 2)
    }
  }
}

/* ═══════════════════════════════════════════════
   COIN
   ═══════════════════════════════════════════════ */
export function drawCoin(ctx, x, y, spin, r = COIN_R) {
  const sw = Math.abs(Math.cos(spin))
  const w = Math.max(1.6, r * sw)

  ctx.save()
  ctx.translate(x, y)

  // glow
  const gl = ctx.createRadialGradient(0, 0, 1, 0, 0, r * 2.1)
  gl.addColorStop(0, 'rgba(255,214,102,0.42)')
  gl.addColorStop(1, 'rgba(255,214,102,0)')
  ctx.fillStyle = gl
  ctx.beginPath()
  ctx.arc(0, 0, r * 2.1, 0, TAU)
  ctx.fill()

  // body
  const g = ctx.createLinearGradient(-w, -r, w, r)
  g.addColorStop(0, '#b8860b')
  g.addColorStop(0.45, '#ffe27a')
  g.addColorStop(1, '#c9971b')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.ellipse(0, 0, w, r, 0, 0, TAU)
  ctx.fill()
  ctx.strokeStyle = '#7a5406'
  ctx.lineWidth = 1.6
  ctx.stroke()

  // inner ring + glyph (fades out when edge-on)
  if (sw > 0.35) {
    ctx.globalAlpha = (sw - 0.35) / 0.65
    ctx.strokeStyle = 'rgba(122,84,6,0.8)'
    ctx.lineWidth = 1.4
    ctx.beginPath()
    ctx.ellipse(0, 0, w * 0.62, r * 0.62, 0, 0, TAU)
    ctx.stroke()

    ctx.fillStyle = '#8a5c05'
    ctx.beginPath()
    // little 4-point sparkle
    ctx.moveTo(0, -r * 0.42)
    ctx.lineTo(w * 0.2, -r * 0.1)
    ctx.lineTo(0, r * 0.42)
    ctx.lineTo(-w * 0.2, -r * 0.1)
    ctx.closePath()
    ctx.fill()
    ctx.globalAlpha = 1
  }

  // shine sweep
  ctx.globalAlpha = 0.55
  ctx.fillStyle = '#fffbe6'
  ctx.beginPath()
  ctx.ellipse(-w * 0.35, -r * 0.4, Math.max(0.6, w * 0.16), r * 0.22, -0.5, 0, TAU)
  ctx.fill()
  ctx.restore()
}

/* ═══════════════════════════════════════════════
   THE BAT  — drawn facing RIGHT (+x is forward):
   eyes / snout / near ear on the right, wings swept
   back to the left. Far wing is behind the body,
   near wing in front, both flapping.
   ═══════════════════════════════════════════════ */

/** wing angle for a given time since the last flap */
export function wingAngle(flapT, t) {
  if (flapT < FLAP_WING_TIME) {
    const k = flapT / FLAP_WING_TIME
    const e = 1 - Math.pow(1 - k, 3) // easeOutCubic
    return lerp(WING_UP, WING_DOWN, e)
  }
  return WING_IDLE + Math.sin(t * WING_IDLE_FREQ) * WING_IDLE_AMP
}

/** 1 → 0 squash envelope for the flap pop */
export function squash(flapT) {
  if (flapT >= SQUASH_TIME) return 0
  return 1 - flapT / SQUASH_TIME
}

export function drawBat(ctx, x, y, tilt, flapT, t, opts = {}) {
  const { dead = false, alpha = 1 } = opts
  const sq = dead ? 0 : squash(flapT)
  const near = dead ? -0.6 : wingAngle(flapT, t)
  const far = dead ? -0.75 : wingAngle(flapT + 0.05, t) * 0.7 - 0.12

  ctx.save()
  ctx.globalAlpha = alpha
  ctx.translate(x, y)
  ctx.rotate(tilt)
  ctx.scale(BAT_SCALE, BAT_SCALE)
  ctx.scale(1 + SQUASH_STRETCH_X * sq, 1 - SQUASH_SQUASH_Y * sq)

  // aura
  const glow = ctx.createRadialGradient(2, -2, 3, 0, 0, 40)
  glow.addColorStop(0, 'rgba(255,206,90,0.32)')
  glow.addColorStop(1, 'rgba(255,206,90,0)')
  ctx.fillStyle = glow
  ctx.beginPath()
  ctx.arc(0, 0, 40, 0, TAU)
  ctx.fill()

  // ── far wing, behind everything (sweeps back and up) ──
  drawWing(ctx, -6, -2, far, 0.84, '#4a2a72', '#1d0f38')

  // far ear
  drawEar(ctx, 2, -12, -1.5, -25, 8, -13.5, '#3d2360', '#1d0f38', 1.7)

  // ── body ──
  ctx.save()
  ctx.rotate(-0.14)
  bodyPath(ctx)
  const bg = ctx.createLinearGradient(-14, -13, 10, 11)
  bg.addColorStop(0, '#9163d0')
  bg.addColorStop(0.55, '#6b3fa8')
  bg.addColorStop(1, '#43256b')
  ctx.fillStyle = bg
  ctx.fill()
  ctx.strokeStyle = '#1d0f38'
  ctx.lineWidth = 1.8
  ctx.stroke()
  // belly
  ctx.fillStyle = 'rgba(255,222,160,0.18)'
  ctx.beginPath()
  ctx.ellipse(2, 5, 7, 4.2, -0.2, 0, TAU)
  ctx.fill()
  ctx.restore()

  // ── head ──
  ctx.fillStyle = '#7544b3'
  ctx.beginPath()
  ctx.arc(11, -7, 8.4, 0, TAU)
  ctx.fill()
  ctx.strokeStyle = '#1d0f38'
  ctx.lineWidth = 1.8
  ctx.stroke()

  // muzzle, jutting to the right
  ctx.fillStyle = '#8f5ccd'
  ctx.beginPath()
  ctx.ellipse(18, -4, 3.9, 3.1, -0.22, 0, TAU)
  ctx.fill()
  ctx.strokeStyle = '#1d0f38'
  ctx.lineWidth = 1.5
  ctx.stroke()

  // near ear — the tall one, on the right of the head
  drawEar(ctx, 8, -13.5, 8, -28, 17.5, -15, '#8a5cc9', '#1d0f38', 1.8)

  // eyes: the right-hand eye is larger, which is what sells
  // "facing right" in a 3/4 view
  eye(ctx, 14.6, -9, 3.3, dead)
  eye(ctx, 7, -10, 2.4, dead)

  // nose
  ctx.fillStyle = '#2a1040'
  ctx.beginPath()
  ctx.arc(20, -5, 1.1, 0, TAU)
  ctx.fill()

  // fangs
  if (!dead) {
    ctx.fillStyle = '#fff6d8'
    ctx.beginPath()
    ctx.moveTo(15.2, -1.6)
    ctx.lineTo(16.1, 2.1)
    ctx.lineTo(17, -1.4)
    ctx.closePath()
    ctx.moveTo(18.4, -1.1)
    ctx.lineTo(19.1, 2.3)
    ctx.lineTo(19.9, -0.9)
    ctx.closePath()
    ctx.fill()
  }

  // ── near wing, in front of the body ──
  drawWing(ctx, 0, -3, near, 1, '#8a5cc9', '#2a1448')

  ctx.restore()
}

function bodyPath(ctx) {
  ctx.beginPath()
  ctx.moveTo(-11, 2)
  ctx.bezierCurveTo(-16, -5, -9, -12, 1, -12) // back / shoulders
  ctx.bezierCurveTo(8, -12, 12, -8, 12, -4) // neck
  ctx.bezierCurveTo(15, 0, 13, 8, 6, 10) // chest
  ctx.bezierCurveTo(-2, 12, -10, 9, -11, 2) // belly
  ctx.closePath()
}

function drawWing(ctx, ox, oy, ang, s, fill, edge) {
  ctx.save()
  ctx.translate(ox, oy)
  ctx.rotate(ang) // >0 lifts the tip
  // wings foreshorten slightly at the top of the stroke, like a real
  // membrane seen edge-on — keeps the flap from looking like a hinge
  ctx.scale(s * (1 - WING_FORESHORTEN * Math.max(0, ang)), s)

  // long membrane sweeping back (to -x), scalloped trailing edge
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.quadraticCurveTo(-16, -14, -32, -11) // leading edge → tip
  ctx.quadraticCurveTo(-27, -2, -22.5, 2) // scallops
  ctx.quadraticCurveTo(-18, 8.5, -14, 3)
  ctx.quadraticCurveTo(-9, 9.5, -5.5, 4)
  ctx.quadraticCurveTo(-2.5, 2, 0, 6)
  ctx.closePath()

  const g = ctx.createLinearGradient(-32, -12, 2, 6)
  g.addColorStop(0, fill)
  g.addColorStop(1, edge)
  ctx.fillStyle = g
  ctx.fill()
  ctx.strokeStyle = edge
  ctx.lineWidth = 1.6
  ctx.stroke()

  // finger bones
  ctx.strokeStyle = 'rgba(20,8,40,0.45)'
  ctx.lineWidth = 0.9
  ctx.beginPath()
  for (const [ex, ey] of [
    [-32, -11],
    [-22.5, 2],
    [-14, 3],
    [-5.5, 4],
  ]) {
    ctx.moveTo(0.5, 1)
    ctx.lineTo(ex, ey)
  }
  ctx.stroke()

  ctx.restore()
}

function drawEar(ctx, x0, y0, x1, y1, x2, y2, fill, edge, lw) {
  ctx.beginPath()
  ctx.moveTo(x0, y0)
  ctx.lineTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
  ctx.strokeStyle = edge
  ctx.lineWidth = lw
  ctx.stroke()
  // inner ear
  ctx.beginPath()
  ctx.moveTo(x0 + 1.4, y0 - 0.5)
  ctx.lineTo(x1, y1 + 3.5)
  ctx.lineTo(x2 - 1.2, y2 + 0.2)
  ctx.closePath()
  ctx.fillStyle = 'rgba(255,140,180,0.35)'
  ctx.fill()
}

function eye(ctx, x, y, r, dead) {
  ctx.fillStyle = '#fffaf0'
  ctx.beginPath()
  ctx.ellipse(x, y, r, r * 1.06, 0, 0, TAU)
  ctx.fill()
  if (dead) {
    ctx.strokeStyle = '#2a1040'
    ctx.lineWidth = 1.3
    ctx.beginPath()
    ctx.moveTo(x - r * 0.6, y - r * 0.6)
    ctx.lineTo(x + r * 0.6, y + r * 0.6)
    ctx.moveTo(x + r * 0.6, y - r * 0.6)
    ctx.lineTo(x - r * 0.6, y + r * 0.6)
    ctx.stroke()
    return
  }
  ctx.fillStyle = '#2a1040'
  ctx.beginPath()
  ctx.arc(x + r * 0.25, y, r * 0.52, 0, TAU)
  ctx.fill()
  ctx.fillStyle = '#ffe680'
  ctx.beginPath()
  ctx.arc(x + r * 0.25, y, r * 0.3, 0, TAU)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.beginPath()
  ctx.arc(x + r * 0.62, y - r * 0.45, r * 0.22, 0, TAU)
  ctx.fill()
}

export { BAT_HIT_W }
