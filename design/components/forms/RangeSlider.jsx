import React from 'react';

const CSS = `
.se-range{display:flex;flex-direction:column;gap:10px;width:100%;}
.se-range__head{display:flex;align-items:baseline;justify-content:space-between;}
.se-range__label{font-family:var(--font-ui);font-size:12px;font-weight:600;color:var(--tx-m);}
.se-range__val{font-family:var(--font-mono);font-size:13px;font-weight:700;color:var(--gold-lt);}
.se-range__input{-webkit-appearance:none;appearance:none;width:100%;height:4px;border-radius:2px;outline:none;
  background:var(--bd-s);}
.se-range__input::-webkit-slider-thumb{-webkit-appearance:none;width:18px;height:18px;border-radius:50%;cursor:pointer;
  background:var(--grad-gold);box-shadow:0 3px 10px rgba(200,150,26,.4);transition:transform var(--dur-fast) var(--ease-std);}
.se-range__input::-webkit-slider-thumb:hover{transform:scale(1.2);}
.se-range__input::-moz-range-thumb{width:18px;height:18px;border:none;border-radius:50%;cursor:pointer;
  background:var(--gold);box-shadow:0 3px 10px rgba(200,150,26,.4);}
`;
if (typeof document !== 'undefined' && !document.getElementById('se-range-css')) {
  const s = document.createElement('style'); s.id = 'se-range-css'; s.textContent = CSS; document.head.appendChild(s);
}

/** Labelled range slider with a live formatted value (price, area…). */
export function RangeSlider({ label, value, min = 0, max = 100, step = 1, onChange, format, className = '', ...rest }) {
  const shown = format ? format(value) : value;
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className={['se-range', className].filter(Boolean).join(' ')}>
      <div className="se-range__head">
        {label && <span className="se-range__label">{label}</span>}
        <span className="se-range__val">{shown}</span>
      </div>
      <input type="range" className="se-range__input" min={min} max={max} step={step} value={value}
        style={{ background: `linear-gradient(90deg, var(--gold) ${pct}%, var(--bd-s) ${pct}%)` }}
        onChange={e => onChange && onChange(Number(e.target.value))} {...rest} />
    </div>
  );
}
