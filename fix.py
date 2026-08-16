with open('apps/sierra-estates-realty/app/client-page/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('autocomplete=', 'autoComplete=')
content = content.replace('allowfullscreen', 'allowFullScreen')
content = content.replace('"WebkitWebkitBackdropFilter"', '"WebkitBackdropFilter"')

with open('apps/sierra-estates-realty/app/client-page/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed props.")
