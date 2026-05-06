import React, { useEffect, useRef } from 'react'
import { 
  createBeatAnimationState, 
  initializeBeatBars, 
  renderBeatFrame, 
  BeatAnimationState, 
  BeatBar 
} from './beatScene'

interface BeatSceneWrapperProps {
  analyser: AnalyserNode | null
  isMini?: boolean
}

export default function BeatSceneWrapper({ analyser, isMini = false }: BeatSceneWrapperProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const barsGroupRef = useRef<SVGGElement>(null)
  const ringMidRef = useRef<SVGCircleElement>(null)
  const ringInnerRef = useRef<SVGCircleElement>(null)
  const coreRef = useRef<SVGCircleElement>(null)
  const beatFlashRef = useRef<SVGCircleElement>(null)
  const waveformRef = useRef<SVGPolylineElement>(null)
  const bpmTextRef = useRef<SVGTextElement>(null)
  const corner1Ref = useRef<SVGPolygonElement>(null)
  const corner2Ref = useRef<SVGPolygonElement>(null)
  const corner3Ref = useRef<SVGPolygonElement>(null)
  const corner4Ref = useRef<SVGPolygonElement>(null)

  const stateRef = useRef<BeatAnimationState | null>(null)
  const barsRef = useRef<BeatBar[]>([])
  const reqRef = useRef<number | null>(null)

  useEffect(() => {
    if (!barsGroupRef.current) return

    stateRef.current = createBeatAnimationState()
    barsRef.current = initializeBeatBars(barsGroupRef.current)

    const loop = () => {
      if (stateRef.current) {
        renderBeatFrame({
          analyserFreq: analyser,
          analyserWave: analyser,
          bars: barsRef.current,
          ringMid: ringMidRef.current,
          ringInner: ringInnerRef.current,
          core: coreRef.current,
          beatFlash: beatFlashRef.current,
          waveform: waveformRef.current,
          bpmText: bpmTextRef.current,
          corners: [corner1Ref.current, corner2Ref.current, corner3Ref.current, corner4Ref.current],
          state: stateRef.current
        })
      }
      reqRef.current = requestAnimationFrame(loop)
    }
    loop()

    return () => {
      if (reqRef.current) cancelAnimationFrame(reqRef.current)
    }
  }, [analyser])

  return (
    <div className={`absolute inset-0 w-full h-full overflow-hidden flex items-center justify-center ${isMini ? 'bg-transparent' : 'bg-[#05050a]'}`}>
      <svg 
        ref={svgRef} 
        viewBox="-300 -300 600 600" 
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full"
      >
        <polygon ref={corner1Ref} points="-300,-300 -250,-300 -300,-250" fill="none" stroke="#1a1a2e" strokeWidth="4" />
        <polygon ref={corner2Ref} points="300,-300 250,-300 300,-250" fill="none" stroke="#1a1a2e" strokeWidth="4" />
        <polygon ref={corner3Ref} points="-300,300 -250,300 -300,250" fill="none" stroke="#1a1a2e" strokeWidth="4" />
        <polygon ref={corner4Ref} points="300,300 250,300 300,250" fill="none" stroke="#1a1a2e" strokeWidth="4" />

        <g ref={barsGroupRef}></g>

        <circle ref={ringMidRef} r="110" fill="none" stroke="#8800ff" strokeWidth="1" opacity="0.1" />
        <circle ref={ringInnerRef} r="60" fill="none" stroke="#00d4ff" strokeWidth="3" opacity="0.2" />
        
        <polyline ref={waveformRef} points="" fill="none" stroke="#ff00cc" strokeWidth="2" opacity="0.5" transform="translate(-260, 200) scale(1, 0.2)" />
        
        <circle ref={beatFlashRef} r="50" fill="#fff" opacity="0" />
        <circle ref={coreRef} r="40" fill="#111" stroke="#00ffcc" strokeWidth="2" />
        
        <text ref={bpmTextRef} x="0" y="5" fill="#fff" fontSize="14" textAnchor="middle" alignmentBaseline="middle" opacity="0.5" fontFamily="monospace">
          --- BPM
        </text>
      </svg>
    </div>
  )
}