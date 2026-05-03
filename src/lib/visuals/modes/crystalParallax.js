import { getBandEnergy, withAlpha } from '../shared.js'

export function drawCrystalParallax(ctx, canvas, dataArray, _timeArray, state) {
  const mids = getBandEnergy(dataArray, 0.2, 0.5)
  const highs = getBandEnergy(dataArray, 0.58, 1)
  const layers = 4

  ctx.globalCompositeOperation = 'lighter'
  for (let l = 0; l < layers; l++) {
    const depth = 1 + l * 0.55
    const speed = 0.4 + depth * 0.3
    const count = 12 + l * 6
    for (let i = 0; i < count; i++) {
      const p = (i / count) * canvas.width
      const x = (p + state.frame * speed * depth) % (canvas.width + 120) - 60
      const y = (canvas.height * (0.18 + l * 0.18)) + Math.sin(state.frame * 0.01 + i) * 22
      const size = 14 + highs * 36 + l * 5
      const hue = (state.hue + 180 + l * 18 + i * 3) % 360

      ctx.fillStyle = withAlpha(hue, 86, 72, 0.08 + mids * 0.24)
      ctx.beginPath()
      ctx.moveTo(x, y - size)
      ctx.lineTo(x + size * 0.62, y)
      ctx.lineTo(x, y + size)
      ctx.lineTo(x - size * 0.62, y)
      ctx.closePath()
      ctx.fill()
    }
  }
  ctx.globalCompositeOperation = 'source-over'
}
