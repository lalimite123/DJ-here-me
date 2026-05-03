import { getBandEnergy, withAlpha } from '../shared.js'

export function drawHelloLight(ctx, canvas, dataArray, _timeArray, state) {
  const bass = getBandEnergy(dataArray, 0, 0.12)
  const mids = getBandEnergy(dataArray, 0.2, 0.45)
  const customText = String(state.modeSettings?.helloLightText || '').trim()
  const text = customText.length > 0 ? customText : 'HELLO LIGHT'
  const cx = canvas.width / 2
  const cy = canvas.height / 2

  ctx.globalCompositeOperation = 'lighter'
  for (let i = 0; i < 6; i++) {
    const blur = 18 + i * 8 + bass * 20
    ctx.shadowBlur = blur
    ctx.shadowColor = withAlpha((state.hue + i * 16) % 360, 100, 70, 0.8)
    ctx.fillStyle = withAlpha((state.hue + i * 14) % 360, 100, 65, 0.13)
    ctx.font = `700 ${Math.floor(60 + mids * 70 + i * 2)}px sans-serif`
    ctx.textAlign = 'center'
    ctx.fillText(text, cx + Math.sin(state.frame * 0.03 + i) * 10, cy + Math.cos(state.frame * 0.025 + i) * 8)
  }
  ctx.shadowBlur = 0
  ctx.globalCompositeOperation = 'source-over'
}
