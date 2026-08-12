import React from 'react';

interface HighlightTextProps {
  text: string;
  highlight: string;
}

export default function HighlightText({ text, highlight }: HighlightTextProps) {
  if (!text) return null;
  if (!highlight || !highlight.trim()) {
    return <span>{text}</span>;
  }

  // Escape special regex characters to prevent runtime errors
  const escapedHighlight = highlight.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
  const regex = new RegExp(`(${escapedHighlight})`, 'gi');
  const parts = text.split(regex);

  return (
    <span>
      {parts.map((part, i) =>
        regex.test(part) ? (
          <mark key={i} className="bg-yellow-500/25 text-yellow-250 px-0.5 rounded font-medium">
            {part}
          </mark>
        ) : (
          part
        )
      )}
    </span>
  );
}
