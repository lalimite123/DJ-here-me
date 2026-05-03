import { getBandEnergy, withAlpha } from '../shared.js'

export function drawVortexTunnel(ctx, canvas, dataArray, _timeArray, state) {
  const bass = getBandEnergy(dataArray, 0, 0.1)
  const mids = getBandEnergy(dataArray, 0.12, 0.45)
  const step = state.quality.sampleStep

  const cx = canvas.width / 2
  const cy = canvas.height / 2
  const maxRadius = Math.min(cx, cy) * (0.86 + bass * 0.2)

  ctx.beginPath()
  ctx.lineWidth = 2.2
  ctx.strokeStyle = withAlpha((state.hue + 90) % 360, 100, 65, 0.72)

  for (let i = 0; i < dataArray.length; i += step) {
    const ratio = i / dataArray.length
    const spin = state.frame * (0.012 + bass * 0.05)
    const angle = ratio * Math.PI * (8 + mids * 7) + spin
    const radius = ratio * maxRadius + (dataArray[i] / 255) * 70
    const x = cx + Math.cos(angle) * radius
    const y = cy + Math.sin(angle) * radius
    if (i === 0) ctx.moveTo(x, y)
    else ctx.lineTo(x, y)
  }

  ctx.stroke()

  for (let i = 0; i < dataArray.length; i += step * 10) {
    const ratio = i / dataArray.length
    const angle = ratio * Math.PI * (10 + mids * 8) + state.frame * 0.018
    const depth = ratio * maxRadius * 0.9
    const x = cx + Math.cos(angle) * depth
    const y = cy + Math.sin(angle) * depth
    const size = 1 + (1 - ratio) * 4
    const val = dataArray[i] / 255

    ctx.fillStyle = withAlpha((state.hue + 220 + i * 0.5) % 360, 100, 76, 0.1 + val * 0.45)
    ctx.beginPath()
    ctx.arc(x, y, size, 0, Math.PI * 2)
    ctx.fill()
  }
}
