const fs = require('fs');
const path = require('path');

const targetDir = path.join(__dirname, '.next');
if (fs.existsSync(targetDir)) {
  console.log('Preparing .next bundle for Hostinger deployment...');
  try {
    // 1. Copy package.json
    fs.copyFileSync(
      path.join(__dirname, 'package.json'),
      path.join(targetDir, 'package.json')
    );

    // 2. Copy node_modules (dereferencing symlinks so they are real physical files)
    const nmSrc = path.join(__dirname, 'node_modules');
    const nmDest = path.join(targetDir, 'node_modules');
    if (fs.existsSync(nmSrc)) {
      fs.cpSync(nmSrc, nmDest, { recursive: true, dereference: true });
    }
    console.log('Successfully prepared .next bundle with node_modules and package.json!');
  } catch (err) {
    console.warn('Deployment prepare notice:', err.message);
  }
}
