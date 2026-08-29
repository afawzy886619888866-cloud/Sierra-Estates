import re

with open('apps/sierra-estates-realty/lib/site/data.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# Add IDs to slides
slides_match = re.search(r'slides: \[(.*?)\]', content, re.DOTALL)
if slides_match:
    slides_text = slides_match.group(1)
    new_slides_text = ""
    count = 1
    for line in slides_text.split('\n'):
        if '{ pre:' in line:
            line = line.replace('{ pre:', f'{{ id: {count}, pre:')
            count += 1
        new_slides_text += line + '\n'
    content = content.replace(slides_text, new_slides_text.strip('\n'))

# Add IDs to rooms
rooms_match = re.search(r'rooms: \[(.*?)\]', content, re.DOTALL)
if rooms_match:
    rooms_text = rooms_match.group(1)
    new_rooms_text = ""
    count = 1
    for line in rooms_text.split('\n'):
        if '{ name:' in line:
            line = line.replace('{ name:', f'{{ id: {count}, name:')
            count += 1
        new_rooms_text += line + '\n'
    content = content.replace(rooms_text, new_rooms_text.strip('\n'))

# Add IDs to compounds
compounds_match = re.search(r'compounds: \[(.*?)\]', content, re.DOTALL)
if compounds_match:
    compounds_text = compounds_match.group(1)
    new_compounds_text = ""
    count = 1
    for line in compounds_text.split('\n'):
        if '{ n:' in line:
            line = line.replace('{ n:', f'{{ id: {count}, n:')
            count += 1
        new_compounds_text += line + '\n'
    content = content.replace(compounds_text, new_compounds_text.strip('\n'))

# Fix the Compound type
content = content.replace(
    'export type Compound = {\n  n: string; z: string; priceM: number; rent: number; ai: number;\n  [k: string]: any;\n};',
    'export type Compound = {\n  id: number; n: string; z: string; priceM: number; rent: number; ai: number; c: [number, number]; g: string;\n  [k: string]: any;\n};'
)

with open('apps/sierra-estates-realty/lib/site/data.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
