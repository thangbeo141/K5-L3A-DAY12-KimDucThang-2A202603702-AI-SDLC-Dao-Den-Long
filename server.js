const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT, 10) || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  let reqPath = req.url.split('?')[0];
  if (reqPath === '/') reqPath = '/index.html';

  // Allow serving engine and contract directly to browser
  let filePath;
  if (reqPath === '/game.contract.json') {
    filePath = path.join(__dirname, 'game.contract.json');
  } else if (reqPath.startsWith('/src/')) {
    filePath = path.join(__dirname, reqPath);
  } else if (reqPath.startsWith('/node_modules/')) {
    filePath = path.join(__dirname, reqPath);
  } else {
    filePath = path.join(PUBLIC_DIR, reqPath);
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      if (err.code === 'ENOENT') {
        res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('404 Not Found');
      } else {
        res.writeHead(500);
        res.end(`Server Error: ${err.code}`);
      }
    } else {
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      });
      res.end(content);
    }
  });
});

let currentPort = PORT;

server.on('listening', () => {
  const actualPort = server.address().port;
  console.log('=======================================================');
  console.log('🏮 Đảo Đèn Lồng 3D Game Server đang chạy tại:');
  console.log(`👉 http://localhost:${actualPort}`);
  console.log('=======================================================');
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.warn(`Port ${currentPort} in use, trying next port...`);
    currentPort += 1;
    if (currentPort - PORT < 10) {
      server.listen(currentPort);
    } else {
      console.error('No available ports found.');
      process.exit(1);
    }
  } else {
    console.error('Server error:', err);
    process.exit(1);
  }
});

server.listen(currentPort);
