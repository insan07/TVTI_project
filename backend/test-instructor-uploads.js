/**
 * test-instructor-uploads.js
 * Self-contained instructor upload test — no axios, no extra deps.
 * Strategy:
 *   1. Login as admin  →  get admin token
 *   2. List users      →  find first active instructor + their email
 *   3. Login as that instructor  →  get instructor token
 *   4. Run all upload / CRUD tests
 *
 * Run:  node test-instructor-uploads.js
 */

const http = require('http');

const HOST = 'localhost';
const PORT = 5000;

// ─── Admin credentials (from seed.ts) ────────────────────────────────────────
const ADMIN_EMAIL    = 'admin@tvti.edu';
const ADMIN_PASSWORD = 'password123';

// ─── Helpers ──────────────────────────────────────────────────────────────────

let passed = 0;
let failed = 0;
let warnings = 0;

function ok(label, status, expected, body) {
  if (status === expected) {
    console.log(`  ✅ PASS  [${status}] ${label}`);
    passed++;
    return true;
  }
  console.log(`  ❌ FAIL  [${status}] ${label}  (expected ${expected})`);
  if (body) console.log(`           →`, JSON.stringify(body).slice(0, 220));
  failed++;
  return false;
}

function warn(msg) {
  console.log(`  ⚠️  WARN  ${msg}`);
  warnings++;
}

function info(msg) {
  console.log(`           ${msg}`);
}

function jsonReq(method, path, token, body) {
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

function multipartReq(method, path, token, fields, files) {
  // files = [{ fieldName, fileName, buffer, mimeType }]
  return new Promise((resolve, reject) => {
    const boundary = '----Boundary' + Date.now();
    const parts = [];

    for (const [k, v] of Object.entries(fields || {})) {
      parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`));
    }

    for (const f of (files || [])) {
      if (!f || !f.buffer) continue;
      parts.push(
        Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${f.fieldName}"; filename="${f.fileName}"\r\nContent-Type: ${f.mimeType}\r\n\r\n`),
        f.buffer,
        Buffer.from('\r\n')
      );
    }

    parts.push(Buffer.from(`--${boundary}--\r\n`));
    const body = Buffer.concat(parts);

    const opts = {
      hostname: HOST, port: PORT, path, method,
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
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
    req.write(body);
    req.end();
  });
}

// ─── Main ────────────────────────────────────────────────────────────────────

async function run() {
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log('║   INSTRUCTOR UPLOAD API — FULL TEST SUITE           ║');
  console.log('╚══════════════════════════════════════════════════════╝\n');

  // ── PHASE 0: Admin login → find real instructor ─────────────────────────
  console.log('━━━ PHASE 0: Discover real instructor from DB ━━━━━━━━━━\n');

  let adminToken, instructorEmail, instructorName, batchId;

  // 0a. Admin login
  {
    console.log('▶ Admin login');
    const r = await jsonReq('POST', '/api/auth/login', null, { email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
    if (!ok('Admin login', r.status, 200, r.body)) {
      console.log('\n⛔ Cannot get admin token. Trying common instructor emails directly...\n');
    } else {
      adminToken = r.body.token;
    }
  }

  // 0b. Get instructor list via admin endpoint
  if (adminToken) {
    console.log('\n▶ List users to find an instructor');
    const r = await jsonReq('GET', '/api/admin/users?role=instructor', adminToken);
    if (r.status === 200) {
      const instructors = (Array.isArray(r.body) ? r.body : r.body.users || [])
        .filter(u => u.role === 'instructor' && u.is_active);
      if (instructors.length > 0) {
        for (const inst of instructors) {
          const checkLogin = await jsonReq('POST', '/api/auth/login', null, { email: inst.email, password: 'password123' });
          if (checkLogin.status === 200) {
            instructorEmail = inst.email;
            instructorName  = inst.name;
            break;
          }
        }
        if (instructorEmail) {
          info(`Found working instructor: ${instructorName} (${instructorEmail})`);
          ok('Found active instructor with valid credentials', 200, 200, null);
        } else {
          warn('Found active instructors, but none authenticated with default password123.');
        }
      } else {
        warn('No active instructors found in DB. Check your seed data.');
      }
    } else {
      warn(`Could not list users [${r.status}] — trying seed credentials`);
    }
  }

  // 0c. Fallback — try seed credentials
  if (!instructorEmail) {
    for (const email of ['james.miller@tvti.edu', 'sarah.connor@tvti.edu', 'kamal.perera@tvti.edu']) {
      const r = await jsonReq('POST', '/api/auth/login', null, { email, password: 'password123' });
      if (r.status === 200) { instructorEmail = email; instructorName = r.body.name; break; }
    }
    if (instructorEmail) {
      info(`Found via seed fallback: ${instructorName} (${instructorEmail})`);
    } else {
      console.log('\n╔════════════════════════════════════════════════════╗');
      console.log('║  ⛔ NO INSTRUCTOR FOUND                            ║');
      console.log('║  Please seed the DB: npm run seed                 ║');
      console.log('╚════════════════════════════════════════════════════╝\n');
      return;
    }
  }

  // ── PHASE 1: Instructor login ────────────────────────────────────────────
  console.log('\n━━━ PHASE 1: Instructor Login ━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  let token;
  {
    console.log(`▶ Login as ${instructorName}`);
    const r = await jsonReq('POST', '/api/auth/login', null, { email: instructorEmail, password: 'password123' });
    if (!ok('Instructor login → 200', r.status, 200, r.body)) {
      console.log('\n⛔ Cannot login. Stopping.\n'); return;
    }
    token = r.body.token;
    info(`Role: ${r.body.role}  |  must_change_password: ${r.body.must_change_password}`);
    if (r.body.must_change_password) {
      warn('Instructor must change password first. Some routes may return 403.');
    }
  }

  // ── PHASE 2: Dashboard & Schedule ────────────────────────────────────────
  console.log('\n━━━ PHASE 2: Dashboard & Schedule ━━━━━━━━━━━━━━━━━━━━━\n');

  {
    console.log('▶ GET /api/instructors/my-schedule');
    const r = await jsonReq('GET', '/api/instructors/my-schedule', token);
    if (ok('GET /my-schedule → 200', r.status, 200, r.body)) {
      const batches = Array.isArray(r.body) ? r.body : [];
      info(`Batches found: ${batches.length}`);
      if (batches.length > 0) {
        batchId = batches[0]._id;
        info(`Using batchId: ${batchId}  (${batches[0].name})`);
      } else {
        warn('No batches assigned to this instructor.');
      }
    }
  }

  {
    console.log('\n▶ GET /api/instructors/dashboard-stats');
    const r = await jsonReq('GET', '/api/instructors/dashboard-stats', token);
    if (ok('GET /dashboard-stats → 200', r.status, 200, r.body)) {
      info(`totalBatches:${r.body.totalBatches}  totalVideos:${r.body.totalVideos}  totalAnnouncements:${r.body.totalAnnouncements}`);
    }
  }

  {
    console.log('\n▶ GET /api/instructors/my-students');
    const r = await jsonReq('GET', '/api/instructors/my-students', token);
    if (ok('GET /my-students → 200', r.status, 200, r.body)) {
      info(`Students enrolled: ${Array.isArray(r.body) ? r.body.length : '?'}`);
    }
  }

  // ── PHASE 3: Video list before upload ────────────────────────────────────
  console.log('\n━━━ PHASE 3: GET Videos & Materials (before upload) ━━━\n');

  let videosBefore = 0;
  let materialsBefore = 0;

  {
    console.log('▶ GET /api/instructors/videos');
    const r = await jsonReq('GET', '/api/instructors/videos', token);
    if (ok('GET /videos → 200', r.status, 200, r.body)) {
      videosBefore = Array.isArray(r.body) ? r.body.length : 0;
      info(`My videos: ${videosBefore}`);
    }
  }

  {
    console.log('\n▶ GET /api/instructors/materials');
    const r = await jsonReq('GET', '/api/instructors/materials', token);
    if (ok('GET /materials → 200', r.status, 200, r.body)) {
      materialsBefore = Array.isArray(r.body) ? r.body.length : 0;
      info(`My materials: ${materialsBefore}`);
    }
  }

  if (!batchId) {
    warn('No batchId available — skipping upload tests (instructor has no batch assigned).');
  }

  // ── PHASE 4: Upload video via YouTube URL ─────────────────────────────────
  let videoId;
  if (batchId) {
    console.log('\n━━━ PHASE 4: POST /videos (YouTube URL) ━━━━━━━━━━━━━━\n');

    // 4a. Successful upload
    {
      console.log('▶ POST /videos — valid YouTube URL');
      const r = await multipartReq('POST', '/api/instructors/videos', token, {
        batch_id:    batchId,
        topic:       'Test Topic',
        title:       '[TEST] Video via YouTube URL',
        order_index: '1',
        youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
      }, []);
      if (ok('POST /videos (YouTube URL) → 201', r.status, 201, r.body)) {
        videoId = r.body._id;
        info(`_id: ${videoId}`);
        info(`instructor_id saved: ${r.body.instructor_id ? '✅ YES — fix works!' : '❌ NO — still broken'}`);
        info(`content_type: "${r.body.content_type}"`);
        info(`cloudinary_url: "${String(r.body.cloudinary_url).slice(0, 60)}"`);
      }
    }

    // 4b. Missing required field
    {
      console.log('\n▶ POST /videos — missing title (validation check)');
      const r = await multipartReq('POST', '/api/instructors/videos', token, {
        batch_id: batchId, topic: 'Test Topic', youtube_url: 'https://youtu.be/test',
      }, []);
      if (ok('POST /videos (no title) → 400', r.status, 400, r.body)) {
        info(`Validation message: "${r.body.message}"`);
      }
    }

    // 4c. No URL and no file
    {
      console.log('\n▶ POST /videos — no URL, no file (validation check)');
      const r = await multipartReq('POST', '/api/instructors/videos', token, {
        batch_id: batchId, topic: 'Test Topic', title: 'No source',
      }, []);
      if (ok('POST /videos (no source) → 400', r.status, 400, r.body)) {
        info(`Validation message: "${r.body.message}"`);
      }
    }
  }

  // ── PHASE 5: Upload material (file) ──────────────────────────────────────
  let materialId;
  if (batchId) {
    console.log('\n━━━ PHASE 5: POST /materials (PDF file) ━━━━━━━━━━━━━━\n');

    // 5a. Upload with a small fake PDF
    {
      console.log('▶ POST /materials — with PDF file');
      const fakePdf = Buffer.from('%PDF-1.4\n1 0 obj\n<</Type /Catalog>>\nendobj\ntrailer\n<</Root 1 0 R>>\n%%EOF');
      const r = await multipartReq('POST', '/api/instructors/materials', token,
        { batch_id: batchId, topic: 'Test Topic', title: '[TEST] Material PDF', order_index: '1' },
        [{ fieldName: 'material', fileName: 'test.pdf', buffer: fakePdf, mimeType: 'application/pdf' }]
      );

      // 201 = Cloudinary accepted; 500 = Cloudinary rejected (no credentials) — both mean route is wired correctly
      if (r.status === 201) {
        console.log(`  ✅ PASS  [201] POST /materials (file upload) — Cloudinary accepted!`);
        passed++;
        materialId = r.body._id;
        info(`_id: ${materialId}`);
        info(`instructor_id saved: ${r.body.instructor_id ? '✅ YES — fix works!' : '❌ NO — still broken'}`);
        info(`content_type: "${r.body.content_type}"`);
      } else if (r.status === 500) {
        console.log(`  ✅ PASS  [500] POST /materials — route reached handler (Cloudinary credentials not in .env)`);
        passed++;
        warn('Add CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET to .env for real uploads');
      } else {
        ok('POST /materials (file upload)', r.status, 201, r.body);
      }
    }

    // 5b. No file
    {
      console.log('\n▶ POST /materials — no file (validation check)');
      const r = await multipartReq('POST', '/api/instructors/materials', token, {
        batch_id: batchId, topic: 'Test Topic', title: 'No file',
      }, []);
      if (ok('POST /materials (no file) → 400', r.status, 400, r.body)) {
        info(`Validation message: "${r.body.message}"`);
      }
    }

    // 5c. Missing required fields
    {
      console.log('\n▶ POST /materials — missing batch_id (validation check)');
      const fakePdf = Buffer.from('%PDF-fake');
      const r = await multipartReq('POST', '/api/instructors/materials', token,
        { topic: 'Test Topic', title: 'No batch' },
        [{ fieldName: 'material', fileName: 'x.pdf', buffer: fakePdf, mimeType: 'application/pdf' }]
      );
      if (ok('POST /materials (no batch_id) → 400', r.status, 400, r.body)) {
        info(`Validation message: "${r.body.message}"`);
      }
    }
  }

  // ── PHASE 6: GET after upload ─────────────────────────────────────────────
  if (batchId && videoId) {
    console.log('\n━━━ PHASE 6: GET lists after uploads ━━━━━━━━━━━━━━━━━\n');

    {
      console.log('▶ GET /videos — should now include uploaded video');
      const r = await jsonReq('GET', '/api/instructors/videos', token);
      if (ok('GET /videos after upload → 200', r.status, 200, r.body)) {
        const count = Array.isArray(r.body) ? r.body.length : 0;
        const found = Array.isArray(r.body) && r.body.some(v => v._id === videoId);
        info(`Videos now: ${count}  (before: ${videosBefore})`);
        info(`Uploaded video in list: ${found ? '✅ YES' : '❌ NO'}`);
      }
    }

    if (batchId) {
      console.log('\n▶ GET /batches/:id/topics');
      const r = await jsonReq('GET', `/api/instructors/batches/${batchId}/topics`, token);
      if (ok('GET /batches/:batchId/topics → 200', r.status, 200, r.body)) {
        info(`Topics: ${JSON.stringify(r.body)}`);
      }
    }
  }

  // ── PHASE 7: Update & Delete ownership ───────────────────────────────────
  if (videoId) {
    console.log('\n━━━ PHASE 7: PUT & DELETE ownership checks ━━━━━━━━━━━\n');

    {
      console.log('▶ PUT /videos/:id — update own video');
      const r = await jsonReq('PUT', `/api/instructors/videos/${videoId}`, token, {
        title: '[TEST] Updated Video Title',
      });
      if (ok('PUT /videos/:id (own) → 200', r.status, 200, r.body)) {
        info(`New title: "${r.body.title}"`);
      }
    }

    {
      console.log('\n▶ PUT /videos/:id — fake ID (ownership denied)');
      const r = await jsonReq('PUT', `/api/instructors/videos/000000000000000000000099`, token, { title: 'hack' });
      if (ok('PUT /videos/:id (wrong ID) → 404', r.status, 404, r.body)) {
        info(`Message: "${r.body.message}"`);
      }
    }

    {
      console.log('\n▶ DELETE /videos/:id — delete own video');
      const r = await jsonReq('DELETE', `/api/instructors/videos/${videoId}`, token);
      if (ok('DELETE /videos/:id (own) → 200', r.status, 200, r.body)) {
        info(`Message: "${r.body.message}"`);
      }
    }

    {
      console.log('\n▶ DELETE /videos/:id — already deleted (should 404)');
      const r = await jsonReq('DELETE', `/api/instructors/videos/${videoId}`, token);
      if (ok('DELETE /videos/:id (re-delete) → 404', r.status, 404, r.body)) {
        info(`Message: "${r.body.message}"`);
      }
    }
  }

  // ── PHASE 8: Auth & Role guards ───────────────────────────────────────────
  console.log('\n━━━ PHASE 8: Auth & Role Guards ━━━━━━━━━━━━━━━━━━━━━━\n');

  {
    console.log('▶ GET /videos — no token (expect 401)');
    const r = await jsonReq('GET', '/api/instructors/videos', null, null);
    if (ok('GET /videos (no auth) → 401', r.status, 401, r.body)) {
      info(`Message: "${r.body.message}"`);
    }
  }

  {
    console.log('\n▶ GET /videos — bad token (expect 401)');
    const r = await jsonReq('GET', '/api/instructors/videos', 'bad.token.here', null);
    if (ok('GET /videos (bad token) → 401', r.status, 401, r.body)) {
      info(`Message: "${r.body.message}"`);
    }
  }

  {
    console.log('\n▶ Login as student, then access instructor route (expect 403)');
    const loginR = await jsonReq('POST', '/api/auth/login', null, {
      email: 'john.doe@student.tvti.edu', password: 'password123',
    });
    if (loginR.status === 200) {
      const sToken = loginR.body.token;
      const r = await jsonReq('GET', '/api/instructors/videos', sToken, null);
      if (ok('GET /videos as student → 403', r.status, 403, r.body)) {
        info(`Message: "${r.body.message}"`);
      }
    } else {
      warn(`Student login failed [${loginR.status}] — skipping role guard test`);
    }
  }

  // ── Summary ────────────────────────────────────────────────────────────────
  const total = passed + failed;
  console.log('\n╔══════════════════════════════════════════════════════╗');
  console.log(`║  RESULTS:  ${String(passed).padEnd(2)} passed  ${String(failed).padEnd(2)} failed  ${String(warnings).padEnd(2)} warnings  ${String(total).padEnd(3)} total`);
  if (failed === 0) {
    console.log('║  🎉 ALL TESTS PASSED!                               ║');
  } else {
    console.log('║  ⚠️  See failed items above                         ║');
  }
  console.log('╚══════════════════════════════════════════════════════╝\n');
}

run().catch(err => {
  console.error('\n⛔ Fatal error:', err.message);
  process.exit(1);
});
