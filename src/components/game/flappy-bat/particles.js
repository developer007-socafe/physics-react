/* ═══════════════════════════════════════════════
   Particles — coin sparkles, flap dust, death poof
   Plain array of tiny records, no allocation pooling
   (counts stay in the low hundreds).
   ═══════════════════════════════════════════════ */

const TAU = Math.PI * 2
const rand = (a, b) => a + Math.random() * (b - a)

export function burst(list, x, y, count, opts = {}) {
  const {
    colors = ['#ffe680', '#ffc93c', '#fff6d8'],
    speed = 120,
    size = 3,
    life = 0.55,
    gravity = 340,
    spread = TAU,
    dir = 0,
  } = opts
  for (let i = 0; i < count; i++) {
    const a = dir + rand(-spread / 2, spread / 2)
    const v = speed * rand(0.35, 1)
    list.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v,
      life: life * rand(0.7, 1.15),
      max: life,
      size: size * rand(0.6, 1.3),
      color: colors[(Math.random() * colors.length) | 0],
      gravity,
    })
  }
}

export function dust(list, x, y, dirX, count = 4) {
  for (let i = 0; i < count; i++) {
    const a = rand(-0.9, 0.9)
    const v = rand(20, 70)
    list.push({
      x: x + rand(-4, 4),
      y: y + rand(-4, 4),
      vx: Math.cos(a) * v - dirX * 30,
      vy: Math.sin(a) * v,
      life: rand(0.22, 0.4),
      max: 0.4,
      size: rand(1.5, 3),
      color: 'rgba(210,180,255,0.85)',
      gravity: 120,
    })
  }
}

export function updateParticles(list, dt) {
  for (let i = list.length - 1; i >= 0; i--) {
    const p = list[i]
    p.life -= dt
    if (p.life <= 0) {
      list.splice(i, 1)
      continue
    }
    p.vy += p.gravity * dt
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.vx *= 1 - 1.6 * dt
  }
}

export function drawParticles(ctx, list) {
  for (const p of list) {
    const k = Math.max(0, p.life / p.max)
    ctx.globalAlpha = Math.min(1, k * 1.4)
    ctx.fillStyle = p.color
    const s = p.size * (0.4 + k * 0.8)
    ctx.fillRect(p.x - s / 2, p.y - s / 2, s, s)
  }
  ctx.globalAlpha = 1
}
