const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 8080;
const BUILD_DIR = path.join(__dirname, 'excalidraw-app', 'build');

const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2'
};

const server = http.createServer((req, res) => {
  console.log(`[REQUEST] ${req.method} ${req.url}`);
  
  // Clean URL to handle query strings
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/' || urlPath === '') {
    urlPath = '/index.html';
  }

  let filePath = path.join(BUILD_DIR, urlPath);

  // If file does not exist, and it's a GET request, act like an SPA and serve index.html
  if (!fs.existsSync(filePath)) {
    console.log(`[404 fallback] ${filePath} not found, falling back to index.html`);
    filePath = path.join(BUILD_DIR, 'index.html');
  }

  if (fs.existsSync(filePath)) {
    const ext = path.extname(filePath);
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';
    
    res.writeHead(200, { 'Content-Type': contentType });
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
  } else {
    // build/index.html doesn't exist either! Look at contents to debug:
    let dirContents = 'Directory does not exist';
    if (fs.existsSync(BUILD_DIR)) {
      dirContents = fs.readdirSync(BUILD_DIR).join(', ');
    } else {
      const parentDir = path.join(__dirname, 'excalidraw-app');
      if (fs.existsSync(parentDir)) {
          dirContents = '[excalidraw-app exists, contents: ' + fs.readdirSync(parentDir).join(', ') + ']';
      }
    }
    console.error(`ERROR: index.html not found in ${BUILD_DIR}. Directory contents: ${dirContents}`);
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end(`404 Not Found. index.html is missing. Debug info: ${dirContents}`);
  }
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`Served directory: ${BUILD_DIR}`);
  
  // Debug container filesystem
  try {
    console.log(`__dirname contents: ${fs.readdirSync(__dirname).join(', ')}`);
    const excalAppDir = path.join(__dirname, 'excalidraw-app');
    if (fs.existsSync(excalAppDir)) {
      console.log(`excalidraw-app contents: ${fs.readdirSync(excalAppDir).join(', ')}`);
      
      if (fs.existsSync(BUILD_DIR)) {
        console.log(`excalidraw-app/build exists! Contents: ${fs.readdirSync(BUILD_DIR).join(', ')}`);
      } else {
        console.log(`excalidraw-app/build DOES NOT EXIST!`);
      }
    }
  } catch(e) { console.error('Error logging dirs', e); }
});
