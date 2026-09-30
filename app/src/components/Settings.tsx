import { useRef, useState } from 'react'
import { GROUPS, ZONE_ORDER, ZONES, type Zone } from '../data/dictionary'
import {
  connectExistingFile,
  connectNewFile,
  disconnectDisk,
  exportFile,
  importFile,
  isDiskConnected,
  isDiskSupported,
} from '../lib/storage'
import type { AppData, StopRule } from '../lib/types'

const ZONE_IDS = ZONE_ORDER

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
  diskOn,
  onDisk,
}: {
  data: AppData
  onChange: (next: AppData) => void
  diskOn: boolean
  onDisk: (connected: boolean) => void
}) {
  const fileInput = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

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

  const run = async (fn: () => Promise<AppData | void>, connected?: boolean) => {
    setBusy(true)
    try {
      const next = await fn()
      if (next) onChange(next)
      if (connected !== undefined) onDisk(connected)
      else onDisk(isDiskConnected())
    } catch (e) {
      if (e instanceof DOMException && e.name === 'AbortError') return
      alert(e instanceof Error ? e.message : 'Не получилось')
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <section className="card">
        <h3>Стоп-лист</h3>
        <p className="note" style={{ marginTop: 0 }}>
          Отметь, для каких зон группа считается запретом. Эти галочки живут в
          файле данных, не в GitHub.
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
        {diskOn ? (
          <p style={{ marginTop: 0 }}>
            <strong>Файл на Диске подключён.</strong> Правки пишутся в{' '}
            <code>полка-данные.json</code> в папке проекта. Яндекс.Диск сам
            развозит его на другие компьютеры, где установлен клиент.
          </p>
        ) : (
          <p style={{ marginTop: 0 }}>
            Сейчас только память этого браузера. Чтобы полка и стоп-лист жили на
            Диске, один раз открой файл <code>полка-данные.json</code> из папки
            проекта.
          </p>
        )}
        <p className="note">
          Публичную ссылку Яндекс.Диска в сайт вшивать не стоит: исходники
          приложения на GitHub открытые, ссылку оттуда кто угодно скопирует. И
          по такой ссылке файл можно только скачать, а не сохранить полку обратно.
          Туннеля у Диска нет — есть либо публичная ссылка, либо вход в аккаунт.
          Выбор файла на компьютере как раз использует уже синхронизируемую папку
          без публикации.
        </p>
        {isDiskSupported() ? (
          <div className="row">
            <button
              className="primary"
              type="button"
              disabled={busy}
              onClick={() => void run(connectExistingFile, true)}
            >
              Открыть файл на Диске
            </button>
            <button
              className="ghost"
              type="button"
              disabled={busy}
              onClick={() => void run(() => connectNewFile(data), true)}
            >
              Сохранить как новый файл
            </button>
            {diskOn && (
              <button
                className="ghost"
                type="button"
                disabled={busy}
                onClick={() => void run(async () => { await disconnectDisk() }, false)}
              >
                Отключить файл
              </button>
            )}
          </div>
        ) : (
          <p className="note">
            Подключить файл напрямую умеют Chrome и Edge. Здесь — выгрузка и
            загрузка вручную.
          </p>
        )}
        <div className="row" style={{ marginTop: 10 }}>
          <button className="ghost" type="button" onClick={() => exportFile(data)}>
            Выгрузить копию
          </button>
          <button className="ghost" type="button" onClick={() => fileInput.current?.click()}>
            Загрузить копию
          </button>
          <input
            ref={fileInput}
            type="file"
            accept="application/json,.json"
            hidden
            onChange={(e) => void onPickFile(e.target.files?.[0])}
          />
        </div>
      </section>
    </>
  )
}
