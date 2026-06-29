import { type ChangeEvent, type ReactNode, useRef, useState } from 'react'
import { AppHeader } from '@/components/AppHeader'
import { Icon, type IconName } from '@/components/Icon'
import { Sheet } from '@/components/Sheet'
import { Segmented, Toggle } from '@/components/ui'
import { useSettings } from '@/hooks/useData'
import { saveSettings, wipeAllData } from '@/db/repo'
import { db } from '@/db/db'
import { useUI } from '@/lib/store'
import { todayKey } from '@/lib/date'
import type { AppSettings } from '@/db/types'

const ACCENTS = ['#0a84ff', '#34c759', '#ff375f', '#ff9f0a', '#5e5ce6', '#ff2d55']

export default function SettingsScreen() {
  const settings = useSettings()
  const toast = useUI((s) => s.toast)
  const fileRef = useRef<HTMLInputElement>(null)
  const [pendingImport, setPendingImport] = useState<Record<string, unknown> | null>(null)
  const [confirmWipe, setConfirmWipe] = useState(false)

  // ---- Exportar ----
  async function exportData() {
    try {
      const names = db.tables.map((t) => t.name)
      const arrays = await Promise.all(db.tables.map((t) => t.toArray()))
      const data: Record<string, unknown[]> = {}
      names.forEach((name, i) => {
        // Las fotos contienen Blobs no serializables: se omiten.
        data[name] = name === 'photos' ? [] : arrays[i]
      })
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `nutripal-backup-${todayKey()}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
      toast('Datos exportados', { icon: 'check' })
    } catch {
      toast('No se pudo exportar', { icon: 'info' })
    }
  }

  // ---- Importar ----
  function onFileChange(e: ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = '' // permite reelegir el mismo archivo
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result))
        if (parsed && typeof parsed === 'object') setPendingImport(parsed as Record<string, unknown>)
        else toast('Archivo no válido', { icon: 'info' })
      } catch {
        toast('Archivo no válido', { icon: 'info' })
      }
    }
    reader.readAsText(file)
  }

  async function doImport() {
    if (!pendingImport) return
    const known = new Set(db.tables.map((t) => t.name))
    for (const [name, rows] of Object.entries(pendingImport)) {
      if (!known.has(name) || !Array.isArray(rows)) continue
      try {
        await db.table(name).bulkPut(rows)
      } catch {
        // tabla con datos incompatibles: se ignora
      }
    }
    setPendingImport(null)
    toast('Datos importados', { icon: 'check' })
  }

  // ---- Borrar ----
  async function doWipe() {
    await wipeAllData()
    toast('Datos borrados', { icon: 'check' })
    location.reload()
  }

  return (
    <div className="screen">
      <AppHeader back title="Ajustes" />

      {/* Apariencia */}
      <div className="section-title">Apariencia</div>
      <div className="card col gap-4">
        <div className="col gap-2">
          <span className="cap">Tema</span>
          <Segmented<AppSettings['theme']>
            options={[
              { value: 'dark', label: 'Oscuro' },
              { value: 'light', label: 'Claro' },
              { value: 'system', label: 'Sistema' },
            ]}
            value={settings.theme}
            onChange={(theme) => saveSettings({ theme })}
          />
        </div>
        <div className="col gap-2">
          <span className="cap">Color de acento</span>
          <div className="row gap-3" style={{ flexWrap: 'wrap' }}>
            {ACCENTS.map((c) => {
              const on = settings.accent.toLowerCase() === c.toLowerCase()
              return (
                <button
                  key={c}
                  className="center-all"
                  onClick={() => saveSettings({ accent: c })}
                  aria-label={`Color ${c}`}
                  aria-pressed={on}
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 999,
                    background: c,
                    border: on ? '2px solid var(--text)' : '2px solid transparent',
                    boxShadow: on ? '0 0 0 3px var(--bg)' : 'none',
                  }}
                >
                  {on && <Icon name="check" size={20} color="#fff" />}
                </button>
              )
            })}
          </div>
        </div>
      </div>

      {/* Diario */}
      <div className="section-title">Diario</div>
      <div className="list">
        <ToggleRow
          icon="list"
          title="Mostrar micronutrientes"
          sub="Fibra, azúcar, sodio y más en el diario"
          on={settings.showMicros}
          onChange={(showMicros) => saveSettings({ showMicros })}
        />
        <ToggleRow
          icon="apple"
          title="Modo Net Carbs (keto)"
          sub="Resta la fibra de los carbohidratos"
          on={settings.netCarbsMode}
          onChange={(netCarbsMode) => saveSettings({ netCarbsMode })}
        />
      </div>

      {/* Recordatorios */}
      <div className="section-title">Recordatorios</div>
      <div className="list">
        <ToggleRow
          icon="bell"
          title="Recordatorios"
          sub="Avisos para registrar tus comidas"
          on={settings.remindersEnabled}
          onChange={(remindersEnabled) => saveSettings({ remindersEnabled })}
        />
      </div>

      {/* Datos */}
      <div className="section-title">Datos</div>
      <div className="list">
        <ActionRow icon="download" title="Exportar datos (JSON)" sub="Copia de seguridad local" onClick={exportData} />
        <ActionRow icon="copy" title="Importar datos (JSON)" sub="Restaurar desde un backup" onClick={() => fileRef.current?.click()} />
      </div>
      <button className="btn btn--danger btn--full" style={{ marginTop: 12 }} onClick={() => setConfirmWipe(true)}>
        <Icon name="trash" size={20} /> Borrar todos los datos
      </button>
      <input ref={fileRef} type="file" accept="application/json" onChange={onFileChange} style={{ display: 'none' }} />

      {/* Acerca de */}
      <div className="section-title">Acerca de</div>
      <div className="card col gap-1">
        <span className="h3">NutriPal 1.0</span>
        <span className="cap dim">100% local y privado. Tus datos nunca salen de este dispositivo.</span>
      </div>

      {/* Confirmar importación */}
      <Sheet open={!!pendingImport} onClose={() => setPendingImport(null)} title="Importar datos">
        <div className="col gap-3" style={{ paddingBottom: 10 }}>
          <p className="cap">
            Se combinarán los datos del archivo con los actuales. Las entradas con el mismo identificador se sobrescribirán. ¿Continuar?
          </p>
          <div className="row gap-3">
            <button className="btn btn--soft btn--full" onClick={() => setPendingImport(null)}>Cancelar</button>
            <button className="btn btn--grad btn--full" onClick={doImport}>Importar</button>
          </div>
        </div>
      </Sheet>

      {/* Confirmar borrado */}
      <Sheet open={confirmWipe} onClose={() => setConfirmWipe(false)} title="Borrar todos los datos">
        <div className="col gap-3" style={{ paddingBottom: 10 }}>
          <p className="cap">
            Se eliminarán de forma permanente tu perfil, diario, recetas, peso, medidas y fotos. Esta acción no se puede deshacer.
          </p>
          <div className="row gap-3">
            <button className="btn btn--soft btn--full" onClick={() => setConfirmWipe(false)}>Cancelar</button>
            <button className="btn btn--danger btn--full" onClick={doWipe}>Borrar todo</button>
          </div>
        </div>
      </Sheet>
    </div>
  )
}

function ToggleRow({
  icon, title, sub, on, onChange,
}: {
  icon: IconName
  title: ReactNode
  sub?: ReactNode
  on: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div className="list-item">
      <span style={{ color: 'var(--brand)', display: 'flex' }}><Icon name={icon} size={22} /></span>
      <span className="col" style={{ gap: 1, minWidth: 0, alignItems: 'flex-start' }}>
        <span className="list-item__title ellipsis">{title}</span>
        {sub && <span className="list-item__sub ellipsis">{sub}</span>}
      </span>
      <span className="list-item__trail"><Toggle on={on} onChange={onChange} /></span>
    </div>
  )
}

function ActionRow({
  icon, title, sub, onClick,
}: {
  icon: IconName
  title: ReactNode
  sub?: ReactNode
  onClick: () => void
}) {
  return (
    <button className="list-item list-item--tap" onClick={onClick} style={{ background: 'none' }}>
      <span style={{ color: 'var(--brand)', display: 'flex' }}><Icon name={icon} size={22} /></span>
      <span className="col" style={{ gap: 1, minWidth: 0, alignItems: 'flex-start' }}>
        <span className="list-item__title ellipsis">{title}</span>
        {sub && <span className="list-item__sub ellipsis">{sub}</span>}
      </span>
      <span className="list-item__trail"><Icon name="chevron-right" size={18} color="var(--text-3)" /></span>
    </button>
  )
}
