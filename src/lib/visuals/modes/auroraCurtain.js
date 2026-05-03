import { getBandEnergy, withAlpha } from '../shared.js'

export function drawAuroraCurtain(ctx, canvas, dataArray, timeArray, state) {
  const mids = getBandEnergy(dataArray, 0.15, 0.5)
  const highs = getBandEnergy(dataArray, 0.6, 1)
  const step = state.quality.sampleStep
  const layers = 4 - (state.quality.tier === 0 ? 1 : 0)

  for (let layer = 0; layer < layers; layer++) {
    const hue = (state.hue + layer * 26 + highs * 110) % 360
    const baseY = canvas.height * (0.24 + layer * 0.12)
    const amp = canvas.height * (0.08 + mids * 0.1 + layer * 0.015)

    ctx.beginPath()
    ctx.moveTo(0, canvas.height)

    for (let i = 0; i < timeArray.length; i += step) {
      const t = i / (timeArray.length - 1)
      const x = t * canvas.width
      const sig = (timeArray[i] - 128) / 128
      const y = baseY + Math.sin(t * Math.PI * (2.5 + layer * 0.6) + state.frame * 0.018) * amp + sig * amp * 0.5
      ctx.lineTo(x, y)
    }

    ctx.lineTo(canvas.width, canvas.height)
    ctx.closePath()

    const g = ctx.createLinearGradient(0, baseY - amp, 0, canvas.height)
    g.addColorStop(0, withAlpha(hue, 100, 70, 0.32 - layer * 0.04))
    g.addColorStop(1, withAlpha((hue + 80) % 360, 100, 20, 0.02))
    ctx.fillStyle = g
    ctx.fill()
  }
}
