import { getBandEnergy, withAlpha } from '../shared.js'

export function drawStarburstNova(ctx, canvas, dataArray, _timeArray, state) {
  const bass = getBandEnergy(dataArray, 0, 0.1)
  const highs = getBandEnergy(dataArray, 0.6, 1)

  const cx = canvas.width / 2
  const cy = canvas.height / 2
  const radius = Math.min(cx, cy) * (0.88 + bass * 0.25)

  const step = state.quality.sampleStep + 1
  ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < dataArray.length; i += step) {
    const val = dataArray[i] / 255
    const angle = (i / dataArray.length) * Math.PI * 2 + state.frame * 0.005
    const inner = 18 + bass * 40
    const outer = inner + radius * (0.22 + val * 0.95)
    const tail = outer + 20 + val * 90

    const x1 = cx + Math.cos(angle) * inner
    const y1 = cy + Math.sin(angle) * inner
    const x2 = cx + Math.cos(angle) * outer
    const y2 = cy + Math.sin(angle) * outer

    ctx.strokeStyle = withAlpha((state.hue + i * 1.1 + highs * 80) % 360, 100, 70, 0.2 + val * 0.82)
    ctx.lineWidth = 1 + val * 3.8
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.lineTo(x2, y2)
    ctx.stroke()

    if (i % (step * 6) === 0) {
      const x3 = cx + Math.cos(angle) * tail
      const y3 = cy + Math.sin(angle) * tail
      ctx.strokeStyle = withAlpha((state.hue + 300 + i * 0.5) % 360, 100, 78, 0.1 + val * 0.4)
      ctx.lineWidth = 0.8 + val * 2.4
      ctx.beginPath()
      ctx.moveTo(x2, y2)
      ctx.lineTo(x3, y3)
      ctx.stroke()
    }
  }

  const glow = 18 + bass * 90
  const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, glow)
  g.addColorStop(0, withAlpha((state.hue + 140) % 360, 100, 70, 0.62))
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(cx, cy, glow, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalCompositeOperation = 'source-over'
}
