import { boostEnergy, getAverageEnergy, getBandEnergy } from './shared.js'
import { VISUALIZER_DRAWERS } from './registry.js'

export function createVisualizerEngine(analyser, canvas, initialHue = 0, options = {}) {
  const performanceMode = options.performanceMode || 'balanced'
  const reduceMotion =
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches

  const frequencyData = new Uint8Array(analyser.frequencyBinCount)
  const timeData = new Uint8Array(analyser.frequencyBinCount)

  const lowPowerDevice =
    typeof navigator !== 'undefined' &&
    ((navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
      (navigator.deviceMemory && navigator.deviceMemory <= 4))

  const QUALITY_PRESETS = {
    'ultra-fast': [
      { tier: 0, sampleStep: 7, particleBudget: 20, trailAlpha: 0.46, targetFrameMs: 28 },
      { tier: 1, sampleStep: 5, particleBudget: 42, trailAlpha: 0.38, targetFrameMs: 20 },
      { tier: 2, sampleStep: 4, particleBudget: 72, trailAlpha: 0.3, targetFrameMs: 14 }
    ],
    balanced: [
      { tier: 0, sampleStep: 6, particleBudget: 24, trailAlpha: 0.44, targetFrameMs: 24 },
      { tier: 1, sampleStep: 4, particleBudget: 56, trailAlpha: 0.36, targetFrameMs: 16 },
      { tier: 2, sampleStep: 3, particleBudget: 96, trailAlpha: 0.28, targetFrameMs: 12 }
    ],
    quality: [
      { tier: 0, sampleStep: 5, particleBudget: 34, trailAlpha: 0.4, targetFrameMs: 20 },
      { tier: 1, sampleStep: 3, particleBudget: 84, trailAlpha: 0.32, targetFrameMs: 14 },
      { tier: 2, sampleStep: 2, particleBudget: 140, trailAlpha: 0.24, targetFrameMs: 10 }
    ]
  }

  const qualityProfiles = QUALITY_PRESETS[performanceMode] || QUALITY_PRESETS.balanced
  const initialQualityIndex = reduceMotion || lowPowerDevice ? 0 : 1

  const state = {
    hue: initialHue,
    frame: 0,
    modeCache: {},
    frameMs: 16.7,
    lastTs: 0,
    lastRenderTs: 0,
    lastEnergy: 0,
    smoothedEnergy: 0,
    bassEnergy: 0,
    midsEnergy: 0,
    highsEnergy: 0,
    beatPulse: 0,
    modeSettings: options.modeSettings || {},
    qualityIndex: initialQualityIndex,
    quality: qualityProfiles[initialQualityIndex]
  }

  return {
    drawFrame(ctx, mode, now = performance.now()) {
      const delta = state.lastTs ? now - state.lastTs : 16.7
      state.lastTs = now
      state.frameMs = state.frameMs * 0.9 + delta * 0.1

      if (state.frame % 18 === 0) {
        if (state.frameMs > 18 && state.qualityIndex > 0) {
          state.qualityIndex -= 1
          state.quality = qualityProfiles[state.qualityIndex]
        } else if (!reduceMotion && state.frameMs < 14 && state.qualityIndex < qualityProfiles.length - 1) {
          state.qualityIndex += 1
          state.quality = qualityProfiles[state.qualityIndex]
        }
      }

      analyser.getByteFrequencyData(frequencyData)
      analyser.getByteTimeDomainData(timeData)

      const rawEnergy = getAverageEnergy(frequencyData)
      const bass = getBandEnergy(frequencyData, 0, 0.12)
      const mids = getBandEnergy(frequencyData, 0.15, 0.55)
      const highs = getBandEnergy(frequencyData, 0.58, 1)

      state.smoothedEnergy = state.smoothedEnergy * 0.65 + rawEnergy * 0.35
      const attack = Math.max(0, rawEnergy - state.smoothedEnergy)
      state.beatPulse = Math.max(0, state.beatPulse * 0.82 - 0.01)
      if (bass > 0.24 && attack > 0.02) {
        state.beatPulse = Math.min(1, state.beatPulse + 0.26 + bass * 0.5)
      }

      state.bassEnergy = bass
      state.midsEnergy = mids
      state.highsEnergy = highs

      const reactiveEnergy = boostEnergy(rawEnergy * 0.55 + bass * 0.35 + state.beatPulse * 0.3, 0.68, 1.12)
      state.lastEnergy = reactiveEnergy

      state.audio = {
        raw: rawEnergy,
        energy: reactiveEnergy,
        bass,
        mids,
        highs,
        beat: state.beatPulse
      }

      if (mode !== '26' && state.lastRenderTs && now - state.lastRenderTs < state.quality.targetFrameMs) {
        return {
          energy: state.lastEnergy,
          bass: state.bassEnergy,
          beat: state.beatPulse,
          qualityTier: state.quality.tier,
          frameMs: state.frameMs
        }
      }
      state.lastRenderTs = now

      if (mode === '26') {
        // DISCO 2 renders a full 3D scene; keep canvas clear of trail compositing.
        ctx.fillStyle = 'rgb(0, 0, 0)'
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      } else {
        const dynamicTrail = Math.max(0.08, state.quality.trailAlpha - reactiveEnergy * 0.08 - state.beatPulse * 0.04)
        const whiteFlash = Math.min(1, (bass * 0.62 + state.beatPulse * 0.78) * 0.2)
        const flashShade = Math.floor(whiteFlash * 255)
        ctx.fillStyle = `rgba(${flashShade}, ${flashShade}, ${flashShade}, ${dynamicTrail})`
        ctx.fillRect(0, 0, canvas.width, canvas.height)
      }

      state.hue = (state.hue + 0.75 + reactiveEnergy * 2.2 + state.beatPulse * 1.4) % 360
      state.frame += 1

      const drawMode = VISUALIZER_DRAWERS[mode] || VISUALIZER_DRAWERS['1']
      drawMode(ctx, canvas, frequencyData, timeData, state)

      return {
        energy: state.lastEnergy,
        bass: state.bassEnergy,
        beat: state.beatPulse,
        qualityTier: state.quality.tier,
        frameMs: state.frameMs
      }
    },
    reset(mode) {
      if (mode) {
        delete state.modeCache[mode]
      } else {
        state.modeCache = {}
      }
    }
  }
}