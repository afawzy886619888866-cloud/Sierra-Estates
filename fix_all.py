import re
import uuid

def fix_html():
    with open('apps/sierra-estates-realty/public/client-page/index.html', 'r', encoding='utf-8') as f:
        html = f.read()

    # 1. fix backdrop-filter
    html = html.replace('backdrop-filter:', '-webkit-backdrop-filter: blur(10px); backdrop-filter:')
    # Fix already applied but maybe we need to be careful

    # 2. Extract inline styles
    style_pattern = re.compile(r'style="([^"]+)"')
    styles_found = set(style_pattern.findall(html))
    
    style_classes = {}
    class_css = []
    
    for i, style in enumerate(styles_found):
        class_name = f"auto-style-{i}"
        style_classes[style] = class_name
        class_css.append(f".{class_name} {{ {style} }}")

    def replace_style(match):
        style_val = match.group(1)
        class_name = style_classes[style_val]
        # Return class="{class_name}" but we might already have a class attribute.
        # Actually it's easier to just do it via beautifulsoup if we want to merge classes,
        # but a regex is risky for merging classes.
        return f'data-auto-class="{class_name}"'

    # Using BeautifulSoup is much safer.
    return html

if __name__ == '__main__':
    html = fix_html()
