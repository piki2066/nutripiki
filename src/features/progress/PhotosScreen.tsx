import { useEffect, useRef, useState, type ChangeEvent } from 'react'
import { AppHeader } from '@/components/AppHeader'
import { Icon } from '@/components/Icon'
import { Sheet } from '@/components/Sheet'
import { EmptyState } from '@/components/ui'
import { usePhotos } from '@/hooks/useData'
import { addPhoto, deletePhoto } from '@/db/repo'
import type { ProgressPhoto } from '@/db/types'
import { friendlyDate, todayKey } from '@/lib/date'
import { useUI } from '@/lib/store'

/** URL de objeto para un Blob, creada y revocada de forma segura. */
function useBlobUrl(blob?: Blob | null): string | null {
  const [url, setUrl] = useState<string | null>(null)
  useEffect(() => {
    if (!blob) { setUrl(null); return }
    const u = URL.createObjectURL(blob)
    setUrl(u)
    return () => URL.revokeObjectURL(u)
  }, [blob])
  return url
}

function PhotoThumb({ photo, onOpen }: { photo: ProgressPhoto; onOpen: () => void }) {
  const url = useBlobUrl(photo.blob)
  return (
    <button
      onClick={onOpen}
      className="col gap-1"
      style={{ background: 'none', padding: 0, textAlign: 'left', alignItems: 'stretch' }}
    >
      <div style={{ aspectRatio: '1', borderRadius: 'var(--r-md)', overflow: 'hidden', background: 'var(--fill)' }}>
        {url && <img src={url} alt={`Foto ${photo.date}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />}
      </div>
      <span className="cap dim">{friendlyDate(photo.date)}</span>
    </button>
  )
}

export default function PhotosScreen() {
  const photos = usePhotos() ?? []
  const toast = useUI((s) => s.toast)
  const fileRef = useRef<HTMLInputElement>(null)

  const [pending, setPending] = useState<File | null>(null)
  const [note, setNote] = useState('')
  const [selected, setSelected] = useState<ProgressPhoto | null>(null)

  const pendingUrl = useBlobUrl(pending)
  const selectedUrl = useBlobUrl(selected?.blob)

  function onPick(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null
    e.target.value = '' // permite volver a elegir la misma foto
    if (!file) return
    setNote('')
    setPending(file)
  }

  async function savePending() {
    if (!pending) return
    await addPhoto({ date: todayKey(), blob: pending, note: note.trim() || undefined })
    toast('Foto guardada', { icon: 'check' })
    setPending(null)
    setNote('')
  }

  async function removeSelected() {
    if (!selected) return
    await deletePhoto(selected.id)
    toast('Foto eliminada')
    setSelected(null)
  }

  return (
    <div className="screen">
      <AppHeader back title="Fotos de progreso" />

      <input ref={fileRef} type="file" accept="image/*" capture="environment" hidden onChange={onPick} />

      <button
        className="btn btn--grad btn--full"
        style={{ marginBottom: 16 }}
        onClick={() => fileRef.current?.click()}
      >
        <Icon name="camera" size={20} /> Añadir foto
      </button>

      {photos.length ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10 }}>
          {photos.map((p) => <PhotoThumb key={p.id} photo={p} onOpen={() => setSelected(p)} />)}
        </div>
      ) : (
        <EmptyState
          icon="camera"
          title="Sin fotos todavía"
          sub="Añade fotos para seguir tu progreso a lo largo del tiempo."
        />
      )}

      {/* Confirmar nueva foto + nota opcional */}
      <Sheet open={!!pending} onClose={() => setPending(null)} title="Nueva foto">
        <div className="col gap-3" style={{ paddingBottom: 10 }}>
          {pendingUrl && (
            <img
              src={pendingUrl} alt="Vista previa"
              style={{ width: '100%', maxHeight: 320, objectFit: 'contain', borderRadius: 'var(--r-md)', background: 'var(--fill)' }}
            />
          )}
          <div className="field">
            <span className="label">Nota (opcional)</span>
            <textarea
              className="textarea" placeholder="Peso, sensaciones, condiciones de luz…"
              value={note} onChange={(e) => setNote(e.target.value)}
            />
          </div>
          <button className="btn btn--grad btn--full" onClick={savePending}>Guardar foto</button>
        </div>
      </Sheet>

      {/* Detalle a tamaño grande */}
      <Sheet
        open={!!selected}
        onClose={() => setSelected(null)}
        full
        title={selected ? friendlyDate(selected.date) : ''}
      >
        {selected && (
          <div className="col gap-3" style={{ padding: 16 }}>
            {selectedUrl && (
              <img src={selectedUrl} alt={`Foto ${selected.date}`} style={{ width: '100%', borderRadius: 'var(--r-md)' }} />
            )}
            {selected.note && <p className="cap">{selected.note}</p>}
            <button className="btn btn--danger btn--full" onClick={removeSelected}>
              <Icon name="trash" size={18} /> Eliminar foto
            </button>
          </div>
        )}
      </Sheet>
    </div>
  )
}
