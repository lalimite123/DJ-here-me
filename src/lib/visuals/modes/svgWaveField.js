import { getBandEnergy, withAlpha } from '../shared.js'

export function drawSvgWaveField(ctx, canvas, dataArray, _timeArray, state) {
  const bass = getBandEnergy(dataArray, 0, 0.1)
  const mids = getBandEnergy(dataArray, 0.2, 0.5)
  const rows = 8 + state.quality.tier * 2

  ctx.globalCompositeOperation = 'lighter'
  for (let r = 0; r < rows; r++) {
    const yBase = canvas.height * (0.14 + (r / (rows + 1)) * 0.78)
    const amp = 10 + r * 4 + bass * 80
    const freq = 0.01 + r * 0.0012

    ctx.strokeStyle = withAlpha((state.hue + r * 18) % 360, 95, 66, 0.1 + mids * 0.45)
    ctx.lineWidth = 1.1 + mids * 2.8
    ctx.beginPath()
    for (let x = 0; x <= canvas.width; x += 8) {
      const y = yBase + Math.sin(x * freq + state.frame * 0.05 + r) * amp
      if (x === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }
  ctx.globalCompositeOperation = 'source-over'
}
