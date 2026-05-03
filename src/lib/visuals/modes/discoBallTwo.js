import * as THREE from 'three'
import { ensureCache } from '../shared.js'

const LIGHT_COLORS = [
  0xff0033, 0xff6600, 0xffcc00, 0x00ff66,
  0x0099ff, 0xcc00ff, 0xff0099, 0x00ffee,
  0xff3300, 0x33ff00, 0x0033ff, 0xff00cc,
  0xffff00, 0x00ffff, 0xff6699, 0x99ff66,
  0x6666ff, 0xff9900, 0x00ff99, 0xcc33ff
]

function initDiscoScene(width, height) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
  const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1
  renderer.setPixelRatio(dpr)
  renderer.setSize(width, height, false)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x000000)
  scene.fog = new THREE.Fog(0x000000, 20, 45)

  const camera = new THREE.PerspectiveCamera(55, width / height, 0.1, 100)
  camera.position.set(0, 4, 9)
  camera.lookAt(0, 2, 0)

  const ballGroup = new THREE.Group()
  ballGroup.position.set(0, 2, 0)
  scene.add(ballGroup)

  const wireMesh = new THREE.Mesh(
    new THREE.CylinderGeometry(0.006, 0.006, 2.4, 6),
    new THREE.MeshStandardMaterial({ color: 0xcccccc, metalness: 1, roughness: 0.1 })
  )
  wireMesh.position.set(0, 3.2, 0)
  scene.add(wireMesh)

  const tileGeo = new THREE.PlaneGeometry(0.15, 0.15)
  const tiles = []
  const ROWS = 30

  for (let row = 0; row < ROWS; row++) {
    const phi = Math.PI * (row + 0.5) / ROWS
    const sinP = Math.sin(phi)
    const cosP = Math.cos(phi)
    const n = Math.max(1, Math.round((2 * Math.PI * sinP) / 0.17))
    for (let col = 0; col < n; col++) {
      const theta = (2 * Math.PI * col / n) + (row % 2) * 0.08
      const R = 1.88
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(1, 1, 1),
        metalness: 1,
        roughness: 0,
        emissive: new THREE.Color(1, 1, 1),
        emissiveIntensity: 1.4
      })
      const m = new THREE.Mesh(tileGeo, mat)
      m.position.set(R * sinP * Math.cos(theta), R * cosP, R * sinP * Math.sin(theta))
      m.lookAt(m.position.clone().multiplyScalar(2))
      m.rotateZ((Math.random() - 0.5) * 0.2)
      ballGroup.add(m)
      tiles.push({ mat, hue: (row * 23 + col * 13) % 360 })
    }
  }

  const pointLights = []
  LIGHT_COLORS.forEach((col, i) => {
    const pl = new THREE.PointLight(col, 5, 12)
    const phi = Math.acos(-1 + (2 * i) / LIGHT_COLORS.length)
    const theta = Math.sqrt(LIGHT_COLORS.length * Math.PI) * phi
    const r = 4
    pl.position.set(
      r * Math.sin(phi) * Math.cos(theta),
      r * Math.cos(phi) * 1.2 + 2,
      r * Math.sin(phi) * Math.sin(theta)
    )
    scene.add(pl)

    const orb = new THREE.Mesh(
      new THREE.SphereGeometry(0.06, 8, 8),
      new THREE.MeshBasicMaterial({ color: col })
    )
    orb.position.copy(pl.position)
    scene.add(orb)
    pointLights.push({ pl, orb, idx: i })
  })

  scene.add(new THREE.AmbientLight(0xffffff, 1.5))
  const topWhite = new THREE.PointLight(0xffffff, 8, 18)
  topWhite.position.set(0, 7, 0)
  scene.add(topWhite)

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(50, 50),
    new THREE.MeshStandardMaterial({ color: 0x080810, metalness: 0.7, roughness: 0.4 })
  )
  floor.rotation.x = -Math.PI / 2
  floor.position.y = -1.9
  scene.add(floor)

  const grid = new THREE.GridHelper(50, 50, 0x111133, 0x0a0a22)
  grid.position.y = -1.89
  scene.add(grid)

  const RAY_COUNT = 12
  const rayLights = []
  for (let i = 0; i < RAY_COUNT; i++) {
    const col = new THREE.Color().setHSL(i / RAY_COUNT, 1, 0.6)
    const spot = new THREE.SpotLight(col, 8, 50, Math.PI / 22, 0.05, 1)
    const a = (i / RAY_COUNT) * Math.PI * 2
    spot.position.set(Math.cos(a) * 9, (i % 3) * 1.5, Math.sin(a) * 9)
    spot.target.position.set(0, 2, 0)
    scene.add(spot)
    scene.add(spot.target)
    rayLights.push({ spot, baseAngle: a })
  }

  const shafts = []
  for (let i = 0; i < RAY_COUNT; i++) {
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(i / RAY_COUNT, 1, 0.5),
      transparent: true,
      opacity: 0.06,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending
    })
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.04, 0.4, 10, 8, 1, true), mat)
    scene.add(m)
    shafts.push({ mesh: m, mat, baseAngle: (i / RAY_COUNT) * Math.PI * 2 })
  }

  const scatterDots = []
  const makeDot = (x, y, z, isFloor) => {
    const mat = new THREE.MeshBasicMaterial({
      color: new THREE.Color().setHSL(Math.random(), 1, 0.7),
      transparent: true,
      opacity: 0
    })
    const geo = isFloor ? new THREE.CircleGeometry(0.1, 8) : new THREE.SphereGeometry(0.07, 6, 6)
    const m = new THREE.Mesh(geo, mat)
    if (isFloor) m.rotation.x = -Math.PI / 2
    m.position.set(x, y, z)
    scene.add(m)
    scatterDots.push({ mat, phase: Math.random() * Math.PI * 2, spd: 0.3 + Math.random() })
  }

  for (let i = 0; i < 140; i++) makeDot((Math.random() - 0.5) * 20, -1.88, (Math.random() - 0.5) * 20, true)
  for (let i = 0; i < 80; i++) {
    const s = i % 3
    if (s === 0) makeDot((Math.random() - 0.5) * 18, (Math.random() - 0.5) * 8 + 2, -11, false)
    else if (s === 1) makeDot(-11, (Math.random() - 0.5) * 8 + 2, (Math.random() - 0.5) * 18, false)
    else makeDot(11, (Math.random() - 0.5) * 8 + 2, (Math.random() - 0.5) * 18, false)
  }
  for (let i = 0; i < 40; i++) makeDot((Math.random() - 0.5) * 16, 6, (Math.random() - 0.5) * 16, false)

  return {
    renderer,
    scene,
    camera,
    ballGroup,
    tiles,
    pointLights,
    topWhite,
    rayLights,
    shafts,
    scatterDots,
    t: 0,
    fBass: 0,
    beatFlash: 0,
    swingPhase: 0,
    rotDir: 1,
    prevBass: 0,
    rotY: 0,
    isBeat: false,
    bass: 0,
    energyHist: new Array(43).fill(0),
    lastBeatTime: 0,
    bpmHistory: [],
    bpm: 120,
    lastTime: 0,
    width,
    height
  }
}

function resizeIfNeeded(cache, width, height) {
  if (cache.width === width && cache.height === height) return
  cache.width = width
  cache.height = height
  const dpr = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 2) : 1
  cache.renderer.setPixelRatio(dpr)
  cache.renderer.setSize(width, height, false)
  cache.camera.aspect = width / height
  cache.camera.updateProjectionMatrix()
}

export function drawDiscoBallTwo(ctx, canvas, dataArray, _timeArray, state) {
  const cache = ensureCache(state, 'disco-ball-two', () => initDiscoScene(canvas.width, canvas.height))
  resizeIfNeeded(cache, canvas.width, canvas.height)

  const now = performance.now()
  const dt = Math.min(((now - cache.lastTime) || 16.7) / 1000, 0.05)
  cache.lastTime = now
  cache.t += dt

  // readAudio() logic mirrored from the provided DISCO HTML.
  const bEnd = Math.max(1, Math.floor(dataArray.length * 0.04))
  let bs = 0
  for (let i = 0; i < bEnd; i++) bs += dataArray[i]
  cache.bass = bs / bEnd / 255

  const en = bs / bEnd
  cache.energyHist.push(en)
  cache.energyHist.shift()
  const avg = cache.energyHist.reduce((a, b) => a + b, 0) / cache.energyHist.length
  cache.isBeat = en > avg * 1.3 && (now - cache.lastBeatTime) > 250
  if (cache.isBeat) {
    const delta = now - cache.lastBeatTime
    cache.lastBeatTime = now
    if (delta > 200 && delta < 2000) {
      cache.bpmHistory.push(60000 / delta)
      if (cache.bpmHistory.length > 12) cache.bpmHistory.shift()
      cache.bpm = Math.max(40, Math.min(220, cache.bpmHistory.reduce((a, b) => a + b, 0) / cache.bpmHistory.length))
    }
  }

  cache.fBass += (cache.bass - cache.fBass) * 0.3
  if (cache.isBeat) cache.beatFlash = 1
  cache.beatFlash *= 0.8

  if (cache.fBass > 0.42 && cache.prevBass <= 0.42) cache.rotDir *= -1
  cache.prevBass = cache.fBass

  const bpmFactor = cache.bpm / 120
  cache.rotY += (0.008 + cache.fBass * 0.07) * bpmFactor * cache.rotDir
  cache.ballGroup.rotation.y = cache.rotY

  const swingFreq = 0.4 + cache.fBass * 2.5
  cache.swingPhase += dt * swingFreq * Math.PI * 2
  cache.ballGroup.rotation.z = Math.sin(cache.swingPhase) * (0.03 + cache.fBass * 0.28 + cache.beatFlash * 0.06)
  cache.ballGroup.rotation.x = Math.sin(cache.swingPhase * 0.38 + 1) * (0.01 + cache.fBass * 0.06)

  cache.tiles.forEach(({ mat, hue }) => {
    const cycle = ((cache.t * 18 + hue) % 360) / 360
    mat.color.setHSL(cycle, cache.fBass * 0.6, 0.97)
    mat.emissive.setHSL(cycle, cache.fBass * 0.9, 0.5)
    const target = 1.2 + cache.fBass * 2.2 + cache.beatFlash * 1.5
    mat.emissiveIntensity += (target - mat.emissiveIntensity) * 0.1
  })

  cache.pointLights.forEach(({ pl, orb, idx }) => {
    const orbitSpeed = 0.03 + cache.fBass * 0.18
    const a = (idx / LIGHT_COLORS.length) * Math.PI * 2 + cache.t * orbitSpeed * (1 + idx * 0.03)
    const phi = Math.acos(-1 + (2 * idx) / LIGHT_COLORS.length)
    const r = 3.5 + cache.fBass * 1 + Math.sin(cache.t * 1.2 + idx) * 0.3

    pl.position.set(
      r * Math.sin(phi) * Math.cos(a),
      r * Math.cos(phi) * 1.2 + 2,
      r * Math.sin(phi) * Math.sin(a)
    )
    orb.position.copy(pl.position)
    pl.intensity = 5 + cache.fBass * 20 + cache.beatFlash * 12

    const hue = ((cache.t * 14 + idx * 18) % 360) / 360
    pl.color.setHSL(hue, 1, 0.6)
    orb.material.color.setHSL(hue, 1, 0.7)
  })

  cache.topWhite.intensity = 7 + cache.fBass * 10 + cache.beatFlash * 8

  cache.rayLights.forEach(({ spot, baseAngle }, i) => {
    const sweepSpeed = 0.025 + cache.fBass * 0.22
    const a = baseAngle + cache.t * sweepSpeed * (i % 2 === 0 ? 1 : -1)
    spot.position.set(Math.cos(a) * 9, (i % 3) * 1.5, Math.sin(a) * 9)
    spot.intensity = 8 + cache.fBass * 40 + cache.beatFlash * 28
    const hue = ((cache.t * 20 + i * 30) % 360) / 360
    spot.color.setHSL(hue, 1, 0.65)
  })

  cache.shafts.forEach(({ mesh, mat, baseAngle }, i) => {
    const sweepSpeed = 0.018 + cache.fBass * 0.18
    const a = baseAngle + cache.t * sweepSpeed * (i % 2 === 0 ? 1 : -1)
    mesh.position.set(Math.cos(a) * 2.5, 2, Math.sin(a) * 2.5)
    mesh.lookAt(0, 2, 0)
    mesh.rotateX(Math.PI / 2)
    const hue = ((cache.t * 14 + i * 30) % 360) / 360
    mat.color.setHSL(hue, 1, 0.6)
    const target = 0.04 + cache.fBass * 0.25 + cache.beatFlash * 0.2
    mat.opacity += (target - mat.opacity) * 0.12
  })

  cache.scatterDots.forEach((d, i) => {
    d.phase += dt * d.spd * (0.5 + cache.fBass * 2) * cache.rotDir
    const hue = ((cache.t * 22 + i * 17) % 360) / 360
    d.mat.color.setHSL(hue, 1, 0.75)
    const base = 0.05 + Math.abs(Math.sin(d.phase * 0.3)) * 0.05
    const target = base + cache.fBass * 0.85 + cache.beatFlash * 0.5
    d.mat.opacity += (Math.min(1, target) - d.mat.opacity) * 0.14
  })

  cache.renderer.render(cache.scene, cache.camera)
  ctx.drawImage(cache.renderer.domElement, 0, 0, canvas.width, canvas.height)
}
