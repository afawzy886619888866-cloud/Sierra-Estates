import React from 'react';

const CSS = `
.se-iconbtn{display:inline-grid;place-items:center;cursor:pointer;
  background:var(--surf);border:1px solid var(--bd);color:var(--tx);
  border-radius:var(--radius-sm);
  transition:all var(--dur-base) var(--ease-silk);}
.se-iconbtn:hover:not(:disabled){border-color:var(--gold);color:var(--gold);}
.se-iconbtn:active{transform:scale(.94);}
.se-iconbtn:disabled{opacity:.4;cursor:not-allowed;}
.se-iconbtn svg{width:1.15em;height:1.15em;}
.se-iconbtn--sm{width:34px;height:34px;font-size:15px;}
.se-iconbtn--md{width:44px;height:44px;font-size:18px;}
.se-iconbtn--lg{width:54px;height:54px;font-size:21px;}
.se-iconbtn--round{border-radius:var(--radius-pill);}
.se-iconbtn--solid{background:var(--grad-gold);border-color:transparent;color:var(--bg-d);box-shadow:0 4px 14px rgba(200,150,26,.3);}
.se-iconbtn--solid:hover:not(:disabled){color:var(--bg-d);transform:translateY(-2px);box-shadow:0 8px 22px rgba(200,150,26,.42);}
`;
if (typeof document !== 'undefined' && !document.getElementById('se-iconbtn-css')) {
  const s = document.createElement('style'); s.id = 'se-iconbtn-css'; s.textContent = CSS; document.head.appendChild(s);
}

/** Square/round icon-only button. Provide an aria-label. */
export function IconButton({ size = 'md', round = false, solid = false, disabled = false, children, className = '', ...rest }) {
  const cls = ['se-iconbtn', `se-iconbtn--${size}`, round ? 'se-iconbtn--round' : '', solid ? 'se-iconbtn--solid' : '', className].filter(Boolean).join(' ');
  return <button className={cls} disabled={disabled} {...rest}>{children}</button>;
}
