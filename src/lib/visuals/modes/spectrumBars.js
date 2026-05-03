import { getBandEnergy, withAlpha } from '../shared.js'

export function drawSpectrumBars(ctx, canvas, dataArray, _timeArray, state) {
  const bass = getBandEnergy(dataArray, 0, 0.1)
  const highs = getBandEnergy(dataArray, 0.6, 1)
  const step = state.quality.sampleStep

  const visibleBars = Math.ceil(dataArray.length / step)
  const barWidth = canvas.width / visibleBars
  const floor = canvas.height * 0.95

  for (let i = 0, bar = 0; i < dataArray.length; i += step, bar++) {
    const value = dataArray[i] / 255
    const curve = Math.sin((i / dataArray.length) * Math.PI)
    const height = (value * value) * canvas.height * (0.2 + curve * 0.85) * (0.7 + bass * 0.65)
    const hue = (state.hue + i * 1.7 + highs * 120) % 360

    const gradient = ctx.createLinearGradient(0, floor - height, 0, floor)
    gradient.addColorStop(0, withAlpha(hue, 100, 74, 0.98))
    gradient.addColorStop(0.5, withAlpha((hue + 24) % 360, 100, 60, 0.8))
    gradient.addColorStop(1, withAlpha((hue + 80) % 360, 100, 35, 0.3))

    ctx.fillStyle = gradient
    const x = bar * barWidth
    ctx.fillRect(x, floor - height, Math.max(1, barWidth - 1), height)

    if (bar % 4 === 0) {
      ctx.fillStyle = withAlpha((hue + 130) % 360, 100, 85, 0.18)
      ctx.fillRect(x, floor - height, Math.max(1, barWidth - 1), Math.max(2, height * 0.18))
    }
  }

  const mirrorGradient = ctx.createLinearGradient(0, floor, 0, canvas.height)
  mirrorGradient.addColorStop(0, withAlpha((state.hue + 180) % 360, 100, 65, 0.18 + bass * 0.3))
  mirrorGradient.addColorStop(1, 'rgba(0,0,0,0)')
  ctx.fillStyle = mirrorGradient
  ctx.fillRect(0, floor, canvas.width, canvas.height - floor)

  const skylineY = floor - (18 + bass * 40)
  ctx.strokeStyle = withAlpha((state.hue + 220) % 360, 100, 74, 0.5)
  ctx.lineWidth = 1.2
  ctx.beginPath()
  ctx.moveTo(0, skylineY)
  for (let i = 0; i <= 12; i++) {
    const x = (i / 12) * canvas.width
    const wave = Math.sin(state.frame * 0.03 + i * 0.8) * (6 + highs * 14)
    ctx.lineTo(x, skylineY + wave)
  }
  ctx.stroke()
}
