import React from 'react';

const CSS = `
.se-switch{display:inline-flex;align-items:center;gap:10px;cursor:pointer;user-select:none;
  font-family:var(--font-ui);font-size:13px;color:var(--tx);}
.se-switch__track{width:42px;height:24px;border-radius:var(--radius-pill);background:var(--bd-s);
  position:relative;transition:background var(--dur-base) var(--ease-std);flex-shrink:0;}
.se-switch__thumb{position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;
  background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.3);transition:transform var(--dur-base) var(--ease-silk);}
.se-switch--on .se-switch__track{background:var(--gold);}
.se-switch--on .se-switch__thumb{transform:translateX(18px);}
.se-switch--disabled{opacity:.4;cursor:not-allowed;}
`;
if (typeof document !== 'undefined' && !document.getElementById('se-switch-css')) {
  const s = document.createElement('style'); s.id = 'se-switch-css'; s.textContent = CSS; document.head.appendChild(s);
}

/** On/off toggle switch with optional label. */
export function Switch({ checked = false, onChange, label, disabled = false, className = '', ...rest }) {
  const cls = ['se-switch', checked ? 'se-switch--on' : '', disabled ? 'se-switch--disabled' : '', className].filter(Boolean).join(' ');
  return (
    <label className={cls} {...rest}>
      <span className="se-switch__track" role="switch" aria-checked={checked}
        onClick={() => !disabled && onChange && onChange(!checked)}>
        <span className="se-switch__thumb"></span>
      </span>
      {label && <span>{label}</span>}
    </label>
  );
}
