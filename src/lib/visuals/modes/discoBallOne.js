import { ensureCache, getBandEnergy, withAlpha } from '../shared.js'

function createParticles(count, width, height) {
  return Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    z: 0.4 + Math.random() * 0.9,
    speed: 0.2 + Math.random() * 0.55,
    hueOffset: Math.random() * 160
  }))
}

function drawMirrorTiles(ctx, cx, cy, radius, frame, bass, highs, beat) {
  const rings = 15
  const baseAngle = frame * 0.014 + beat * 0.12
  for (let ring = 0; ring < rings; ring++) {
    const ratio = (ring + 0.5) / rings
    const ringRadius = ratio * radius
    const yScale = 0.78
    const segments = Math.max(8, Math.round(10 + ratio * 30))
    for (let i = 0; i < segments; i++) {
      const a = (i / segments) * Math.PI * 2 + baseAngle + ring * 0.03
      const nextA = a + (Math.PI * 2) / segments * 0.8
      const x1 = cx + Math.cos(a) * ringRadius
      const y1 = cy + Math.sin(a) * ringRadius * yScale
      const x2 = cx + Math.cos(nextA) * ringRadius
      const y2 = cy + Math.sin(nextA) * ringRadius * yScale
      const inward = radius * 0.07
      const x3 = cx + Math.cos(nextA) * Math.max(0, ringRadius - inward)
      const y3 = cy + Math.sin(nextA) * Math.max(0, ringRadius - inward) * yScale
      const x4 = cx + Math.cos(a) * Math.max(0, ringRadius - inward)
      const y4 = cy + Math.sin(a) * Math.max(0, ringRadius - inward) * yScale

      const sparkle = Math.sin(frame * 0.03 + ring * 0.61 + i * 0.37) * 0.5 + 0.5
      const light = 68 + sparkle * 18 + highs * 8
      const alpha = 0.18 + bass * 0.44 + beat * 0.22
      const hue = (frame * 0.7 + ring * 8 + i * 4 + highs * 80) % 360

      ctx.fillStyle = withAlpha(hue, 96, light, Math.min(0.95, alpha))
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.lineTo(x2, y2)
      ctx.lineTo(x3, y3)
      ctx.lineTo(x4, y4)
      ctx.closePath()
      ctx.fill()
    }
  }
}

export function drawDiscoBallOne(ctx, canvas, dataArray, _timeArray, state) {
  const bass = getBandEnergy(dataArray, 0, 0.12)
  const mids = getBandEnergy(dataArray, 0.14, 0.56)
  const highs = getBandEnergy(dataArray, 0.58, 1)
  const beat = state.audio?.beat || 0

  const cx = canvas.width * 0.5
  const cy = canvas.height * 0.35
  const radius = Math.min(canvas.width, canvas.height) * (0.17 + bass * 0.05 + beat * 0.03)

  const cacheKey = `disco-one-${state.quality.tier}`
  const particles = ensureCache(state, cacheKey, () =>
    createParticles(56 + state.quality.tier * 32, canvas.width, canvas.height)
  )

  ctx.globalCompositeOperation = 'lighter'

  // Rotating rays around the disco ball.
  const rayCount = 12 + state.quality.tier * 4
  for (let i = 0; i < rayCount; i++) {
    const angle = (i / rayCount) * Math.PI * 2 + state.frame * (0.005 + bass * 0.03)
    const beamLen = Math.min(canvas.width, canvas.height) * (0.4 + highs * 0.4 + beat * 0.15)
    const sx = cx + Math.cos(angle) * radius * 0.8
    const sy = cy + Math.sin(angle) * radius * 0.62
    const ex = sx + Math.cos(angle) * beamLen
    const ey = sy + Math.sin(angle) * beamLen
    const grad = ctx.createLinearGradient(sx, sy, ex, ey)
    const hue = (state.hue + i * 24 + highs * 120) % 360
    grad.addColorStop(0, withAlpha(hue, 100, 72, 0.34 + bass * 0.35 + beat * 0.2))
    grad.addColorStop(1, withAlpha((hue + 50) % 360, 100, 60, 0))
    ctx.strokeStyle = grad
    ctx.lineWidth = 1 + bass * 2 + beat * 1.4
    ctx.beginPath()
    ctx.moveTo(sx, sy)
    ctx.lineTo(ex, ey)
    ctx.stroke()
  }

  drawMirrorTiles(ctx, cx, cy, radius, state.frame, bass, highs, beat)

  const coreGlow = ctx.createRadialGradient(cx, cy, radius * 0.05, cx, cy, radius * 1.35)
  coreGlow.addColorStop(0, withAlpha((state.hue + 160) % 360, 100, 84, 0.82))
  coreGlow.addColorStop(1, withAlpha((state.hue + 260) % 360, 100, 58, 0))
  ctx.fillStyle = coreGlow
  ctx.beginPath()
  ctx.arc(cx, cy, radius * 1.35, 0, Math.PI * 2)
  ctx.fill()

  for (let i = 0; i < particles.length; i++) {
    const p = particles[i]
    p.y += p.speed * (1 + bass * 4 + beat * 2)
    p.x += Math.sin(state.frame * 0.015 + i) * 0.3

    if (p.y > canvas.height + 10) {
      p.y = -10
      p.x = Math.random() * canvas.width
    }

    const alpha = Math.min(0.95, 0.18 + mids * 0.5 + beat * 0.25)
    const hue = (state.hue + p.hueOffset + i * 3) % 360
    ctx.fillStyle = withAlpha(hue, 100, 74, alpha)
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.z * (1.8 + highs * 2.2), 0, Math.PI * 2)
    ctx.fill()
  }

  ctx.globalCompositeOperation = 'source-over'
}
