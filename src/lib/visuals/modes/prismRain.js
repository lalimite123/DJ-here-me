import { getBandEnergy, withAlpha } from '../shared.js'

export function drawPrismRain(ctx, canvas, dataArray, _timeArray, state) {
  const highs = getBandEnergy(dataArray, 0.6, 1)
  const mids = getBandEnergy(dataArray, 0.2, 0.5)
  const count = 36 + state.quality.tier * 18

  ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < count; i++) {
    const ratio = i / count
    const band = dataArray[(i * 3) % dataArray.length] / 255
    const speed = 1.2 + band * 9 + highs * 2
    const y = ((state.frame * speed + i * 25) % (canvas.height + 80)) - 80
    const x = (ratio * canvas.width + Math.sin(state.frame * 0.01 + i) * 20) % canvas.width
    const w = 8 + band * 18
    const h = 26 + mids * 50 + band * 20
    const hue = (state.hue + i * 7 + highs * 90) % 360

    ctx.fillStyle = withAlpha(hue, 100, 72, 0.18 + band * 0.65)
    ctx.beginPath()
    ctx.moveTo(x, y)
    ctx.lineTo(x + w, y + h * 0.25)
    ctx.lineTo(x + w * 0.45, y + h)
    ctx.lineTo(x - w * 0.4, y + h * 0.72)
    ctx.closePath()
    ctx.fill()
  }
  ctx.globalCompositeOperation = 'source-over'
}
