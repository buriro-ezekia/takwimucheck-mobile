# Batch 09: Mobile Authentication, Roles and Server Pro Enforcement

## Purpose

Batch 09 removes manual protected API-key entry from the user workflow. TakwimuCheck now signs users in, receives short-lived backend tokens, applies role-aware navigation and obtains RevenueCat identity from the authenticated account.

## Session handling

- The access token remains in React memory.
- The rotating refresh token is stored with Expo SecureStore on Android and iOS using `WHEN_UNLOCKED_THIS_DEVICE_ONLY`.
- Web stores refresh credentials in `sessionStorage` only; they do not survive a browser-session restart.
- Any stale Batch 9 token copy under the old `localStorage` key is deleted during migration/read/write handling rather than silently retained.
- The app refreshes the access token shortly before expiry.
- App launch attempts one refresh-token restoration.
- Session mutations use a generation/sign-out guard so a refresh that finishes after sign-out or account replacement cannot reapply credentials.
- Sign-out clears the active local session and revokes the backend session through `POST /auth/revoke` using the refresh credential.
- When revocation cannot reach the backend, TakwimuCheck stores only a dedicated pending-revocation credential and retries it after connectivity returns; the UI reports revocation as pending rather than claiming server logout succeeded.

## Role-aware interface

```text
Viewer
→ validation results, reports and review history

Reviewer
→ Viewer access plus issue decisions

Supervisor
→ Reviewer access plus CSV validation and complete audit export

Administrator
→ Supervisor access plus backend user administration
```

The backend remains authoritative. Hidden or disabled buttons are only usability controls.

## Reviewer identity

The issue-decision screen no longer asks for reviewer name. It displays the signed-in account and submits only the decision, reason and optional proposed value. The backend records the authenticated display name.

## RevenueCat flow

The backend user profile supplies `revenuecat_app_user_id`. The app logs RevenueCat in with that ID on Android, iOS and web. RevenueCat customer state is disconnected after TakwimuCheck sign-out and re-established for the next authenticated user.

The client RevenueCat state drives paywall and restore UX. Complete audit export requires all of the following:

- Supervisor or Administrator role;
- an active device RevenueCat entitlement where purchase UI is available;
- an active server-verified `TakwimuCheck Pro` entitlement;
- an authenticated bearer session.

The backend, not the device SDK or role-aware UI, is the security authority.

## Authentication endpoints used by the app

```text
POST /auth/login
POST /auth/refresh
POST /auth/logout
POST /auth/revoke
GET  /auth/me
GET  /auth/entitlement
```

`/auth/revoke` accepts a current or recently rotated refresh credential and exists specifically so sign-out remains a reliable server revocation boundary even when the access token changed during refresh.

## Main routes

```text
/sign-in       Account sign-in and sign-out
/settings      Session, role, backend and entitlement status
/upload        Supervisor CSV workflow
/review-queue  Reviewer issue queue
/review-issue  Authenticated decision form
/review-audit  Supervisor and server-verified Pro export
```

## Public configuration

```text
EXPO_PUBLIC_API_BASE_URL
EXPO_PUBLIC_REVENUECAT_API_KEY
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY
EXPO_PUBLIC_REVENUECAT_WEB_API_KEY
```

Do not place passwords, tokens, bootstrap keys, backend API keys or RevenueCat server keys in `EXPO_PUBLIC` variables. The obsolete shared `EXPO_PUBLIC_REVENUECAT_APP_USER_ID` is not part of Batch 9.

## Transport security

Android cleartext traffic is enabled only for the explicit development build profile used for local USB/ADB testing. Preview and production builds keep cleartext disabled.

## Acceptance criteria

- sign-in works on web and Android;
- refresh token restores the session after restart on native devices;
- browser refresh credentials are session-scoped and never written to `localStorage`;
- stale persistent browser token copies are removed;
- access token rotates before or after expiry;
- a refresh result cannot recreate a session after sign-out starts;
- sign-out revokes server access or explicitly records a pending revocation for retry;
- cross-account sign-in does not reuse the previous user's RevenueCat identity;
- role restrictions match backend behaviour;
- reviewer identity cannot be edited in the client;
- RevenueCat uses the authenticated user's App User ID;
- server entitlement status is visible separately from device status;
- audit export is rejected when role or server Pro verification fails;
- production/preview cleartext transport remains disabled;
- no bearer or refresh token appears in logs, URLs or screenshots;
- `scripts/check_batch09_session_security.mjs` passes in CI.