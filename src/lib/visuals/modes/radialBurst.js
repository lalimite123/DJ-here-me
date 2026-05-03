import { getBandEnergy, withAlpha } from '../shared.js'

export function drawRadialBurst(ctx, canvas, dataArray, _timeArray, state) {
  const bass = getBandEnergy(dataArray, 0, 0.1)
  const highs = getBandEnergy(dataArray, 0.65, 1)
  const step = state.quality.sampleStep + 1

  const cx = canvas.width / 2
  const cy = canvas.height / 2
  const base = Math.min(cx, cy) * (0.22 + bass * 0.25)

  ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < dataArray.length; i += step) {
    const angle = (i / dataArray.length) * Math.PI * 2
    const val = dataArray[i] / 255
    const spike = base + val * Math.min(cx, cy) * (0.8 + highs * 0.45)

    const x1 = cx + Math.cos(angle) * base
    const y1 = cy + Math.sin(angle) * base
    const x2 = cx + Math.cos(angle) * spike
    const y2 = cy + Math.sin(angle) * spike

    ctx.strokeStyle = withAlpha((state.hue + i * 0.9) % 360, 100, 72, 0.18 + val * 0.85)
    ctx.lineWidth = 1 + val * 4
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()

    if (i % (step * 5) === 0) {
      const petalR = base + val * 35
      ctx.fillStyle = withAlpha((state.hue + i * 0.7 + 180) % 360, 100, 72, 0.08 + val * 0.22)
      ctx.beginPath()
      ctx.arc(
        cx + Math.cos(angle) * petalR,
        cy + Math.sin(angle) * petalR,
        2 + val * 6,
        0,
        Math.PI * 2
      )
      ctx.fill()
    }
  }

  ctx.fillStyle = withAlpha((state.hue + 120) % 360, 100, 68, 0.2 + bass * 0.65)
  ctx.beginPath()
  ctx.arc(cx, cy, 10 + bass * 66, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalCompositeOperation = 'source-over'
}
