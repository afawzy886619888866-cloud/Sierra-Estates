import React from 'react';

const CSS = `
.se-aitile{display:flex;align-items:center;gap:14px;text-align:start;cursor:pointer;width:100%;
  padding:15px 16px;border-radius:var(--radius-md);
  background:var(--surf);border:1px solid rgba(233,193,118,.14);color:var(--tx);text-decoration:none;
  transition:all var(--dur-slow) var(--ease-silk);}
.se-aitile:hover{background:rgba(233,193,118,.10);border-color:var(--bd-gold);transform:translateX(-4px);color:var(--tx);}
.se-aitile__ic{flex-shrink:0;width:44px;height:44px;display:grid;place-items:center;font-size:22px;
  border-radius:var(--radius-sm);background:var(--bg-d);}
.se-aitile__txt{flex:1;min-width:0;display:flex;flex-direction:column;gap:3px;}
.se-aitile__t{font-family:var(--font-ui);font-weight:600;font-size:14px;color:var(--tx-s);}
.se-aitile__d{font-family:var(--font-ui);font-size:11px;color:var(--tx-m);}
.se-aitile__arrow{color:var(--gold-lt);font-size:16px;transition:transform var(--dur-base) var(--ease-silk);}
.se-aitile:hover .se-aitile__arrow{transform:translateX(4px);}
`;
if (typeof document !== 'undefined' && !document.getElementById('se-aitile-css')) {
  const s = document.createElement('style'); s.id = 'se-aitile-css'; s.textContent = CSS; document.head.appendChild(s);
}

/**
 * AI Support module tile — the one place emoji glyphs are on-brand.
 * Used in the floating AI Support drawer / hub grid.
 */
export function AITile({ icon, title, desc, href, as = 'a', onClick, className = '', ...rest }) {
  const Tag = as;
  return (
    <Tag className={['se-aitile', className].filter(Boolean).join(' ')} href={as === 'a' ? href : undefined} onClick={onClick} {...rest}>
      <span className="se-aitile__ic">{icon}</span>
      <span className="se-aitile__txt">
        <span className="se-aitile__t">{title}</span>
        {desc && <span className="se-aitile__d">{desc}</span>}
      </span>
      <span className="se-aitile__arrow">→</span>
    </Tag>
  );
}
