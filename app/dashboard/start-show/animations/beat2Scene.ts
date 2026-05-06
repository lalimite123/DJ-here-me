const FFT_SIZE = 2048
const BAR_COUNT = 80
const CX = 340
const CY = 260

export type ButterflyBar = {
  lLine: SVGLineElement
  rLine: SVGLineElement
  y: number
  innerGap: number
  envelope: number
}

export type Beat2AnimationState = {
  energyHistory: number[]
  bpmHistory: number[]
  lastBeatTime: number
  bpmDisplay: number
  sweepAngle: number
  shockRx: number
  shockRy: number
  shockOp: number
  shakeMag: number
  freqData: Uint8Array
  waveData: Uint8Array
}

export function createBeat2AnimationState(): Beat2AnimationState {
  return {
    energyHistory: new Array(43).fill(0),
    bpmHistory: [],
    lastBeatTime: 0,
    bpmDisplay: 0,
    sweepAngle: 0,
    shockRx: 78,
    shockRy: 54,
    shockOp: 0,
    shakeMag: 0,
    freqData: new Uint8Array(FFT_SIZE / 2),
    waveData: new Uint8Array(1024)
  }
}

function hueFromFreq(norm: number, i: number) {
  const baseHue = 170 + (i / BAR_COUNT) * 170
  return `hsl(${baseHue}, 100%, ${55 + norm * 35}%)`
}

export function initializeBeat2Bars(leftGroup: SVGGElement, rightGroup: SVGGElement): ButterflyBar[] {
  leftGroup.innerHTML = ''
  rightGroup.innerHTML = ''

  const bars: ButterflyBar[] = []
  for (let i = 0; i < BAR_COUNT; i++) {
    const t = (i / (BAR_COUNT - 1)) - 0.5
    const ySpread = 190
    const y = CY + t * ySpread
    const envelope = Math.cos(t * Math.PI)
    const innerGap = 80 + (1 - envelope) * 40

    const lLine = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    lLine.setAttribute('x1', String(CX - innerGap))
    lLine.setAttribute('y1', String(y))
    lLine.setAttribute('x2', String(CX - innerGap))
    lLine.setAttribute('y2', String(y))
    lLine.setAttribute('stroke-width', '2.2')
    lLine.setAttribute('stroke-linecap', 'round')
    leftGroup.appendChild(lLine)

    const rLine = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    rLine.setAttribute('x1', String(CX + innerGap))
    rLine.setAttribute('y1', String(y))
    rLine.setAttribute('x2', String(CX + innerGap))
    rLine.setAttribute('y2', String(y))
    rLine.setAttribute('stroke-width', '2.2')
    rLine.setAttribute('stroke-linecap', 'round')
    rightGroup.appendChild(rLine)

    bars.push({ lLine, rLine, y, innerGap, envelope })
  }

  return bars
}

type RenderBeat2FrameInput = {
  analyserFreq: AnalyserNode | null
  analyserWave: AnalyserNode | null
  bars: ButterflyBar[]
  ringOuter: SVGEllipseElement | null
  ringMid: SVGEllipseElement | null
  ringInner: SVGEllipseElement | null
  coreGlow: SVGEllipseElement | null
  core: SVGEllipseElement | null
  coreInner: SVGEllipseElement | null
  sweep: SVGEllipseElement | null
  coreShine: SVGEllipseElement | null
  haloAmbient: SVGEllipseElement | null
  beatFlash: SVGEllipseElement | null
  shockwave: SVGEllipseElement | null
  divider: SVGLineElement | null
  waveformBottom: SVGPolylineElement | null
  waveformCore: SVGPolylineElement | null
  bpmText: SVGTextElement | null
  corners: Array<SVGPolygonElement | null>
  container: HTMLDivElement | null
  state: Beat2AnimationState
}

export function renderBeat2Frame(input: RenderBeat2FrameInput) {
  const {
    analyserFreq,
    analyserWave,
    bars,
    ringOuter,
    ringMid,
    ringInner,
    coreGlow,
    core,
    coreInner,
    sweep,
    coreShine,
    haloAmbient,
    beatFlash,
    shockwave,
    divider,
    waveformBottom,
    waveformCore,
    bpmText,
    corners,
    container,
    state
  } = input

  if (!analyserFreq || !analyserWave) return

  analyserFreq.getByteFrequencyData(state.freqData as unknown as Uint8Array<ArrayBuffer>)
  analyserWave.getByteTimeDomainData(state.waveData as unknown as Uint8Array<ArrayBuffer>)

  const bassEnd = Math.max(1, Math.floor(analyserFreq.frequencyBinCount * 0.05))
  let energy = 0
  for (let i = 0; i < bassEnd; i++) energy += state.freqData[i]
  energy /= bassEnd

  state.energyHistory.push(energy)
  state.energyHistory.shift()
  const avg = state.energyHistory.reduce((a, b) => a + b, 0) / state.energyHistory.length

  const now = performance.now()
  const isBeat = energy > avg * 1.4 && (now - state.lastBeatTime) > 300
  if (isBeat) {
    const delta = now - state.lastBeatTime
    state.lastBeatTime = now
    if (delta < 2000) {
      state.bpmHistory.push(60000 / delta)
      if (state.bpmHistory.length > 8) state.bpmHistory.shift()
      state.bpmDisplay = Math.round(state.bpmHistory.reduce((a, b) => a + b, 0) / state.bpmHistory.length)
    }
  }

  const midEnd = Math.floor(state.freqData.length * 0.25)
  const highEnd = Math.floor(state.freqData.length * 0.6)
  let bassSum = 0
  let midSum = 0
  let highSum = 0
  for (let i = 0; i < bassEnd; i++) bassSum += state.freqData[i]
  for (let i = bassEnd; i < midEnd; i++) midSum += state.freqData[i]
  for (let i = midEnd; i < highEnd; i++) highSum += state.freqData[i]
  const bass = bassSum / bassEnd / 255
  const mid = midSum / Math.max(1, (midEnd - bassEnd)) / 255
  const high = highSum / Math.max(1, (highEnd - midEnd)) / 255

  const binsPerBar = Math.floor(state.freqData.length / BAR_COUNT)
  for (let i = 0; i < BAR_COUNT; i++) {
    const freqIdx = i
    let sum = 0
    for (let j = 0; j < binsPerBar; j++) sum += state.freqData[freqIdx * binsPerBar + j]
    const norm = (sum / Math.max(1, binsPerBar)) / 255

    const { lLine, rLine, innerGap, envelope } = bars[i]
    const maxLen = 200 * envelope + 20
    const barLen = norm * maxLen + 2
    const color = hueFromFreq(norm, i)
    const opacity = (0.3 + norm * 0.7).toFixed(2)
    const sw = (1.5 + norm * 2).toFixed(2)

    lLine.setAttribute('x2', (CX - innerGap - barLen).toFixed(2))
    lLine.setAttribute('stroke', color)
    lLine.setAttribute('opacity', opacity)
    lLine.setAttribute('stroke-width', sw)

    rLine.setAttribute('x2', (CX + innerGap + barLen).toFixed(2))
    rLine.setAttribute('stroke', color)
    rLine.setAttribute('opacity', opacity)
    rLine.setAttribute('stroke-width', sw)
  }

  state.sweepAngle += 1.2 + mid * 4
  if (sweep) {
    sweep.setAttribute('transform', `rotate(${state.sweepAngle}, 340, 260)`)
    sweep.setAttribute('stroke', `hsl(${160 + high * 80}, 100%, 65%)`)
    sweep.setAttribute('opacity', (0.1 + mid * 0.35).toFixed(2))
  }

  if (haloAmbient) {
    haloAmbient.setAttribute('rx', (215 + bass * 50).toFixed(1))
    haloAmbient.setAttribute('ry', (140 + bass * 35).toFixed(1))
    haloAmbient.setAttribute('opacity', (0.3 + bass * 0.5).toFixed(2))
  }

  if (ringOuter) {
    ringOuter.setAttribute('rx', (205 + mid * 30).toFixed(1))
    ringOuter.setAttribute('ry', (130 + mid * 20).toFixed(1))
    ringOuter.setAttribute('stroke', `hsl(${170 + high * 60}, 100%, 60%)`)
    ringOuter.setAttribute('opacity', (0.05 + mid * 0.2).toFixed(3))
  }

  if (ringMid) {
    ringMid.setAttribute('rx', (165 + mid * 55).toFixed(1))
    ringMid.setAttribute('ry', (108 + mid * 38).toFixed(1))
    ringMid.setAttribute('opacity', (0.1 + mid * 0.55).toFixed(2))
    ringMid.setAttribute('stroke-width', (0.5 + mid * 2.5).toFixed(2))
    ringMid.setAttribute('stroke', `hsl(${180 + mid * 40}, 100%, 65%)`)
  }

  if (ringInner) {
    const inRx = 112 + bass * 30
    const inRy = 76 + bass * 22
    ringInner.setAttribute('rx', inRx.toFixed(1))
    ringInner.setAttribute('ry', inRy.toFixed(1))
    ringInner.setAttribute('opacity', (0.2 + bass * 0.65).toFixed(2))
    ringInner.setAttribute('stroke', `hsl(${220 + bass * 60}, 100%, 70%)`)
    ringInner.setAttribute('stroke-width', (1.2 + bass * 2).toFixed(2))
  }

  const cRx = 75 + high * 18 + bass * 10
  const cRy = 52 + high * 13 + bass * 7

  if (coreGlow) {
    const cgRx = 85 + high * 22 + bass * 14
    const cgRy = 58 + high * 16 + bass * 10
    coreGlow.setAttribute('rx', cgRx.toFixed(1))
    coreGlow.setAttribute('ry', cgRy.toFixed(1))
    coreGlow.setAttribute('opacity', (0.6 + bass * 0.4).toFixed(2))
  }

  if (core) {
    core.setAttribute('rx', cRx.toFixed(1))
    core.setAttribute('ry', cRy.toFixed(1))
    core.setAttribute('stroke', `hsl(${160 + high * 80}, 100%, 60%)`)
    core.setAttribute('stroke-width', (1 + high * 3 + bass * 1.5).toFixed(2))
  }

  if (coreInner) {
    coreInner.setAttribute('rx', (cRx * 0.7).toFixed(1))
    coreInner.setAttribute('ry', (cRy * 0.7).toFixed(1))
    coreInner.setAttribute('stroke', `hsl(${200 + mid * 60}, 80%, 80%)`)
    coreInner.setAttribute('opacity', (0.06 + mid * 0.22).toFixed(2))
  }

  if (coreShine) {
    coreShine.setAttribute('cx', (322 + Math.sin(now * 0.001) * 10).toFixed(1))
    coreShine.setAttribute('cy', (248 + Math.cos(now * 0.0007) * 6).toFixed(1))
    coreShine.setAttribute('opacity', (0.08 + high * 0.3).toFixed(2))
  }

  if (waveformCore) {
    const cPts: string[] = []
    const cStep = (cRx * 2) / state.waveData.length
    for (let i = 0; i < state.waveData.length; i++) {
      const wx = (CX - cRx) + i * cStep
      const wy = CY + ((state.waveData[i] - 128) / 128) * (cRy * 0.55)
      cPts.push(`${wx.toFixed(1)},${wy.toFixed(1)}`)
    }
    waveformCore.setAttribute('points', cPts.join(' '))
    waveformCore.setAttribute('stroke', `hsl(${160 + bass * 60}, 100%, 70%)`)
    waveformCore.setAttribute('opacity', (0.2 + mid * 0.5).toFixed(2))
  }

  if (beatFlash) {
    if (isBeat) {
      beatFlash.setAttribute('rx', (cRx + 8).toFixed(1))
      beatFlash.setAttribute('ry', (cRy + 6).toFixed(1))
      beatFlash.setAttribute('opacity', '0.45')
      state.shockRx = cRx
      state.shockRy = cRy
      state.shockOp = 0.9
    } else {
      const curOp = parseFloat(beatFlash.getAttribute('opacity') || '0')
      beatFlash.setAttribute('opacity', Math.max(0, curOp - 0.055).toFixed(2))
    }
  }

  state.shockRx += 5
  state.shockRy += 3.5
  state.shockOp = Math.max(0, state.shockOp - 0.045)

  if (shockwave) {
    shockwave.setAttribute('rx', state.shockRx.toFixed(1))
    shockwave.setAttribute('ry', state.shockRy.toFixed(1))
    shockwave.setAttribute('opacity', state.shockOp.toFixed(3))
    shockwave.setAttribute('stroke', `hsl(${160 + bass * 80}, 100%, 70%)`)
  }

  if (isBeat) state.shakeMag = 8 + bass * 14
  let shakeX = 0
  let shakeY = 0
  if (state.shakeMag > 0.3) {
    shakeX = (Math.random() - 0.5) * 2 * state.shakeMag
    shakeY = (Math.random() - 0.5) * state.shakeMag * 0.4
    state.shakeMag *= 0.72
  } else {
    state.shakeMag = 0
  }

  if (container) {
    container.style.transform = `translate(${shakeX.toFixed(2)}px, ${shakeY.toFixed(2)}px)`
  }

  if (divider) {
    divider.setAttribute('stroke', `hsl(${160 + bass * 60}, 100%, ${10 + bass * 30}%)`)
    divider.setAttribute('stroke-width', (0.5 + bass * 1.5).toFixed(2))
  }

  if (waveformBottom) {
    const pts: string[] = []
    const wStep = 680 / state.waveData.length
    for (let i = 0; i < state.waveData.length; i++) {
      pts.push(`${(i * wStep).toFixed(1)},${(490 + ((state.waveData[i] - 128) / 128) * 18).toFixed(1)}`)
    }
    waveformBottom.setAttribute('points', pts.join(' '))
    waveformBottom.setAttribute('stroke', `hsl(${330 + bass * 40}, 100%, 65%)`)
  }

  if (bpmText && state.bpmDisplay > 0) {
    bpmText.textContent = `${state.bpmDisplay} BPM`
    bpmText.setAttribute('opacity', (0.3 + bass * 0.7).toFixed(2))
  }

  if (isBeat) {
    corners.forEach((el) => el?.setAttribute('stroke', '#00ffcc'))
    window.setTimeout(() => {
      corners.forEach((el) => el?.setAttribute('stroke', '#1a1a2e'))
    }, 80)
  }
}
