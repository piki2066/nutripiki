// Genera los iconos PNG a partir de public/favicon.svg (logo "NP" dorado sobre
// fondo carbón). Rasteriza el SVG con QuickLook (qlmanage) y redimensiona con sips.
// Solo macOS. Uso:  node scripts/gen-icons.mjs
import { execFileSync } from 'node:child_process'
import { copyFileSync, mkdirSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'

const SVG = 'public/favicon.svg'
const tmp = join(tmpdir(), 'nutripiki-icons')
mkdirSync(tmp, { recursive: true })
mkdirSync('public', { recursive: true })

// 1) Rasteriza el SVG a 512×512 con QuickLook
execFileSync('qlmanage', ['-t', '-s', '512', '-o', tmp, SVG], { stdio: 'ignore' })
const base = join(tmp, 'favicon.svg.png')

// 2) Copias y redimensionados
copyFileSync(base, 'public/pwa-512.png')
copyFileSync(base, 'public/maskable-512.png')
execFileSync('sips', ['-z', '192', '192', base, '--out', 'public/pwa-192.png'], { stdio: 'ignore' })
execFileSync('sips', ['-z', '180', '180', base, '--out', 'public/apple-touch-icon.png'], { stdio: 'ignore' })

rmSync(tmp, { recursive: true, force: true })
console.log('Iconos generados en public/ (NP dorado sobre carbón)')
