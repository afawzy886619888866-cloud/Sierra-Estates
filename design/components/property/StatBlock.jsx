import React from 'react';

const CSS = `
.se-stats{display:grid;background:var(--surf);border:1px solid var(--bd);border-radius:var(--radius-lg);overflow:hidden;}
.se-stat{text-align:center;padding:18px 12px;border-right:1px solid var(--bd);border-bottom:1px solid var(--bd);}
.se-stat__v{font-family:var(--font-mono);font-weight:700;font-size:24px;line-height:1;color:var(--gold);}
.se-stat__l{font-family:var(--font-ui);font-size:9px;text-transform:uppercase;letter-spacing:.2em;color:var(--tx-f);margin-top:8px;}
`;
if (typeof document !== 'undefined' && !document.getElementById('se-stats-css')) {
  const s = document.createElement('style'); s.id = 'se-stats-css'; s.textContent = CSS; document.head.appendChild(s);
}

/** Grid of headline stats (hero / dashboard KPI strip). Mono value + label. */
export function StatBlock({ stats = [], columns, className = '', style = {}, ...rest }) {
  const cols = columns || stats.length || 1;
  return (
    <div className={['se-stats', className].filter(Boolean).join(' ')}
      style={{ gridTemplateColumns: `repeat(${cols}, 1fr)`, ...style }} {...rest}>
      {stats.map((s, i) => (
        <div className="se-stat" key={i}>
          <div className="se-stat__v">{s.value}</div>
          <div className="se-stat__l">{s.label}</div>
        </div>
      ))}
    </div>
  );
}
