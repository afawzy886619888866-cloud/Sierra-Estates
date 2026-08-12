import React from 'react';

const CSS = `
.se-eyebrow{display:inline-flex;align-items:center;gap:10px;
  font-family:var(--font-mono);font-size:var(--mono-sm);font-weight:600;
  text-transform:uppercase;letter-spacing:var(--eyebrow-tracking);color:var(--gold);}
.se-eyebrow::before{content:'';width:22px;height:1px;background:var(--gold);flex-shrink:0;}
.se-eyebrow--center{justify-content:center;}
.se-eyebrow--center::after{content:'';width:22px;height:1px;background:var(--gold);flex-shrink:0;}
`;
if (typeof document !== 'undefined' && !document.getElementById('se-eyebrow-css')) {
  const s = document.createElement('style'); s.id = 'se-eyebrow-css'; s.textContent = CSS; document.head.appendChild(s);
}

/** The signature section eyebrow — mono uppercase gold with a leading rule. */
export function Eyebrow({ center = false, children, className = '', ...rest }) {
  const cls = ['se-eyebrow', center ? 'se-eyebrow--center' : '', className].filter(Boolean).join(' ');
  return <span className={cls} {...rest}>{children}</span>;
}
