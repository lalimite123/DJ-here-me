import { ensureCache, getBandEnergy, withAlpha } from '../shared.js'

export function drawRymdField(ctx, canvas, dataArray, _timeArray, state) {
  const cache = ensureCache(state, 'rymdField', () => ({ stars: [] }))
  const target = 120 + state.quality.tier * 80
  const bass = getBandEnergy(dataArray, 0, 0.12)

  while (cache.stars.length < target) {
    cache.stars.push({ x: Math.random() * canvas.width, y: Math.random() * canvas.height, z: Math.random() })
  }
  if (cache.stars.length > target) cache.stars.length = target

  const cx = canvas.width / 2
  const cy = canvas.height / 2
  ctx.globalCompositeOperation = 'lighter'
  cache.stars.forEach((s, i) => {
    s.z += 0.003 + bass * 0.03
    if (s.z > 1) {
      s.z = 0.01
      s.x = Math.random() * canvas.width
      s.y = Math.random() * canvas.height
    }

    const dx = (s.x - cx) * s.z * 1.8
    const dy = (s.y - cy) * s.z * 1.8
    const px = cx + dx
    const py = cy + dy
    const r = 0.4 + s.z * 2.6

    ctx.fillStyle = withAlpha((state.hue + i * 0.4) % 360, 90, 72, 0.3 + s.z * 0.6)
    ctx.beginPath()
    ctx.arc(px, py, r, 0, Math.PI * 2)
    ctx.fill()
  })
  ctx.globalCompositeOperation = 'source-over'
}
