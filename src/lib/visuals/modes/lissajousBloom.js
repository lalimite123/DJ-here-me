import { getBandEnergy, withAlpha } from '../shared.js'

export function drawLissajousBloom(ctx, canvas, _dataArray, timeArray, state) {
  const highs = getBandEnergy(timeArray, 0.6, 1)
  const lows = getBandEnergy(timeArray, 0, 0.2)
  const cx = canvas.width / 2
  const cy = canvas.height / 2

  const ax = canvas.width * (0.22 + highs * 0.18)
  const ay = canvas.height * (0.2 + lows * 0.2)
  const phase = state.frame * 0.015

  ctx.globalCompositeOperation = 'lighter'
  for (let pass = 0; pass < 3; pass++) {
    ctx.beginPath()
    ctx.lineWidth = 1.6 + pass * 1.1
    ctx.strokeStyle = withAlpha((state.hue + pass * 42) % 360, 100, 72, 0.66 - pass * 0.18)

    for (let i = 0; i < timeArray.length; i++) {
      const t = (i / timeArray.length) * Math.PI * 2
      const signal = (timeArray[i] - 128) / 128
      const x = cx + Math.sin((3 + pass) * t + phase) * (ax + signal * 38)
      const y = cy + Math.sin((4 + pass) * t + phase * 1.3) * (ay + signal * 34)
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    }

    ctx.closePath()
    ctx.stroke()
  }
  ctx.globalCompositeOperation = 'source-over'
}
