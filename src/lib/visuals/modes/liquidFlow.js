import { ensureCache, getBandEnergy, withAlpha } from '../shared.js'

export function drawLiquidFlow(ctx, canvas, dataArray, timeArray, state) {
  const cache = ensureCache(state, 'liquidFlow', () => ({ offset: 0 }))
  const bass = getBandEnergy(dataArray, 0, 0.1)
  const mids = getBandEnergy(dataArray, 0.15, 0.45)
  cache.offset += 0.006 + bass * 0.03

  const bands = 5 + state.quality.tier
  ctx.globalCompositeOperation = 'lighter'
  for (let b = 0; b < bands; b++) {
    const yBase = canvas.height * (0.2 + (b / (bands + 1)) * 0.7)
    const amp = 26 + mids * 90 + b * 6
    const hue = (state.hue + b * 28) % 360

    ctx.beginPath()
    ctx.moveTo(0, yBase)
    for (let x = 0; x <= canvas.width; x += 10) {
      const idx = (Math.floor((x / canvas.width) * (timeArray.length - 1)) + b * 5) % timeArray.length
      const wave = timeArray[idx] / 128 - 1
      const y = yBase + Math.sin(x * 0.01 + cache.offset * (2 + b * 0.2)) * amp * 0.45 + wave * amp
      ctx.lineTo(x, y)
    }
    ctx.lineTo(canvas.width, canvas.height)
    ctx.lineTo(0, canvas.height)
    ctx.closePath()
    ctx.fillStyle = withAlpha(hue, 95, 58, 0.1 + bass * 0.22)
    ctx.fill()
  }
  ctx.globalCompositeOperation = 'source-over'
}
