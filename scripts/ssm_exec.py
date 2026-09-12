import subprocess, sys, json

if len(sys.argv) < 2:
    print("Usage: python scripts/ssm_exec.py <command>")
    sys.exit(1)

shell_command = sys.argv[1]

cmd = [
    'aws', '--profile', 'sierra-estates', '--region', 'us-east-1', 'ssm', 'send-command',
    '--instance-ids', 'i-0be8ff8c5cfba7363',
    '--document-name', 'AWS-RunShellScript',
    '--parameters', json.dumps({'commands': [shell_command]}),
    '--query', 'Command.CommandId', '--output', 'text'
]

res = subprocess.run(cmd, capture_output=True, text=True)
cmd_id = res.stdout.strip()

import time
for _ in range(30):
    time.sleep(2)
    out_cmd = [
        'aws', '--profile', 'sierra-estates', '--region', 'us-east-1', 'ssm', 'get-command-invocation',
        '--command-id', cmd_id, '--instance-id', 'i-0be8ff8c5cfba7363'
    ]
    out_res = subprocess.run(out_cmd, capture_output=True, text=True, encoding='utf-8', errors='ignore')
    try:
        data = json.loads(out_res.stdout)
        status = data.get('Status')
        if status in ['Success', 'Failed', 'Cancelled', 'TimedOut']:
            print(data.get('StandardOutputContent', ''))
            if data.get('StandardErrorContent'):
                print("STDERR:", data.get('StandardErrorContent'))
            sys.exit(0 if status == 'Success' else 1)
    except Exception:
        pass
