const fs = require('fs');
const path = require('path');

const rootDir = __dirname;
const standaloneDir = path.join(rootDir, '.next', 'standalone');

if (!fs.existsSync(standaloneDir)) {
  console.log('[copy-standalone] .next/standalone not found, skipping copy.');
  process.exit(0);
}

// In monorepos, Next.js standalone outputs apps/web/ inside .next/standalone
const standaloneAppDir = path.join(standaloneDir, 'apps', 'web');
const targetDirs = [standaloneDir];
if (fs.existsSync(standaloneAppDir)) {
  targetDirs.push(standaloneAppDir);
}

const publicDir = path.join(rootDir, 'public');
const staticDir = path.join(rootDir, '.next', 'static');

for (const target of targetDirs) {
  // Copy public folder
  if (fs.existsSync(publicDir)) {
    const destPublic = path.join(target, 'public');
    fs.cpSync(publicDir, destPublic, { recursive: true, force: true });
    console.log(`[copy-standalone] Copied public to: ${destPublic}`);
  }

  // Copy static folder
  if (fs.existsSync(staticDir)) {
    const destStatic = path.join(target, '.next', 'static');
    fs.mkdirSync(path.dirname(destStatic), { recursive: true });
    fs.cpSync(staticDir, destStatic, { recursive: true, force: true });
    console.log(`[copy-standalone] Copied .next/static to: ${destStatic}`);
  }
}

// Hostinger LiteSpeed runner looks for server.js directly in the output root
const innerServerJs = path.join(standaloneAppDir, 'server.js');
const rootServerJs = path.join(standaloneDir, 'server.js');
if (fs.existsSync(innerServerJs) && !fs.existsSync(rootServerJs)) {
  fs.writeFileSync(
    rootServerJs,
    `// Entry bridge for Hostinger / LiteSpeed runner
require('./apps/web/server.js');
`
  );
  console.log(`[copy-standalone] Created root entry bridge at: ${rootServerJs}`);
}

console.log('[copy-standalone] Standalone build preparation completed successfully!');
