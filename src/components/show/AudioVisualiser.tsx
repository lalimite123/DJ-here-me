"use client"

import React, { useRef, useState, useEffect } from 'react';

export default function AudioVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [audioContext, setAudioContext] = useState<AudioContext | null>(null);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);
  const [isVisualizerActive, setIsVisualizerActive] = useState(false);
  const animationRef = useRef<number>(0);
  
  // Lissage des barres (smoothing)
  const smoothingTimeConstant = 0.85; 

  const handleStartClick = async () => {
    try {
      const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
      const ctx = new AudioContext();
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const audioAnalyser = ctx.createAnalyser();
      audioAnalyser.fftSize = 512; // Résolution plus fine mais optimisée
      audioAnalyser.smoothingTimeConstant = smoothingTimeConstant; 
      
      const source = ctx.createMediaStreamSource(stream);
      source.connect(audioAnalyser);
      
      setAudioContext(ctx);
      setAnalyser(audioAnalyser);
      setIsVisualizerActive(true);
    } catch (error) {
      console.error("Erreur microphone:", error);
      alert("Impossible d'accéder au microphone.");
    }
  };
  
  useEffect(() => {
    if (!isVisualizerActive || !analyser || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: false }); // Optimisation Chrome : alpha false
    if (!ctx) return;
    
    // Définir la résolution interne du canvas pour la netteté (Retina displays)
    const setCanvasSize = () => {
      const dpr = window.devicePixelRatio || 1;
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(dpr, dpr);
    };
    
    setCanvasSize();
    window.addEventListener('resize', setCanvasSize);
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    // Particules pour un effet "poussière d'étoiles" réactif aux basses
    const particles: {x: number, y: number, speed: number, radius: number, alpha: number}[] = [];
    for(let i=0; i<50; i++) {
       particles.push({
         x: Math.random() * window.innerWidth,
         y: Math.random() * window.innerHeight,
         speed: Math.random() * 2 + 1,
         radius: Math.random() * 3 + 1,
         alpha: Math.random()
       });
    }

    let previousBass = 0;
    
    const draw = () => {
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);
      
      const w = window.innerWidth;
      const h = window.innerHeight;

      // Effet de traînée (motion blur) en dessinant un fond semi-transparent
      ctx.fillStyle = 'rgba(10, 5, 20, 0.2)'; 
      ctx.fillRect(0, 0, w, h);
      
      // Calcul des basses (pour faire vibrer l'écran)
      let bassSum = 0;
      for(let i = 0; i < 10; i++) bassSum += dataArray[i];
      const bassAvg = bassSum / 10;
      
      // Lissage des basses pour éviter les flashs trop agressifs
      const smoothedBass = previousBass * 0.8 + bassAvg * 0.2;
      previousBass = smoothedBass;

      // Effet de flash global sur les grosses basses
      if (smoothedBass > 220) {
        ctx.fillStyle = `rgba(139, 92, 246, ${((smoothedBass - 220) / 35) * 0.1})`;
        ctx.fillRect(0, 0, w, h);
      }

      // Dessin des particules
      particles.forEach(p => {
        p.y -= p.speed * (1 + (smoothedBass / 100)); // Accélère avec la musique
        if (p.y < 0) {
          p.y = h;
          p.x = Math.random() * w;
        }
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(217, 70, 239, ${p.alpha * (smoothedBass/255 + 0.2)})`;
        ctx.fill();
      });

      // Dessin de l'onde (barres symétriques depuis le centre)
      const barCount = 64; // On n'affiche pas tout le spectre pour plus de fluidité
      const barWidth = (w / barCount) * 0.8;
      const centerX = w / 2;
      const centerY = h / 2;

      for (let i = 0; i < barCount; i++) {
        // Ignorer les très hautes fréquences (souvent du bruit)
        const dataIndex = Math.floor(i * (bufferLength / 2) / barCount);
        const rawHeight = (dataArray[dataIndex] / 255) * (h * 0.4);
        
        // Exagérer la hauteur avec une courbe pour plus de dynamisme
        const barHeight = Math.pow(rawHeight / (h*0.4), 1.5) * (h*0.4);
        
        // Dégradé Cyberpunk (Violet -> Rose -> Cyan)
        const hue = 280 + (i / barCount) * 80;
        ctx.fillStyle = `hsla(${hue}, 80%, 60%, 0.8)`;
        
        // Barre Droite
        const xRight = centerX + (i * (w / 2 / barCount));
        ctx.beginPath();
        ctx.roundRect(xRight, centerY - barHeight/2, barWidth, barHeight, 10);
        ctx.fill();

        // Barre Gauche (Symétrie)
        if (i > 0) {
          const xLeft = centerX - (i * (w / 2 / barCount)) - barWidth;
          ctx.beginPath();
          ctx.roundRect(xLeft, centerY - barHeight/2, barWidth, barHeight, 10);
          ctx.fill();
        }
      }
    };
    
    draw();
    
    return () => {
      window.removeEventListener('resize', setCanvasSize);
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [analyser, isVisualizerActive]);
  
  useEffect(() => {
    return () => {
      if (audioContext && audioContext.state !== 'closed') {
        audioContext.close();
      }
    };
  }, [audioContext]);
  
  return (
    <div className="absolute inset-0 -z-10 bg-[#0a0514] overflow-hidden">
      <canvas 
        ref={canvasRef} 
        className="absolute top-0 left-0 w-full h-full"
      />
      
      {!isVisualizerActive && (
        <div className="absolute inset-0 flex items-center justify-center backdrop-blur-sm bg-black/40 z-10">
          <button
            onClick={handleStartClick}
            className="group relative px-8 py-4 bg-transparent overflow-hidden rounded-2xl transition-all hover:scale-105 active:scale-95"
          >
            <div className="absolute inset-0 w-full h-full bg-gradient-to-r from-fuchsia-600 via-purple-600 to-indigo-600 opacity-80 group-hover:opacity-100 transition-opacity"></div>
            <div className="absolute -inset-1 bg-gradient-to-r from-fuchsia-600 to-indigo-600 rounded-2xl blur-lg opacity-40 group-hover:opacity-70 transition-opacity animate-pulse"></div>
            <span className="relative text-white font-bold text-xl tracking-wider">
              🎤 Démarrer le Visualiseur
            </span>
          </button>
        </div>
      )}
    </div>
  );
}