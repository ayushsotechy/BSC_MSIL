const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const publicDir = path.join(root, 'public');
const buildDir = path.join(root, 'build');

function copyDirectory(source, target) {
  fs.mkdirSync(target, { recursive: true });

  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    const sourcePath = path.join(source, entry.name);
    const targetPath = path.join(target, entry.name);

    if (entry.isDirectory()) {
      copyDirectory(sourcePath, targetPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(sourcePath, targetPath);
    }
  }
}

fs.rmSync(buildDir, { recursive: true, force: true });
copyDirectory(publicDir, buildDir);

const rootRedirect = `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>BSC Portal</title>
    <meta http-equiv="refresh" content="0; url=/vanilla/auth/" />
  </head>
  <body>
    <script>window.location.replace('/vanilla/auth/');</script>
  </body>
</html>
`;

fs.writeFileSync(path.join(buildDir, 'index.html'), rootRedirect);
console.log('Static frontend copied to build/.');
