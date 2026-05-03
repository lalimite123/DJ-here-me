import { getBandEnergy, withAlpha } from '../shared.js'

export function drawFractalWeb(ctx, canvas, dataArray, _timeArray, state) {
  const bass = getBandEnergy(dataArray, 0, 0.1)
  const mids = getBandEnergy(dataArray, 0.15, 0.45)
  const cx = canvas.width / 2
  const cy = canvas.height / 2
  const rings = 5 + state.quality.tier
  const spokes = 22 - state.quality.sampleStep * 5

  ctx.globalCompositeOperation = 'lighter'
  for (let r = 1; r <= rings; r++) {
    const radius = (r / rings) * Math.min(cx, cy) * (0.85 + bass * 0.2)
    const hue = (state.hue + r * 20) % 360

    ctx.strokeStyle = withAlpha(hue, 100, 66, 0.14 + mids * 0.36)
    ctx.lineWidth = 1 + (rings - r) * 0.2
    ctx.beginPath()
    for (let s = 0; s <= spokes; s++) {
      const angle = (s / spokes) * Math.PI * 2 + state.frame * 0.004 * r
      const pulse = dataArray[(s * 3) % dataArray.length] / 255
      const rr = radius + pulse * 22
      const x = cx + Math.cos(angle) * rr
      const y = cy + Math.sin(angle) * rr
      if (s === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.closePath()
    ctx.stroke()
  }

  for (let s = 0; s < spokes; s += 2) {
    const angle = (s / spokes) * Math.PI * 2 + state.frame * 0.003
    const x = cx + Math.cos(angle) * Math.min(cx, cy) * 0.9
    const y = cy + Math.sin(angle) * Math.min(cx, cy) * 0.9
    ctx.strokeStyle = withAlpha((state.hue + s * 4 + 90) % 360, 100, 72, 0.1 + bass * 0.26)
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.lineTo(x, y)
    ctx.stroke()
  }
  ctx.globalCompositeOperation = 'source-over'
}
