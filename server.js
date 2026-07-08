/**
 * Production Web Server for Smadiums.
 * Zero-dependency, lightweight static file server with strict security headers,
 * ready for Google Cloud Run containerization.
 * @module server
 */

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Cloud Run binds to the PORT environment variable; defaults to 3000 for local dev. */
const PORT = process.env.PORT || 3000;

/** Root directory for serving static files. */
const PUBLIC_DIR = __dirname;

/** Mapping of file extensions to MIME content types. */
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

/**
 * Apply security response headers to prevent XSS, clickjacking, and MIME sniffing.
 * @param {http.ServerResponse} res - HTTP response object
 */
function setSecurityHeaders(res) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Content-Security-Policy', "default-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com https://generativelanguage.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://generativelanguage.googleapis.com; script-src 'self' 'unsafe-inline';");
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=(), interest-cohort=()');
}

/**
 * Resolve the requested URL to a safe filesystem path.
 * Returns null if the path fails safety checks (directory traversal).
 * @param {string} requestUrl - Raw request URL
 * @returns {{ filePath: string, error: number | null }} Resolved file path and optional error code
 */
function resolveFilePath(requestUrl) {
  let safeUrl = requestUrl;

  try {
    safeUrl = decodeURIComponent(safeUrl);
  } catch (_e) {
    return { filePath: '', error: 400 };
  }

  // Strip query parameters
  const queryIdx = safeUrl.indexOf('?');
  if (queryIdx !== -1) {
    safeUrl = safeUrl.substring(0, queryIdx);
  }

  const filePath = path.join(PUBLIC_DIR, safeUrl === '/' ? 'index.html' : safeUrl);

  // Directory traversal guard
  const relative = path.relative(PUBLIC_DIR, filePath);
  const isSafe = relative && !relative.startsWith('..') && !path.isAbsolute(relative);

  if (safeUrl !== '/' && !isSafe) {
    return { filePath: '', error: 403 };
  }

  return { filePath, error: null };
}

const server = http.createServer((req, res) => {
  setSecurityHeaders(res);

  const { filePath, error } = resolveFilePath(req.url);

  if (error) {
    const messages = { 400: 'Bad Request', 403: 'Forbidden' };
    res.writeHead(error, { 'Content-Type': 'text/plain' });
    res.end(messages[error]);
    return;
  }

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (readErr, data) => {
    if (readErr) {
      const statusCode = readErr.code === 'ENOENT' ? 404 : 500;
      const statusText = readErr.code === 'ENOENT' ? '404 Not Found' : 'Internal Server Error';
      res.writeHead(statusCode, { 'Content-Type': 'text/plain' });
      res.end(statusText);
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
