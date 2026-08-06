# Batch 8: Live review decisions and Pro audit export

## Purpose

Batch 8 connects the protected validation issue register to a persistent human-review workflow.

The mobile application now supports:

```text
Select validation run
→ open real protected issue
→ choose review action
→ record reviewer evidence
→ persist decision
→ reload issue status and history
→ export the complete audit with TakwimuCheck Pro
```

## New routes

```text
src/app/review-queue.tsx
src/app/review-issue.tsx
src/app/review-audit.tsx
```

## Review actions

- Accept finding
- Defer
- Reject finding
- Propose correction

Reviewer name and reason are mandatory. A correction proposal also requires a proposed value.

The proposed value is evidence only. TakwimuCheck does not silently change an uploaded respondent record.

## Persistent behaviour

Review decisions are submitted to the backend rather than held only in React state. After a successful submission:

- the issue status is refreshed from the backend;
- the review history is reloaded;
- review counters reflect persisted status;
- closing and reopening the app does not remove the decision.

## Privacy boundary

The live queue, issue screen and history do not display the original observed respondent value.

The review history may display a reviewer-proposed value because it is part of the human decision record. It is clearly separated from the original source value and is never applied automatically.

## RevenueCat product boundary

The complete review-audit CSV is gated by the active RevenueCat entitlement:

```text
TakwimuCheck Pro
```

Without Pro:

- users can review issues;
- users can submit and read persistent decisions;
- the full audit export remains locked;
- the published paywall and restore-purchases action are available.

With Pro:

- the app requests a five-minute signed export link;
- the session backend key is not placed in the URL;
- the CSV opens or downloads through the platform handler.

## Acceptance checks

Batch 8 mobile acceptance requires:

1. the newest validation run appears in the live queue;
2. a real issue opens without showing `current_value`;
3. all four review actions can be selected;
4. reviewer and reason validation works;
5. correction proposals require a proposed value;
6. a submitted decision updates the issue status;
7. history remains after app restart;
8. stale-status conflicts prompt a refresh rather than overwriting another review;
9. non-Pro users see the paywall boundary for full export;
10. an active or restored Pro entitlement unlocks signed CSV export;
11. TypeScript, Expo Doctor and web export pass;
12. the workflow is verified in an Android development build.
