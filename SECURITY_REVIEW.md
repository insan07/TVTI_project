# Cleanup and security review

Reviewed on 2026-11-15. This review covers the backend, mobile application, public website, dependency lockfiles, and current tracked files. It includes local source inspection and isolated tests, not a live production penetration test. Production databases, accounts, SMTP delivery, cloud permissions, and deployed secrets were not changed or probed.

## Cleanup completed

- Removed 91 tracked files totaling approximately 32.6 MiB, plus ignored temporary exports, browser fixtures' generated output, historical build logs, and a redundant test database download archive.
- Removed the committed Android verification export, accidental PowerShell cache, stray search output, empty backend placeholders, duplicate logs, and the duplicate issue-creation script. The original issue-creation script was later archived outside the repository.
- Removed unreferenced image/template assets and five unreferenced source modules that contained no comments.
- Removed compiler/linter-confirmed unused imports and dead helper code. Retained source comments were checked against a snapshot taken before cleanup.
- Removed unused root-level `dotenv` and `mongoose` dependencies. The backend retains its own runtime dependencies; root commands delegate to the backend/mobile packages.
- Preserved application uploads, tests, installed dependencies, native project configuration, APK releases, the PDF reader/license, and the local MongoDB executable required by tests. Build workfiles and the unused SQL schema draft were later archived outside the repository.
- Added ignore rules to prevent the accidental cache/export/log files and environment variants from being committed again.
- Removed attendance and assessment models, routes, screens, seed data, and display fields. Archived unused website screens, an unused mobile hook, standalone backend debug scripts and misplaced Expo config, generated outputs, and older documentation outside the repository. The current draw.io diagram matches the remaining MongoDB models.

Potentially useful source comments and historical files were preserved in the sibling archive. Static reachability alone does not establish that an operational tool is unnecessary, so functional modules remain in place.

## Security fixes completed

| Area | Change |
| --- | --- |
| Applications | The application-list endpoint now requires authentication and the administrator role. Public application submission remains available. |
| Debug data | Removed the unauthenticated batch-debug endpoint. |
| Authentication | Removed the fallback JWT secret, restricted verification to HS256, validated the token's account ID, and checked session versions. |
| First login | Matched allowed paths exactly; placing an allowed path in a query string no longer bypasses first-login restrictions. |
| Sessions | Password changes, password resets, and credential regeneration invalidate older sessions. Password-change responses return a replacement token, which the mobile client persists before continuing. |
| Account privacy | Recovery OTP hashes, token hashes, credential snapshots, expiry dates, and attempt counters are excluded from ordinary user queries. |
| Password recovery | Added per-account cooldowns, five-attempt OTP limits, account locks, one-time reset tokens, credential binding, input validation, and password byte limits. Simulated or failed mail cannot authorize recovery. |
| Certificate OTP | Removed development-code disclosure, isolated certificate codes from admissions verification, enforced attempt limits, and consumed successful codes once. Failed mail leaves no new usable code. |
| Public abuse controls | Added email, verification, and submission limits to authentication, application, and certificate endpoints. Login limits also apply during development. |
| Instructor access | Restricted batch-topic access, targeted announcements, and custom notifications to assigned batches; instructors cannot broadcast to arbitrary user IDs. Existing global-announcement behavior remains unchanged. |
| Uploads | Matched MIME types to extensions, bounded multipart parts/files, limited profile/admin images to 5 MiB, and checked PNG/JPEG signatures. |
| CORS/errors | Removed blanket Vercel and wildcard-origin acceptance; production development origins require explicit configuration. Suppressed generic internal exception details in production responses. |
| Mobile transport | Release builds use the HTTPS production API instead of the development LAN IP/emulator fallback. |
| Dependencies | Applied compatible audit fixes, refreshed lockfiles, and pinned the patched gRPC 1.x release used by Firebase. No forced framework downgrade or major upgrade was applied. |

Approved preview deployments must be listed explicitly in `CORS_ORIGINS`. The official HTTPS `twintec.edu.lk` domains continue to be accepted.

## Remaining findings

These findings mean the system should not yet be described as fully secure.

| Priority | Finding and evidence | Required follow-up |
| --- | --- | --- |
| High | `backend/src/server.ts` serves `/uploads` and `/api/files/:fileId` without resource authorization. Study materials and payment slips use these URLs. Anyone possessing a URL can bypass the protected listing/view endpoints. External storage URLs may have the same exposure. | Introduce resource ownership/enrollment checks and short-lived signed viewing URLs. Update native/web viewers and distinguish intentional public gallery images from private documents before disabling direct access. This requires coordinated viewer/storage changes; a blanket authentication middleware would break current viewers. |
| High | The JWT secret in the local ignored backend environment file is configured but shorter than 32 characters. The deployed secret was not inspected. No secret value is included in this report. | Generate a cryptographically random secret with at least 256 bits of entropy and configure hosting securely. Rotate deployed credentials if the same weak value was reused. Rotation invalidates existing sessions and was not performed automatically. |
| High | The certificate view no longer invents marks, grades, or a record without an enrollment. It still treats a completed enrollment as completion without a dedicated issuance or revocation record. Email ownership proves identity, not official certificate approval. | Define certificate eligibility, issue and revocation rules, and store approved certificate records before relying on the page as official issuance evidence. |
| High | Admissions verification is stored as an email-level flag for up to two hours. `isEmailVerified(email)` does not require a proof bound to the browser/device that verified the OTP. A third party knowing that email can attempt submission during the verification window. | Return a short-lived, single-use verification grant and require it on registration/application submission. Update both mobile registration and the website inquiry/application form together. |
| Medium | Public rate-limit counters use the default in-memory store. Multiple serverless instances do not share those counters. Recovery/certificate attempt limits and credential locks are persisted, but not every public limit is distributed. | Use a shared rate-limit store and test multi-instance behavior. |
| Medium | Registration OTP verification still uses read/modify/save attempt accounting. Concurrent verification requests can lose attempt increments. | Make challenge consumption and attempt increments atomic, and bind the verification grant to the requester. |
| Medium | The development seed includes known demonstration passwords and destructive database setup. | Restrict seed/maintenance tools to isolated development databases. Never use demonstration accounts or passwords in production. |
| Medium | Web session tokens remain in localStorage. No raw HTML injection was found in the active website routes during the targeted search, but an XSS elsewhere could read these tokens. | Consider HttpOnly, Secure, SameSite cookies for web sessions and a deployment-specific Content Security Policy. Keep native credentials in SecureStore. |
| Medium | Seven backend and three mobile npm advisory records remain in transitive dependency chains. | Upgrade the affected upstream packages through a compatible migration and repeat native/runtime validation. Do not apply the suggested forced Expo/Firebase downgrades blindly. |

The public certificate search also reveals limited student/application information by design. Review that disclosure policy, global instructor announcements, and public eligibility responses against the institute's intended privacy rules.

## Dependency audit

Counts below are npm package advisory records, including records propagated through dependency chains; they are not counts of independently exploitable application flaws.

| Package tree | Before | After |
| --- | --- | --- |
| Root | 1 critical | 0; unused root dependencies removed |
| Backend | 18 total, including 1 critical and 6 high | 7 moderate; 0 high/critical |
| Mobile | 22 total, including 1 critical and 14 high | 3 moderate; 0 high/critical |
| Website | 2 high | 0 |

Remaining backend chains: `gaxios`, `gcp-metadata`, `glob`, `google-gax`, `minimatch`, `rimraf`, and `uuid`. Remaining mobile chain: `expo` / `@expo/fingerprint` / `minimatch`. Current lockfiles contain the compatible fixes; use `npm ci` to reproduce them.

## Validation

- Backend TypeScript build passed, including the previously failing payment-status type check.
- All 160 backend tests passed after assessment removal. The 15 security integration tests include completed-enrollment verification without marks or grades. The full-suite log is in the sibling `TVTI_project_deliverables/backend-test-final.txt`.
- All 66 mobile tests passed; mobile TypeScript checking passed.
- Mobile web export, Android JavaScript/Hermes export, and website production build passed.
- Website lint completed without errors; pre-existing hook/refresh and unused-state warnings remain.
- No missing comments were found in retained source files against the pre-cleanup snapshot. Archived files retain their comments.
- Comment content was checked in all 266 retained source files from the baseline; none was removed. Whitespace-only formatting is ignored by this check.
- The current tracked-source scan found no recognized private-key blocks, credential-bearing MongoDB URLs, GitHub tokens, or AWS access-key indicators. This targeted scan is not a guarantee that every possible secret format is absent. The checked environment/private-key path history returned no matches.

Reproducible commands:

```powershell
cd backend
npm run build
node --require ./tests/helpers/account-test-environment.cjs --test --test-concurrency=2 tests/*.test.js
cd ../mobile
npx tsc --noEmit
node --test tests/*.test.cjs
npm run build
npx expo export --platform android --output-dir .expo/security-check-android
cd ../website
npm run build
npm run lint
```

Tests used isolated local MongoDB instances and mocked/loopback email. Native APK compilation, physical-device behavior, iOS export/signing, production mail delivery, cloud storage permissions, Firebase rules, backups, and live deployment configuration were not validated. Existing APK releases were retained and were not rebuilt or replaced.

## Reference guidance

- [OWASP Authorization Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html): enforce authorization on each request, including static resources.
- [OWASP Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html): rate limits and expiring, single-use recovery credentials.
- [OWASP File Upload Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/File_Upload_Cheat_Sheet.html): file type/signature checks, access control, and size limits.
