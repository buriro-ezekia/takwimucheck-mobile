# TakwimuCheck Mobile

TakwimuCheck is a mobile-first survey data quality assurance application for supervisors, data managers and researchers.

```text
Upload → Validate → Review → Report
```

The Expo application connects to the TakwimuCheck validation backend, presents explainable quality findings, records persistent human review decisions and unlocks the complete review-audit export through RevenueCat.

## Current status

The application uses Expo SDK 57, React Native, TypeScript and Expo Router.

Implemented:

- responsive TakwimuCheck dashboard;
- synthetic public demonstration project;
- RevenueCat Purchases and Paywalls integration;
- Monthly and Yearly Test Store packages for `TakwimuCheck Pro`;
- verified Android Test Store purchase and restore workflow;
- backend readiness checks;
- memory-only controlled-pilot backend credential;
- CSV file selection and protected upload preflight;
- configured validation-run submission;
- validation-run selection and result summaries;
- server-backed issue search, filtering and pagination;
- privacy-minimised protected issue presentation;
- short-lived signed validation-report links;
- persistent live issue review;
- accept, defer, reject and correction-proposal actions;
- required reviewer identity and decision reason;
- required proposed value for correction proposals;
- issue-specific and run-level review history;
- RevenueCat-gated complete review-audit CSV export;
- GitHub Actions checks for TypeScript, Expo compatibility, project health and web export.

## Product principles

- Deterministic validation before AI assistance.
- Explainable findings with identifiers, variables, rule context and expected conditions.
- Separate raw data, standardised data, issue registers and review logs.
- No silent substantive corrections.
- Human approval before correction or final acceptance.
- Original observed respondent values remain excluded from protected mobile summary and history screens.
- Proposed corrections are reviewer evidence only and are never applied automatically.
- Secrets are never embedded in public mobile configuration.
- Mobile-first and low-connectivity optimised, not fully offline.

## Live controlled-pilot workflow

```text
Select CSV
→ run server preflight
→ submit validation
→ inspect quality results
→ open live review queue
→ record reviewer evidence
→ reload persistent status and history
→ open signed reports
→ export the complete review audit with Pro
```

Review decisions are stored by the backend, so they remain available after the browser or Android app is closed and reopened.

## Persistent review actions

The live review workflow supports:

```text
Accept finding
Defer
Reject finding
Propose correction
```

Every action records:

- a server decision identifier;
- a retry-safe client decision identifier;
- issue and validation-run identifiers;
- action and resulting status;
- reviewer identity;
- mandatory decision reason;
- proposed value, where applicable;
- previous issue status;
- server timestamp.

A correction proposal does not modify the uploaded source record.

## RevenueCat product boundary

RevenueCat manages one entitlement:

```text
TakwimuCheck Pro
```

Monthly and Yearly products unlock the entitlement. The app loads the active Offering remotely and does not hard-code prices.

Without Pro, authorised pilot users can still:

- upload and validate a controlled-pilot CSV;
- inspect protected validation findings;
- submit persistent human review decisions;
- read review history.

The complete persistent review-audit CSV is locked until `TakwimuCheck Pro` is active or restored. The app then requests a five-minute signed backend link. Neither the RevenueCat secret key nor the protected backend session key is placed in the export URL.

RevenueCat Test Store uses a public SDK key:

```text
EXPO_PUBLIC_REVENUECAT_API_KEY
```

Production platform keys can use:

```text
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY
```

Never place RevenueCat secret keys in the mobile app.

## Controlled-pilot backend access

The pilot backend key is entered in **Settings → Controlled-pilot protected access**. It is:

- held only in React state for the active app session;
- never written to `.env.local`, AsyncStorage, logs or repository files;
- never shown in result or review screens;
- cleared explicitly by the user or when the app process closes.

This shared-key design is suitable only for a controlled pilot. Production identity must replace it with user authentication, short-lived tokens and role-based authorisation.

## Local setup

Requirements:

- Node.js LTS;
- npm;
- Git;
- Expo account for EAS Build;
- Android phone or emulator for native purchase testing.

Clone and install:

```powershell
git clone https://github.com/buriro-ezekia/takwimucheck-mobile.git
Set-Location takwimucheck-mobile
npm install
Copy-Item .env.example .env.local
```

For local web testing:

```text
EXPO_PUBLIC_API_BASE_URL=http://localhost:8000
```

Use `http://10.0.2.2:8000` for an Android emulator. A physical phone must use the computer's LAN address while both devices are on the same network.

Do not place the protected backend key in an `EXPO_PUBLIC` variable. Paste it into the Settings screen only.

Run the web application:

```powershell
npm run web
```

Run project checks:

```powershell
npm run typecheck
npx expo install --check
npx expo-doctor
npx expo export --platform web
```

## Android development build

Authenticate and confirm the linked EAS project:

```powershell
npx eas-cli@latest login
npx eas-cli@latest whoami
npx eas-cli@latest project:info
```

Create an installable Android development build:

```powershell
npx eas-cli@latest build --platform android --profile development
```

Start Metro for the installed development client:

```powershell
npm run start:dev-client -- --clear
```

A development build is required for the native RevenueCat Test Store purchase flow. Expo Go cannot perform the complete transaction.

## Main routes

```text
src/app/index.tsx                Home dashboard
src/app/upload.tsx               CSV selection, preflight and validation
src/app/protected-data.tsx       Validation results, filters and reports
src/app/review-queue.tsx         Persistent live review queue
src/app/review-issue.tsx         Issue decision form and issue history
src/app/review-audit.tsx         Run history and Pro audit export
src/app/demo.tsx                 Synthetic project overview
src/app/validation-summary.tsx   Demonstration validation coverage
src/app/issues.tsx               Demonstration issue workflow
src/app/upgrade.tsx              RevenueCat subscription screen
src/app/settings.tsx             Backend, access and purchase status
```

## Delivery sequence

Completed:

1. Expo application foundation and product shell.
2. RevenueCat Test Store integration and Android purchase verification.
3. Interactive synthetic issue-review demonstration.
4. Backend readiness and controlled-pilot protected access.
5. CSV selection, upload preflight and validation-run orchestration.
6. Validation-result presentation, filtering and signed report access.
7. Persistent live issue review and RevenueCat-gated audit export.

Next production work:

1. user identity, short-lived tokens and role-based authorisation;
2. server-side RevenueCat entitlement verification for production-grade premium enforcement;
3. Google Play subscription products and internal testing;
4. production deployment, privacy documentation and store-release preparation.

## Batch documentation

```text
docs/BATCH_06_CSV_VALIDATION.md
docs/BATCH_07_VALIDATION_RESULTS.md
docs/BATCH_08_LIVE_REVIEW.md
```

## Licence

Licensed under the Apache License 2.0. See `LICENSE`.
