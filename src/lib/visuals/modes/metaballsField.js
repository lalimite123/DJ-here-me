import { ensureCache, getBandEnergy, withAlpha } from '../shared.js'

export function drawMetaballsField(ctx, canvas, dataArray, _timeArray, state) {
  const cache = ensureCache(state, 'metaballsField', () => ({ balls: [] }))
  const target = 12 + state.quality.tier * 5
  const bass = getBandEnergy(dataArray, 0, 0.1)

  while (cache.balls.length < target) {
    cache.balls.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 1.5,
      vy: (Math.random() - 0.5) * 1.5,
      r: 28 + Math.random() * 50
    })
  }
  if (cache.balls.length > target) cache.balls.length = target

  ctx.globalCompositeOperation = 'lighter'
  cache.balls.forEach((b, i) => {
    b.x += b.vx * (1 + bass * 2)
    b.y += b.vy * (1 + bass * 2)
    if (b.x < -b.r) b.x = canvas.width + b.r
    if (b.x > canvas.width + b.r) b.x = -b.r
    if (b.y < -b.r) b.y = canvas.height + b.r
    if (b.y > canvas.height + b.r) b.y = -b.r

    const hue = (state.hue + i * 22) % 360
    const grad = ctx.createRadialGradient(b.x, b.y, b.r * 0.1, b.x, b.y, b.r * (1.1 + bass * 0.4))
    grad.addColorStop(0, withAlpha(hue, 100, 72, 0.5))
    grad.addColorStop(1, withAlpha(hue, 100, 58, 0))
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.arc(b.x, b.y, b.r * (1 + bass * 0.25), 0, Math.PI * 2)
    ctx.fill()
  })
  ctx.globalCompositeOperation = 'source-over'
}
