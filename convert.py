import sys
import re

def style_to_dict(style_str):
    if not style_str.strip(): return '{}'
    rules = style_str.split(';')
    d = {}
    for rule in rules:
        if ':' not in rule: continue
        k, v = rule.split(':', 1)
        k = k.strip()
        v = v.strip()
        if not k: continue
        # camelCase the key
        parts = k.split('-')
        k_camel = parts[0] + ''.join(p.capitalize() for p in parts[1:])
        d[k_camel] = v
    # Format to JS object string
    inner = ', '.join(f'"{k}": "{v}"' for k, v in d.items())
    return '{{' + inner + '}}'

def html_to_jsx(html):
    # Convert class to className
    html = re.sub(r'\bclass=', 'className=', html)
    # Convert for to htmlFor
    html = re.sub(r'\bfor=', 'htmlFor=', html)
    # Fix the unclosed string from the CSS problem first
    html = html.replace('content:"absolute', 'content:"";position:absolute')
    # Add -webkit-backdrop-filter
    html = html.replace('backdrop-filter:blur', '-webkit-backdrop-filter:blur(8px);backdrop-filter:blur')
    # Convert inline styles
    def replace_style(m):
        return 'style={' + style_to_dict(m.group(1)) + '}'
    html = re.sub(r'style="([^"]*)"', replace_style, html)
    # Self close unclosed tags (br, hr, input, img)
    html = re.sub(r'<(img|input|br|hr|source|meta|link)([^>]*?)(?<!/)>', r'<\1\2 />', html)
    # Convert HTML comments to JSX comments (only outside of scripts/styles)
    html = re.sub(r'<!--(.*?)-->', r'{/* \1 */}', html, flags=re.DOTALL)
    # Convert SVG attributes
    html = re.sub(r'stroke-width=', 'strokeWidth=', html)
    html = re.sub(r'stroke-linecap=', 'strokeLinecap=', html)
    html = re.sub(r'stroke-linejoin=', 'strokeLinejoin=', html)
    html = re.sub(r'fill-rule=', 'fillRule=', html)
    html = re.sub(r'clip-rule=', 'clipRule=', html)
    html = re.sub(r'tabindex=', 'tabIndex=', html)
    html = re.sub(r'\bautoplay\b', 'autoPlay', html)
    # Accessibility problems: add aria-label if missing
    def fix_buttons(m):
        tag_content = m.group(0)
        if 'title=' not in tag_content and 'aria-label=' not in tag_content:
            return tag_content.replace('<button', '<button aria-label="Button"')
        return tag_content
    html = re.sub(r'<button[^>]*>', fix_buttons, html)

    def fix_selects(m):
        tag_content = m.group(0)
        if 'title=' not in tag_content and 'aria-label=' not in tag_content:
            return tag_content.replace('<select', '<select aria-label="Select"')
        return tag_content
    html = re.sub(r'<select[^>]*>', fix_selects, html)

    def fix_links(m):
        tag_content = m.group(0)
        if 'title=' not in tag_content and 'aria-label=' not in tag_content:
            return tag_content.replace('<a', '<a aria-label="Link"')
        return tag_content
    html = re.sub(r'<a[^>]*>', fix_links, html)
    return html

with open('apps/sierra-estates-realty/public/client-page/index.html', 'r', encoding='utf-8') as f:
    content = f.read()

body_match = re.search(r'<body[^>]*>(.*)</body>', content, flags=re.DOTALL | re.IGNORECASE)
body_content = body_match.group(1) if body_match else content

jsx_body = html_to_jsx(body_content)

head_match = re.search(r'<head>(.*)</head>', content, flags=re.DOTALL | re.IGNORECASE)
head_content = head_match.group(1) if head_match else ''

styles = re.findall(r'<style[^>]*>(.*?)</style>', head_content, flags=re.DOTALL | re.IGNORECASE)
all_css = '\n'.join(styles)

import os
os.makedirs('apps/sierra-estates-realty/app/client-page', exist_ok=True)

page_tsx = f'''"use client";
import React, {{ useEffect }} from "react";
import Script from "next/script";
import "./client-page.css";

export default function ClientPage() {{
  useEffect(() => {{
    // We can load external scripts or run initializing logic here if needed
  }}, []);

  return (
    <>
      <Script src="https://unpkg.com/lucide@0.294.0/dist/umd/lucide.min.js" strategy="beforeInteractive" />
      <Script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js" strategy="beforeInteractive" />
      <Script src="https://unpkg.com/leaflet.markercluster@1.5.3/dist/leaflet.markercluster.js" strategy="beforeInteractive" />
      <Script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/dist/umd/supabase.min.js" strategy="beforeInteractive" />
      <Script src="/client-page/supabase-config.js" strategy="lazyOnload" />
      <Script src="/client-page/data.js" strategy="lazyOnload" />
      <Script src="/client-page/shared.js" strategy="lazyOnload" />
      <Script src="/client-page/supabase.js" strategy="lazyOnload" />

      <div className="client-page-wrapper">
        {jsx_body}
      </div>
    </>
  );
}}
'''

with open('apps/sierra-estates-realty/app/client-page/page.tsx', 'w', encoding='utf-8') as f:
    f.write(page_tsx)

with open('apps/sierra-estates-realty/app/client-page/client-page.css', 'w', encoding='utf-8') as f:
    f.write(all_css)

print('JSX conversion complete!')
