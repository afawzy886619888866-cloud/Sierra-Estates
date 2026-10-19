import json
import os
import urllib.request

auth_path = os.path.expandvars(r"%APPDATA%\com.vercel.cli\Data\auth.json")
with open(auth_path, 'r', encoding='utf-8') as f:
    auth_data = json.load(f)
token = auth_data.get('token')

deploy_id = "dpl_CffeCDwj6xp9EMEfBPUNM7czg8ZM"
team_id = "team_UvdJ5ezVTaqEKyhqZ5QVqOKJ"

url = f"https://api.vercel.com/v13/deployments/{deploy_id}?teamId={team_id}"
req = urllib.request.Request(url, headers={"Authorization": f"Bearer {token}"})

try:
    with urllib.request.urlopen(req) as resp:
        data = json.loads(resp.read().decode('utf-8'))
        print("Status:", data.get('status'), data.get('readyState'))
        print("ErrorCode:", data.get('errorCode'))
        print("ErrorMessage:", data.get('errorMessage'))
        print("Error:", data.get('error'))
except Exception as e:
    print("Error:", e)
