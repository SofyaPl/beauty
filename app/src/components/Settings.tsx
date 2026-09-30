import { useRef } from 'react'
import { GROUPS, ZONES, type Zone } from '../data/dictionary'
import { exportFile, importFile, localAdapter } from '../lib/storage'
import type { AppData, StopRule } from '../lib/types'

const ZONE_IDS = Object.keys(ZONES) as Zone[]

function toggleZone(rules: StopRule[], groupId: string, zone: Zone): StopRule[] {
  const existing = rules.find((r) => r.groupId === groupId)
  if (!existing) return [...rules, { groupId, zones: [zone] }]

  const zones = existing.zones.includes(zone)
    ? existing.zones.filter((z) => z !== zone)
    : [...existing.zones, zone]

  return zones.length === 0
    ? rules.filter((r) => r.groupId !== groupId)
    : rules.map((r) => (r.groupId === groupId ? { ...r, zones } : r))
}

export function Settings({
  data,
  onChange,
}: {
  data: AppData
  onChange: (next: AppData) => void
}) {
  const fileInput = useRef<HTMLInputElement>(null)

  const setStopList = (stopList: StopRule[]) =>
    onChange({ ...data, profile: { ...data.profile, stopList } })

  const onPickFile = async (file: File | undefined) => {
    if (!file) return
    try {
      onChange(await importFile(file))
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Не удалось прочитать файл')
    }
  }

  return (
    <>
      <section className="card">
        <h3>Стоп-лист</h3>
        <p className="note" style={{ marginTop: 0 }}>
          Отметь, для каких зон группа считается запретом. Требования у зон
          разные: то, что исключено для волос, для лица может быть уместно.
        </p>
        {GROUPS.filter((g) => g.kind === 'watch').map((g) => {
          const rule = data.profile.stopList.find((r) => r.groupId === g.id)
          return (
            <div className="toggle-row" key={g.id}>
              <span>{g.title}</span>
              <span className="zone-toggles">
                {ZONE_IDS.map((z) => (
                  <button
                    key={z}
                    type="button"
                    aria-pressed={rule?.zones.includes(z) ?? false}
                    onClick={() => setStopList(toggleZone(data.profile.stopList, g.id, z))}
                  >
                    {ZONES[z]}
                  </button>
                ))}
              </span>
            </div>
          )
        })}
      </section>

      <section className="card">
        <h3>Где лежат данные</h3>
        <p style={{ marginTop: 0 }}>
          <strong>{localAdapter.title}.</strong> {localAdapter.description}
        </p>
        <p className="note">
          Хранилище подключаемое: следующими планируются Яндекс.Диск, чтобы файл
          данных попадал в ту же синхронизируемую папку, где проект правится с
          компьютера, и приватный репозиторий с историей изменений.
        </p>
        <div className="row">
          <button className="ghost" type="button" onClick={() => exportFile(data)}>
            Выгрузить файл
          </button>
          <button className="ghost" type="button" onClick={() => fileInput.current?.click()}>
            Загрузить файл
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => void onPickFile(e.target.files?.[0])}
          />
        </div>
        <p className="note">
          Выгруженный JSON можно править руками в любом редакторе и загружать
          обратно — это же формат переноса между устройствами.
        </p>
      </section>
    </>
  )
}
