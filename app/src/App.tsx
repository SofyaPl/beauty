import { useEffect, useState } from 'react'
import { FORM_ORDER, FORMS, ZONE_ORDER, ZONES, type Form, type Zone } from './data/dictionary'
import { analyze, type Analysis } from './lib/analyze'
import { initStorage, isDiskConnected, saveData } from './lib/storage'
import { emptyData, inferForm, type AppData } from './lib/types'
import { ResultView } from './components/ResultView'
import { Settings } from './components/Settings'
import { Shelf } from './components/Shelf'

const ZONE_IDS = ZONE_ORDER

export default function App() {
  const [tab, setTab] = useState<'check' | 'shelf' | 'settings'>('shelf')
  const [zone, setZone] = useState<Zone>('body')
  const [form, setForm] = useState<Form>('rinse')
  const [compareId, setCompareId] = useState('')
  const [input, setInput] = useState('')
  const [result, setResult] = useState<Analysis | null>(null)
  const [data, setData] = useState<AppData>(emptyData)
  const [diskOn, setDiskOn] = useState(false)
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    void initStorage().then((d) => {
      setData(d)
      setDiskOn(isDiskConnected())
      setLoaded(true)
    })
  }, [])

  useEffect(() => {
    if (loaded) void saveData(data)
  }, [data, loaded])

  const peers = data.products.filter(
    (p) => p.era !== 'past' && p.zone === zone && inferForm(p) === form && p.inci.trim(),
  )

  useEffect(() => {
    setCompareId((id) => {
      if (peers.some((p) => p.id === id)) return id
      const prefer = peers.find((p) => p.status === 'replace') ?? peers[0]
      return prefer?.id ?? ''
    })
  }, [zone, form, data.products])

  const check = () =>
    setResult(
      analyze(input, {
        zone,
        form,
        profile: data.profile,
        baseline: peers.find((p) => p.id === compareId),
      }),
    )

  const pasteFromClipboard = async () => {
    try {
      const text = await navigator.clipboard.readText()
      if (text.trim()) setInput(text)
    } catch {
      alert(
        'Браузер не отдал буфер. Кликни в поле и вставь правой кнопкой — или открой сайт в обычном Chrome, не во встроенном окне Cursor: там Ctrl+V часто уходит в редактор.',
      )
    }
  }

  const clear = () => {
    setInput('')
    setResult(null)
  }

  const remember = () => {
    if (!result) return
    setData({
      ...data,
      checks: [
        {
          id: crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          zone,
          inci: input,
          verdict: result.headline,
        },
        ...data.checks,
      ],
    })
  }

  return (
    <div className="app">
      <h1>Полка</h1>
      <p className="sub">
        Проверка состава под свой профиль. Считается на месте — ничего не уходит в сеть.
      </p>

      <div className="tabs" role="tablist">
        <button
          className="tab"
          role="tab"
          aria-selected={tab === 'check'}
          onClick={() => setTab('check')}
        >
          Проверка
        </button>
        <button
          className="tab"
          role="tab"
          aria-selected={tab === 'shelf'}
          onClick={() => setTab('shelf')}
        >
          Полка
        </button>
        <button
          className="tab"
          role="tab"
          aria-selected={tab === 'settings'}
          onClick={() => setTab('settings')}
        >
          Настройки
        </button>
      </div>

      {tab === 'check' ? (
        <div className="split">
          <div>
            <div className="field">
              <label className="block">Для какой зоны средство</label>
              <div className="zones">
                {ZONE_IDS.map((z) => (
                  <button
                    key={z}
                    type="button"
                    className="zone"
                    aria-pressed={zone === z}
                    onClick={() => setZone(z)}
                  >
                    {ZONES[z]}
                  </button>
                ))}
              </div>
            </div>

            <div className="field">
              <label className="block">Смывается или остаётся</label>
              <div className="zones">
                {FORM_ORDER.map((f) => (
                  <button
                    key={f}
                    type="button"
                    className="zone"
                    aria-pressed={form === f}
                    onClick={() => setForm(f)}
                  >
                    {FORMS[f]}
                  </button>
                ))}
              </div>
              <p className="note">
                Мыло и крем для тела — не одно и то же. Умывалка и крем для лица тоже.
              </p>
            </div>

            <div className="field">
              <label className="block" htmlFor="compare">
                Сравнить с тем, чем пользуюсь сейчас
              </label>
              <select
                id="compare"
                value={compareId}
                onChange={(e) => setCompareId(e.target.value)}
              >
                <option value="">Не сравнивать</option>
                {peers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {peers.length === 0 && (
                <p className="note">
                  На полке нет текущего средства с этой зоной и формой — сравнение появится, когда
                  добавишь.
                </p>
              )}
            </div>

            <div className="field">
              <label className="block" htmlFor="inci">
                Состав
              </label>
              <textarea
                id="inci"
                value={input}
                placeholder="Aqua, Glycerin, Dimethicone…"
                onChange={(e) => setInput(e.target.value)}
                onPaste={(e) => {
                  const text = e.clipboardData.getData('text')
                  if (!text) return
                  e.preventDefault()
                  setInput(text)
                }}
              />
            </div>

            <div className="row">
              <button className="primary" type="button" disabled={!input.trim()} onClick={check}>
                Проверить
              </button>
              <button className="ghost" type="button" onClick={() => void pasteFromClipboard()}>
                Вставить
              </button>
              {result && (
                <button className="ghost" type="button" onClick={remember}>
                  Сохранить разбор
                </button>
              )}
              {input && (
                <button className="ghost" type="button" onClick={clear}>
                  Очистить
                </button>
              )}
            </div>

            {data.profile.stopList.length === 0 && (
              <p className="foot">
                Стоп-лист пока не настроен, поэтому вердикт опирается только на общие
                группы. Отметь свои запреты в настройках — и проверка станет личной.
              </p>
            )}
          </div>

          <div className="results">{result && <ResultView result={result} />}</div>
        </div>
      ) : tab === 'shelf' ? (
        <div className="narrow">
          <Shelf data={data} onChange={setData} />
        </div>
      ) : (
        <div className="narrow">
          <Settings data={data} onChange={setData} diskOn={diskOn} onDisk={setDiskOn} />
        </div>
      )}

      <p className="foot narrow">
        Состав не показывает концентраций, а порядок в INCI обязателен только
        до 1%. Инструмент читает этикетку и не заменяет врача.
      </p>
    </div>
  )
}
