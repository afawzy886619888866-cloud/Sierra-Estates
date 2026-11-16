const sheetId = '1q-dQmbFS9UZkRrL_HmJIxBXQ-ASEPkM7MvFiviojw7A';

async function main() {
  const res = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/edit`);
  const html = await res.text();
  console.log('HTML length:', html.length);
  
  // Look for bootstrap data patterns
  const idx = html.indexOf('bootstrapData');
  if (idx !== -1) {
    console.log('bootstrapData found near index:', idx);
    console.log(html.slice(idx, idx + 500));
  } else {
    // Look for sheet tab names or gids
    const matches = html.match(/\[\d+,\s*\"[^\"]+\",\s*\d+\]/g) || [];
    console.log('Array matches:', matches.slice(0, 10));
    
    // search for GID=
    const gidMatches = html.match(/gid=(\d+)/g) || [];
    console.log('gid= matches:', Array.from(new Set(gidMatches)));
    
    // search for sheetId
    const sidMatches = html.match(/"?sheetId"?\s*[:=]\s*(\d+)/g) || [];
    console.log('sheetId matches:', Array.from(new Set(sidMatches)));
  }
}

main();
