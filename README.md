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
- settings, privacy and connectivity safeguards;
- typed backend readiness client aligned with the deployed public routes;
- live health, version and runtime-status connection test;
- RevenueCat Purchases and Paywalls integration;
- Monthly and Yearly Test Store packages;
- published RevenueCat paywall;
- entitlement activation and restore-purchases workflow;
- EAS Android development and preview build profiles;
- successful Android development APK and Test Store purchase verification;
- protected local environment files;
- GitHub Actions checks for TypeScript, Expo compatibility, project health and web export.

The demonstration data, issues and review decisions are fictional and contain no personal or confidential respondent information.

## Product principles

- Deterministic validation before AI assistance.
- Explainable findings with record, variable, observed value and expected rule.
- Separate raw data, standardised data, issue registers and review logs.
- No silent substantive corrections.
- Visible validation and metadata coverage.
- Mobile-first and low-connectivity optimised, not fully offline.
- Human approval before correction or final acceptance.

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

The mobile client currently targets the backend routes that already exist:

```text
GET /health
GET /version
GET /runtime-status
```

The Settings screen can call these routes together and report:

- service reachability;
- service name;
- backend version;
- whether protected storage routes are enabled;
- whether CORS is enabled;
- the time of the last successful check.

The backend also exposes storage and review routes when database storage is configured, but mobile authentication and protected-route access are intentionally deferred to the next production batch.

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

Set the appropriate values in `.env.local`.

For backend testing:

```text
EXPO_PUBLIC_API_BASE_URL=http://localhost:8000
```

Use `http://10.0.2.2:8000` for an Android emulator. A physical phone must use the computer's LAN address while both devices are on the same network.

Run the web preview:

```powershell
npm run web
```

The web preview can test public backend readiness and the interactive synthetic review workflow, but it does not initiate native store purchases.

Run project checks:

```powershell
npm run typecheck
npx expo install --check
npx expo-doctor
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
src/app/upgrade.tsx              RevenueCat Pro subscription screen
src/app/settings.tsx             Backend, safeguards and purchase status
```

## Delivery sequence

Completed:

1. Expo SDK 57 application foundation.
2. TakwimuCheck product shell and synthetic workflow.
3. RevenueCat Test Store integration and verified Android purchase flow.
4. Backend readiness client and release hardening.
5. Interactive issue-review workflow with local audit history.

Next production batches:

1. Backend authentication and protected-route access.
2. CSV selection, upload preflight and validation-run orchestration.
3. Real issue-register retrieval, review submission and export workflows.
4. Google Play subscription products, internal testing and store-release preparation.

## Licence

Licensed under the Apache License 2.0. See `LICENSE`.
