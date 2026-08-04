# Batch 6: CSV Selection and Validation Orchestration

## Purpose

This batch connects TakwimuCheck Mobile to the protected backend CSV workflow:

1. select one CSV file through the system document picker;
2. run server-side upload preflight without creating a validation run;
3. review file size, record count, column count, headers, warnings and blocking errors;
4. enter a survey identifier;
5. deliberately start the configured validation pipeline;
6. refresh protected validation-run and issue-register summaries.

## Mobile safeguards

- The selected file remains local until the user presses **Run upload preflight**.
- Preflight creates no validation run and returns no respondent values.
- Validation remains disabled until preflight succeeds and a survey ID is entered.
- The backend pilot key remains in memory only and is sent through `x-api-key`.
- The RevenueCat public SDK key is unrelated to protected backend access.
- Clearing the selected upload removes the file reference and preflight result from app memory.

## Backend contract

The mobile client uses:

```text
POST /validation-runs/preflight
POST /validation-runs
GET  /validation-runs
GET  /issue-register
```

Both POST routes use `multipart/form-data` and require the controlled-pilot `x-api-key` header.

The backend runtime must configure:

```text
ASQA_DATABASE_PATH
ASQA_API_KEY
ASQA_CORS_ORIGINS
ASQA_METADATA_FOLDER
ASQA_OUTPUT_ROOT
```

Optional upload limits:

```text
ASQA_UPLOAD_MAX_BYTES
ASQA_UPLOAD_MAX_RECORDS
```

The controlled-pilot defaults are 5 MB and 500 records.

## Local installation

Install the Expo-compatible picker and update the lock file:

```powershell
npx expo install expo-document-picker
```

Then run:

```powershell
npm run typecheck
npx expo install --check
npx expo-doctor
npx expo export --platform web
```

## Acceptance checks

- unauthorised sessions cannot open the upload workflow;
- cancelling the picker uploads nothing;
- a valid UTF-8 CSV produces a readable preflight summary;
- duplicate or blank headers block validation;
- files above the configured record or byte limits are blocked;
- validation cannot start without a survey ID;
- a successful run appears in the protected backend summary;
- issue counts refresh after completion;
- no observed respondent values appear in the mobile protected summary.
