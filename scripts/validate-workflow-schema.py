import urllib.request, json, yaml, jsonschema

req = urllib.request.urlopen('https://json.schemastore.org/github-workflow.json')
schema = json.loads(req.read().decode('utf-8'))

with open('.github/workflows/deploy-vercel.yml', 'r', encoding='utf-8') as f:
    text = f.read()

text = text.replace('\non:\n', '\n"on":\n')
wf = yaml.safe_load(text)

validator = jsonschema.Draft7Validator(schema)
errors = list(validator.iter_errors(wf))
if not errors:
    print("VALID: 0 schema errors found!")
else:
    for err in errors:
        print("PATH:", list(err.path), "MESSAGE:", err.message)
