import { getBandEnergy, withAlpha } from '../shared.js'

export function drawMatrixColumns(ctx, canvas, dataArray, _timeArray, state) {
  const highs = getBandEnergy(dataArray, 0.6, 1)
  const bass = getBandEnergy(dataArray, 0, 0.12)
  const columns = 18 + state.quality.tier * 8
  const colWidth = canvas.width / columns

  for (let c = 0; c < columns; c++) {
    const idx = (c * 5) % dataArray.length
    const val = dataArray[idx] / 255
    const speed = 1 + val * 8 + highs * 3
    const trail = canvas.height * (0.08 + val * 0.5)
    const y = ((state.frame * speed + c * 30) % (canvas.height + trail)) - trail

    const hue = (state.hue + 120 + c * 1.5) % 360
    const g = ctx.createLinearGradient(0, y, 0, y + trail)
    g.addColorStop(0, withAlpha(hue, 100, 78, 0.78))
    g.addColorStop(1, withAlpha(hue, 100, 24, 0.02))

    ctx.fillStyle = g
    ctx.fillRect(c * colWidth, y, Math.max(2, colWidth - 2), trail)
  }

  const pulseY = canvas.height * (0.9 - bass * 0.25)
  ctx.strokeStyle = withAlpha((state.hue + 150) % 360, 100, 72, 0.32)
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.moveTo(0, pulseY)
  ctx.lineTo(canvas.width, pulseY)
  ctx.stroke()
}
