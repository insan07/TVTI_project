const http = require('http');

const HOST = 'localhost';
const PORT = 5000;

async function jsonReq(method, path) {
  return new Promise((resolve, reject) => {
    const opts = { hostname: HOST, port: PORT, path, method };
    const req = http.request(opts, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve(JSON.parse(raw)); }
        catch { resolve(raw); }
      });
    });
    req.on('error', reject);
    req.end();
  });
}

async function run() {
  const data = await jsonReq('GET', '/api/auth/debug-batch');
  if (Array.isArray(data)) {
     const hwBatch = data.find(b => b.course_id && b.course_id.title && b.course_id.title.includes('Hardware'));
     if (hwBatch) {
         console.log(JSON.stringify(hwBatch, null, 2));
     } else {
         console.log('Not found, found:', data.length, 'batches');
     }
  } else {
     console.log('Response:', data);
  }
}
run();
