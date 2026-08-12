import React from 'react';

const CSS = `
.se-card{background:var(--bg-e);border:1px solid var(--bd);border-radius:var(--radius-lg);
  transition:transform var(--dur-slow) var(--ease-silk),box-shadow var(--dur-slow) var(--ease-silk),border-color var(--dur-slow) var(--ease-silk);}
.se-card--pad{padding:var(--space-lg);}
.se-card--hover:hover{transform:translateY(-4px);border-color:var(--bd-gold);box-shadow:var(--shd-gold);}
.se-card--glass{background:var(--surf);backdrop-filter:blur(14px);}
.se-card--well{background:var(--bg-d);}
`;
if (typeof document !== 'undefined' && !document.getElementById('se-card-css')) {
  const s = document.createElement('style'); s.id = 'se-card-css'; s.textContent = CSS; document.head.appendChild(s);
}

/** Generic surface container. */
export function Card({ variant = 'solid', pad = true, hover = false, children, className = '', ...rest }) {
  const cls = ['se-card',
    variant === 'glass' ? 'se-card--glass' : '',
    variant === 'well' ? 'se-card--well' : '',
    pad ? 'se-card--pad' : '',
    hover ? 'se-card--hover' : '', className].filter(Boolean).join(' ');
  return <div className={cls} {...rest}>{children}</div>;
}
