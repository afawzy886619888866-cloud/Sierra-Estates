import React from 'react';

const CSS = `
.se-avatar{display:inline-grid;place-items:center;overflow:hidden;flex-shrink:0;
  font-family:var(--font-ui);font-weight:600;color:var(--bg-d);
  background:var(--grad-gold);border-radius:var(--radius-pill);}
.se-avatar img{width:100%;height:100%;object-fit:cover;}
.se-avatar--sm{width:32px;height:32px;font-size:12px;}
.se-avatar--md{width:42px;height:42px;font-size:15px;}
.se-avatar--lg{width:56px;height:56px;font-size:19px;}
.se-avatar--ring{box-shadow:0 0 0 2px var(--bg),0 0 0 3px var(--gold);}
`;
if (typeof document !== 'undefined' && !document.getElementById('se-avatar-css')) {
  const s = document.createElement('style'); s.id = 'se-avatar-css'; s.textContent = CSS; document.head.appendChild(s);
}

/** Agent/user avatar. Shows an image, else gold-gradient initials. */
export function Avatar({ src, name = '', size = 'md', ring = false, className = '', ...rest }) {
  const initials = name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const cls = ['se-avatar', `se-avatar--${size}`, ring ? 'se-avatar--ring' : '', className].filter(Boolean).join(' ');
  return <span className={cls} {...rest}>{src ? <img src={src} alt={name} /> : initials}</span>;
}
