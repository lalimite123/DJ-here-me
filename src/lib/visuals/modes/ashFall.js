import { ensureCache, getBandEnergy, withAlpha } from '../shared.js'

export function drawAshFall(ctx, canvas, dataArray, _timeArray, state) {
  const cache = ensureCache(state, 'ashFall', () => ({ ash: [] }))
  const target = 90 + state.quality.tier * 50
  const highs = getBandEnergy(dataArray, 0.55, 1)

  while (cache.ash.length < target) {
    cache.ash.push({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.45,
      vy: 0.4 + Math.random() * 1.4,
      r: Math.random() * 2 + 0.6
    })
  }
  if (cache.ash.length > target) cache.ash.length = target

  ctx.globalCompositeOperation = 'lighter'
  cache.ash.forEach((p, i) => {
    p.x += p.vx + Math.sin((state.frame + i) * 0.02) * 0.2
    p.y += p.vy + highs * 1.2

    if (p.y > canvas.height + 8) {
      p.y = -10
      p.x = Math.random() * canvas.width
    }

    ctx.fillStyle = withAlpha((state.hue + 12) % 360, 12, 85, 0.07 + highs * 0.32)
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.r + highs * 1.3, 0, Math.PI * 2)
    ctx.fill()
  })
  ctx.globalCompositeOperation = 'source-over'
}
