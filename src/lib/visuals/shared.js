const clamp01 = (value) => Math.max(0, Math.min(1, value))

export function getAverageEnergy(dataArray) {
  let sum = 0
  for (let i = 0; i < dataArray.length; i++) sum += dataArray[i]
  const normalized = sum / dataArray.length / 255
  // Boost lower levels so visuals react earlier to subtle music passages.
  return clamp01(Math.pow(normalized, 0.72))
}

export function getBandEnergy(dataArray, startRatio, endRatio) {
  const start = Math.max(0, Math.floor(dataArray.length * startRatio))
  const end = Math.min(dataArray.length - 1, Math.floor(dataArray.length * endRatio))
  if (end <= start) return 0

  let sum = 0
  for (let i = start; i <= end; i++) sum += dataArray[i]
  const normalized = (sum / (end - start + 1)) / 255
  return clamp01(Math.pow(normalized, 0.74))
}

export function boostEnergy(value, exponent = 0.7, gain = 1.08) {
  return clamp01(Math.pow(clamp01(value), exponent) * gain)
}

export function withAlpha(hue, sat, light, alpha) {
  return `hsla(${hue}, ${sat}%, ${light}%, ${alpha})`
}

export function ensureCache(state, key, factory) {
  if (!state.modeCache[key]) state.modeCache[key] = factory()
  return state.modeCache[key]
}
