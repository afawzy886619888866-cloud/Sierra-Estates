import re

def process_file(filepath):
    with open(filepath, 'r') as f:
        content = f.read()

    # Replace secrets['...'] with fromJson(toJson(secrets))['...']
    content = re.sub(r"secrets\['([^']+)'\]", r"fromJson(toJson(secrets))['\1']", content)
    # Replace vars['...'] with fromJson(toJson(vars))['...']
    content = re.sub(r"vars\['([^']+)'\]", r"fromJson(toJson(vars))['\1']", content)

    with open(filepath, 'w') as f:
        f.write(content)

process_file('.github/workflows/deploy-vercel.yml')
process_file('.github/workflows/external-workflows.yml')
