# Account registration and credentials

`registration_number` is the official public identifier shown in account directories,
profiles, credential acknowledgments, exports and email. `index_number` remains a
legacy login alias so existing users can continue signing in.

| Role | New official number | Example |
| --- | --- | --- |
| Student | `YYTNNNN` | `26T0001` |
| Instructor | `YYINNNN` | `26I0001` |

Each series advances independently using the institute year in Asia/Colombo.
Student numbers start at `26T0001` in 2026, then `26T0002`, and so on. At the
start of 2027 the new series is `27T0001`. New students receive the same number
in `registration_number` and `index_number`; only one sequence allocation is made.
The existing student index counter and both account/application identifier fields
are checked so imported or previously allocated `YYT` numbers are not reused.
Persistent counters are initialized above existing records and keep advancing after
deletion. Number allocation and account creation run in the existing transaction
lock, preventing duplicate numbers under concurrent requests. Existing official
numbers are preserved. Missing instructor numbers use the instructor series.

## Account lifecycle

1. Validate the account and acquire a database lease for its normalized email.
2. Allocate identifiers and commit the account with a cryptographically random
   temporary password hash, a seven-day expiry and mandatory password change.
3. Email exactly the committed registration number, generated password and expiry.
   Students and instructors use the same template with the appropriate role.
4. Return those same values to the admin alongside `email_sent` and `email_error`.
   An SMTP outage preserves the account and reports a delivery failure. Simulated
   delivery is never counted as a real email.
5. Release the lease. Another simultaneous credential request returns HTTP 409
   before replacing the password. An abandoned lease expires after five minutes.

“Send temporary credentials” explicitly generates a replacement password. Previous
passwords stop working; the official number and enrollment records stay unchanged.
Only password hashes are stored. Plaintext passwords are returned to the authorized
admin for the immediate acknowledgment and sent by email; they are not logged or
persisted. Successful first login requires a permanent password.

SMTP delivery requires the existing `SMTP_HOST` (or Gmail service), `SMTP_USER`,
`SMTP_PASS`/`SMTP_PASSWORD`, port and sender configuration. Provider acceptance is
reported as sent; arrival in an inbox still depends on the mail provider.

## Validation

Build the backend, then run the isolated replica-set tests:

```sh
npm run build
node --require ./tests/helpers/account-test-environment.cjs --test --test-concurrency=1 tests/account-credentials.test.js tests/student-admissions.test.js
```

The test helper disables production configuration, SMTP and push credentials.
Tests use a disposable MongoDB replica set and stub email/notification delivery.
