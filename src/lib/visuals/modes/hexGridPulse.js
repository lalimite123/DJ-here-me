import { getBandEnergy, withAlpha } from '../shared.js'

export function drawHexGridPulse(ctx, canvas, dataArray, _timeArray, state) {
  const mids = getBandEnergy(dataArray, 0.2, 0.6)
  const highs = getBandEnergy(dataArray, 0.6, 1)
  const size = 34 - state.quality.tier * 6
  const h = size * 0.866
  const cols = Math.ceil(canvas.width / (size * 1.5)) + 2
  const rows = Math.ceil(canvas.height / (h * 2)) + 2
  const stride = state.quality.tier === 0 ? 2 : 1

  ctx.globalCompositeOperation = 'lighter'
  for (let row = 0; row < rows; row += stride) {
    for (let col = 0; col < cols; col += stride) {
      const x = col * size * 1.5 + ((row % 2) * size * 0.75)
      const y = row * h
      const idx = (row * cols + col) % dataArray.length
      const val = dataArray[idx] / 255
      const pulse = 0.5 + Math.sin(state.frame * 0.03 + row * 0.5 + col * 0.2) * 0.5
      const alpha = 0.04 + val * 0.18 + highs * 0.12
      const r = size * (0.75 + val * 0.4 + mids * 0.2)

      ctx.strokeStyle = withAlpha((state.hue + row * 6 + col * 3) % 360, 88, 62, alpha)
      ctx.lineWidth = 1 + pulse * 0.8
      ctx.beginPath()
      for (let i = 0; i < 6; i++) {
        const a = (Math.PI / 3) * i
        const px = x + Math.cos(a) * r
        const py = y + Math.sin(a) * r
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.stroke()
    }
  }
  ctx.globalCompositeOperation = 'source-over'
}
