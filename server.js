const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = parseInt(process.env.PORT, 10) || 3000;
const PUBLIC_DIR = path.join(__dirname, 'public');
const LEADERBOARD_FILE = path.join(__dirname, 'data', 'leaderboard.json');

function getLeaderboard() {
  try {
    if (fs.existsSync(LEADERBOARD_FILE)) {
      const data = JSON.parse(fs.readFileSync(LEADERBOARD_FILE, 'utf8'));
      if (Array.isArray(data)) {
        return { entries: data };
      }
      if (Array.isArray(data.entries)) {
        return data;
      }
    }
  } catch (e) {}
  return { entries: [] };
}

function saveLeaderboard(entries) {
  const dir = path.dirname(LEADERBOARD_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(LEADERBOARD_FILE, JSON.stringify(entries, null, 2), 'utf8');
}

// Check --export-leaderboard CLI command
for (let i = 2; i < process.argv.length; i++) {
  const arg = process.argv[i];
  if (arg === '--export-leaderboard' || arg.startsWith('--export-leaderboard=')) {
    let outPath = null;
    if (arg.includes('=')) {
      outPath = arg.split('=')[1];
    } else {
      outPath = process.argv[i + 1];
    }
    if (!outPath) {
      console.error("Missing output file for --export-leaderboard");
      process.exit(1);
    }
    const lb = getLeaderboard();
    const outDir = path.dirname(path.resolve(outPath));
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(lb.entries, null, 2), 'utf8');
    console.log(`Leaderboard exported successfully to ${outPath}`);
    process.exit(0);
  }
}

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

  // API Endpoints for Leaderboard
  if (reqPath === '/api/leaderboard') {
    if (req.method === 'GET') {
      const lb = getLeaderboard();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(lb.entries));
    }
    if (req.method === 'POST') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const entry = JSON.parse(body);
          if (!entry.name || typeof entry.name !== 'string') throw new Error("Invalid name");
          const trimmedName = entry.name.trim();
          if (trimmedName.length < 3 || trimmedName.length > 12) throw new Error("Name must be 3-12 characters");

          const lb = getLeaderboard();
          const newEntry = {
            name: trimmedName,
            score: parseInt(entry.score, 10) || 0,
            nights_won: Math.max(0, Math.min(3, parseInt(entry.nights_won, 10) || 0)),
            achieved_at: new Date().toISOString(),
            seed: entry.seed !== undefined ? entry.seed : 42
          };
          lb.entries.push(newEntry);
          // Sort: score DESC, achieved_at ASC
          lb.entries.sort((a, b) => {
            if (b.score !== a.score) return b.score - a.score;
            return a.achieved_at.localeCompare(b.achieved_at);
          });
          lb.entries = lb.entries.slice(0, 10);
          saveLeaderboard(lb.entries);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ success: true, entries: lb.entries }));
        } catch (e) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ error: e.message }));
        }
      });
      return;
    }
  }

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
