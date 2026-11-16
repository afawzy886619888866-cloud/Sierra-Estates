const sheetId = '1g9GIcCM0slC5QplgzatZRxU46O_N4CR2jgDp9DeMYZk';

async function checkGid(gid) {
  try {
    const res = await fetch(`https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv&gid=${gid}`);
    if (res.ok) {
      const text = await res.text();
      const firstLine = text.split('\n')[0];
      const lineCount = text.split('\n').filter(Boolean).length;
      return { gid, ok: true, lineCount, firstLine: firstLine.slice(0, 100) };
    }
  } catch {}
  return { gid, ok: false };
}

async function main() {
  const gids = ['0', '1', '1127958606', '341562911', '123456'];
  for (const g of gids) {
    const r = await checkGid(g);
    if (r.ok) {
      console.log(`GID ${r.gid}: Lines: ${r.lineCount} | Header: ${r.firstLine}`);
    } else {
      console.log(`GID ${g}: not found`);
    }
  }
}

main();
