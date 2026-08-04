// Maintains auditable synthetic review decisions across the TakwimuCheck app session.

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { demoIssues, demoReviewDecisions } from '@/constants/demo-data';
import type {
  IssueStatus,
  ReviewAction,
  ReviewDecision,
  SubmitReviewDecisionInput,
  ValidationIssue,
} from '@/types/validation';

interface ReviewContextValue {
  issues: ValidationIssue[];
  decisions: ReviewDecision[];
  latestDecisionsByIssue: Partial<Record<string, ReviewDecision>>;
  submitDecision: (input: SubmitReviewDecisionInput) => ReviewDecision;
  resetReview: () => void;
}

const ReviewContext = createContext<ReviewContextValue | undefined>(undefined);

const statusByAction: Record<ReviewAction, IssueStatus> = {
  accept: 'accepted',
  defer: 'deferred',
  'propose-correction': 'correction-proposed',
};

function cloneIssues(): ValidationIssue[] {
  return demoIssues.map((issue) => ({ ...issue }));
}

function cloneDecisions(): ReviewDecision[] {
  return demoReviewDecisions.map((decision) => ({ ...decision }));
}

export function ReviewProvider({ children }: { children: ReactNode }) {
  const [issues, setIssues] = useState<ValidationIssue[]>(cloneIssues);
  const [decisions, setDecisions] = useState<ReviewDecision[]>(cloneDecisions);

  const latestDecisionsByIssue = useMemo(() => {
    return decisions.reduce<Partial<Record<string, ReviewDecision>>>((latest, decision) => {
      const current = latest[decision.issueId];

      if (!current || new Date(decision.createdAt).getTime() >= new Date(current.createdAt).getTime()) {
        latest[decision.issueId] = decision;
      }

      return latest;
    }, {});
  }, [decisions]);

  const submitDecision = useCallback(
    (input: SubmitReviewDecisionInput): ReviewDecision => {
      const issueExists = issues.some((issue) => issue.id === input.issueId);
      const reason = input.reason.trim();
      const reviewer = input.reviewer.trim();
      const proposedValue = input.proposedValue?.trim();

      if (!issueExists) {
        throw new Error('The selected issue is no longer available in the demonstration register.');
      }

      if (!reason) {
        throw new Error('Enter a review reason before saving the decision.');
      }

      if (!reviewer) {
        throw new Error('Enter the reviewer name before saving the decision.');
      }

      if (input.action === 'propose-correction' && !proposedValue) {
        throw new Error('Enter the proposed correction before saving this decision.');
      }

      const decision: ReviewDecision = {
        id: `DEC-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        issueId: input.issueId,
        action: input.action,
        reason,
        reviewer,
        proposedValue: input.action === 'propose-correction' ? proposedValue : undefined,
        createdAt: new Date().toISOString(),
      };

      setIssues((currentIssues) =>
        currentIssues.map((issue) =>
          issue.id === input.issueId
            ? { ...issue, status: statusByAction[input.action] }
            : issue,
        ),
      );
      setDecisions((currentDecisions) => [...currentDecisions, decision]);

      return decision;
    },
    [issues],
  );

  const resetReview = useCallback(() => {
    setIssues(cloneIssues());
    setDecisions(cloneDecisions());
  }, []);

  const value = useMemo<ReviewContextValue>(
    () => ({
      issues,
      decisions,
      latestDecisionsByIssue,
      submitDecision,
      resetReview,
    }),
    [decisions, issues, latestDecisionsByIssue, resetReview, submitDecision],
  );

  return <ReviewContext.Provider value={value}>{children}</ReviewContext.Provider>;
}

export function useReview(): ReviewContextValue {
  const context = useContext(ReviewContext);

  if (!context) {
    throw new Error('useReview must be used within a ReviewProvider.');
  }

  return context;
}
