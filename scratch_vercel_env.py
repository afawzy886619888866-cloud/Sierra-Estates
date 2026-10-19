import json
import os
import urllib.request

auth_path = os.path.expandvars(r"%APPDATA%\com.vercel.cli\Data\auth.json")
with open(auth_path, 'r', encoding='utf-8') as f:
    auth_data = json.load(f)
token = auth_data.get('token')

team_id = "team_UvdJ5ezVTaqEKyhqZ5QVqOKJ"
project_id = "prj_ieVcIcoeTtHndspXMzlE0cwLl89c"
url = f"https://api.vercel.com/v9/projects/{project_id}/env?teamId={team_id}"
req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})

try:
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        envs = data.get('envs', [])
        for e in envs:
            key = e.get('key')
            if any(k in key for k in ['POSTGRES', 'DATABASE', 'DB_URL', 'SUPABASE_URL']):
                print("Key:", key, "type:", e.get('type'), "target:", e.get('target'))
except Exception as e:
    print("Error:", e)
