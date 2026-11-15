const fs = require('fs');
const all = JSON.parse(fs.readFileSync('scripts/pf-all-listings.json', 'utf8'));
const l = all.find(x => x.id === '01JPJ134EVEJYBTV0YS1NBH7RW');
console.log(JSON.stringify(l, null, 2));
