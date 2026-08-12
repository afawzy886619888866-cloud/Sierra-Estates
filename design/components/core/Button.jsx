import React from 'react';

/* Inject component CSS once (keeps hover/active/focus states clean). */
const CSS = `
.se-btn{display:inline-flex;align-items:center;justify-content:center;gap:9px;
  font-family:var(--font-ui);font-weight:600;letter-spacing:var(--label-tracking);
  text-transform:uppercase;cursor:pointer;border:1px solid transparent;
  border-radius:var(--radius-sm);white-space:nowrap;text-decoration:none;
  transition:transform var(--dur-base) var(--ease-silk),box-shadow var(--dur-base) var(--ease-silk),background var(--dur-base) var(--ease-std),border-color var(--dur-base) var(--ease-std),color var(--dur-base) var(--ease-std);}
.se-btn:active{transform:scale(.98);}
.se-btn:disabled{opacity:.4;cursor:not-allowed;transform:none;box-shadow:none;}
.se-btn svg{width:1.05em;height:1.05em;}
/* sizes */
.se-btn--sm{height:var(--control-sm);padding:0 16px;font-size:11px;}
.se-btn--md{height:var(--control-md);padding:0 22px;font-size:12px;}
.se-btn--lg{height:var(--control-lg);padding:0 30px;font-size:13px;}
/* variants */
.se-btn--primary{background:var(--grad-gold);color:var(--bg-d);box-shadow:0 6px 18px rgba(200,150,26,.28);}
.se-btn--primary:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 12px 30px rgba(200,150,26,.42);}
.se-btn--secondary{background:transparent;border-color:var(--bd-s);color:var(--tx);}
.se-btn--secondary:hover:not(:disabled){border-color:var(--gold);color:var(--gold);}
.se-btn--ghost{background:var(--surf);border-color:var(--bd);color:var(--tx);}
.se-btn--ghost:hover:not(:disabled){background:var(--surf-2);border-color:var(--bd-gold);}
.se-btn--danger{background:var(--grad-red);color:#fff;box-shadow:0 6px 18px rgba(230,57,70,.28);}
.se-btn--danger:hover:not(:disabled){transform:translateY(-2px);box-shadow:0 12px 30px rgba(230,57,70,.42);}
.se-btn--block{width:100%;}
`;
if (typeof document !== 'undefined' && !document.getElementById('se-btn-css')) {
  const s = document.createElement('style'); s.id = 'se-btn-css'; s.textContent = CSS; document.head.appendChild(s);
}

/**
 * Primary action button. Gold-gradient primary is the signature CTA;
 * secondary/ghost recede; danger uses the red gradient.
 */
export function Button({
  variant = 'primary',
  size = 'md',
  block = false,
  disabled = false,
  iconLeft = null,
  iconRight = null,
  as = 'button',
  children,
  className = '',
  ...rest
}) {
  const Tag = as;
  const cls = ['se-btn', `se-btn--${variant}`, `se-btn--${size}`, block ? 'se-btn--block' : '', className]
    .filter(Boolean).join(' ');
  return (
    <Tag className={cls} disabled={Tag === 'button' ? disabled : undefined} {...rest}>
      {iconLeft}
      {children}
      {iconRight}
    </Tag>
  );
}
