const fs = require('fs');
const path = require('path');
const componentsDir = 'f:/Sierra Estates/i-sierra-2027/sierra-estates-final/packages/ui/src/components';
const indexFile = 'f:/Sierra Estates/i-sierra-2027/sierra-estates-final/packages/ui/src/index.ts';

const files = fs.readdirSync(componentsDir).filter(f => f.endsWith('.tsx'));
let exportsText = '';

files.forEach(file => {
    const filePath = path.join(componentsDir, file);
    const content = fs.readFileSync(filePath, 'utf8');
    const basename = path.basename(file, '.tsx');
    
    // We already know some don't have default exports based on my previous script
    if (content.includes('export default')) {
        exportsText += `export { default as ${basename} } from './components/${basename}';\n`;
    } else {
        exportsText += `export * from './components/${basename}';\n`;
    }
});

fs.writeFileSync(indexFile, exportsText, 'utf8');
console.log('Updated index.ts with exports for ' + files.length + ' components.');
