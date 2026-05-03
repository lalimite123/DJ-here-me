import { ensureCache, getBandEnergy, withAlpha } from '../shared.js'

export function drawParticlesWave(ctx, canvas, dataArray, timeArray, state) {
  const cache = ensureCache(state, 'particlesWave', () => ({ particles: [], ripples: [] }))
  const targetCount = state.quality.particleBudget

  if (cache.particles.length < targetCount) {
    for (let i = cache.particles.length; i < targetCount; i++) {
      cache.particles.push({
        x: Math.random() * canvas.width,
        y: Math.random() * canvas.height,
        vx: (Math.random() - 0.5) * 1.2,
        vy: (Math.random() - 0.5) * 1.2,
        size: Math.random() * 2.8 + 0.8,
        seed: Math.random()
      })
    }
  } else if (cache.particles.length > targetCount) {
    cache.particles.length = targetCount
  }

  const bass = getBandEnergy(dataArray, 0, 0.08)
  const mids = getBandEnergy(dataArray, 0.12, 0.45)

  const cx = canvas.width / 2
  const cy = canvas.height / 2

  ctx.globalCompositeOperation = 'lighter'
  cache.particles.forEach((p, idx) => {
    const pull = 0.001 + bass * 0.018
    p.vx += (cx - p.x) * pull * (0.3 + p.seed)
    p.vy += (cy - p.y) * pull * (0.3 + p.seed)

    p.x += p.vx + Math.sin(state.frame * 0.018 + idx) * 0.3
    p.y += p.vy + Math.cos(state.frame * 0.015 + idx) * 0.3

    p.vx *= 0.965
    p.vy *= 0.965

    if (p.x < -30 || p.x > canvas.width + 30 || p.y < -30 || p.y > canvas.height + 30) {
      p.x = Math.random() * canvas.width
      p.y = Math.random() * canvas.height
      p.vx = (Math.random() - 0.5) * 2.4
      p.vy = (Math.random() - 0.5) * 2.4
    }

    const hue = (state.hue + idx * 0.35) % 360
    ctx.fillStyle = withAlpha(hue, 100, 60, 0.18 + mids * 0.55)
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.size + bass * 4, 0, Math.PI * 2)
    ctx.fill()

    if (idx % (state.quality.sampleStep * 5) === 0) {
      const next = cache.particles[(idx + 9) % cache.particles.length]
      ctx.strokeStyle = withAlpha((hue + 30) % 360, 100, 64, 0.08 + mids * 0.12)
      ctx.lineWidth = 0.8
      ctx.beginPath()
      ctx.moveTo(p.x, p.y)
      ctx.lineTo(next.x, next.y)
      ctx.stroke()
    }
  })

  const step = state.quality.sampleStep
  const sliceWidth = canvas.width / Math.ceil(timeArray.length / step)
  ctx.lineWidth = 2.4 + bass * 5
  ctx.strokeStyle = withAlpha((state.hue + 55) % 360, 100, 68, 0.9)
  ctx.beginPath()

  for (let i = 0, drawIndex = 0; i < timeArray.length; i += step, drawIndex++) {
    const v = timeArray[i] / 128 - 1
    const y = cy + v * (canvas.height * (0.22 + mids * 0.18))
    const drawX = drawIndex * sliceWidth

    if (i === 0) ctx.moveTo(drawX, y)
    else ctx.lineTo(drawX, y)

    if (i % 18 === 0 && Math.random() > 0.6) {
      cache.ripples.push({ x: drawX, y, r: 4, life: 1 })
    }
  }
  ctx.stroke()

  cache.ripples.forEach((r) => {
    r.r += 3 + bass * 5
    r.life -= 0.024
    ctx.strokeStyle = withAlpha((state.hue + 90) % 360, 100, 72, r.life)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.arc(r.x, r.y, r.r, 0, Math.PI * 2)
    ctx.stroke()
  })
  cache.ripples = cache.ripples.filter((r) => r.life > 0)
  ctx.globalCompositeOperation = 'source-over'
}
