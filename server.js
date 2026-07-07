/**
 * Production Web Server for Smadiums.
 * Zero-dependency, lightweight static server with strict security headers,
 * ready for Google Cloud Run containerization.
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Cloud Run binds to the PORT environment variable
const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const server = http.createServer((req, res) => {
  // 1. Security Headers Configuration (Prevents XSS, Clickjacking, MIME sniffing)
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Content-Security-Policy', "default-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com https://generativelanguage.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://generativelanguage.googleapis.com; script-src 'self' 'unsafe-inline';");

  // Normalize request URL path to file path
  let safeUrl = req.url;
  try {
    safeUrl = decodeURIComponent(safeUrl);
  } catch (e) {
    res.statusCode = 400;
    res.end('Bad Request');
    return;
  }

  // Strip query parameters
  const queryIdx = safeUrl.indexOf('?');
  if (queryIdx !== -1) {
    safeUrl = safeUrl.substring(0, queryIdx);
  }

  let filePath = path.join(PUBLIC_DIR, safeUrl === '/' ? 'index.html' : safeUrl);
  
  // 2. Directory Traversal Guard (Security block)
  const relative = path.relative(PUBLIC_DIR, filePath);
  const isSafe = relative && !relative.startsWith('..') && !path.isAbsolute(relative);
  
  if (safeUrl !== '/' && !isSafe) {
    res.statusCode = 403;
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('Forbidden');
    return;
  }

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.statusCode = 404;
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('404 Not Found');
      } else {
        res.statusCode = 500;
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('Internal Server Error');
      }
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(data);
    }
  });
});

// Bind on all network interfaces (required for Cloud Run)
server.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Production server running on http://localhost:${PORT}`);
});
