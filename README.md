# TakwimuCheck Mobile

TakwimuCheck is a mobile-first survey data quality assurance application for supervisors, data managers and researchers.

```text
Upload → Validate → Review → Report
```

The mobile application connects a focused survey-quality workflow to the existing TakwimuCheck validation backend, presents explainable findings, supports auditable review decisions and unlocks paid capabilities through RevenueCat.

## Current status

The application is built with Expo SDK 57, React Native, TypeScript and Expo Router.

Implemented:

- TakwimuCheck home dashboard;
- synthetic demonstration project;
- transparent validation summary;
- filterable issue register;
- interactive accept, defer and propose-correction decisions;
- required reviewer identity and reason fields;
- required proposed value for correction proposals;
- timestamped decision history and dynamic review counters;
- explicit demonstration reset control;
- typed backend readiness client aligned with deployed public routes;
- live health, version and runtime-status connection test;
- memory-only controlled-pilot API-key entry;
- protected validation-run and issue-register retrieval;
- privacy-minimised protected-data summary that omits observed respondent values;
- explicit clearing of the session credential and protected response cache;
- RevenueCat Purchases and Paywalls integration;
- Monthly and Yearly Test Store packages;
- published RevenueCat paywall;
- entitlement activation and restore-purchases workflow;
- EAS Android development and preview build profiles;
- successful Android development APK and Test Store purchase verification;
- protected local environment files;
- GitHub Actions checks for TypeScript, Expo compatibility, project health and web export.

The public demonstration data, issues and review decisions are fictional and contain no personal or confidential respondent information.

## Product principles

- Deterministic validation before AI assistance.
- Explainable findings with record, variable, observed value and expected rule.
- Separate raw data, standardised data, issue registers and review logs.
- No silent substantive corrections.
- Visible validation and metadata coverage.
- Mobile-first and low-connectivity optimised, not fully offline.
- Human approval before correction or final acceptance.
- Secrets are never embedded in public mobile configuration.

## Interactive review demonstration

The sample issue register supports three review actions:

```text
Accept finding
Defer finding
Propose correction
```

Each action records:

- the issue identifier;
- the selected action;
- reviewer name;
- a required reason;
- a proposed value when correction is selected;
- an ISO timestamp.

Review state is shared across routes for the current app session. The demonstration reset control restores the seeded synthetic issues and audit history. No review action changes a source record.

## Controlled-pilot protected access

The backend already protects storage-backed routes with the `x-api-key` header when `ASQA_API_KEY` is configured. TakwimuCheck Mobile can now open:

```text
GET /validation-runs
GET /issue-register
```

The pilot credential is entered manually in **Settings → Controlled-pilot protected access**. It is:

- held only in React state for the active app session;
- never written to `.env.local`, AsyncStorage, logs or repository files;
- never displayed in the protected summary;
- cleared explicitly by the user or when the app process closes.

This mechanism is suitable only for a controlled pilot. A production release should replace the shared API key with user authentication, short-lived tokens, role-based authorisation and secure server-side session handling.

The protected summary displays validation-run metadata and issue identifiers, rules, severity and review status. It deliberately omits observed respondent values.

## RevenueCat configuration

RevenueCat manages one Pro entitlement using the dashboard identifier:

```text
TakwimuCheck Pro
```

Monthly and Yearly products both unlock this entitlement. The app loads the current Offering remotely and does not hard-code prices.

RevenueCat Test Store requires a public SDK key:

```text
EXPO_PUBLIC_REVENUECAT_API_KEY
```

Production builds can later use platform-specific public SDK keys:

```text
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY
```

Never place RevenueCat secret keys in the mobile app or commit real environment values.

### Verified RevenueCat milestone

The following have been completed in an Android development build:

- the current Offering loaded successfully;
- Monthly and Yearly packages appeared in the published paywall;
- a Test Store purchase completed;
- `TakwimuCheck Pro` became active;
- entitlement state persisted after closing and reopening the app;
- Restore Purchases completed successfully.

## Backend readiness

The public readiness client targets:

```text
GET /health
GET /version
GET /runtime-status
```

The Settings screen reports:

- service reachability;
- service name;
- backend version;
- whether protected storage routes are enabled;
- whether CORS is enabled;
- the time of the last successful check.

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
```

Create the private local environment file:

```powershell
Copy-Item .env.example .env.local
```

For backend testing:

```text
EXPO_PUBLIC_API_BASE_URL=http://localhost:8000
```

Use `http://10.0.2.2:8000` for an Android emulator. A physical phone must use the computer's LAN address while both devices are on the same network.

Do not add the protected API key to any `EXPO_PUBLIC` variable. Enter it through the Settings screen only.

Run the web preview:

```powershell
npm run web
```

Run project checks:

```powershell
npm run typecheck
npx expo install --check
npx expo-doctor
```

## Controlled-pilot backend start

From the backend repository, choose a private local API key interactively and start the SQLite-backed API:

```powershell
$env:ASQA_DATABASE_PATH = Join-Path (Get-Location) "runtime\pilot-quality.db"
$env:ASQA_CORS_ORIGINS = "http://localhost:8081,http://127.0.0.1:8081"
$env:ASQA_API_KEY = Read-Host "Enter a private controlled-pilot API key"

& ".\.venv\Scripts\python.exe" -m uvicorn automated_survey_qa.api.main:app `
  --host 0.0.0.0 `
  --port 8000
```

The protected routes can return empty collections when the database contains no validation runs or issues. A successful empty response still confirms that storage routing and API-key protection are working.

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

Install the resulting APK on the Android test phone, then start Metro for the installed development client:

```powershell
npm run start:dev-client -- --clear
```

A development build is required for the full RevenueCat Test Store flow. Expo Go cannot perform the native purchase transaction.

## Main routes

```text
src/app/index.tsx                Home dashboard
src/app/demo.tsx                 Synthetic project and live sample-review overview
src/app/validation-summary.tsx   Validation coverage and issue summary
src/app/issues.tsx               Interactive sample issue register and audit history
src/app/protected-data.tsx       Protected validation-run and issue metadata summary
src/app/upgrade.tsx              RevenueCat Pro subscription screen
src/app/settings.tsx             Backend, protected access, safeguards and purchase status
```

## Delivery sequence

Completed:

1. Expo SDK 57 application foundation.
2. TakwimuCheck product shell and synthetic workflow.
3. RevenueCat Test Store integration and verified Android purchase flow.
4. Backend readiness client and release hardening.
5. Interactive issue-review workflow with local audit history.
6. Controlled-pilot protected-route access with a memory-only credential.

Next production batches:

1. CSV selection, upload preflight and validation-run orchestration.
2. Real issue-review submission and export workflows.
3. Production identity, short-lived tokens and role-based authorisation.
4. Google Play subscription products, internal testing and store-release preparation.

## Licence

Licensed under the Apache License 2.0. See `LICENSE`.
