const FFT_SIZE = 1024
const COLS = 13
const ROWS = 7
const GAP = 3

type Disco2Cell = {
  col: number
  row: number
  hue: number
  freqT: number
  norm: number
  flareAngle: number
}

export type Disco2State = {
  canvas: HTMLCanvasElement
  ctx: CanvasRenderingContext2D
  width: number
  height: number
  freqData: Uint8Array
  energyBuf: number[]
  lastBeat: number
  shakeMag: number
  shakeX: number
  shakeY: number
  t: number
  lastTs: number
  cells: Disco2Cell[]
}

function cellHue(_col: number, row: number) {
  const t = row / (ROWS - 1)
  return 210 + t * 100
}

function buildCells(): Disco2Cell[] {
  const cells: Disco2Cell[] = []
  for (let row = 0; row < ROWS; row++) {
    for (let col = 0; col < COLS; col++) {
      const cx = col - (COLS - 1) / 2
      const cy = row - (ROWS - 1) / 2
      const dist = Math.sqrt(cx * cx + cy * cy)
      const maxD = Math.sqrt(((COLS - 1) / 2) ** 2 + ((ROWS - 1) / 2) ** 2)
      const freqT = dist / maxD
      cells.push({
        col,
        row,
        hue: cellHue(col, row),
        freqT,
        norm: 0,
        flareAngle: Math.random() * Math.PI * 2
      })
    }
  }
  return cells
}

export function createDisco2State(canvas: HTMLCanvasElement): Disco2State {
  const ctx = canvas.getContext('2d', { alpha: false })
  if (!ctx) throw new Error('2D context unavailable for DISCO 2')

  const state: Disco2State = {
    canvas,
    ctx,
    width: 0,
    height: 0,
    freqData: new Uint8Array(FFT_SIZE / 2),
    energyBuf: new Array(40).fill(0),
    lastBeat: 0,
    shakeMag: 0,
    shakeX: 0,
    shakeY: 0,
    t: 0,
    lastTs: performance.now(),
    cells: buildCells()
  }

  resizeDisco2(state, window.innerWidth, window.innerHeight)
  return state
}

export function resizeDisco2(state: Disco2State, width: number, height: number) {
  state.width = width
  state.height = height
  state.canvas.width = width
  state.canvas.height = height
}

export function renderDisco2Frame(state: Disco2State, analyser: AnalyserNode | null) {
  const { ctx } = state
  const now = performance.now()
  const dt = Math.min((now - state.lastTs) / 1000, 0.05)
  state.lastTs = now
  state.t += dt

  let bass = 0
  let isBeat = false

  const binCount = analyser ? analyser.frequencyBinCount : state.freqData.length
  const bassEnd = Math.max(1, Math.floor(binCount * 0.05))

  if (analyser) {
    analyser.getByteFrequencyData(state.freqData as unknown as Uint8Array<ArrayBuffer>)

    let bS = 0
    for (let i = 0; i < bassEnd; i++) bS += state.freqData[i]
    bass = bS / bassEnd / 255

    state.energyBuf.push(bS / bassEnd)
    state.energyBuf.shift()

    const avg = state.energyBuf.reduce((a, b) => a + b, 0) / state.energyBuf.length
    isBeat = (bS / bassEnd) > avg * 1.38 && now - state.lastBeat > 260
    if (isBeat) {
      state.lastBeat = now
      state.shakeMag = 10 + bass * 20
    }

    for (const c of state.cells) {
      const binIdx = Math.floor(c.freqT * binCount * 0.65)
      const span = Math.max(1, Math.floor(binCount * 0.02))
      let s = 0
      for (let b = 0; b < span; b++) s += state.freqData[Math.min(binIdx + b, binCount - 1)]
      c.norm = (s / span) / 255
    }
  } else {
    for (const c of state.cells) {
      c.norm = 0.04 + Math.abs(Math.sin(state.t * 1.1 + c.col * 0.5 + c.row * 0.4)) * 0.1
    }
    bass = 0.04
  }

  if (state.shakeMag > 0.3) {
    state.shakeX = (Math.random() - 0.5) * state.shakeMag
    state.shakeY = (Math.random() - 0.5) * state.shakeMag * 0.45
    state.shakeMag *= 0.72
  } else {
    state.shakeX = 0
    state.shakeY = 0
    state.shakeMag = 0
  }

  const W = state.width
  const H = state.height

  ctx.clearRect(0, 0, W, H)
  ctx.save()
  ctx.translate(state.shakeX, state.shakeY)

  const cellW = (W - GAP * (COLS + 1)) / COLS
  const cellH = (H - GAP * (ROWS + 1)) / ROWS

  for (const c of state.cells) {
    const norm = c.norm
    const hue = c.hue
    const x0 = GAP + c.col * (cellW + GAP)
    const y0 = GAP + c.row * (cellH + GAP)

    const bgL = 4 + norm * 10
    ctx.fillStyle = `hsl(${hue},80%,${bgL}%)`
    ctx.fillRect(x0, y0, cellW, cellH)

    const cx = x0 + cellW / 2
    const cy = y0 + cellH / 2
    const glowR = Math.max(cellW, cellH) * (0.5 + norm * 0.85)
    const grd = ctx.createRadialGradient(cx, cy, 0, cx, cy, glowR)
    const coreL = 55 + norm * 40
    const outerL = 20 + norm * 20
    grd.addColorStop(0, `hsla(${hue}, 100%, ${Math.min(coreL, 95)}%, ${0.08 + norm * 0.85})`)
    grd.addColorStop(0.35, `hsla(${hue}, 100%, ${outerL}%, ${0.06 + norm * 0.5})`)
    grd.addColorStop(1, `hsla(${hue}, 80%, 8%, 0)`)
    ctx.fillStyle = grd
    ctx.fillRect(x0, y0, cellW, cellH)

    if (norm > 0.08) {
      c.flareAngle += 0.018 + norm * 0.06
      const fa = c.flareAngle
      const fr = Math.min(cellW, cellH) * (0.12 + norm * 0.22)
      const fx = cx + Math.cos(fa) * fr
      const fy = cy + Math.sin(fa) * fr * 0.6

      const streakR = cellW * (0.18 + norm * 0.28)
      const sg = ctx.createRadialGradient(fx, fy, 0, fx, fy, streakR)
      const sweepA = Math.min(0.95, norm * 1.6)
      sg.addColorStop(0, `rgba(255,255,255,${sweepA})`)
      sg.addColorStop(0.2, `hsla(${hue + 20},100%,85%,${sweepA * 0.6})`)
      sg.addColorStop(1, `hsla(${hue},100%,50%,0)`)
      ctx.fillStyle = sg
      ctx.fillRect(x0, y0, cellW, cellH)

      if (norm > 0.2) {
        const tailLen = cellW * (0.3 + norm * 0.5)
        const tx = cx + Math.cos(fa + Math.PI) * tailLen
        const ty = cy + Math.sin(fa + Math.PI) * tailLen * 0.55
        ctx.save()
        ctx.globalAlpha = norm * 0.55
        ctx.strokeStyle = `hsla(${hue + 10},100%,75%,1)`
        ctx.lineWidth = 1.5 + norm * 2.5
        ctx.lineCap = 'round'
        ctx.beginPath()
        ctx.moveTo(fx, fy)
        ctx.lineTo(tx, ty)
        ctx.stroke()
        ctx.restore()
      }
    }

    ctx.save()
    ctx.globalAlpha = 0.25 + norm * 0.5
    ctx.strokeStyle = `hsl(${hue},100%,${60 + norm * 35}%)`
    ctx.lineWidth = 0.8 + norm * 1.5
    ctx.shadowColor = `hsl(${hue},100%,65%)`
    ctx.shadowBlur = 4 + norm * 18
    ctx.strokeRect(x0 + 1, y0 + 1, cellW - 2, cellH - 2)
    ctx.restore()

    if (isBeat && norm > 0.25) {
      ctx.save()
      ctx.globalAlpha = (norm - 0.2) * 1.2
      ctx.fillStyle = `hsla(${hue},60%,95%,0.85)`
      ctx.fillRect(x0, y0, cellW, cellH)
      ctx.restore()
    }
  }

  ctx.globalAlpha = 0.25
  ctx.fillStyle = '#080810'
  for (let r = 0; r <= ROWS; r++) {
    const gy = r * (cellH + GAP)
    ctx.fillRect(0, gy, W, GAP)
  }
  for (let c = 0; c <= COLS; c++) {
    const gx = c * (cellW + GAP)
    ctx.fillRect(gx, 0, GAP, H)
  }
  ctx.globalAlpha = 1

  if (isBeat) {
    ctx.save()
    ctx.globalAlpha = 0.18 + bass * 0.2
    ctx.fillStyle = `hsl(${270 + bass * 40},100%,70%)`
    ctx.fillRect(0, 0, W, H)
    ctx.restore()
  }

  ctx.restore()
}
