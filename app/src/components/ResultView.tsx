import { FLAG_LABEL, isTrace, type Analysis, type FlagMark } from '../lib/analyze'

export function ResultView({ result }: { result: Analysis }) {
  const { parse, hits, flags, unmatched, level, headline, comparison } = result
  const otherZones = hits.filter((h) => !h.relevantToZone)
  const otherForm = hits.filter((h) => h.relevantToZone && !h.relevantToForm)

  return (
    <>
      <section className="card verdict" data-level={level} data-cmp={comparison?.kind}>
        <h2>{headline}</h2>
        {level === 'unclear' && parse.listWarnings.length > 0 && (
          <ul className="plain">
            {parse.listWarnings.map((w, i) => (
              <li key={i}>{w}</li>
            ))}
          </ul>
        )}
      </section>

      {comparison && (
        <section className="card">
          <h3>Сравнение с текущим</h3>
          {comparison.lost.length === 0 &&
          comparison.gained.length === 0 &&
          comparison.plusGained.length === 0 ? (
            <p className="note" style={{ margin: 0 }}>
              По словарю те же группы, что у «{comparison.against}».
            </p>
          ) : (
            <ul className="plain">
              {comparison.lost.map((line) => (
                <li key={`l-${line}`}>Ушло: {line}</li>
              ))}
              {comparison.gained.map((line) => (
                <li key={`g-${line}`}>Появилось: {line}</li>
              ))}
              {comparison.plusGained.map((line) => (
                <li key={`p-${line}`}>В плюс появилось: {line}</li>
              ))}
            </ul>
          )}
        </section>
      )}

      {flags.length > 0 && (
        <section className="card">
          <h3>Флаги</h3>
          <ul className="flags">
            {flags.map((f, i) => (
              <li key={`${f.mark}-${f.title}-${i}`}>
                <span className="mark" data-mark={f.mark}>
                  {FLAG_LABEL[f.mark as FlagMark]}
                </span>
                <div>
                  <div className="group-title">{f.title}</div>
                  <div className="items">
                    {f.items.map((ing) => (
                      <span key={ing.position}>
                        {ing.display}{' '}
                        <span className="pos">
                          ({ing.position}-я{isTrace(ing, parse) ? ', следы' : ''})
                        </span>
                        {ing !== f.items[f.items.length - 1] ? ', ' : ''}
                      </span>
                    ))}
                  </div>
                  {f.note && <div className="note">{f.note}</div>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}

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

      {otherForm.length > 0 && (
        <section className="card">
          <h3>Для этой формы (смываемое / нет) не важно</h3>
          <ul className="plain">
            {otherForm.map((h) => (
              <li key={h.group.id}>
                <span className="group-title">{h.group.title}</span>
                <div className="items">{h.items.map((i) => i.display).join(', ')}</div>
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
                <div className="items">{h.items.map((i) => i.display).join(', ')}</div>
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
