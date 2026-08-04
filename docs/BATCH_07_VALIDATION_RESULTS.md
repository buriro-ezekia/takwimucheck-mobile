# Batch 07: Validation Results, Filtering and Report Access

## Purpose

Batch 07 turns the protected backend summary into a usable validation-results workspace. It allows an authorised controlled-pilot user to select a validation run, understand the scale and severity of its findings, focus the issue register and open generated reports without exposing the session API key in a URL.

## User flow

```text
Authorise protected session
    ↓
Open Validation results
    ↓
Select a stored validation run
    ↓
Review quality summary
    ↓
Search or filter issue metadata
    ↓
Load additional issue pages where required
    ↓
Request a short-lived report link
    ↓
Open or download the selected report
```

## Mobile capabilities

- validation runs are ordered from newest to oldest;
- one run is selected at a time;
- headline metrics show all issues, errors, open issues and affected variables;
- filters cover severity, review status, issue type and variable;
- free-text search covers identifiers, rules, types and messages;
- issue pages are loaded in groups of 20;
- observed respondent values are not rendered in the results workspace;
- available reports display their names and sizes;
- reports open through a five-minute signed link;
- the controlled-pilot API key remains in memory and is never added to the report URL.

## Backend capabilities

- `GET /validation-results/runs/{validation_run_id}` returns one run, aggregate issue counts and available report metadata;
- `GET /validation-results/issues` applies protected server-side filters and pagination;
- `GET /validation-results/runs/{validation_run_id}/reports/{artifact_key}/link` creates a short-lived signed link;
- `GET /validation-results/runs/{validation_run_id}/reports/{artifact_key}` serves only allowlisted report files after validating the signature and expiry;
- report resolution rejects unsupported artefacts and directory traversal;
- filtered issue responses exclude `current_value`.

## Allowlisted reports

- interactive HTML validation report;
- Excel validation report;
- Markdown validation report;
- missingness profile CSV;
- dataset summary CSV.

Raw uploads, cleaned datasets and the full issue-register export are not exposed by the report-link endpoint.

## Acceptance checks

### Access and run selection

- [ ] Opening results without an authorised session shows a protected-access state.
- [ ] An authorised session lists stored validation runs.
- [ ] Runs appear newest first.
- [ ] Changing the selected run refreshes its summary and issue page.

### Result summary

- [ ] The selected run shows survey ID, run ID, status, quality score and creation time.
- [ ] Aggregate totals match the protected database.
- [ ] No server output-folder path is displayed.

### Filtering

- [ ] Severity filtering returns only the selected severity.
- [ ] Status filtering returns only the selected review status.
- [ ] Issue-type filtering returns only the selected type.
- [ ] Variable filtering returns only the selected variable.
- [ ] Search matches variable, rule, type or message metadata.
- [ ] Clearing filters restores the full issue count.
- [ ] Load more appends the next page without duplicating previous issues.
- [ ] Respondent values remain absent from the result cards and API response.

### Reports

- [ ] HTML report access succeeds from web.
- [ ] Excel report access succeeds from web.
- [ ] A report can be opened or downloaded on Android.
- [ ] The report URL contains a scoped token but not the session API key.
- [ ] A changed token is rejected.
- [ ] An expired link is rejected.
- [ ] Unsupported artefact names return a controlled not-found response.

### Regression

- [ ] CSV upload and preflight remain functional.
- [ ] Protected validation-run and issue collection refresh remains functional.
- [ ] RevenueCat configuration and purchases remain unaffected.
- [ ] TypeScript, Expo Doctor and web export pass.
- [ ] Backend Python tests and Docker image build pass.
