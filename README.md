# Twintec VTI

This repository contains three applications:

| Folder | Application | Purpose |
| --- | --- | --- |
| `website/` | Public website | Courses, applications, contact information, galleries, and student record verification. |
| `mobile/` | Learning portal | Student, instructor, and administrator screens for web and mobile. |
| `backend/` | Shared API | Accounts, admissions, courses, batches, learning materials, payments, practical scheduling, and notifications. |

The public website and learning portal are separate clients. Both use the Express API and MongoDB. The active data model is in `backend/src/models`.

## Local setup

Use Node.js 24.15.0, npm, and MongoDB Atlas or a local replica set. Admissions and practical booking use MongoDB transactions. Install dependencies in each application separately.

| Terminal | Commands | Local address |
| --- | --- | --- |
| API | `cd backend`, `npm ci`, `npm run dev` | `http://localhost:5000/api` |
| Website | `cd website`, `npm ci`, `npm run dev` | Usually `http://localhost:5173` |
| LMS web | `cd mobile`, `npm ci`, `npm run web` | Use the address printed by Expo, usually port 8081 |

Create private local environment files. `backend/.env` needs `MONGO_URI`, a strong `JWT_SECRET`, approved `CORS_ORIGINS`, and SMTP settings for email flows. Set `website/.env.local` with `VITE_API_URL=http://localhost:5000`. Set `mobile/.env.local` with `EXPO_PUBLIC_API_URL=http://localhost:5000/api`. The website value is the origin; the LMS value includes `/api`.

For a physical mobile device, use a reachable API address instead of `localhost`. Do not put server secrets in `VITE_` or `EXPO_PUBLIC_` variables.

## Checks

Run `npm run build` in `backend/` and `website/`. Run `npx tsc --noEmit`, `node --test tests/*.test.cjs`, and `npm run build` in `mobile/`. Backend integration tests use the helper in `backend/tests/helpers/account-test-environment.cjs` and an isolated replica set. See `SECURITY_REVIEW.md` for security findings and release checks.

## Key documentation

- `backend/ACCOUNT_SYSTEM.md`: account identifiers and temporary credentials.
- `backend/PRACTICAL_SCHEDULING.md`: practical sessions and booking rules.
- `SECURITY_REVIEW.md`: verified checks and unresolved security work.

Generated PDFs, diagrams, previews, and document drafts are stored in the sibling `TVTI_project_deliverables` folder. Learning material PDFs under `backend/uploads/materials` remain in the project because the app can serve them.
The current database diagram is `TVTI_project_deliverables/diagrams/TVTI_Entity_Relationship_Diagram.drawio`. Older developer documentation that described assessment records is kept under `TVTI_project_deliverables/archive/pre-assessment-removal-docs` for reference only.
