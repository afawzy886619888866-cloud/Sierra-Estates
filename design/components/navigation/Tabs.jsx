import React from 'react';

const CSS = `
.se-tabs{display:flex;gap:4px;border-bottom:1px solid var(--bd);}
.se-tab{position:relative;border:none;background:none;cursor:pointer;
  font-family:var(--font-ui);font-weight:600;font-size:13px;color:var(--tx-m);
  padding:12px 18px;transition:color var(--dur-base) var(--ease-std);}
.se-tab:hover{color:var(--tx);}
.se-tab--on{color:var(--gold);}
.se-tab__ink{position:absolute;left:14px;right:14px;bottom:-1px;height:2px;background:var(--gold);border-radius:2px;
  transform:scaleX(0);transform-origin:center;transition:transform var(--dur-base) var(--ease-silk);}
.se-tab--on .se-tab__ink{transform:scaleX(1);}
.se-tab__count{margin-inline-start:7px;font-family:var(--font-mono);font-size:10px;color:var(--tx-f);}
`;
if (typeof document !== 'undefined' && !document.getElementById('se-tabs-css')) {
  const s = document.createElement('style'); s.id = 'se-tabs-css'; s.textContent = CSS; document.head.appendChild(s);
}

/** Underline tab bar. Options: string | {value,label,count}. */
export function Tabs({ tabs = [], value, onChange, className = '', ...rest }) {
  return (
    <div className={['se-tabs', className].filter(Boolean).join(' ')} role="tablist" {...rest}>
      {tabs.map(t => {
        const val = typeof t === 'string' ? t : t.value;
        const lbl = typeof t === 'string' ? t : t.label;
        const count = typeof t === 'object' ? t.count : undefined;
        const on = val === value;
        return (
          <button key={val} role="tab" aria-selected={on}
            className={['se-tab', on ? 'se-tab--on' : ''].filter(Boolean).join(' ')}
            onClick={() => onChange && onChange(val)}>
            {lbl}{count != null && <span className="se-tab__count">{count}</span>}
            <span className="se-tab__ink"></span>
          </button>
        );
      })}
    </div>
  );
}
