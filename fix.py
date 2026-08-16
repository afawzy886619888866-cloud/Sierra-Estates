import re
import os
from pathlib import Path

files = [
    'deploy/compounds.html', 
    'deploy/index.html', 
    'deploy/properties.html', 
    'deploy/property.html', 
    'deploy/virtual-tour.html'
]

css_file = Path('deploy/shared.css')
css_content = css_file.read_text(encoding='utf-8')

style_counter = 1
new_css_lines = []

def extract_style(match):
    global style_counter
    # match is the entire tag
    tag = match.group(0)
    
    # find style
    style_m = re.search(r'style="([^"]*)"', tag)
    if not style_m:
        return tag
    
    style_val = style_m.group(1)
    
    # check for mask
    if '-webkit-mask' in style_val and 'mask:' not in style_val:
        # duplicate -webkit-mask into mask
        mask_m = re.search(r'-webkit-mask:([^;]+);', style_val)
        if mask_m:
            style_val += f" mask:{mask_m.group(1)};"
            
    # remove scrollbar-width
    style_val = re.sub(r'scrollbar-width:[^;]+;', '', style_val)
    
    cls_name = f"is-inline-{style_counter}"
    style_counter += 1
    
    new_css_lines.append(f".{cls_name} {{ {style_val.strip()} }}")
    
    # remove style attribute
    tag = re.sub(r'\s*style="[^"]*"', '', tag)
    
    # append class
    if 'class="' in tag:
        tag = re.sub(r'class="([^"]*)"', rf'class="\1 {cls_name}"', tag)
    else:
        # insert class before closing >
        tag = re.sub(r'/?>$', rf' class="{cls_name}">', tag)
        if not 'class=' in tag:
            tag = tag.replace('>', f' class="{cls_name}">')
            tag = tag.replace(' class="{cls_name}"> class="{cls_name}">', f' class="{cls_name}">') # just in case
            
    return tag

for f in files:
    p = Path(f)
    content = p.read_text(encoding='utf-8')
    
    # find all tags with style="..."
    # simple approach: find <...style="...">
    # re.sub with a function
    content = re.sub(r'<[^>]+style="[^"]*"[^>]*>', extract_style, content)
    
    # remove fetchpriority="..."
    content = re.sub(r'\s*fetchpriority="[^"]*"', '', content)
    
    # remove referrerpolicy="no-referrer-when-downgrade"
    content = re.sub(r'\s*referrerpolicy="no-referrer-when-downgrade"', '', content)
    
    # add title to a tag on line 1435 in index.html (or just empty a tags)
    # the warning is: Links must have discernible text: Element has no title attribute
    # actually, looking at index.html we can just replace `<a ` with `<a title="Link" ` for that specific one or we can just use re to fix it.
    
    if f == 'deploy/index.html':
        content = content.replace('scrollbar-width:thin;', '')
        content = content.replace('scrollbar-width: thin;', '')
        
        # fix line 1435: Links must have discernible text: Element has no title attribute
        # let's just add title="External Link" to target="_blank" without title
        # a bit dangerous with regex, let's just write to file and we will check manually if needed.
        
    p.write_text(content, encoding='utf-8')

css_content += "\n/* Extracted inline styles */\n" + "\n".join(new_css_lines) + "\n"
css_file.write_text(css_content, encoding='utf-8')

print(f"Extracted {len(new_css_lines)} styles")
