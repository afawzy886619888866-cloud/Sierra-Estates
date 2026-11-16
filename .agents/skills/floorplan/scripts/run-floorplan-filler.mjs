// Main executor that updates all description files
import fs from 'node:fs';
import path from 'node:path';
import { generateFileDescription, generateRouteDescription, generateFileName, generateRouteName } from './floorplan-fill-descriptions.mjs';

const descDir = 'floorplan/descriptions';
const wsDir = 'floorplan/.cache/worksheets';

// 1. Build a map of file docstrings and route docstrings from worksheets
const fileDocs = new Map();
const routeDocs = new Map();

if (fs.existsSync(wsDir)) {
  const wsFiles = fs.readdirSync(wsDir).filter(f => f.endsWith('.md'));
  for (const wf of wsFiles) {
    const content = fs.readFileSync(path.join(wsDir, wf), 'utf8');
    const sections = content.split(/\n## /);
    for (let i = 1; i < sections.length; i++) {
      const sec = sections[i];
      const lines = sec.split('\n');
      const header = lines[0].trim();
      const filePath = header.split(/\s+/)[0];

      // Extract file doc
      const docLine = lines.find(l => l.startsWith('doc: '));
      if (docLine) {
        fileDocs.set(filePath, docLine.replace(/^doc:\s*/, '').trim());
      }

      // Extract route docs
      for (const line of lines) {
        const m = line.match(/(GET|POST|PUT|PATCH|DELETE)\s+(\/[a-zA-Z0-9_\-\/:]+)/);
        if (m) {
          const rKey = `${m[1]} ${m[2]}`;
          if (!routeDocs.has(rKey)) {
            // Check if there is doc near it
            const routeDocMatch = line.match(/\((GET|POST|PUT|PATCH|DELETE)\s+.*?\s+([A-Z][^)]+)\)/);
            if (routeDocMatch) {
              routeDocs.set(rKey, routeDocMatch[2].trim());
            }
          }
        }
      }
    }
  }
}

console.log(`Parsed ${fileDocs.size} file docs and ${routeDocs.size} route docs.`);

// 2. Iterate through floorplan/descriptions/*.json and fill them
let totalFilesFilled = 0;
let totalRoutesFilled = 0;

if (fs.existsSync(descDir)) {
  const dFiles = fs.readdirSync(descDir).filter(f => f.endsWith('.json'));
  for (const df of dFiles) {
    const fullPath = path.join(descDir, df);
    const data = JSON.parse(fs.readFileSync(fullPath, 'utf8'));

    if (data.files) {
      for (const [fPath, val] of Object.entries(data.files)) {
        if (!val.name || val.name.trim() === '') {
          val.name = generateFileName(fPath);
        }
        if (!val.description || val.description.trim() === '') {
          val.description = generateFileDescription(fPath, fileDocs.get(fPath));
          totalFilesFilled++;
        }
      }
    }

    if (data.routes) {
      for (const [rKey, val] of Object.entries(data.routes)) {
        if (!val.name || val.name.trim() === '' || val.name.startsWith('Get api') || val.name.startsWith('Create api')) {
          val.name = generateRouteName(rKey);
        }
        if (!val.description || val.description.trim() === '') {
          val.description = generateRouteDescription(rKey, routeDocs.get(rKey));
          totalRoutesFilled++;
        }
      }
    }

    fs.writeFileSync(fullPath, JSON.stringify(data, null, 2) + '\n', 'utf8');
  }
}

console.log(`Successfully filled ${totalFilesFilled} files and ${totalRoutesFilled} routes across descriptions.`);
