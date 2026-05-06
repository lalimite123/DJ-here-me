import React, { useEffect, useRef } from 'react'
import { createDisco2State, resizeDisco2, renderDisco2Frame, Disco2State } from './disco2Scene'

interface Disco2WrapperProps {
  analyser: AnalyserNode | null
}

export default function Disco2Wrapper({ analyser }: Disco2WrapperProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const stateRef = useRef<Disco2State | null>(null)
  const reqRef = useRef<number | null>(null)

  useEffect(() => {
    if (!canvasRef.current) return

    stateRef.current = createDisco2State(canvasRef.current)

    const handleResize = () => {
      if (stateRef.current) {
        resizeDisco2(stateRef.current, window.innerWidth, window.innerHeight)
      }
    }
    window.addEventListener('resize', handleResize)

    const loop = () => {
      if (stateRef.current) {
        renderDisco2Frame(stateRef.current, analyser)
      }
      reqRef.current = requestAnimationFrame(loop)
    }
    loop()

    return () => {
      window.removeEventListener('resize', handleResize)
      if (reqRef.current) cancelAnimationFrame(reqRef.current)
    }
  }, [analyser])

  return (
    <canvas 
      ref={canvasRef} 
      className="absolute inset-0 w-full h-full object-cover z-0"
    />
  )
}