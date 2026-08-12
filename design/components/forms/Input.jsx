import React from 'react';

const CSS = `
.se-field{display:flex;flex-direction:column;gap:7px;width:100%;}
.se-field__label{font-family:var(--font-ui);font-size:12px;font-weight:600;color:var(--tx-m);}
.se-field__wrap{display:flex;align-items:center;gap:9px;
  background:var(--surf);border:1px solid var(--bd);border-radius:var(--radius-sm);
  padding:0 14px;height:var(--control-md);transition:border-color var(--dur-base) var(--ease-std),box-shadow var(--dur-base) var(--ease-std);}
.se-field__wrap:focus-within{border-color:var(--gold);box-shadow:0 0 0 3px rgba(200,150,26,.14);}
.se-field__wrap svg{width:17px;height:17px;color:var(--tx-f);flex-shrink:0;}
.se-field__input{flex:1;min-width:0;background:none;border:none;outline:none;
  font-family:var(--font-ui);font-size:14px;color:var(--tx);}
.se-field__input::placeholder{color:var(--tx-f);}
.se-field--error .se-field__wrap{border-color:var(--red);}
.se-field__hint{font-family:var(--font-ui);font-size:11px;color:var(--tx-f);}
.se-field--error .se-field__hint{color:var(--red);}
`;
if (typeof document !== 'undefined' && !document.getElementById('se-field-css')) {
  const s = document.createElement('style'); s.id = 'se-field-css'; s.textContent = CSS; document.head.appendChild(s);
}

/** Labelled text input with optional leading icon, hint and error state. */
export function Input({ label, hint, error = false, icon = null, iconRight = null, className = '', id, ...rest }) {
  const fid = id || (label ? 'in-' + label.replace(/\s+/g, '-').toLowerCase() : undefined);
  const cls = ['se-field', error ? 'se-field--error' : '', className].filter(Boolean).join(' ');
  return (
    <div className={cls}>
      {label && <label className="se-field__label" htmlFor={fid}>{label}</label>}
      <div className="se-field__wrap">
        {icon}
        <input id={fid} className="se-field__input" {...rest} />
        {iconRight}
      </div>
      {hint && <span className="se-field__hint">{hint}</span>}
    </div>
  );
}
