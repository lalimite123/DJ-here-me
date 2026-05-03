import { drawParticlesWave } from './modes/particlesWave.js'
import { drawSpectrumBars } from './modes/spectrumBars.js'
import { drawWaveformRibbon } from './modes/waveformRibbon.js'
import { drawRadialBurst } from './modes/radialBurst.js'
import { drawVortexTunnel } from './modes/vortexTunnel.js'
import { drawLissajousBloom } from './modes/lissajousBloom.js'
import { drawNeonTunnel } from './modes/neonTunnel.js'
import { drawStarburstNova } from './modes/starburstNova.js'
import { drawAuroraCurtain } from './modes/auroraCurtain.js'
import { drawFractalWeb } from './modes/fractalWeb.js'
import { drawMatrixColumns } from './modes/matrixColumns.js'
import { drawPrismRain } from './modes/prismRain.js'
import { drawLiquidFlow } from './modes/liquidFlow.js'
import { drawHexGridPulse } from './modes/hexGridPulse.js'
import { drawAshFall } from './modes/ashFall.js'
import { drawSpipaCircle } from './modes/spipaCircle.js'
import { drawCrystalParallax } from './modes/crystalParallax.js'
import { drawHelloLight } from './modes/helloLight.js'
import { drawRymdField } from './modes/rymdField.js'
import { drawMetaballsField } from './modes/metaballsField.js'
import { drawMotionTrails } from './modes/motionTrails.js'
import { drawSvgWaveField } from './modes/svgWaveField.js'
import { drawRisingBubbles } from './modes/risingBubbles.js'
import { drawNeonTubeTrail } from './modes/neonTubeTrail.js'
import { drawDiscoBallOne } from './modes/discoBallOne.js'
import { drawDiscoBallTwo } from './modes/discoBallTwo.js'

export const VISUALIZER_DRAWERS = {
  '1': drawParticlesWave,
  '2': drawSpectrumBars,
  '3': drawWaveformRibbon,
  '4': drawRadialBurst,
  '5': drawVortexTunnel,
  '6': drawLissajousBloom,
  '7': drawNeonTunnel,
  '8': drawStarburstNova,
  '9': drawAuroraCurtain,
  '10': drawFractalWeb,
  '11': drawMatrixColumns,
  '12': drawPrismRain,
  '13': drawLiquidFlow,
  '14': drawHexGridPulse,
  '15': drawAshFall,
  '16': drawSpipaCircle,
  '17': drawCrystalParallax,
  '18': drawHelloLight,
  '19': drawRymdField,
  '20': drawMetaballsField,
  '21': drawMotionTrails,
  '22': drawSvgWaveField,
  '23': drawRisingBubbles,
  '24': drawNeonTubeTrail,
  '25': drawDiscoBallOne,
  '26': drawDiscoBallTwo
}
