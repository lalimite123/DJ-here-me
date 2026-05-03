import { ensureCache, getBandEnergy, withAlpha } from '../shared.js'

export function drawNeonTubeTrail(ctx, canvas, dataArray, _timeArray, state) {
  const cache = ensureCache(state, 'neonTubeTrail', () => ({
    path: Array.from({ length: 42 }, () => ({ x: canvas.width / 2, y: canvas.height / 2 }))
  }))
  const mids = getBandEnergy(dataArray, 0.2, 0.55)

  const t = state.frame * (0.02 + mids * 0.02)
  const x = canvas.width / 2 + Math.cos(t * 0.9) * canvas.width * (0.24 + mids * 0.18)
  const y = canvas.height / 2 + Math.sin(t * 1.3) * canvas.height * (0.2 + mids * 0.16)

  cache.path.unshift({ x, y })
  if (cache.path.length > 56) cache.path.pop()

  ctx.globalCompositeOperation = 'lighter'
  for (let i = 1; i < cache.path.length; i++) {
    const p0 = cache.path[i - 1]
    const p1 = cache.path[i]
    const alpha = 1 - i / cache.path.length
    ctx.strokeStyle = withAlpha((state.hue + i * 5) % 360, 100, 65, alpha * (0.16 + mids * 0.65))
    ctx.lineWidth = (1 - i / cache.path.length) * (16 + mids * 22)
    ctx.beginPath()
    ctx.moveTo(p0.x, p0.y)
    ctx.lineTo(p1.x, p1.y)
    ctx.stroke()
  }
  ctx.globalCompositeOperation = 'source-over'
}
