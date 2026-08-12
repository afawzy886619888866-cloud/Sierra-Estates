import React from 'react';

const CSS = `
.se-chip{display:inline-flex;align-items:center;gap:7px;cursor:pointer;user-select:none;
  font-family:var(--font-ui);font-weight:600;font-size:13px;
  padding:0 16px;height:38px;border-radius:var(--radius-pill);
  background:var(--surf);border:1px solid var(--bd);color:var(--tx);
  transition:all var(--dur-base) var(--ease-silk);}
.se-chip:hover{border-color:var(--bd-gold);}
.se-chip svg{width:15px;height:15px;}
.se-chip--on{background:var(--grad-gold);border-color:var(--gold);color:var(--bg-d);
  box-shadow:0 3px 16px rgba(200,150,26,.28);}
.se-chip--sm{height:32px;font-size:12px;padding:0 13px;}
.se-chip:disabled{opacity:.4;cursor:not-allowed;}
`;
if (typeof document !== 'undefined' && !document.getElementById('se-chip-css')) {
  const s = document.createElement('style'); s.id = 'se-chip-css'; s.textContent = CSS; document.head.appendChild(s);
}

/** Toggleable filter chip / pill. Turns gold when `active`. */
export function Chip({ active = false, size = 'md', icon = null, children, className = '', ...rest }) {
  const cls = ['se-chip', active ? 'se-chip--on' : '', size === 'sm' ? 'se-chip--sm' : '', className].filter(Boolean).join(' ');
  return <button className={cls} aria-pressed={active} {...rest}>{icon}{children}</button>;
}
