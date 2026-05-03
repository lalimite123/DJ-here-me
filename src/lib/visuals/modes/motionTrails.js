import { getBandEnergy, withAlpha } from '../shared.js'

export function drawMotionTrails(ctx, canvas, dataArray, _timeArray, state) {
  const mids = getBandEnergy(dataArray, 0.2, 0.55)
  const highs = getBandEnergy(dataArray, 0.6, 1)
  const lines = 28 + state.quality.tier * 20

  ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < lines; i++) {
    const p = i / lines
    const y = p * canvas.height
    const sway = Math.sin(state.frame * 0.03 + i * 0.35) * (18 + mids * 90)
    const x1 = canvas.width * 0.2 + sway
    const x2 = canvas.width * 0.8 - sway

    ctx.strokeStyle = withAlpha((state.hue + i * 4) % 360, 92, 68, 0.1 + highs * 0.4)
    ctx.lineWidth = 0.8 + highs * 2.3
    ctx.beginPath()
    ctx.moveTo(x1, y)
    ctx.lineTo(x2, y + Math.sin(i + state.frame * 0.02) * 18)
    ctx.stroke()
  }
  ctx.globalCompositeOperation = 'source-over'
}
