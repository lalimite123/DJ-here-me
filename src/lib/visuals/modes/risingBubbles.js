import { ensureCache, getBandEnergy, withAlpha } from '../shared.js'

export function drawRisingBubbles(ctx, canvas, dataArray, _timeArray, state) {
  const cache = ensureCache(state, 'risingBubbles', () => ({ bubbles: [] }))
  const target = 55 + state.quality.tier * 30
  const bass = getBandEnergy(dataArray, 0, 0.1)

  while (cache.bubbles.length < target) {
    cache.bubbles.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: 3 + Math.random() * 14,
      speed: 0.8 + Math.random() * 1.8,
      drift: (Math.random() - 0.5) * 0.7
    })
  }
  if (cache.bubbles.length > target) cache.bubbles.length = target

  ctx.globalCompositeOperation = 'lighter'
  cache.bubbles.forEach((b, i) => {
    b.y -= b.speed + bass * 3
    b.x += Math.sin(state.frame * 0.02 + i) * b.drift
    if (b.y < -30) {
      b.y = canvas.height + 24
      b.x = Math.random() * canvas.width
    }

    const hue = (state.hue + 180 + i * 2.6) % 360
    ctx.strokeStyle = withAlpha(hue, 96, 74, 0.2 + bass * 0.45)
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.arc(b.x, b.y, b.r * (1 + bass * 0.25), 0, Math.PI * 2)
    ctx.stroke()
  })
  ctx.globalCompositeOperation = 'source-over'
}
