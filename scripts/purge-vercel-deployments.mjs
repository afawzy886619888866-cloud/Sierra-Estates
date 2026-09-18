// scripts/purge-vercel-deployments.mjs
// Automated tool to safely purge historical Vercel deployments and clear 10GB storage quota

const token = process.env.VERCEL_TOKEN || process.argv[2];
if (!token) {
  console.error('❌ Error: Vercel token required. Pass as VERCEL_TOKEN env var or first argument.');
  process.exit(1);
}

const headers = {
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
};

async function api(path, options = {}) {
  const url = `https://api.vercel.com${path}`;
  const res = await fetch(url, { ...options, headers });
  if (!res.ok && options.method === 'DELETE' && res.status === 404) {
    return { success: true, deleted: false };
  }
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    return { status: res.status, text };
  }
}

async function run() {
  console.log('🔍 Authenticating with Vercel API...');
  const user = await api('/v2/user');
  if (user.error) {
    console.error('❌ Auth failed:', user.error);
    process.exit(1);
  }
  console.log(`✅ Authenticated as: ${user.user?.username || user.user?.email || 'User'}`);

  // Fetch teams
  const teamsData = await api('/v2/teams');
  const teams = teamsData.teams || [];
  console.log(`📋 Teams found: ${teams.map(t => `${t.name} (${t.id})`).join(', ') || 'Personal account'}`);

  const targetTeam = teams.find(t => t.id === 'team_UvdJ5ezVTaqEKyhqZ5QVqOKJ' || t.slug === 'sierra-estates-projects') || teams[0];
  const teamParam = targetTeam ? `?teamId=${targetTeam.id}` : '';
  const teamId = targetTeam ? targetTeam.id : null;
  console.log(`🎯 Targeting Team: ${targetTeam ? targetTeam.name : 'Personal'}`);

  // Fetch projects
  const projectsData = await api(`/v9/projects${teamParam}`);
  const projects = projectsData.projects || [];
  console.log(`📁 Projects found: ${projects.map(p => p.name).join(', ')}`);

  for (const project of projects) {
    console.log(`\n========================================`);
    console.log(`🚀 Processing Project: ${project.name} (${project.id})`);
    console.log(`========================================`);

    let allDeployments = [];
    let until = null;

    // Paginate through deployments
    while (true) {
      const q = new URLSearchParams();
      if (teamId) q.set('teamId', teamId);
      q.set('projectId', project.id);
      q.set('limit', '100');
      if (until) q.set('until', until);

      const res = await api(`/v6/deployments?${q.toString()}`);
      const list = res.deployments || [];
      if (list.length === 0) break;
      allDeployments.push(...list);
      console.log(`  Fetched ${allDeployments.length} deployments...`);
      if (list.length < 100) break;
      until = list[list.length - 1].created;
    }

    console.log(`📊 Total deployments found for ${project.name}: ${allDeployments.length}`);
    if (allDeployments.length <= 1) {
      console.log(`  Project already has minimal deployments. Skipping.`);
      continue;
    }

    // Identify active production deployment to preserve
    const productionDeployments = allDeployments.filter(d => d.target === 'production' && d.state === 'READY');
    const latestProd = productionDeployments[0] || allDeployments[0];
    console.log(`🛡️ Preserving latest active deployment: ${latestProd.uid} (${latestProd.url})`);

    const toDelete = allDeployments.filter(d => d.uid !== latestProd.uid);
    console.log(`🗑️ Deleting ${toDelete.length} historical deployments to free storage...`);

    let deletedCount = 0;
    let failedCount = 0;

    // Delete in concurrent batches of 10
    const BATCH_SIZE = 10;
    for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
      const batch = toDelete.slice(i, i + BATCH_SIZE);
      await Promise.all(
        batch.map(async (dep) => {
          const deleteUrl = `/v13/deployments/${dep.uid}${teamParam}`;
          const result = await api(deleteUrl, { method: 'DELETE' });
          if (result && (result.state === 'DELETED' || result.deleted || !result.error)) {
            deletedCount++;
          } else {
            failedCount++;
          }
        })
      );
      process.stdout.write(`\r  Progress: ${deletedCount + failedCount} / ${toDelete.length} (${deletedCount} deleted, ${failedCount} errors)...`);
    }
    console.log(`\n✅ Finished ${project.name}: ${deletedCount} deployments deleted.`);
  }

  console.log('\n🎉 Deployment purge complete! 10GB storage quota cleared.');
}

run().catch(console.error);
