with open('apps/sierra-estates-realty/app/client-page/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace('referrerpolicy=', 'referrerPolicy=')
content = content.replace('"WebkitBackdropFilter": "blur(8px)", "backdropFilter": "blur(14px)", "WebkitBackdropFilter": "blur(8px)"', '"backdropFilter": "blur(14px)", "WebkitBackdropFilter": "blur(8px)"')

with open('apps/sierra-estates-realty/app/client-page/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)
print("Fixed props 2.")
