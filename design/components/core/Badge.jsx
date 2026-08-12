import React from 'react';

const CSS = `
.se-badge{display:inline-flex;align-items:center;gap:6px;
  font-family:var(--font-mono);font-weight:700;font-size:9px;
  letter-spacing:.14em;text-transform:uppercase;
  padding:5px 11px;border-radius:var(--radius-pill);white-space:nowrap;line-height:1;}
.se-badge svg{width:11px;height:11px;}
.se-badge--dot::before{content:'';width:6px;height:6px;border-radius:50%;background:currentColor;}
/* tone variants — translucent fill, full-saturation text */
.se-badge--gold{background:rgba(200,150,26,.16);color:var(--gold-lt);}
.se-badge--red{background:rgba(230,57,70,.16);color:var(--red);}
.se-badge--blue{background:rgba(30,136,217,.16);color:var(--blue);}
.se-badge--emerald{background:rgba(52,211,153,.16);color:var(--emerald);}
.se-badge--violet{background:rgba(124,58,237,.18);color:#a78bfa;}
.se-badge--neutral{background:var(--surf);color:var(--tx-m);}
/* solid — for listing corner badges over photos */
.se-badge--solid{color:#fff;}
`;
if (typeof document !== 'undefined' && !document.getElementById('se-badge-css')) {
  const s = document.createElement('style'); s.id = 'se-badge-css'; s.textContent = CSS; document.head.appendChild(s);
}

/**
 * Small status/label pill. `tone` sets a translucent-fill colour;
 * pass `solidColor` for an opaque badge over imagery (listing corner badge).
 */
export function Badge({ tone = 'gold', dot = false, solidColor, icon = null, children, className = '', style = {}, ...rest }) {
  const cls = ['se-badge', `se-badge--${tone}`, dot ? 'se-badge--dot' : '', solidColor ? 'se-badge--solid' : '', className].filter(Boolean).join(' ');
  const st = solidColor ? { background: solidColor, ...style } : style;
  return <span className={cls} style={st} {...rest}>{icon}{children}</span>;
}
