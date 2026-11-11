# Practical scheduling

All timetable dates and 24-hour times belong to Asia/Colombo. The API returns
`starts_at`, `ends_at`, and `booking_closes_at` as absolute ISO timestamps.

The same service enforces rules for students, instructors, and admins:

- At most two instructors conduct practicals simultaneously across the institute.
- An instructor cannot teach overlapping sessions. Separate sessions on one day are allowed.
- Locked slots still occupy the timetable; locking closes bookings, not the session.
- Students must be active and enrolled in the batch. Slots must have available capacity.
- One active booking per student per batch per week, with no overlaps across courses.
- Pending cancellations retain the seat and booking restrictions until approved.
- Staff assignments follow the same booking rules. Instructors manage only their own slots.
- Rescheduling checks both instructor availability and affected students' other bookings.
- Expired sessions are view-only, apart from staff deletion.

Mutations use MongoDB transactions and a shared guard document so concurrent requests
on different app instances cannot bypass capacity or scheduling checks. Use MongoDB
Atlas or a replica set; a standalone MongoDB instance is not supported for mutations.
Notification delivery happens after commit and cannot undo or misreport a saved booking.
No existing slots or bookings are migrated or deleted by this change.

Run `npm run test:practical` for the integration suite. It starts a disposable local
replica set and never loads application database credentials. On its first run the
test runner downloads a MongoDB binary; alternatively set `MONGOMS_SYSTEM_BINARY`
to an existing `mongod` executable. The test dependency has no install-time download.
