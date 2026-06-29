// Genera iconos PNG (anillo de progreso sobre degradado) sin dependencias externas.
import { deflateSync } from 'node:zlib'
import { writeFileSync, mkdirSync } from 'node:fs'

const CRC = (() => {
  const t = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    t[n] = c >>> 0
  }
  return (buf) => {
    let c = 0xffffffff
    for (let i = 0; i < buf.length; i++) c = t[(c ^ buf[i]) & 0xff] ^ (c >>> 8)
    return (c ^ 0xffffffff) >>> 0
  }
})()

function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0)
  const t = Buffer.from(type, 'ascii')
  const body = Buffer.concat([t, data])
  const crc = Buffer.alloc(4); crc.writeUInt32BE(CRC(body), 0)
  return Buffer.concat([len, body, crc])
}

function png(size, draw) {
  const px = Buffer.alloc(size * size * 4)
  draw(px, size)
  // filtrar (filter 0 por scanline)
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    px.copy(raw, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4)
  }
  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0); ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8; ihdr[9] = 6; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10])
  return Buffer.concat([sig, chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0))])
}

function lerp(a, b, t) { return Math.round(a + (b - a) * t) }

function drawIcon(rounded) {
  return (px, size) => {
    const cx = size / 2, cy = size / 2
    const ringR = size * 0.31, ringW = size * 0.092, dotR = size * 0.082
    const radius = size * 0.225 // esquinas redondeadas (squircle aprox.)
    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const i = (y * size + x) * 4
        // degradado diagonal azul->verde
        const t = (x + y) / (2 * size)
        let r = lerp(0x0a, 0x34, t), g = lerp(0x84, 0xc7, t), b = lerp(0xff, 0x59, t), a = 255
        // máscara de esquinas redondeadas
        if (rounded) {
          const dx = Math.max(radius - x, x - (size - radius), 0)
          const dy = Math.max(radius - y, y - (size - radius), 0)
          if (Math.hypot(dx, dy) > radius) a = 0
        }
        // anillo blanco (con hueco arriba para efecto "progreso")
        const dxc = x - cx, dyc = y - cy
        const dist = Math.hypot(dxc, dyc)
        const ang = (Math.atan2(dyc, dxc) * 180) / Math.PI // -180..180
        const inRing = Math.abs(dist - ringR) < ringW / 2
        const gapStart = -120, gapEnd = -60 // pequeño hueco arriba-izq
        const inGap = ang > gapStart && ang < gapEnd
        if (inRing && !inGap) { r = 255; g = 255; b = 255 }
        if (dist < dotR) { r = 255; g = 255; b = 255 }
        px[i] = r; px[i + 1] = g; px[i + 2] = b; px[i + 3] = a
      }
    }
  }
}

mkdirSync('public', { recursive: true })
writeFileSync('public/pwa-512.png', png(512, drawIcon(true)))
writeFileSync('public/pwa-192.png', png(192, drawIcon(true)))
writeFileSync('public/apple-touch-icon.png', png(180, drawIcon(false)))
writeFileSync('public/maskable-512.png', png(512, drawIcon(false)))
console.log('Iconos generados en public/')
