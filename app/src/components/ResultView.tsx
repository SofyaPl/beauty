import { isTrace, type Analysis } from '../lib/analyze'

export function ResultView({ result }: { result: Analysis }) {
  const { parse, hits, watchHits, unmatched, level, headline, reasons } = result

  const relevant = hits.filter((h) => h.relevantToZone)
  const otherZones = hits.filter((h) => !h.relevantToZone)

  return (
    <>
      <section className="card verdict" data-level={level}>
        <h2>{headline}</h2>
        {reasons.length > 0 ? (
          <ul className="plain">
            {reasons.map((r, i) => (
              <li key={i}>{r}</li>
            ))}
          </ul>
        ) : (
          <p className="note" style={{ margin: 0 }}>
            Ни одна группа из словаря не сработала.
          </p>
        )}
      </section>

      {parse.listWarnings.length > 0 && level !== 'unclear' && (
        <div className="warn">
          <strong>Оговорки по списку</strong>
          <ul>
            {parse.listWarnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        </div>
      )}

      {watchHits.length > 0 && (
        <section className="card">
          <h3>Личное наблюдение</h3>
          <ul className="plain">
            {watchHits.map((w, i) => (
              <li key={i}>
                <span className="group-title" data-kind="watch">
                  {w.item.display}
                </span>
                <div className="note">{w.reason}</div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {relevant.length > 0 && (
        <section className="card">
          <h3>Что нашлось по словарю</h3>
          <ul className="plain">
            {relevant.map((h) => (
              <li key={h.group.id}>
                <span className="group-title" data-kind={h.group.kind}>
                  {h.group.title}
                  {h.stopRule ? ' — стоп-лист' : ''}
                </span>
                <div className="items">
                  {h.items.map((i) => (
                    <span key={i.position}>
                      {i.display}{' '}
                      <span className="pos">
                        ({i.position}-я{isTrace(i, parse) ? ', следы' : ''})
                      </span>
                      {i !== h.items[h.items.length - 1] ? ', ' : ''}
                    </span>
                  ))}
                </div>
                {h.group.note && <div className="note">{h.group.note}</div>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {otherZones.length > 0 && (
        <section className="card">
          <h3>Есть в составе, но для этой зоны не важно</h3>
          <ul className="plain">
            {otherZones.map((h) => (
              <li key={h.group.id}>
                <span className="group-title">{h.group.title}</span>
                <div className="items">
                  {h.items.map((i) => i.display).join(', ')}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="card">
        <h3>Разобранный состав — {parse.ingredients.length} позиций</h3>
        <div className="chips">
          {parse.ingredients.map((i) => (
            <span
              key={i.position}
              className="chip"
              data-trace={isTrace(i, parse)}
              title={i.translated ? `распознано как ${i.key}` : i.key}
            >
              {i.position}. {i.display}
            </span>
          ))}
        </div>
        <p className="note">
          {parse.subOnePercentFrom !== null
            ? `Приблизительная граница 1% — позиция ${parse.subOnePercentFrom + 1}. Всё после неё в следовых количествах: порядок в INCI обязателен только до процента.`
            : 'Границу 1% определить не удалось — в составе нет типичных маркеров вроде консервантов или хелаторов в конце списка.'}
          {unmatched.length > 0 &&
            ` Незнакомых словарю ингредиентов: ${unmatched.length}.`}
        </p>
      </section>
    </>
  )
}
