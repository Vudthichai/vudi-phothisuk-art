import './ForestDecorations.css';

/** Small illustrated accents; never part of the artwork or the accessibility tree. */
export function ForestDecorations() {
  return <span className="forest-drift" aria-hidden="true">
    {[0, 1, 2].map(index => <svg key={index} className={`forest-drift-piece forest-leaf leaf-${index}`} viewBox="0 0 32 48" focusable="false"><path d="M27 3C6 5-2 22 13 42 29 36 33 19 27 3Z"/><path className="leaf-vein" d="M13 42 26 6M20 24l-9-5m6 14 10-5"/></svg>)}
    <svg className="forest-drift-piece forest-petal" viewBox="0 0 32 48" focusable="false"><path d="M16 43C-3 29-2 5 13 5c16-7 26 15 3 38Z"/></svg>
  </span>;
}
