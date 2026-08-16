import re
import os

with open('apps/sierra-estates-realty/app/client-page/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# Find all <script>...</script> blocks
scripts = re.findall(r'<script>(.*?)</script>', content, flags=re.DOTALL | re.IGNORECASE)

# Write to inline-scripts.js
os.makedirs('apps/sierra-estates-realty/public/client-page', exist_ok=True)
with open('apps/sierra-estates-realty/public/client-page/inline-scripts.js', 'w', encoding='utf-8') as f:
    f.write('\n\n'.join(scripts))

# Remove <script>...</script> blocks from page.tsx
new_content = re.sub(r'<script>.*?</script>', '', content, flags=re.DOTALL | re.IGNORECASE)

# Add the Script tag for inline-scripts.js
script_tag = '<Script src="/client-page/inline-scripts.js" strategy="lazyOnload" />\n'
new_content = new_content.replace('<div className="client-page-wrapper">', script_tag + '      <div className="client-page-wrapper">')

with open('apps/sierra-estates-realty/app/client-page/page.tsx', 'w', encoding='utf-8') as f:
    f.write(new_content)
print("Extracted scripts.")
