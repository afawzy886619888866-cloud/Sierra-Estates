import React from 'react';

const CSS = `
.se-pcard{position:relative;display:flex;flex-direction:column;text-align:start;cursor:pointer;
  background:var(--bg-e);border:1px solid var(--bd);border-radius:var(--radius-lg);overflow:hidden;
  transition:transform var(--dur-slow) var(--ease-silk),box-shadow var(--dur-slow) var(--ease-silk),border-color var(--dur-slow) var(--ease-silk);}
.se-pcard:hover{transform:translateY(-5px);border-color:var(--bd-gold);box-shadow:var(--shd-gold);}
.se-pcard__media{position:relative;aspect-ratio:4/3;overflow:hidden;background:var(--bg-e2);}
.se-pcard__img{width:100%;height:100%;object-fit:cover;transition:transform var(--dur-xslow) var(--ease-silk);}
.se-pcard:hover .se-pcard__img{transform:scale(1.06);}
.se-pcard__scrim{position:absolute;inset:0;background:linear-gradient(to top,var(--ov-c),transparent 55%);}
.se-pcard__code{position:absolute;top:11px;left:11px;font-family:var(--font-mono);font-weight:700;font-size:9px;
  letter-spacing:.12em;color:var(--gold-lt);background:rgba(8,21,38,.7);backdrop-filter:blur(6px);
  padding:5px 9px;border-radius:var(--radius-pill);border:1px solid rgba(233,193,118,.25);}
.se-pcard__badge{position:absolute;top:11px;right:11px;font-family:var(--font-mono);font-weight:700;font-size:9px;
  letter-spacing:.1em;text-transform:uppercase;color:#fff;padding:5px 10px;border-radius:var(--radius-pill);}
.se-pcard__ai{position:absolute;bottom:11px;left:11px;display:flex;align-items:center;gap:6px;
  font-family:var(--font-mono);font-weight:700;font-size:10px;color:var(--emerald);
  background:rgba(8,21,38,.62);backdrop-filter:blur(6px);padding:4px 9px;border-radius:var(--radius-pill);}
.se-pcard__ai .live-dot{background:var(--emerald);animation:pulseGold 2s infinite;}
.se-pcard__save{position:absolute;bottom:11px;right:11px;width:34px;height:34px;display:grid;place-items:center;
  border:none;cursor:pointer;border-radius:50%;background:rgba(8,21,38,.62);backdrop-filter:blur(6px);
  color:#fff;transition:all var(--dur-base) var(--ease-silk);}
.se-pcard__save:hover{background:rgba(8,21,38,.85);}
.se-pcard__save svg{width:16px;height:16px;}
.se-pcard__save--on{color:var(--red);}
.se-pcard__save--on svg{fill:var(--red);}
.se-pcard__body{padding:15px 16px 17px;display:flex;flex-direction:column;gap:9px;}
.se-pcard__loc{font-family:var(--font-mono);font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:var(--tx-f);}
.se-pcard__title{font-family:var(--font-display);font-weight:600;font-size:19px;line-height:1.15;color:var(--tx-s);}
.se-pcard__price{font-family:var(--font-mono);font-weight:700;font-size:16px;color:var(--gold-lt);}
.se-pcard__specs{display:flex;gap:14px;margin-top:2px;padding-top:11px;border-top:1px solid var(--bd);}
.se-pcard__spec{display:flex;align-items:center;gap:6px;font-family:var(--font-ui);font-size:12px;color:var(--tx-m);}
.se-pcard__spec svg{width:15px;height:15px;color:var(--tx-f);}
`;
if (typeof document !== 'undefined' && !document.getElementById('se-pcard-css')) {
  const s = document.createElement('style'); s.id = 'se-pcard-css'; s.textContent = CSS; document.head.appendChild(s);
}

const svg = {
  bed: 'M2 4v16M2 8h18a2 2 0 0 1 2 2v10M2 17h20M6 8v9',
  bath: 'M10 4 8 6M17 19v2M2 12h20M7 19v2M9 5 7.621 3.621A2.121 2.121 0 0 0 4 5v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-5',
  area: 'M4 4h16v16H4z',
  heart: 'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z',
};
function I({ d }) {
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d={d}/></svg>;
}

/**
 * Signature property listing card: photo with SBR code, listing badge,
 * live AI score and save button; title, price and beds/baths/area specs.
 * Hover lifts the card, glows the border gold and zooms the image.
 */
export function PropertyCard({
  image, code, title, location, price, badge, badgeColor = '#C8961A',
  aiScore, beds, baths, area, saved = false, onSave, onClick, className = '', ...rest
}) {
  return (
    <div className={['se-pcard', className].filter(Boolean).join(' ')} onClick={onClick} {...rest}>
      <div className="se-pcard__media">
        {image && <img className="se-pcard__img" src={image} alt={title} loading="lazy" />}
        <div className="se-pcard__scrim"></div>
        {code && <span className="se-pcard__code">{code}</span>}
        {badge && <span className="se-pcard__badge" style={{ background: badgeColor }}>{badge}</span>}
        {aiScore != null && <span className="se-pcard__ai"><span className="live-dot"></span>AI {aiScore}</span>}
        <button className={['se-pcard__save', saved ? 'se-pcard__save--on' : ''].filter(Boolean).join(' ')}
          aria-label={saved ? 'Saved' : 'Save'} onClick={e => { e.stopPropagation(); onSave && onSave(!saved); }}>
          <I d={svg.heart} />
        </button>
      </div>
      <div className="se-pcard__body">
        {location && <span className="se-pcard__loc">{location}</span>}
        {title && <h3 className="se-pcard__title">{title}</h3>}
        {price && <span className="se-pcard__price">{price}</span>}
        {(beds != null || baths != null || area != null) && (
          <div className="se-pcard__specs">
            {beds != null && <span className="se-pcard__spec"><I d={svg.bed} />{beds}</span>}
            {baths != null && <span className="se-pcard__spec"><I d={svg.bath} />{baths}</span>}
            {area != null && <span className="se-pcard__spec"><I d={svg.area} />{area} m²</span>}
          </div>
        )}
      </div>
    </div>
  );
}
