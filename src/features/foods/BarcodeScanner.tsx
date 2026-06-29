import { useEffect, useRef, useState } from 'react'
import { BrowserMultiFormatReader } from '@zxing/browser'
import { Sheet } from '@/components/Sheet'
import { Icon } from '@/components/Icon'

interface Props {
  open: boolean
  onClose: () => void
  onDetected: (code: string) => void
}

/** Escáner de código de barras con la cámara (ZXing). */
export function BarcodeScanner({ open, onClose, onDetected }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [manual, setManual] = useState('')

  useEffect(() => {
    if (!open) return
    let stop: (() => void) | undefined
    let cancelled = false
    const reader = new BrowserMultiFormatReader()
    setError(null)

    reader
      .decodeFromVideoDevice(undefined, videoRef.current!, (result, _err, controls) => {
        if (cancelled) return
        stop = () => controls.stop()
        if (result) {
          controls.stop()
          onDetected(result.getText())
        }
      })
      .catch(() => {
        setError('No se pudo acceder a la cámara. Puedes introducir el código a mano.')
      })

    return () => {
      cancelled = true
      try { stop?.() } catch { /* noop */ }
    }
  }, [open, onDetected])

  return (
    <Sheet open={open} onClose={onClose} full title="Escanear código">
      <div className="col gap-3">
        <div style={{ position: 'relative', borderRadius: 18, overflow: 'hidden', background: '#000', aspectRatio: '4/3' }}>
          <video ref={videoRef} playsInline muted style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          <div style={{
            position: 'absolute', inset: '18% 12%', border: '3px solid rgba(255,255,255,0.9)',
            borderRadius: 14, boxShadow: '0 0 0 2000px rgba(0,0,0,0.35)',
          }} />
          <div style={{ position: 'absolute', left: '12%', right: '12%', top: '50%', height: 2, background: 'var(--bad)', boxShadow: '0 0 8px var(--bad)' }} />
        </div>
        <p className="cap dim center-all" style={{ textAlign: 'center' }}>
          {error ?? 'Apunta al código de barras del producto'}
        </p>
        <div className="divider" />
        <span className="label">¿No funciona la cámara? Introduce el código (EAN/UPC)</span>
        <form className="row gap-2" onSubmit={(e) => { e.preventDefault(); if (manual.trim()) onDetected(manual.trim()) }}>
          <input className="input grow" inputMode="numeric" placeholder="8410000000000"
            value={manual} onChange={(e) => setManual(e.target.value)} />
          <button className="btn btn--primary" type="submit"><Icon name="search" size={18} /></button>
        </form>
      </div>
    </Sheet>
  )
}
