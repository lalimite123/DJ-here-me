const FFT = 2048
const BAR_COUNT = 128

export type BeatBar = { el: SVGLineElement; angle: number; innerR: number }

export type BeatAnimationState = {
  energyHistory: number[]
  bpmHistory: number[]
  lastBeatTime: number
  bpmDisplay: number
  freqData: Uint8Array
  waveData: Uint8Array
}

export const hueFromFreq = (norm: number) => `hsl(${180 + norm * 160}, 100%, 65%)`

export function createBeatAnimationState(): BeatAnimationState {
  return {
    energyHistory: new Array(43).fill(0),
    bpmHistory: [],
    lastBeatTime: 0,
    bpmDisplay: 0,
    freqData: new Uint8Array(FFT / 2),
    waveData: new Uint8Array(1024)
  }
}

export function initializeBeatBars(group: SVGGElement): BeatBar[] {
  group.innerHTML = ''
  const bars: BeatBar[] = []

  for (let i = 0; i < BAR_COUNT; i++) {
    const angle = (i / BAR_COUNT) * Math.PI * 2
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line')
    const innerR = 90
    const x1 = Math.cos(angle) * innerR
    const y1 = Math.sin(angle) * innerR
    line.setAttribute('x1', String(x1))
    line.setAttribute('y1', String(y1))
    line.setAttribute('x2', String(x1))
    line.setAttribute('y2', String(y1))
    line.setAttribute('stroke-width', '2')
    line.setAttribute('stroke-linecap', 'round')
    group.appendChild(line)
    bars.push({ el: line, angle, innerR })
  }

  return bars
}

type RenderBeatFrameInput = {
  analyserFreq: AnalyserNode | null
  analyserWave: AnalyserNode | null
  bars: BeatBar[]
  ringMid: SVGCircleElement | null
  ringInner: SVGCircleElement | null
  core: SVGCircleElement | null
  beatFlash: SVGCircleElement | null
  waveform: SVGPolylineElement | null
  bpmText: SVGTextElement | null
  corners: Array<SVGPolygonElement | null>
  state: BeatAnimationState
}

export function renderBeatFrame(input: RenderBeatFrameInput) {
  const {
    analyserFreq,
    analyserWave,
    bars,
    ringMid,
    ringInner,
    core,
    beatFlash,
    waveform,
    bpmText,
    corners,
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

  const binsPerBar = Math.floor(state.freqData.length / Math.max(1, bars.length))
  for (let i = 0; i < bars.length; i++) {
    let sum = 0
    for (let j = 0; j < binsPerBar; j++) sum += state.freqData[i * binsPerBar + j]
    const norm = (sum / Math.max(1, binsPerBar)) / 255
    const { el, angle, innerR } = bars[i]
    const outerR = innerR + norm * 110 + 2
    el.setAttribute('x2', (Math.cos(angle) * outerR).toFixed(2))
    el.setAttribute('y2', (Math.sin(angle) * outerR).toFixed(2))
    el.setAttribute('stroke', hueFromFreq(norm))
    el.setAttribute('opacity', (0.3 + norm * 0.7).toFixed(2))
  }

  if (ringMid) {
    const midR = 110 + mid * 60
    ringMid.setAttribute('r', midR.toFixed(1))
    ringMid.setAttribute('opacity', (0.1 + mid * 0.5).toFixed(2))
    ringMid.setAttribute('stroke-width', (0.5 + mid * 2).toFixed(2))
  }

  if (ringInner) {
    const innerR2 = 60 + bass * 40
    ringInner.setAttribute('r', innerR2.toFixed(1))
    ringInner.setAttribute('opacity', (0.2 + bass * 0.6).toFixed(2))
    ringInner.setAttribute('stroke', `hsl(${220 + bass * 60}, 100%, 70%)`)
  }

  let coreR = 40
  if (core) {
    coreR = 30 + high * 25 + bass * 10
    core.setAttribute('r', coreR.toFixed(1))
    core.setAttribute('stroke', `hsl(${160 + high * 80}, 100%, 60%)`)
    core.setAttribute('stroke-width', (1 + high * 3).toFixed(2))
  }

  if (beatFlash) {
    if (isBeat) {
      beatFlash.setAttribute('r', (coreR + 10).toFixed(1))
      beatFlash.setAttribute('opacity', '0.6')
    } else {
      const curOp = parseFloat(beatFlash.getAttribute('opacity') || '0')
      beatFlash.setAttribute('opacity', Math.max(0, curOp - 0.06).toFixed(2))
    }
  }

  if (waveform) {
    const pts: string[] = []
    const wStep = 520 / state.waveData.length
    for (let i = 0; i < state.waveData.length; i++) {
      pts.push(`${(i * wStep).toFixed(1)},${(490 + ((state.waveData[i] - 128) / 128) * 18).toFixed(1)}`)
    }
    waveform.setAttribute('points', pts.join(' '))
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
