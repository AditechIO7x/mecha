export async function getRepoData(repoUrl, token) {
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) throw new Error('URL GitHub tidak valid.');

  const owner = match[1];
  let repo = match[2].replace(/\.git$/, '');

  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    ...(token && { 'Authorization': `Bearer ${token}` }),
  };

  const repoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
  if (!repoRes.ok) throw new Error('Gagal mengakses metadata repositori. Periksa izin akses.');
  const repoData = await repoRes.json();
  const defaultBranch = repoData.default_branch;

  const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees/${defaultBranch}?recursive=1`, { headers });
  if (!treeRes.ok) throw new Error('Gagal membaca struktur berkas repositori.');
  const treeData = await treeRes.json();

  const ignoredExtensions = ['.png', '.jpg', '.jpeg', '.gif', '.ico', '.woff', '.zip', '.mp4', '.avi', '.mov', '.pdf', '.mp3', '.wav', '.exe', '.dll', '.svg', '.eot', '.ttf', '.tar', '.gz', '.7z'];
  const filesToAnalyze = treeData.tree.filter(file => 
    file.type === 'blob' && 
    !ignoredExtensions.some(ext => file.path.endsWith(ext)) &&
    !file.path.includes('node_modules/') &&
    !file.path.includes('.git/') &&
    !file.path.includes('package-lock.json') &&
    !file.path.includes('yarn.lock') &&
    !file.path.includes('pnpm-lock.yaml') &&
    !file.path.includes('.next/') &&
    !file.path.includes('dist/') &&
    !file.path.includes('build/')
  ).slice(0, 50);

  let aggregatedContent = `REPOSITORY STRUCTURE:\n`;
  treeData.tree.forEach(f => { aggregatedContent += `- ${f.path}\n`; });
  aggregatedContent += `\n=========================================\nFILE CONTENTS:\n`;

  for (const file of filesToAnalyze) {
    const fileRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${file.path}`, { headers });
    if (fileRes.ok) {
      const fileData = await fileRes.json();
      if (fileData.content) {
        const rawContent = Buffer.from(fileData.content, 'base64').toString('utf8');
        aggregatedContent += `\n--- START OF FILE: ${file.path} ---\n${rawContent}\n--- END OF FILE ---\n`;
      }
    }
  }

  return aggregatedContent;
}