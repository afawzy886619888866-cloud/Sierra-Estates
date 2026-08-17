import re

file_path = 'apps/sierra-estates-realty/public/client-page/index.html'

with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Fix repeated -webkit-
content = re.sub(r'-webkit--webkit-backdrop-filter:[^;]+;', '', content)
content = re.sub(r'-webkit-backdrop-filter:[^;]+;', '', content)
# Now safely add -webkit-backdrop-filter before each backdrop-filter
content = re.sub(r'backdrop-filter:\s*([^;]+);', r'-webkit-backdrop-filter: \1; backdrop-filter: \1;', content)

# Remove any remaining scrollbar-width
content = re.sub(r'scrollbar-width:[^;]+;', '', content)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Cleaned up backdrop-filter")
