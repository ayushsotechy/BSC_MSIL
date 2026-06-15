const fs = require('fs');
const http = require('http');
const path = require('path');

const root = path.resolve(__dirname, '..', 'public');
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '0.0.0.0';

const redirects = new Map([
  ['/', '/vanilla/auth/'],
  ['/login', '/vanilla/auth/'],
  ['/admin/dashboard', '/vanilla/admin/'],
  ['/admin/access-credentials', '/vanilla/admin/'],
  ['/msil/dashboard', '/vanilla/msil/'],
  ['/msil/access-credentials', '/vanilla/msil/'],
  ['/dealer/dashboard', '/vanilla/dealer/'],
]);

const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

function sendRedirect(response, location) {
  response.writeHead(302, { Location: location });
  response.end();
}

function sendNotFound(response) {
  response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  response.end('Not found');
}

function resolveStaticPath(urlPath) {
  const decodedPath = decodeURIComponent(urlPath);
  const normalizedPath = path.normalize(decodedPath).replace(/^(\.\.[/\\])+/, '');
  let filePath = path.join(root, normalizedPath);

  if (!filePath.startsWith(root)) return null;
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }
  return filePath;
}

const server = http.createServer((request, response) => {
  const requestUrl = new URL(request.url, `http://${request.headers.host || 'localhost'}`);
  const redirect = redirects.get(requestUrl.pathname);

  if (redirect) {
    sendRedirect(response, redirect);
    return;
  }

  const filePath = resolveStaticPath(requestUrl.pathname);
  if (!filePath || !fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
    sendNotFound(response);
    return;
  }

  response.writeHead(200, {
    'Content-Type': contentTypes[path.extname(filePath)] || 'application/octet-stream',
  });
  fs.createReadStream(filePath).pipe(response);
});

server.listen(port, host, () => {
  console.log(`Static frontend running at http://localhost:${port}`);
});
