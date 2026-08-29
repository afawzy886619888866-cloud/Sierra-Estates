import re

with open('apps/sierra-estates-realty/lib/site/data.ts', 'r', encoding='utf-8') as f:
    lines = f.readlines()

new_lines = []
in_slides = False
slides_count = 1

in_rooms = False
rooms_count = 1

in_compounds = False
compounds_count = 1

for i, line in enumerate(lines):
    # Detect arrays
    if 'slides: [' in line:
        in_slides = True
    elif 'rooms: [' in line:
        in_rooms = True
    elif 'compounds: [' in line:
        in_compounds = True
    elif 'interiors: [' in line:
        in_compounds = False
    elif '],\\n' in line or ']' in line and line.strip() == '],':
        in_slides = False
        in_rooms = False
        in_compounds = False

    # Process lines
    if in_slides and '{ pre:' in line and 'id:' not in line:
        line = line.replace('{ pre:', f'{{ id: {slides_count}, pre:')
        slides_count += 1
    elif in_rooms and '{ name:' in line and 'id:' not in line:
        line = line.replace('{ name:', f'{{ id: {rooms_count}, name:')
        rooms_count += 1
    elif in_compounds and '{ n:' in line and 'id:' not in line:
        line = line.replace('{ n:', f'{{ id: {compounds_count}, n:')
        compounds_count += 1
        
    # The first line of arrays was combined in the previous script output, let's fix that
    if line.startswith('  slides: [    { id: 1,'):
        line = line.replace('  slides: [    { id: 1,', '  slides: [\n    { id: 1,')
    if line.startswith('  rooms: [    { id: 1,'):
        line = line.replace('  rooms: [    { id: 1,', '  rooms: [\n    { id: 1,')
    if line.startswith('  compounds: [    { id: 1,'):
        line = line.replace('  compounds: [    { id: 1,', '  compounds: [\n    { id: 1,')
        
    new_lines.append(line)

with open('apps/sierra-estates-realty/lib/site/data.ts', 'w', encoding='utf-8') as f:
    f.writelines(new_lines)

print("Done")
