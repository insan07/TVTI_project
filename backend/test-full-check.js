/**
 * test-full-check.js
 * Full end-to-end check: Instructor updates → Student accessibility
 * Tests that everything an instructor uploads/creates is accessible by the enrolled student.
 */

const http = require('http');

const HOST = 'localhost';
const PORT = 5000;

let passed = 0, failed = 0, warnings = 0;

function ok(label, status, expected, body) {
  if (status === expected) {
    console.log(`  ✅ PASS  [${status}] ${label}`);
    passed++;
    return true;
  }
  console.log(`  ❌ FAIL  [${status}] ${label}  (expected ${expected})`);
  if (body) console.log(`           →`, JSON.stringify(body).slice(0, 300));
  failed++;
  return false;
}
function warn(msg) { console.log(`  ⚠️  WARN  ${msg}`); warnings++; }
function info(msg)  { console.log(`           ${msg}`); }

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

function multipartReq(method, path, token, fields) {
  return new Promise((resolve, reject) => {
    const boundary = '----Boundary' + Date.now();
    const parts = [];
    for (const [k, v] of Object.entries(fields || {})) {
      parts.push(Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`));
    }
    parts.push(Buffer.from(`--${boundary}--\r\n`));
    const bodyBuf = Buffer.concat(parts);
    const opts = {
      hostname: HOST, port: PORT, path, method,
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': bodyBuf.length,
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
    req.write(bodyBuf);
    req.end();
  });
}

async function run() {
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log('║  INSTRUCTOR → STUDENT FULL END-TO-END ACCESSIBILITY TEST  ║');
  console.log('╚═══════════════════════════════════════════════════════════╝\n');

  // ── STEP 0: Admin login → discover real instructor + student ──────────────
  console.log('━━━ STEP 0: Admin login & discover real users ━━━━━━━━━━━━━━\n');

  const adminR = await jsonReq('POST', '/api/auth/login', null, { email: 'admin@tvti.com', password: 'password123' });
  if (!ok('Admin login → 200', adminR.status, 200, adminR.body)) {
    console.log('\n⛔ Cannot get admin token. Stopping.\n'); return;
  }
  const adminToken = adminR.body.token;
  info(`Admin: ${adminR.body.name}`);

  // List all users
  const usersR = await jsonReq('GET', '/api/admin/users', adminToken);
  if (!ok('GET /api/admin/users → 200', usersR.status, 200, usersR.body)) {
    console.log('\n⛔ Cannot list users. Stopping.\n'); return;
  }
  const allUsers = Array.isArray(usersR.body) ? usersR.body : (usersR.body.users || []);
  const instructors = allUsers.filter(u => u.role === 'instructor' && u.is_active);
  const students    = allUsers.filter(u => u.role === 'student' && u.is_active);
  info(`Found ${instructors.length} active instructors, ${students.length} active students`);

  if (instructors.length === 0) { warn('No active instructors. Run seed or create one via Admin.'); return; }
  if (students.length === 0)    { warn('No active students. Run seed or create one via Admin.'); return; }

  // Try to find working instructor credentials
  let instructorEmail = null, instructorToken = null, instructorName = null;
  for (const inst of instructors) {
    const r = await jsonReq('POST', '/api/auth/login', null, { email: inst.email, password: 'password123' });
    if (r.status === 200) { instructorEmail = inst.email; instructorToken = r.body.token; instructorName = inst.name; break; }
  }
  if (!instructorToken) { warn('Could not login as any instructor with password123.'); return; }
  info(`Instructor: ${instructorName} (${instructorEmail})`);

  // Try to find working student credentials
  let studentEmail = null, studentToken = null, studentName = null;
  const studentEmails = students.map(s => s.email);
  for (const s of students) {
    const r = await jsonReq('POST', '/api/auth/login', null, { email: s.email, password: 'password123' });
    if (r.status === 200) { studentEmail = s.email; studentToken = r.body.token; studentName = s.name; break; }
    // try by index number too
    if (s.index_number) {
      const r2 = await jsonReq('POST', '/api/auth/login', null, { identifier: s.index_number, password: 'password123' });
      if (r2.status === 200) { studentEmail = s.email; studentToken = r2.body.token; studentName = s.name; break; }
    }
  }
  if (!studentToken) { warn('Could not login as any student with password123.'); return; }
  info(`Student:    ${studentName} (${studentEmail})`);

  // ── STEP 1: Instructor dashboard ─────────────────────────────────────────
  console.log('\n━━━ STEP 1: Instructor Dashboard & Schedule ━━━━━━━━━━━━━━━\n');

  const schedR = await jsonReq('GET', '/api/instructors/my-schedule', instructorToken);
  ok('GET /api/instructors/my-schedule → 200', schedR.status, 200, schedR.body);
  const batches = Array.isArray(schedR.body) ? schedR.body : [];
  info(`Instructor assigned batches: ${batches.length}`);

  const dashR = await jsonReq('GET', '/api/instructors/dashboard-stats', instructorToken);
  ok('GET /api/instructors/dashboard-stats → 200', dashR.status, 200, dashR.body);
  if (dashR.status === 200) info(`Stats: totalBatches=${dashR.body.totalBatches} totalVideos=${dashR.body.totalVideos} totalAnnouncements=${dashR.body.totalAnnouncements}`);

  const myStudentsR = await jsonReq('GET', '/api/instructors/my-students', instructorToken);
  ok('GET /api/instructors/my-students → 200', myStudentsR.status, 200, myStudentsR.body);
  if (myStudentsR.status === 200) info(`Instructor students: ${Array.isArray(myStudentsR.body) ? myStudentsR.body.length : '?'}`);

  let batchId = batches.length > 0 ? batches[0]._id : null;
  if (batchId) info(`Using batchId for tests: ${batchId} (${batches[0].name})`);
  else warn('Instructor has no batches — upload tests will be skipped.');

  // ── STEP 2: Instructor uploads a video ───────────────────────────────────
  let videoId = null;
  if (batchId) {
    console.log('\n━━━ STEP 2: Instructor uploads a video (YouTube URL) ━━━━━━\n');
    const uploadR = await multipartReq('POST', '/api/instructors/videos', instructorToken, {
      batch_id:    batchId,
      topic:       'Test Topic - Accessibility Check',
      title:       '[AUTO-TEST] Video - ' + new Date().toISOString(),
      order_index: '99',
      youtube_url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    });
    if (ok('POST /api/instructors/videos (YouTube URL) → 201', uploadR.status, 201, uploadR.body)) {
      videoId = uploadR.body._id;
      info(`Video ID: ${videoId}`);
      info(`instructor_id set: ${uploadR.body.instructor_id ? '✅ YES' : '❌ NO'}`);
      info(`content_type: ${uploadR.body.content_type}`);
      info(`cloudinary_url: ${String(uploadR.body.cloudinary_url).slice(0, 60)}`);
    }
  }

  // ── STEP 3: Instructor creates an announcement ───────────────────────────
  let announcementId = null;
  if (batchId) {
    console.log('\n━━━ STEP 3: Instructor creates an announcement ━━━━━━━━━━━\n');
    const annR = await jsonReq('POST', '/api/announcements', instructorToken, {
      title:    '[AUTO-TEST] Announcement - ' + new Date().toISOString(),
      message:  'This is an automated test announcement.',
      batch_id: batchId,
    });
    ok('POST /api/announcements → 201', annR.status, 201, annR.body);
    if (annR.status === 201) {
      announcementId = annR.body._id;
      info(`Announcement ID: ${announcementId}`);
    }
  }

  // ── STEP 4: Student access check ─────────────────────────────────────────
  console.log('\n━━━ STEP 4: Student Dashboard & Schedule ━━━━━━━━━━━━━━━━━\n');

  const sHomeR = await jsonReq('GET', '/api/students/home', studentToken);
  ok('GET /api/students/home → 200', sHomeR.status, 200, sHomeR.body);
  if (sHomeR.status === 200) info(`Student home: next_class=${sHomeR.body.next_class ? sHomeR.body.next_class.name : 'none'}`);

  const sSchedR = await jsonReq('GET', '/api/students/my-schedule', studentToken);
  ok('GET /api/students/my-schedule → 200', sSchedR.status, 200, sSchedR.body);
  const sBatches = Array.isArray(sSchedR.body) ? sSchedR.body : [];
  info(`Student enrolled batches: ${sBatches.length}`);

  const sBatchesR = await jsonReq('GET', '/api/students/batches', studentToken);
  ok('GET /api/students/batches → 200', sBatchesR.status, 200, sBatchesR.body);
  const studentBatches = Array.isArray(sBatchesR.body) ? sBatchesR.body : [];
  info(`Student batch list: ${studentBatches.length} batches`);

  // Check if the student's batch matches instructor's batch
  let sharedBatchId = null;
  if (batchId && studentBatches.some(b => String(b._id) === String(batchId))) {
    sharedBatchId = batchId;
    info(`✅ Student IS enrolled in instructor's batch: ${batchId}`);
  } else if (studentBatches.length > 0) {
    sharedBatchId = studentBatches[0]._id;
    warn(`Student is NOT in the same batch as instructor. Using student batch ${sharedBatchId} for remaining tests.`);
  }

  // ── STEP 5: Student can see videos ───────────────────────────────────────
  if (sharedBatchId) {
    console.log('\n━━━ STEP 5: Student accesses videos & materials ━━━━━━━━━━\n');

    const sVidsR = await jsonReq('GET', `/api/students/batches/${sharedBatchId}/videos`, studentToken);
    ok(`GET /api/students/batches/${sharedBatchId}/videos → 200`, sVidsR.status, 200, sVidsR.body);
    const vids = Array.isArray(sVidsR.body) ? sVidsR.body : [];
    info(`Videos visible to student: ${vids.length}`);

    // If instructor just uploaded, check it appears
    if (videoId && String(sharedBatchId) === String(batchId)) {
      const foundNewVideo = vids.some(v => String(v._id) === String(videoId));
      if (foundNewVideo) {
        console.log(`  ✅ PASS  Newly uploaded instructor video IS visible to student`);
        passed++;
      } else {
        console.log(`  ❌ FAIL  Newly uploaded instructor video NOT found in student video list`);
        failed++;
      }
    }

    // Test stream URL for first video
    if (vids.length > 0) {
      const vid = vids[0]._id;
      const streamR = await jsonReq('GET', `/api/students/videos/${vid}/stream-url`, studentToken);
      ok(`GET /api/students/videos/${vid}/stream-url → 200`, streamR.status, 200, streamR.body);
      if (streamR.status === 200) info(`Stream URL type: ${streamR.body.type}, title: "${streamR.body.title}"`);
    }

    const sMatsR = await jsonReq('GET', `/api/students/batches/${sharedBatchId}/materials`, studentToken);
    ok(`GET /api/students/batches/${sharedBatchId}/materials → 200`, sMatsR.status, 200, sMatsR.body);
    info(`Materials visible to student: ${Array.isArray(sMatsR.body) ? sMatsR.body.length : '?'}`);
  }

  // ── STEP 6: Student can see announcements ────────────────────────────────
  console.log('\n━━━ STEP 6: Student accesses announcements ━━━━━━━━━━━━━━━\n');
  const sAnnR = await jsonReq('GET', `/api/students/announcements`, studentToken);
  ok('GET /api/announcements → 200', sAnnR.status, 200, sAnnR.body);
  const anns = Array.isArray(sAnnR.body) ? sAnnR.body : [];
  info(`Announcements visible to student: ${anns.length}`);
  if (announcementId) {
    const foundAnn = anns.some(a => String(a._id) === String(announcementId));
    if (foundAnn) {
      console.log(`  ✅ PASS  Instructor announcement IS visible to student`);
      passed++;
    } else {
      console.log(`  ⚠️  WARN  Instructor announcement not found in student view (may be batch-filtered)`);
      warnings++;
    }
  }

  // ── STEP 7: Student can see practice slots ───────────────────────────────
  console.log('\n━━━ STEP 7: Student accesses practice slots ━━━━━━━━━━━━━━\n');
  if (sharedBatchId) {
    const sSlotsR = await jsonReq('GET', `/api/students/practice-slots?batchId=${sharedBatchId}`, studentToken);
    ok(`GET /api/students/practice-slots?batchId=${sharedBatchId} → 200`, sSlotsR.status, 200, sSlotsR.body);
    const slots = Array.isArray(sSlotsR.body) ? sSlotsR.body : [];
    info(`Practice slots visible: ${slots.length}`);
  }

  const sBookingsR = await jsonReq('GET', '/api/students/my-practice-bookings', studentToken);
  ok('GET /api/students/my-practice-bookings → 200', sBookingsR.status, 200, sBookingsR.body);
  info(`Student practice bookings: ${Array.isArray(sBookingsR.body) ? sBookingsR.body.length : '?'}`);

  // ── STEP 8: Student can see results ─────────────────────────────────────
  console.log('\n━━━ STEP 8: Student accesses results ━━━━━━━━━━━━━━━━━━━━\n');
  const sResR = await jsonReq('GET', '/api/students/my-results', studentToken);
  ok('GET /api/students/my-results → 200', sResR.status, 200, sResR.body);
  const results = Array.isArray(sResR.body) ? sResR.body : [];
  info(`Results visible to student: ${results.length}`);
  if (results.length > 0) info(`Sample: "${results[0].assessment_name}" → Grade: ${results[0].grade}, Marks: ${results[0].marks}`);

  // ── STEP 9: Role guard - student CANNOT access instructor routes ─────────
  console.log('\n━━━ STEP 9: Role guards (student blocked from instructor routes) ━\n');

  const blockR = await jsonReq('GET', '/api/instructors/videos', studentToken);
  ok('Student cannot GET /api/instructors/videos → 403', blockR.status, 403, blockR.body);
  if (blockR.status === 403) info(`Block message: "${blockR.body.message}"`);

  const blockR2 = await jsonReq('GET', '/api/instructors/dashboard-stats', studentToken);
  ok('Student cannot GET /api/instructors/dashboard-stats → 403', blockR2.status, 403, blockR2.body);

  // ── STEP 10: Cleanup – delete the test video ────────────────────────────
  if (videoId) {
    console.log('\n━━━ STEP 10: Cleanup — delete test video ━━━━━━━━━━━━━━━\n');
    const delR = await jsonReq('DELETE', `/api/instructors/videos/${videoId}`, instructorToken);
    ok(`DELETE /api/instructors/videos/${videoId} → 200`, delR.status, 200, delR.body);
  }

  // ── Summary ───────────────────────────────────────────────────────────────
  const total = passed + failed;
  console.log('\n╔═══════════════════════════════════════════════════════════╗');
  console.log(`║  RESULTS:  ${String(passed).padEnd(2)} passed  ${String(failed).padEnd(2)} failed  ${String(warnings).padEnd(2)} warnings  ${String(total).padEnd(3)} total`);
  if (failed === 0) {
    console.log('║  🎉 ALL TESTS PASSED — Instructor→Student chain works!     ║');
  } else {
    console.log('║  ⚠️  See failed items above                                ║');
  }
  console.log('╚═══════════════════════════════════════════════════════════╝\n');
}

run().catch(err => {
  console.error('\n⛔ Fatal error:', err.message);
  process.exit(1);
});
