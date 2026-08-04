# TakwimuCheck Mobile

TakwimuCheck is a mobile-first survey data quality assurance application for supervisors, data managers and researchers.

```text
Upload → Validate → Review → Report
```

The mobile application will connect to the existing TakwimuCheck validation backend, present explainable quality findings, support auditable review decisions and unlock paid capabilities through RevenueCat.

## Current status

The application is built with Expo SDK 57, React Native, TypeScript and Expo Router.

Implemented:

- TakwimuCheck home dashboard;
- synthetic demonstration project;
- transparent validation summary;
- filterable issue register;
- settings, privacy and connectivity safeguards;
- typed backend API foundation;
- RevenueCat SDK and Paywalls integration foundation;
- `takwimucheck_pro` entitlement checks;
- paywall presentation and restore-purchases actions;
- EAS Android development and preview build profiles;
- protected local environment files.

The demonstration data are fictional and contain no personal or confidential respondent information.

## Product principles

- Deterministic validation before AI assistance.
- Explainable findings with record, variable, observed value and expected rule.
- Separate raw data, standardised data, issue registers and review logs.
- No silent substantive corrections.
- Visible validation and metadata coverage.
- Mobile-first and low-connectivity optimised, not fully offline.
- Human approval before correction or final acceptance.

## RevenueCat configuration

RevenueCat manages one Pro entitlement:

```text
takwimucheck_pro
```

Monthly and annual products must both unlock this entitlement. The app loads the current offering remotely and does not hard-code prices.

RevenueCat Test Store requires a public SDK key in the local environment:

```text
EXPO_PUBLIC_REVENUECAT_API_KEY
```

Production builds can later use:

```text
EXPO_PUBLIC_REVENUECAT_ANDROID_API_KEY
EXPO_PUBLIC_REVENUECAT_IOS_API_KEY
```

Never place RevenueCat secret keys in the mobile app.

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

Create the local environment file:

```powershell
Copy-Item .env.example .env
```

Add the RevenueCat Test Store public SDK key to `.env`.

Run the web preview:

```powershell
npm run web
```

The web preview displays subscription readiness but does not initiate native store purchases.

Run TypeScript and Expo checks:

```powershell
npm run typecheck
npx expo-doctor
```

## Android development build

Install and authenticate the EAS CLI:

```powershell
npm install --global eas-cli
eas login
eas whoami
```

Initialise the Expo project on EAS when prompted:

```powershell
eas init
eas build:configure
```

Create the installable Android development build:

```powershell
eas build --platform android --profile development
```

Install the resulting APK on the Android test phone, then start Metro for the development client:

```powershell
npm run start:dev-client
```

A development build is required for real RevenueCat Test Store purchases. Expo Go can preview JavaScript flows but cannot perform the full native purchase transaction.

## Main routes

```text
src/app/index.tsx                Home dashboard
src/app/demo.tsx                 Synthetic project overview
src/app/validation-summary.tsx   Validation coverage and issue summary
src/app/issues.tsx               Filterable sample issue register
src/app/upgrade.tsx              RevenueCat Pro subscription screen
src/app/settings.tsx             Configuration, safeguards and purchase status
```

## Next milestones

1. Complete the first RevenueCat Test Store purchase.
2. Confirm `takwimucheck_pro` becomes active.
3. Confirm restore purchases works.
4. Connect authentication and project APIs.
5. Implement CSV upload and validation-run orchestration.
6. Add issue-review decisions and export workflows.
7. Begin Google Play testing.

## Licence

Licensed under the Apache License 2.0. See `LICENSE`.
