import subprocess, sys, json, os, time

if len(sys.argv) < 2:
    print("Usage: python scripts/ssm_exec.py <command>")
    sys.exit(1)

shell_command = sys.argv[1]
instance_id = os.environ.get('SIERRA_EC2_INSTANCE_ID', 'i-0bfd988398645d0cb')
region = os.environ.get('AWS_REGION', 'us-east-1')

aws_base = ['aws']
if 'AWS_ACCESS_KEY_ID' not in os.environ and 'AWS_PROFILE' not in os.environ:
    aws_base.extend(['--profile', 'sierra-estates'])
aws_base.extend(['--region', region])

import base64

b64_payload = base64.b64encode(shell_command.encode('utf-8')).decode('ascii')
wrapper_cmd = f"echo {b64_payload} | base64 -d | bash"

cmd = aws_base + [
    'ssm', 'send-command',
    '--instance-ids', instance_id,
    '--document-name', 'AWS-RunShellScript',
    '--parameters', json.dumps({'commands': [wrapper_cmd]}),
    '--query', 'Command.CommandId', '--output', 'text'
]

env = os.environ.copy()
env['PYTHONUTF8'] = '1'
env['PYTHONIOENCODING'] = 'utf-8'

res = subprocess.run(cmd, capture_output=True, text=True, env=env)
cmd_id = res.stdout.strip()
if not cmd_id or res.returncode != 0:
    print("Failed to send SSM command:", res.stderr)
    sys.exit(res.returncode or 1)

for _ in range(45):
    time.sleep(2)
    out_cmd = aws_base + [
        'ssm', 'get-command-invocation',
        '--command-id', cmd_id, '--instance-id', instance_id
    ]
    out_res = subprocess.run(out_cmd, capture_output=True, text=True, encoding='utf-8', errors='ignore', env=env)
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

print("SSM command timed out waiting for invocation completion.")
sys.exit(1)
