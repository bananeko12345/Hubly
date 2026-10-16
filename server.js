import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(fileURLToPath(new URL('.', import.meta.url)), 'dist');
const port = Number(process.env.PORT || 3000);
const contentTypes = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.ico': 'image/x-icon' };

createServer(async (request, response) => {
  const requestPath = decodeURIComponent(new URL(request.url, `http://${request.headers.host || 'localhost'}`).pathname);
  const relativePath = normalize(requestPath).replace(/^([.][.][/\\])+/, '');
  let filePath = join(root, relativePath === '/' ? 'index.html' : relativePath);
  try {
    const body = await readFile(filePath);
    response.writeHead(200, { 'Content-Type': contentTypes[extname(filePath)] || 'application/octet-stream', 'Cache-Control': extname(filePath) === '.html' ? 'no-cache' : 'public, max-age=31536000' });
    response.end(body);
  } catch {
    const body = await readFile(join(root, 'index.html'));
    response.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-cache' });
    response.end(body);
  }
}).listen(port, '0.0.0.0', () => console.log(`Hubly Chat listening on ${port}`));
