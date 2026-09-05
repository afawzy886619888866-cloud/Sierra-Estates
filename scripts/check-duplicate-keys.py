import yaml
import sys

class DuplicateKeyError(Exception):
    pass

def dict_constructor(loader, node):
    mapping = {}
    for key_node, value_node in node.value:
        key = loader.construct_object(key_node, deep=False)
        if key in mapping:
            raise DuplicateKeyError(f"Duplicate key '{key}' found at line {key_node.start_mark.line + 1}, column {key_node.start_mark.column + 1}")
        mapping[key] = loader.construct_object(value_node, deep=False)
    return mapping

loader = yaml.SafeLoader
loader.add_constructor(yaml.resolver.BaseResolver.DEFAULT_MAPPING_TAG, dict_constructor)

target = sys.argv[1] if len(sys.argv) > 1 else '.github/workflows/deploy-vercel.yml'
with open(target, 'r', encoding='utf-8') as f:
    try:
        yaml.load(f, Loader=loader)
        print(f"✅ {target}: No duplicate keys found!")
    except DuplicateKeyError as e:
        print(f"❌ {target}: {e}")
    except Exception as e:
        print(f"Error in {target}: {e}")
