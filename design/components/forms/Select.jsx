import React from 'react';

const CSS = `
.se-select{position:relative;display:flex;flex-direction:column;gap:7px;width:100%;}
.se-select__label{font-family:var(--font-ui);font-size:12px;font-weight:600;color:var(--tx-m);}
.se-select__control{appearance:none;width:100%;cursor:pointer;
  background:var(--surf);border:1px solid var(--bd);border-radius:var(--radius-sm);
  padding:0 38px 0 14px;height:var(--control-md);
  font-family:var(--font-ui);font-size:14px;color:var(--tx);
  transition:border-color var(--dur-base) var(--ease-std);}
.se-select__control:hover{border-color:var(--bd-gold);}
.se-select__control:focus{outline:none;border-color:var(--gold);box-shadow:0 0 0 3px rgba(200,150,26,.14);}
.se-select__chev{position:absolute;right:14px;bottom:13px;width:16px;height:16px;color:var(--tx-f);pointer-events:none;}
.se-select__control option{background:var(--bg-e);color:var(--tx);}
`;
if (typeof document !== 'undefined' && !document.getElementById('se-select-css')) {
  const s = document.createElement('style'); s.id = 'se-select-css'; s.textContent = CSS; document.head.appendChild(s);
}

/** Native select styled to the system, with a chevron. */
export function Select({ label, options = [], placeholder, className = '', id, children, ...rest }) {
  const fid = id || (label ? 'sel-' + label.replace(/\s+/g, '-').toLowerCase() : undefined);
  return (
    <div className={['se-select', className].filter(Boolean).join(' ')}>
      {label && <label className="se-select__label" htmlFor={fid}>{label}</label>}
      <select id={fid} className="se-select__control" {...rest}>
        {placeholder && <option value="" disabled>{placeholder}</option>}
        {children || options.map(o => {
          const val = typeof o === 'string' ? o : o.value;
          const lbl = typeof o === 'string' ? o : o.label;
          return <option key={val} value={val}>{lbl}</option>;
        })}
      </select>
      <svg className="se-select__chev" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m6 9 6 6 6-6"/></svg>
    </div>
  );
}
