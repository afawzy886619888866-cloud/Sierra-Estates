import React from 'react';

const CSS = `
.se-seg{display:inline-flex;padding:4px;gap:2px;
  background:var(--surf);border:1px solid var(--bd);border-radius:var(--radius-pill);}
.se-seg__opt{border:none;cursor:pointer;background:none;
  font-family:var(--font-ui);font-weight:600;font-size:13px;color:var(--tx-m);
  padding:0 20px;height:36px;border-radius:var(--radius-pill);white-space:nowrap;
  transition:all var(--dur-base) var(--ease-silk);}
.se-seg__opt:hover{color:var(--tx);}
.se-seg__opt--on{background:var(--grad-gold);color:var(--bg-d);box-shadow:0 3px 14px rgba(200,150,26,.28);}
.se-seg__opt--on:hover{color:var(--bg-d);}
.se-seg--sm .se-seg__opt{height:30px;font-size:12px;padding:0 15px;}
`;
if (typeof document !== 'undefined' && !document.getElementById('se-seg-css')) {
  const s = document.createElement('style'); s.id = 'se-seg-css'; s.textContent = CSS; document.head.appendChild(s);
}

/** Segmented control — the All / Rent / Resale style toggle. */
export function SegmentedControl({ options = [], value, onChange, size = 'md', className = '', ...rest }) {
  const cls = ['se-seg', size === 'sm' ? 'se-seg--sm' : '', className].filter(Boolean).join(' ');
  return (
    <div className={cls} role="tablist" {...rest}>
      {options.map(o => {
        const val = typeof o === 'string' ? o : o.value;
        const lbl = typeof o === 'string' ? o : o.label;
        const on = val === value;
        return (
          <button key={val} role="tab" aria-selected={on}
            className={['se-seg__opt', on ? 'se-seg__opt--on' : ''].filter(Boolean).join(' ')}
            onClick={() => onChange && onChange(val)}>{lbl}</button>
        );
      })}
    </div>
  );
}
