# TakwimuCheck Mobile

TakwimuCheck is a mobile-first survey data quality assurance application for supervisors, data managers and researchers.

It is designed around a simple workflow:

```text
Upload → Validate → Review → Report
```

The mobile application will connect to the existing TakwimuCheck validation backend, present explainable quality findings, support auditable review decisions and unlock paid capabilities through RevenueCat.

## Current status

This branch contains the first complete product shell built with Expo SDK 57, React Native, TypeScript and Expo Router.

Implemented in the product shell:

- TakwimuCheck home dashboard;
- synthetic demonstration project;
- transparent validation summary;
- filterable issue register;
- Pro subscription preview;
- settings, privacy and connectivity safeguards;
- typed backend API foundation;
- environment-variable template;
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

## Planned monetisation

RevenueCat will manage one Pro entitlement:

```text
takwimucheck_pro
```

Monthly and annual products will unlock the same entitlement. The current product shell does not execute purchases; RevenueCat will be added after Android product-shell verification.

## Local setup

Requirements:

- Node.js LTS;
- npm;
- Git;
- Expo-compatible Android development environment for native testing.

Clone and install:

```powershell
git clone https://github.com/buriro-ezekia/takwimucheck-mobile.git
Set-Location takwimucheck-mobile
npm install
```

Create a local environment file:

```powershell
Copy-Item .env.example .env
```

Run the web application:

```powershell
npm run web
```

Run Expo development mode:

```powershell
npm start
```

Check TypeScript:

```powershell
npm run typecheck
```

Check Expo project health:

```powershell
npx expo-doctor
```

## Environment variables

```text
EXPO_PUBLIC_API_BASE_URL
EXPO_PUBLIC_REVENUECAT_API_KEY
```

Do not commit `.env` or production credentials. Only public mobile SDK keys may be placed in the application environment.

## Main routes

```text
src/app/index.tsx                Home dashboard
src/app/demo.tsx                 Synthetic project overview
src/app/validation-summary.tsx   Validation coverage and issue summary
src/app/issues.tsx               Filterable sample issue register
src/app/upgrade.tsx              Pro subscription preview
src/app/settings.tsx             Configuration and safeguards
```

## Next milestones

1. Verify the product shell on web and Android.
2. Add automated component and route tests.
3. Connect authentication and project APIs.
4. Implement CSV upload and validation-run orchestration.
5. Add issue-review decisions.
6. Integrate RevenueCat Test Store, paywall, entitlement checks and restore purchases.
7. Produce an Android development build and begin Google Play testing.

## Licence

Licensed under the Apache License 2.0. See `LICENSE`.
