/* Animated AI-hub glyphs — ported verbatim from the AI_IC map in deploy/index.html. */
import React from 'react';

export const AI_ICONS: Record<string, React.ReactElement> = {
  radar: (
    <svg viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="20" stroke="#E9C176" strokeWidth="1.2" strokeDasharray="3 3" opacity=".3" />
      <circle cx="24" cy="24" r="14" stroke="#E9C176" strokeWidth="1.2" opacity=".5" />
      <circle cx="24" cy="24" r="7" stroke="#E9C176" strokeWidth="1.5" />
      <circle cx="24" cy="24" r="3" fill="#E9C176">
        <animate attributeName="r" values="2;4;2" dur="1.5s" repeatCount="indefinite" />
      </circle>
      <line x1="24" y1="24" x2="24" y2="4" stroke="#E9C176" strokeWidth="1.8" strokeLinecap="round">
        <animateTransform attributeName="transform" type="rotate" from="0 24 24" to="360 24 24" dur="3s" repeatCount="indefinite" />
      </line>
    </svg>
  ),
  engine: (
    <svg viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="20" stroke="#C8961A" strokeWidth="1" strokeDasharray="4 3" opacity=".4">
        <animateTransform attributeName="transform" type="rotate" from="0 24 24" to="360 24 24" dur="8s" repeatCount="indefinite" />
      </circle>
      <circle cx="24" cy="24" r="13" stroke="#E9C176" strokeWidth="1" strokeDasharray="3 4" opacity=".3">
        <animateTransform attributeName="transform" type="rotate" from="360 24 24" to="0 24 24" dur="5s" repeatCount="indefinite" />
      </circle>
      <circle cx="24" cy="11" r="2.5" fill="#C8961A">
        <animate attributeName="opacity" values="1;.3;1" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="24" cy="24" r="4" fill="#E9C176">
        <animate attributeName="r" values="3.5;5;3.5" dur="2s" repeatCount="indefinite" />
      </circle>
    </svg>
  ),
  match: (
    <svg viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="18" stroke="#4ade80" strokeWidth="1.5">
        <animate attributeName="r" values="10;20;10" dur="2.5s" repeatCount="indefinite" />
        <animate attributeName="opacity" values=".5;0;.5" dur="2.5s" repeatCount="indefinite" />
      </circle>
      <circle cx="24" cy="24" r="5" fill="#4ade80" />
      <path d="M21.5 24 L23.5 26.5 L27.5 21" stroke="#071524" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  ),
  roi: (
    <svg viewBox="0 0 48 48" fill="none">
      <rect x="7" y="30" width="7" height="10" rx="2" fill="#f59e0b" opacity=".5">
        <animate attributeName="height" values="3;10;3" dur="2.2s" repeatCount="indefinite" />
        <animate attributeName="y" values="37;30;37" dur="2.2s" repeatCount="indefinite" />
      </rect>
      <rect x="17" y="22" width="7" height="18" rx="2" fill="#f59e0b" opacity=".75">
        <animate attributeName="height" values="7;18;7" dur="2.2s" begin=".35s" repeatCount="indefinite" />
        <animate attributeName="y" values="33;22;33" dur="2.2s" begin=".35s" repeatCount="indefinite" />
      </rect>
      <rect x="27" y="13" width="7" height="27" rx="2" fill="#f59e0b">
        <animate attributeName="height" values="12;27;12" dur="2.2s" begin=".7s" repeatCount="indefinite" />
        <animate attributeName="y" values="28;13;28" dur="2.2s" begin=".7s" repeatCount="indefinite" />
      </rect>
    </svg>
  ),
  price: (
    <svg viewBox="0 0 48 48" fill="none">
      <path d="M8 8 L32 8 L40 24 L32 40 L8 40 Z" stroke="#a78bfa" strokeWidth="1.5" fill="rgba(167,139,250,.08)" />
      <circle cx="15" cy="18" r="3" stroke="#a78bfa" strokeWidth="1.5" />
      <text x="26" y="30" textAnchor="middle" fontWeight="700" fontSize="15" fill="#a78bfa" fontFamily="monospace">
        $
        <animate attributeName="opacity" values="1;.25;1" dur="1.8s" repeatCount="indefinite" />
      </text>
    </svg>
  ),
  dream: (
    <svg viewBox="0 0 48 48" fill="none">
      <path d="M24 10 L36 22 L33 22 L33 36 L15 36 L15 22 L12 22 Z" fill="#f472b6" opacity=".9" />
      <rect x="20" y="27" width="8" height="9" fill="#07121E" rx="1" />
      <g>
        <animateTransform attributeName="transform" type="rotate" from="0 24 23" to="360 24 23" dur="3s" repeatCount="indefinite" />
        <circle cx="40" cy="23" r="2.2" fill="#f472b6">
          <animate attributeName="opacity" values="1;.3;1" dur="1.5s" repeatCount="indefinite" />
        </circle>
      </g>
    </svg>
  ),
  imap: (
    <svg viewBox="0 0 48 48" fill="none">
      <rect x="6" y="8" width="36" height="32" rx="3" stroke="#C8961A" strokeWidth="1.3" fill="rgba(200,150,26,.07)" />
      <circle cx="24" cy="23" r="5" fill="rgba(200,150,26,.2)" stroke="#C8961A" strokeWidth="1.5">
        <animate attributeName="r" values="4;7;4" dur="2s" repeatCount="indefinite" />
        <animate attributeName="opacity" values="1;.3;1" dur="2s" repeatCount="indefinite" />
      </circle>
      <circle cx="24" cy="23" r="2.5" fill="#C8961A" />
    </svg>
  ),
  tour: (
    <svg viewBox="0 0 48 48" fill="none">
      <circle cx="24" cy="24" r="18" stroke="#38bdf8" strokeWidth="1.3" fill="rgba(56,189,248,.07)" />
      <ellipse cx="24" cy="24" rx="18" ry="7" stroke="#38bdf8" strokeWidth="1" fill="none" opacity=".4" />
      <circle cx="24" cy="24" r="4" fill="#38bdf8">
        <animate attributeName="r" values="3;5;3" dur="1.8s" repeatCount="indefinite" />
      </circle>
      <path d="M20 21 L28 24 L20 27 Z" fill="#fff" opacity=".9" />
    </svg>
  ),
};
