# Batch 09: Mobile Authentication, Roles and Server Pro Enforcement

## Purpose

Batch 09 removes manual protected API-key entry from the user workflow. TakwimuCheck now signs users in, receives short-lived backend tokens, applies role-aware navigation and obtains RevenueCat identity from the authenticated account.

## Session handling

- The access token remains in React memory.
- The rotating refresh token is stored with Expo SecureStore on Android and iOS.
- Web stores the refresh token in browser storage for the signed-in browser profile.
- The app refreshes the access token shortly before expiry.
- App launch attempts one refresh-token restoration.
- Sign-out revokes the backend session and clears local tokens.

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

The backend user profile supplies `revenuecat_app_user_id`. The app logs RevenueCat in with that ID on Android, iOS and web.

The client RevenueCat state drives paywall and restore UX. Complete audit export requires all of the following:

- Supervisor or Administrator role;
- an active device RevenueCat entitlement where purchase UI is available;
- an active server-verified `TakwimuCheck Pro` entitlement;
- an authenticated bearer session.

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

Do not place passwords, tokens, bootstrap keys, backend API keys or RevenueCat server keys in `EXPO_PUBLIC` variables.

## Acceptance criteria

- sign-in works on web and Android;
- refresh token restores the session after restart;
- access token rotates before or after expiry;
- sign-out revokes server access;
- role restrictions match backend behaviour;
- reviewer identity cannot be edited in the client;
- RevenueCat uses the authenticated user's App User ID;
- server entitlement status is visible separately from device status;
- audit export is rejected when role or server Pro verification fails;
- no bearer or refresh token appears in logs, URLs or screenshots.
