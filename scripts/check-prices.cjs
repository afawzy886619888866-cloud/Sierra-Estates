const fs = require('fs');
const data = JSON.parse(fs.readFileSync('scripts/pf-88-analysis.json', 'utf8'));

console.log('Sample prices:');
data.slice(0, 15).forEach(d => {
  console.log(d.id, d.ref, d.type, JSON.stringify(d.price));
});

const priceTypes = {};
data.forEach(d => {
  const t = d.price?.type || 'no_type';
  priceTypes[t] = (priceTypes[t] || 0) + 1;
});
console.log('\nPrice types:', priceTypes);
