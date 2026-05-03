import { getBandEnergy, withAlpha } from '../shared.js'

export function drawNeonTunnel(ctx, canvas, dataArray, _timeArray, state) {
  const bass = getBandEnergy(dataArray, 0, 0.1)
  const mids = getBandEnergy(dataArray, 0.15, 0.5)
  const cx = canvas.width / 2
  const horizon = canvas.height * 0.36
  const floor = canvas.height

  const lines = 12 - state.quality.tier * 2
  ctx.lineWidth = 1.2
  for (let i = -lines; i <= lines; i++) {
    const spread = i / lines
    const xBottom = cx + spread * canvas.width * 0.6
    const xTop = cx + spread * canvas.width * 0.08
    ctx.strokeStyle = withAlpha((state.hue + i * 6 + 180) % 360, 100, 65, 0.12 + bass * 0.3)
    ctx.beginPath()
    ctx.moveTo(xBottom, floor)
    ctx.lineTo(xTop, horizon)
    ctx.stroke()
  }

  const rowCount = 14 - state.quality.tier * 2
  for (let r = 1; r <= rowCount; r++) {
    const depth = r / rowCount
    const y = horizon + Math.pow(depth, 2.2) * (floor - horizon)
    const wobble = Math.sin(state.frame * 0.06 + r * 0.7) * (2 + mids * 10)
    ctx.strokeStyle = withAlpha((state.hue + r * 14) % 360, 100, 66, 0.16 + mids * 0.35)
    ctx.beginPath()
    ctx.moveTo(cx - canvas.width * depth * 0.62, y + wobble)
    ctx.lineTo(cx + canvas.width * depth * 0.62, y + wobble)
    ctx.stroke()
  }

  const orbPulse = 14 + bass * 50
  const idx = Math.floor((state.frame * 1.8) % dataArray.length)
  const tone = dataArray[idx] / 255
  const orbY = horizon - 18 - tone * 46
  const g = ctx.createRadialGradient(cx, orbY, 0, cx, orbY, orbPulse)
  g.addColorStop(0, withAlpha((state.hue + 200) % 360, 100, 72, 0.8))
  g.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(cx, orbY, orbPulse, 0, Math.PI * 2)
  ctx.fill()

  const beatBarHeight = (bass * bass) * 120
  ctx.fillStyle = withAlpha((state.hue + 260) % 360, 100, 66, 0.35)
  ctx.fillRect(0, floor - beatBarHeight, canvas.width, beatBarHeight)
}
