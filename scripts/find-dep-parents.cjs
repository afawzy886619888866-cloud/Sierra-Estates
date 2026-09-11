const fs = require('fs');
const lock = fs.readFileSync('pnpm-lock.yaml', 'utf8');

const targets = [
  'hint@7.1.13',
  'hint',
  'latest-version@5.1.0'
];

// In pnpm lockfile v9:
// snapshots section:
// 'package-name@version...':
//   dependencies:
//     dep: version
const lines = lock.split('\n');
targets.forEach(target => {
  const [name, ver] = target.split('@');
  const callers = [];
  let currentParent = null;
  let inDeps = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (/^  ['"]?[@a-zA-Z0-9_\-\.\/]+@[^:]+['"]?:/.test(line)) {
      currentParent = line.trim().replace(/:$/, '');
      inDeps = false;
    } else if (/^    dependencies:|^    optionalDependencies:/.test(line)) {
      inDeps = true;
    } else if (/^    [a-z]/.test(line)) {
      inDeps = false;
    } else if (inDeps && currentParent) {
      const match = line.match(/^      ['"]?([@a-zA-Z0-9_\-\.\/]+)['"]?:\s*['"]?([^'"]+)['"]?/);
      if (match) {
        const depName = match[1];
        const depVer = match[2];
        if (depName === name && depVer.startsWith(ver)) {
          callers.push(currentParent);
        }
      }
    }
  }
  console.log(target + ' -> used by: ' + (callers.length > 0 ? callers.join(', ') : 'root/direct or not in snapshots'));
});
