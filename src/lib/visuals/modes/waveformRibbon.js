import { getBandEnergy, withAlpha } from '../shared.js'

export function drawWaveformRibbon(ctx, canvas, _dataArray, timeArray, state) {
  const mids = getBandEnergy(timeArray, 0.2, 0.7)
  const centerY = canvas.height / 2
  const step = state.quality.sampleStep
  const layers = 3 + state.quality.tier

  for (let layer = 0; layer < layers; layer++) {
    const amp = canvas.height * (0.13 + layer * 0.06 + mids * 0.08)
    const phase = state.frame * 0.012 + layer * 1.2
    const hue = (state.hue + layer * 38) % 360

    ctx.beginPath()
    ctx.lineWidth = 1.8 + layer * 0.8
    ctx.strokeStyle = withAlpha(hue, 100, 70, 0.72 - layer * 0.1)

    for (let i = 0; i < timeArray.length; i += step) {
      const t = i / (timeArray.length - 1)
      const x = t * canvas.width
      const v = (timeArray[i] - 128) / 128
      const y = centerY + Math.sin(t * Math.PI * (3 + layer) + phase) * 25 + v * amp
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }

    ctx.stroke()

    ctx.beginPath()
    ctx.lineWidth = 0.7
    ctx.strokeStyle = withAlpha((hue + 140) % 360, 100, 82, 0.22)
    for (let i = 0; i < timeArray.length; i += step * 2) {
      const t = i / (timeArray.length - 1)
      const x = t * canvas.width
      const v = (timeArray[i] - 128) / 128
      const y = centerY - Math.sin(t * Math.PI * (3 + layer) + phase) * 18 - v * amp * 0.42
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }
    ctx.stroke()
  }

  ctx.fillStyle = withAlpha((state.hue + 80) % 360, 100, 72, 0.08 + mids * 0.15)
  ctx.fillRect(0, centerY - 28, canvas.width, 56)
}
