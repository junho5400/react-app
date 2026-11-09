# Administrator access

The app uses the existing Google Sign-In, Firebase Authentication, and Realtime
Database project `react-challenges-junho`. Only `/admins/<Firebase Auth UID>` with
the boolean value `true` grants course editing. Guests and other signed-in users
can still browse, filter, select courses, and open their course plan.

`useAdmin()` exposes `user`, `isAdmin`, `loading`, and `error`. It subscribes only
after authentication resolves to a user, reads that user's membership, and cleans
up on account changes or unmount. Pending, missing, non-true, and failed lookups
deny editing. Course links, direct edit URLs, and submission use this permission.
The form also checks permission after asynchronous validation; unmounting invalidates
pending submissions. The database rules independently enforce authorization.

## Manual production setup and verification

Use this checklist when configuring or deploying the existing project:

1. In Firebase Console, select the existing `react-challenges-junho` project.
   Verify the web configuration in `src/utilities/firebase.ts` and the local
   `VITE_FIREBASE_API_KEY` refer to this project. Confirm Google Sign-In is enabled
   and the deployed site's domain is authorized in Firebase Authentication.
2. Have each intended administrator sign in once. Copy their **UID** from
   Authentication > Users. Through the trusted Firebase Console or Admin SDK,
   set Realtime Database `/admins/<UID>` to boolean `true`, not the string
   `"true"` and not an email address. Never grant client writes to this path.
   Remove membership or set it to `false` to revoke access.
3. Review and deploy `database.rules.json` to the existing project:
   `firebase deploy --only database --project react-challenges-junho`.
   Verify the published rules have no broader ancestor write grants.
4. Build with `npm run build` and deploy the app through the existing hosting
   workflow (Firebase Hosting: `firebase deploy --only hosting --project react-challenges-junho`).
5. On the deployed site, verify guest and non-administrator scheduling, administrator
   edits and saves, direct `/edit/<courseId>` navigation, sign-out/account changes,
   and live membership revocation. Verify unauthorized SDK/REST course writes and
   membership writes are denied. Confirm the production Firebase configuration and
   deployed rules, which mocked UI tests and local emulator tests cannot establish.

## Automated verification

- `npx vitest run`: application tests, including authorization and existing
  scheduler, Banner, navigation, validation, and submission regressions.
- `npm run test:rules`: real Realtime Database emulator tests, separate from
  mocked UI tests. Requires Firebase CLI, Java, and Node compatible with installed
  dependencies (`@firebase/rules-unit-testing` requires Node >=24.12).
  Uses the local-only `demo-course-scheduler` ID; it does not create a Firebase
  project or touch the production database. Port 9000 must be available. The CLI
  may download its emulator runtime on the first run.
- `npm run build`: TypeScript and production bundle.

The existing lint configuration references the unavailable
`react-hooks/react-compiler` rule, so `npm run lint` currently stops before linting.
The production build reports CSS `@theme` and bundle-size warnings; these do not
prevent the build.
