import React, { useEffect, useRef } from 'react'
import { 
  createBeat2AnimationState, 
  initializeBeat2Bars, 
  renderBeat2Frame, 
  Beat2AnimationState, 
  ButterflyBar 
} from './beat2Scene'

export interface Beat2SceneWrapperProps {
  analyser: AnalyserNode | null
}

export default function Beat2SceneWrapper({ analyser }: Beat2SceneWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const leftGroupRef = useRef<SVGGElement>(null)
  const rightGroupRef = useRef<SVGGElement>(null)
  
  const ringOuterRef = useRef<SVGEllipseElement>(null)
  const ringMidRef = useRef<SVGEllipseElement>(null)
  const ringInnerRef = useRef<SVGEllipseElement>(null)
  const coreGlowRef = useRef<SVGEllipseElement>(null)
  const coreRef = useRef<SVGEllipseElement>(null)
  const coreInnerRef = useRef<SVGEllipseElement>(null)
  const sweepRef = useRef<SVGEllipseElement>(null)
  const coreShineRef = useRef<SVGEllipseElement>(null)
  const haloAmbientRef = useRef<SVGEllipseElement>(null)
  const beatFlashRef = useRef<SVGEllipseElement>(null)
  const shockwaveRef = useRef<SVGEllipseElement>(null)
  
  const dividerRef = useRef<SVGLineElement>(null)
  const waveformBottomRef = useRef<SVGPolylineElement>(null)
  const waveformCoreRef = useRef<SVGPolylineElement>(null)
  const bpmTextRef = useRef<SVGTextElement>(null)
  
  const corner1Ref = useRef<SVGPolygonElement>(null)
  const corner2Ref = useRef<SVGPolygonElement>(null)
  const corner3Ref = useRef<SVGPolygonElement>(null)
  const corner4Ref = useRef<SVGPolygonElement>(null)

  const stateRef = useRef<Beat2AnimationState | null>(null)
  const barsRef = useRef<ButterflyBar[]>([])
  const reqRef = useRef<number | null>(null)

  useEffect(() => {
    if (!leftGroupRef.current || !rightGroupRef.current) return

    stateRef.current = createBeat2AnimationState()
    barsRef.current = initializeBeat2Bars(leftGroupRef.current, rightGroupRef.current)

    const loop = () => {
      if (stateRef.current) {
        renderBeat2Frame({
          analyserFreq: analyser,
          analyserWave: analyser,
          bars: barsRef.current,
          ringOuter: ringOuterRef.current,
          ringMid: ringMidRef.current,
          ringInner: ringInnerRef.current,
          coreGlow: coreGlowRef.current,
          core: coreRef.current,
          coreInner: coreInnerRef.current,
          sweep: sweepRef.current,
          coreShine: coreShineRef.current,
          haloAmbient: haloAmbientRef.current,
          beatFlash: beatFlashRef.current,
          shockwave: shockwaveRef.current,
          divider: dividerRef.current,
          waveformBottom: waveformBottomRef.current,
          waveformCore: waveformCoreRef.current,
          bpmText: bpmTextRef.current,
          corners: [corner1Ref.current, corner2Ref.current, corner3Ref.current, corner4Ref.current],
          container: containerRef.current,
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
    <div ref={containerRef} className="absolute inset-0 w-full h-full bg-[#020205] overflow-hidden flex items-center justify-center">
      <svg 
        viewBox="0 0 680 520" 
        preserveAspectRatio="xMidYMid meet"
        className="w-full h-full"
      >
        <defs>
          <linearGradient id="coreGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#00ffcc" />
            <stop offset="100%" stopColor="#0066ff" />
          </linearGradient>
        </defs>

        <polygon ref={corner1Ref} points="0,0 50,0 0,50" fill="none" stroke="#1a1a2e" strokeWidth="4" />
        <polygon ref={corner2Ref} points="680,0 630,0 680,50" fill="none" stroke="#1a1a2e" strokeWidth="4" />
        <polygon ref={corner3Ref} points="0,520 50,520 0,470" fill="none" stroke="#1a1a2e" strokeWidth="4" />
        <polygon ref={corner4Ref} points="680,520 630,520 680,470" fill="none" stroke="#1a1a2e" strokeWidth="4" />

        <ellipse ref={haloAmbientRef} cx="340" cy="260" rx="300" ry="200" fill="url(#coreGrad)" opacity="0.05" filter="blur(40px)" />

        <g ref={leftGroupRef}></g>
        <g ref={rightGroupRef}></g>

        <line ref={dividerRef} x1="340" y1="50" x2="340" y2="470" stroke="#00ffcc" strokeWidth="1" opacity="0.2" strokeDasharray="4 8" />

        <polyline ref={waveformBottomRef} points="" fill="none" stroke="#8800ff" strokeWidth="2" opacity="0.4" />

        <ellipse ref={shockwaveRef} cx="340" cy="260" rx="78" ry="54" fill="none" stroke="#ffffff" strokeWidth="2" opacity="0" />
        <ellipse ref={ringOuterRef} cx="340" cy="260" rx="140" ry="100" fill="none" stroke="#00d4ff" strokeWidth="1" opacity="0.15" strokeDasharray="2 6" />
        <ellipse ref={ringMidRef} cx="340" cy="260" rx="100" ry="70" fill="none" stroke="#8800ff" strokeWidth="2" opacity="0.3" />
        <ellipse ref={ringInnerRef} cx="340" cy="260" rx="78" ry="54" fill="none" stroke="#00ffcc" strokeWidth="3" opacity="0.5" />

        <ellipse ref={sweepRef} cx="340" cy="260" rx="90" ry="60" fill="none" stroke="#ffffff" strokeWidth="1" opacity="0.2" strokeDasharray="10 100" />

        <ellipse ref={coreGlowRef} cx="340" cy="260" rx="60" ry="40" fill="url(#coreGrad)" opacity="0.2" filter="blur(10px)" />
        <ellipse ref={coreRef} cx="340" cy="260" rx="50" ry="34" fill="#050510" stroke="url(#coreGrad)" strokeWidth="2" />
        <ellipse ref={coreInnerRef} cx="340" cy="260" rx="35" ry="24" fill="url(#coreGrad)" opacity="0.4" />
        <ellipse ref={coreShineRef} cx="340" cy="245" rx="20" ry="8" fill="#ffffff" opacity="0.3" filter="blur(2px)" />
        <ellipse ref={beatFlashRef} cx="340" cy="260" rx="55" ry="38" fill="#ffffff" opacity="0" />

        <polyline ref={waveformCoreRef} points="" fill="none" stroke="#ffffff" strokeWidth="1.5" opacity="0.8" />

        <text ref={bpmTextRef} x="340" y="262" fill="#ffffff" fontSize="12" textAnchor="middle" alignmentBaseline="middle" opacity="0.8" fontFamily="monospace" fontWeight="bold" letterSpacing="1">
          ---
        </text>
      </svg>
    </div>
  )
}