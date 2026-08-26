const http = require('http');

const HOST = 'localhost';
const PORT = 5000;

async function jsonReq(method, path, token, body) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const opts = {
      hostname: HOST, port: PORT, path, method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    };
    const req = http.request(opts, (res) => {
      let raw = '';
      res.on('data', c => raw += c);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(raw) }); }
        catch { resolve({ status: res.statusCode, body: raw }); }
      });
    });
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

async function run() {
  console.log('--- Testing Student Access ---');
  // Find a student from seed data (john.doe@student.tvti.edu or similar)
  const loginR = await jsonReq('POST', '/api/auth/login', null, { email: 'john.doe@student.tvti.edu', password: 'password123' });
  if (loginR.status !== 200) {
    console.log('Could not login as student:', loginR.body);
    return;
  }
  const token = loginR.body.token;
  console.log('✅ Logged in as student:', loginR.body.name);

  // Home Dashboard
  const homeR = await jsonReq('GET', '/api/students/home', token);
  console.log('✅ GET /api/students/home:', homeR.status, homeR.body.notifications ? '(has data)' : '(no data)');

  // Schedule
  const schedR = await jsonReq('GET', '/api/students/my-schedule', token);
  console.log('✅ GET /api/students/my-schedule:', schedR.status, Array.isArray(schedR.body) ? `${schedR.body.length} batches` : schedR.body);

  // Batches
  const batchesR = await jsonReq('GET', '/api/students/batches', token);
  console.log('✅ GET /api/students/batches:', batchesR.status, Array.isArray(batchesR.body) ? `${batchesR.body.length} batches` : batchesR.body);

  let batchId = null;
  if (Array.isArray(batchesR.body) && batchesR.body.length > 0) {
    batchId = batchesR.body[0]._id || batchesR.body[0];
    if (typeof batchId === 'object' && batchId._id) batchId = batchId._id;
  }

  if (batchId) {
    const vidsR = await jsonReq('GET', `/api/students/batches/${batchId}/videos`, token);
    console.log(`✅ GET /api/students/batches/${batchId}/videos:`, vidsR.status, Array.isArray(vidsR.body) ? `${vidsR.body.length} videos` : vidsR.body);

    if (vidsR.status === 200 && vidsR.body.length > 0) {
      const vid = vidsR.body[0]._id;
      const streamR = await jsonReq('GET', `/api/students/videos/${vid}/stream-url`, token);
      console.log(`✅ GET /api/students/videos/${vid}/stream-url:`, streamR.status, streamR.body.url ? '(has URL)' : streamR.body);
    }

    const matsR = await jsonReq('GET', `/api/students/batches/${batchId}/materials`, token);
    console.log(`✅ GET /api/students/batches/${batchId}/materials:`, matsR.status, Array.isArray(matsR.body) ? `${matsR.body.length} materials` : matsR.body);
  } else {
    console.log('⚠️ No enrolled batches found to test videos/materials.');
  }

  // Practice slots
  const slotsR = await jsonReq('GET', `/api/students/practice-slots?batchId=${batchId || ''}`, token);
  console.log('✅ GET /api/students/practice-slots:', slotsR.status, Array.isArray(slotsR.body) ? `${slotsR.body.length} slots` : slotsR.body);
  
  // Results
  const resR = await jsonReq('GET', '/api/students/my-results', token);
  console.log('✅ GET /api/students/my-results:', resR.status, Array.isArray(resR.body) ? `${resR.body.length} results` : resR.body);

}

run().catch(console.error);
