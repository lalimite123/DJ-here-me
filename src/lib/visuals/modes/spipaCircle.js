import { getBandEnergy, withAlpha } from '../shared.js'

export function drawSpipaCircle(ctx, canvas, dataArray, _timeArray, state) {
  const bass = getBandEnergy(dataArray, 0, 0.12)
  const mids = getBandEnergy(dataArray, 0.2, 0.55)
  const cx = canvas.width / 2
  const cy = canvas.height / 2
  const loops = 2 + state.quality.tier
  const points = 120 + state.quality.tier * 60

  ctx.globalCompositeOperation = 'lighter'
  for (let l = 0; l < loops; l++) {
    const baseR = Math.min(canvas.width, canvas.height) * (0.14 + l * 0.07)
    const aMul = 3 + l
    const bMul = 5 + l

    ctx.strokeStyle = withAlpha((state.hue + l * 36) % 360, 92, 64, 0.22 + mids * 0.34)
    ctx.lineWidth = 1.2 + bass * 2
    ctx.beginPath()
    for (let i = 0; i <= points; i++) {
      const t = (i / points) * Math.PI * 2
      const r = baseR + Math.sin(t * bMul + state.frame * 0.03) * (22 + bass * 70)
      const x = cx + Math.cos(t * aMul + state.frame * 0.008) * r
      const y = cy + Math.sin(t * bMul) * r * (0.72 + mids * 0.2)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  ctx.globalCompositeOperation = 'source-over'
}
