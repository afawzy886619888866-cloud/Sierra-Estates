import os
import filecmp

def diff(dcmp, path=''):
    for n in dcmp.right_only:
        print(f"Only in Final: {os.path.join(path, n)}")
    for n in dcmp.diff_files:
        print(f"Modified: {os.path.join(path, n)}")
    for n, s in dcmp.subdirs.items():
        diff(s, os.path.join(path, n))

ignore = ['.git', 'node_modules', '.next', 'dist', '.turbo', '.venv', '.vercel', '.wwebjs_auth', '.wwebjs_cache', 'artifacts', 'logs', 'public', '.archive', '_archive', '_archived_repos', '.idea']
dcmp = filecmp.dircmp(r'H:\SE', r'H:\Sierra-Estates-Final', ignore=ignore)
diff(dcmp)
