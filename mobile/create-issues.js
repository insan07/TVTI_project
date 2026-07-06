const https = require('https');

// Get command line arguments
const token = process.argv[2];
const repoFullName = process.argv[3]; // format: "username/repository"

if (!token || !repoFullName) {
  console.log('\nUsage: node create-issues.js <YOUR_GITHUB_PERSONAL_ACCESS_TOKEN> <OWNER>/<REPO_NAME>');
  console.log('Example: node create-issues.js ghp_123456789abc mohamedinsan/twintec-lms\n');
  process.exit(1);
}

// Full list of 26 roadmap issues
const issues = [
  // Phase 1
  {
    title: '[BE] Issue #1: Database Schema & MongoDB Atlas Setup',
    body: `**Assignee: Member 1 (Backend Dev)**\n\n**Goal:** Set up a MongoDB Atlas cluster and create Mongoose schemas.\n\n**Details:**\n- Set up a MongoDB Atlas project and database.\n- Implement schemas for \`User\`, \`Course\`, \`Batch\`, \`Video\`, \`Announcement\`, \`Result\`, and \`PracticeSlot\` inside \`backend/src/models/\`.`
  },
  {
    title: '[FE] Issue #2: React Native / Expo Boilerplate & Theme Setup',
    body: `**Assignee: Member 2 (Frontend Lead)**\n\n**Goal:** Initialize Expo project and configure styling system.\n\n**Details:**\n- Initialize Expo project with TypeScript template.\n- Configure global theme file (\`app/src/config/theme.ts\`) for colors, margins, fonts, and shadows.`
  },
  {
    title: '[FE] Issue #3: Navigation Architecture Setup',
    body: `**Assignee: Member 2 (Frontend Lead)**\n\n**Goal:** Set up conditional tab navigation routes.\n\n**Details:**\n- Create \`AuthNavigator\` for login/registration.\n- Set up role-based bottom tab navigators (\`AdminTabs\`, \`InstructorTabs\`, \`StudentTabs\`) linked conditionally in \`AppNavigator.tsx\`.`
  },
  {
    title: '[BE] Issue #4: Express Server & Base API Routing',
    body: `**Assignee: Member 1 (Backend Dev)**\n\n**Goal:** Setup Express API boilerplate.\n\n**Details:**\n- Setup Express framework with TS support.\n- Configure middlewares: cors, helmet, morgan, express.json.\n- Add rate limiter and global error handler.`
  },
  {
    title: '[DevOps] Issue #5: Environment Config & Local Run Scripts',
    body: `**Assignee: Member 5 (Fullstack / DevOps)**\n\n**Goal:** Setup local workspace config.\n\n**Details:**\n- Create \`backend/.env\` and \`app/src/config/constants.ts\` templates.\n- Add helper run scripts to \`package.json\` (e.g. concurrent developer runs).`
  },
  // Phase 2
  {
    title: '[BE] Issue #6: Auth Endpoints (Register & Login)',
    body: `**Assignee: Member 1 (Backend Dev)**\n\n**Goal:** Create authentication backend controllers.\n\n**Details:**\n- Create \`register\` controller: hash passwords, register student with \`is_active: false\`.\n- Create \`login\` controller: verify active state, compare bcrypt, return JWT.`
  },
  {
    title: '[FE] Issue #7: Global AuthState Management (AuthContext)',
    body: `**Assignee: Member 2 (Frontend Lead)**\n\n**Goal:** Implement login/logout states.\n\n**Details:**\n- Implement \`AuthContext\` to store current token & user role.\n- Setup persistence utilizing SecureStore/AsyncStorage.`
  },
  {
    title: '[FE] Issue #8: Custom Axios Client Setup & Interceptors',
    body: `**Assignee: Member 2 (Frontend Lead)**\n\n**Goal:** Configure network request client.\n\n**Details:**\n- Create Axios instance in \`api.ts\`.\n- Add request interceptor to attach JWT.\n- Add response interceptor to handle network errors and bypass token-resets during auth login 401s.`
  },
  {
    title: '[FE] Issue #9: UI - Login & Register Screens',
    body: `**Assignee: Member 3 or 4 (Frontend Screens)**\n\n**Goal:** Build beautiful auth screen interfaces.\n\n**Details:**\n- Design input textboxes, validation status handling, and buttons.\n- Connect submit handlers to \`AuthContext.login\` and registration API.`
  },
  {
    title: '[BE/FS] Issue #10: Role Verification Middleware & Route Guarding',
    body: `**Assignee: Member 1 / 5 (Backend / DevOps)**\n\n**Goal:** Protect administrative and teaching routes.\n\n**Details:**\n- Build \`protect\` middleware to verify JWT tokens.\n- Build \`checkRole\` middleware to enforce role permissions (\`admin\`, \`instructor\`).`
  },
  // Phase 3 - Admin
  {
    title: '[BE] Issue #11: Admin User Approval & Role Management API',
    body: `**Assignee: Member 1 (Backend Dev)**\n\n**Goal:** Create endpoints to manage student approvals.\n\n**Details:**\n- Build \`/admin/users/approve/:userId\` to toggle \`is_active\`.\n- Add instructor listing and creation API routes.`
  },
  {
    title: '[FE] Issue #12: UI - User Management Screen',
    body: `**Assignee: Member 3 (Frontend Screens)**\n\n**Goal:** Build approval management list view.\n\n**Details:**\n- Build Admin dashboard list of pending inactive student sign-ups.\n- Connect approval button to trigger backend approval endpoint.`
  },
  {
    title: '[FE] Issue #13: UI - Course & Batch Management Screen',
    body: `**Assignee: Member 3 (Frontend Screens)**\n\n**Goal:** Implement Course CRUD UI.\n\n**Details:**\n- Create course management and batch details form forms.\n- Enable editing schedules and trainer allocations.`
  },
  {
    title: '[FE] Issue #14: UI - Student Enrollment Flow',
    body: `**Assignee: Member 3 (Frontend Screens)**\n\n**Goal:** Link students to specific cohorts.\n\n**Details:**\n- Develop search list interface for students.\n- Create multiselect options to enroll students into designated batches.`
  },
  // Phase 3 - Instructor
  {
    title: '[BE] Issue #15: Content & Video Management API',
    body: `**Assignee: Member 1 (Backend Dev)**\n\n**Goal:** Create routes to handle learning content uploads.\n\n**Details:**\n- Implement endpoints to link YouTube URLs/video entries to targeted course batches.`
  },
  {
    title: '[FE] Issue #16: UI - Upload Video & Post Announcement Screens',
    body: `**Assignee: Member 4 (Frontend Screens)**\n\n**Goal:** UI for teachers to post announcements and lectures.\n\n**Details:**\n- Implement screen forms allowing instructors to post messages or upload links.`
  },
  {
    title: '[BE] Issue #17: Practice Sessions Scheduling API',
    body: `**Assignee: Member 1 (Backend Dev)**\n\n**Goal:** Create practice schedules management.\n\n**Details:**\n- Implement endpoints to post, edit, and list practice dates, timings, and attendee limits.`
  },
  {
    title: '[FE] Issue #18: UI - Manage Practice Slots Screen',
    body: `**Assignee: Member 4 (Frontend Screens)**\n\n**Goal:** Schedule configuration UI.\n\n**Details:**\n- Create list/calendar representation of instructor slots.`
  },
  // Phase 3 - Student
  {
    title: '[FE] Issue #19: UI - Video Lecture Player & Course View',
    body: `**Assignee: Member 4 (Frontend Screens)**\n\n**Goal:** Video playback client interface.\n\n**Details:**\n- Implement embedded video player scaled to current student's batch uploads.`
  },
  {
    title: '[FE] Issue #20: UI - Practice Booking & Results Portal',
    body: `**Assignee: Member 4 (Frontend Screens)**\n\n**Goal:** Student self-service screens.\n\n**Details:**\n- Calendar display of open booking slots.\n- Interactive results viewer card.`
  },
  {
    title: '[BE] Issue #21: Results & Booking Controller API',
    body: `**Assignee: Member 1 (Backend Dev)**\n\n**Goal:** API controllers for students actions.\n\n**Details:**\n- Create booking slot handler (checks capacities and duplication).\n- Add student result fetching endpoints.`
  },
  // Phase 4
  {
    title: '[BE] Issue #22: Push Notification Engine (FCM / Expo)',
    body: `**Assignee: Member 1 (Backend Dev)**\n\n**Goal:** Integrate server-side notification push triggers.\n\n**Details:**\n- Configure backend triggers using Expo Server SDK or FCM when announcements publish.`
  },
  {
    title: '[FE] Issue #23: Frontend Push Token Registration',
    body: `**Assignee: Member 2 (Frontend Lead)**\n\n**Goal:** Register devices for pushes.\n\n**Details:**\n- Handle system permissions requests on app load.\n- Store push token mapping to DB.`
  },
  {
    title: '[DevOps] Issue #24: Backend Cloud Deployment (Vercel)',
    body: `**Assignee: Member 5 (Fullstack / DevOps)**\n\n**Goal:** Deploy Express server to Vercel production.\n\n**Details:**\n- Setup \`vercel.json\`.\n- Connect MongoDB Atlas secrets into production environment variables.`
  },
  {
    title: '[DevOps] Issue #25: Expo Application Publishing (EAS)',
    body: `**Assignee: Member 5 (Fullstack / DevOps)**\n\n**Goal:** Package and bundle the mobile app.\n\n**Details:**\n- Set up EAS CLI and log in.\n- Configure building profiles inside \`eas.json\` and build native binaries.`
  },
  {
    title: '[All] Issue #26: End-to-End Testing & Bug Squashing',
    body: `**Assignee: All Members**\n\n**Goal:** Complete system verification.\n\n**Details:**\n- Test full workflow cycle: Register -> Approve -> Enroll -> Book Practice -> Get Notification -> Check Results.`
  }
];

let created = 0;

function createIssue(index) {
  if (index >= issues.length) {
    console.log(`\nCOMPLETED: Successfully created ${created}/${issues.length} issues on GitHub!`);
    return;
  }

  const issue = issues[index];
  const postData = JSON.stringify(issue);

  const options = {
    hostname: 'api.github.com',
    port: 443,
    path: `/repos/${repoFullName}/issues`,
    method: 'POST',
    headers: {
      'User-Agent': 'NodeJS-Script',
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
      'Content-Length': postData.length
    }
  };

  process.stdout.write(`Creating: ${issue.title} ... `);

  const req = https.request(options, (res) => {
    let body = '';
    res.on('data', (chunk) => body += chunk);
    res.on('end', () => {
      if (res.statusCode === 201) {
        console.log('✅ OK');
        created++;
      } else {
        console.log(`❌ FAILED (Status: ${res.statusCode})`);
        try {
          const err = JSON.parse(body);
          console.log(`   Reason: ${err.message}`);
        } catch(e) {
          console.log(`   Response: ${body}`);
        }
      }
      // Create next issue with a slight delay to avoid rate-limiting triggers
      setTimeout(() => createIssue(index + 1), 300);
    });
  });

  req.on('error', (e) => {
    console.log(`❌ ERROR: ${e.message}`);
    setTimeout(() => createIssue(index + 1), 300);
  });

  req.write(postData);
  req.end();
}

console.log(`\nInitializing creation of ${issues.length} issues in repository: ${repoFullName}...`);
createIssue(0);
