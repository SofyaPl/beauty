import { useState } from 'react'
import { FORM_ORDER, FORMS, ZONE_ORDER, ZONES, type Form, type Zone } from '../data/dictionary'
import {
  ERA_LABEL,
  STATUS_LABEL,
  inferForm,
  productTitle,
  type AppData,
  type Product,
  type ProductEra,
  type ProductStatus,
} from '../lib/types'

const STATUSES = Object.keys(STATUS_LABEL) as ProductStatus[]

function stamp(): string {
  return new Date().toISOString()
}

function Card({
  product,
  onEra,
  onZone,
}: {
  product: Product
  onEra: (era: ProductEra) => void
  onZone: (zone: Zone) => void
}) {
  const [open, setOpen] = useState(false)
  return (
    <article className="product" data-status={product.status}>
      <button type="button" className="product-head" onClick={() => setOpen((v) => !v)}>
        <span className="product-name">{productTitle(product)}</span>
        <span className="product-meta">
          {ZONES[product.zone]} · {FORMS[inferForm(product)]}
          {product.category ? ` · ${product.category}` : ''}
        </span>
        <span className="status-pill" data-status={product.status}>
          {STATUS_LABEL[product.status]}
        </span>
      </button>
      {product.verdict && <p className="product-verdict">{product.verdict}</p>}
      {open && (
        <div className="product-body">
          {product.inci ? <p className="inci">{product.inci}</p> : <p className="note">Состава нет.</p>}
          <p className="note">Зона</p>
          <div className="zones" style={{ marginBottom: 10 }}>
            {ZONE_ORDER.map((z) => (
              <button
                key={z}
                type="button"
                className="zone"
                aria-pressed={product.zone === z}
                onClick={() => onZone(z)}
              >
                {ZONES[z]}
              </button>
            ))}
          </div>
          <div className="row">
            {product.era === 'now' ? (
              <button className="ghost" type="button" onClick={() => onEra('past')}>
                Это уже прошлое
              </button>
            ) : (
              <button className="ghost" type="button" onClick={() => onEra('now')}>
                Вернуть на текущую полку
              </button>
            )}
          </div>
        </div>
      )}
    </article>
  )
}

function AddForm({ onAdd }: { onAdd: (p: Product) => void }) {
  const [name, setName] = useState('')
  const [zone, setZone] = useState<Zone>('body')
  const [form, setForm] = useState<Form>('leave')
  const [era, setEra] = useState<ProductEra>('now')
  const [status, setStatus] = useState<ProductStatus>('neutral')
  const [inci, setInci] = useState('')

  const submit = () => {
    if (!name.trim()) return
    onAdd({
      id: crypto.randomUUID(),
      name: name.trim(),
      zone,
      form,
      era,
      status,
      inci: inci.trim(),
      updatedAt: stamp(),
    })
    setName('')
    setInci('')
  }

  return (
    <div className="card">
      <h3>Добавить средство</h3>
      <div className="field">
        <label className="block" htmlFor="new-name">
          Название
        </label>
        <input id="new-name" value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div className="field">
        <label className="block">Зона</label>
        <div className="zones">
          {ZONE_ORDER.map((z) => (
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
      </div>
      <div className="field">
        <label className="block">Когда</label>
        <div className="zones">
          {(['now', 'past'] as ProductEra[]).map((e) => (
            <button
              key={e}
              type="button"
              className="zone"
              aria-pressed={era === e}
              onClick={() => setEra(e)}
            >
              {ERA_LABEL[e]}
            </button>
          ))}
        </div>
      </div>
      <div className="field">
        <label className="block" htmlFor="new-status">
          Отметка
        </label>
        <select id="new-status" value={status} onChange={(e) => setStatus(e.target.value as ProductStatus)}>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABEL[s]}
            </option>
          ))}
        </select>
      </div>
      <div className="field">
        <label className="block" htmlFor="new-inci">
          Состав, если есть
        </label>
        <textarea id="new-inci" value={inci} rows={3} onChange={(e) => setInci(e.target.value)} />
      </div>
      <button className="primary" type="button" disabled={!name.trim()} onClick={submit}>
        Добавить
      </button>
    </div>
  )
}

export function Shelf({
  data,
  onChange,
}: {
  data: AppData
  onChange: (next: AppData) => void
}) {
  const [filter, setFilter] = useState<Zone | 'all'>('all')

  const visible = data.products.filter((p) => filter === 'all' || p.zone === filter)
  const now = visible.filter((p) => p.era !== 'past')
  const past = visible.filter((p) => p.era === 'past')

  const setEra = (id: string, era: ProductEra) => {
    onChange({
      ...data,
      products: data.products.map((p) => (p.id === id ? { ...p, era, updatedAt: stamp() } : p)),
    })
  }

  const setZone = (id: string, zone: Zone) => {
    onChange({
      ...data,
      products: data.products.map((p) => (p.id === id ? { ...p, zone, updatedAt: stamp() } : p)),
    })
  }

  return (
    <>
      <div className="zones" style={{ marginBottom: 18 }}>
        <button
          type="button"
          className="zone"
          aria-pressed={filter === 'all'}
          onClick={() => setFilter('all')}
        >
          Все зоны
        </button>
        {ZONE_ORDER.map((z) => (
          <button
            key={z}
            type="button"
            className="zone"
            aria-pressed={filter === z}
            onClick={() => setFilter(z)}
          >
            {ZONES[z]}
          </button>
        ))}
      </div>

      {data.products.length === 0 && (
        <p className="note" style={{ marginTop: 0 }}>
          Полка пустая, пока не подключён файл данных. Он лежит в папке проекта на
          Яндекс.Диске — «полка-данные.json». Открой его во вкладке «Настройки».
        </p>
      )}

      {visible.length > 0 && (
        <section className="card" style={{ marginTop: 0 }}>
          <h3>Состав полки — {visible.length}</h3>
          {ZONE_ORDER.filter((z) => visible.some((p) => p.zone === z)).map((z) => (
            <div key={z} style={{ marginBottom: 12 }}>
              <div className="group-title">{ZONES[z]}</div>
              <ul className="plain">
                {visible
                  .filter((p) => p.zone === z)
                  .map((p) => (
                    <li key={p.id}>
                      {productTitle(p)}
                      <span className="pos">
                        {' '}
                        · {FORMS[inferForm(p)].toLowerCase()}
                        {p.era === 'past' ? ' · раньше' : ''}
                      </span>
                    </li>
                  ))}
              </ul>
            </div>
          ))}
        </section>
      )}

      <section>
        <h3>Сейчас</h3>
        {now.length === 0 ? (
          <p className="note">Пока пусто.</p>
        ) : (
          <div className="product-list">
            {now.map((p) => (
              <Card
                key={p.id}
                product={p}
                onEra={(era) => setEra(p.id, era)}
                onZone={(z) => setZone(p.id, z)}
              />
            ))}
          </div>
        )}
      </section>

      <section style={{ marginTop: 28 }}>
        <h3>Раньше</h3>
        <p className="note" style={{ marginTop: 0 }}>
          Сюда можно переносить то, чем уже не пользуешься. Как дробить историю
          дальше — решим отдельно.
        </p>
        {past.length === 0 ? (
          <p className="note">Пока пусто.</p>
        ) : (
          <div className="product-list">
            {past.map((p) => (
              <Card
                key={p.id}
                product={p}
                onEra={(era) => setEra(p.id, era)}
                onZone={(z) => setZone(p.id, z)}
              />
            ))}
          </div>
        )}
      </section>

      <div style={{ marginTop: 28 }}>
        <AddForm
          onAdd={(p) => onChange({ ...data, products: [p, ...data.products] })}
        />
      </div>
    </>
  )
}
