import json
import os
import urllib.request

auth_path = os.path.expandvars(r"%APPDATA%\com.vercel.cli\Data\auth.json")
with open(auth_path, 'r', encoding='utf-8') as f:
    auth_data = json.load(f)
token = auth_data.get('token')

team_id = "team_UvdJ5ezVTaqEKyhqZ5QVqOKJ"
url = f"https://api.vercel.com/v9/projects/sierra-estates-client-portal?teamId={team_id}"
req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})

try:
    with urllib.request.urlopen(req) as resp:
        proj = json.loads(resp.read().decode('utf-8'))
        print("Root directory:", proj.get('rootDirectory'))
        print("Build command:", proj.get('buildCommand'))
        print("Framework:", proj.get('framework'))
except Exception as e:
    print("Error:", e)
