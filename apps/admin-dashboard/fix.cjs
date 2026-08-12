const fs = require('fs');
const code = fs.readFileSync('src/App.tsx', 'utf-8').split('\n');
const newCode = code.slice(0, 522).join('\n') + '\n' + code.slice(832).join('\n');
fs.writeFileSync('src/App.tsx', newCode);
console.log('Fixed App.tsx');
