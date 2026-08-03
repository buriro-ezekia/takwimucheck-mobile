// Defines the shared data contracts used by the TakwimuCheck demonstration workflow.

export type IssueSeverity = 'error' | 'warning';

export type IssueStatus = 'open' | 'reviewed' | 'deferred';

export type ValidationRuleStatus = 'passed' | 'attention';

export interface ValidationMetrics {
  recordsChecked: number;
  rulesExecuted: number;
  errors: number;
  warnings: number;
  reviewedIssues: number;
  openIssues: number;
}

export interface ValidationIssue {
  id: string;
  ruleId: string;
  title: string;
  message: string;
  severity: IssueSeverity;
  status: IssueStatus;
  recordId: string;
  variable: string;
  observedValue: string;
  expected: string;
  category: string;
}

export interface RuleCoverageItem {
  id: string;
  label: string;
  coverage: number;
  checksExecuted: number;
  status: ValidationRuleStatus;
}

export interface DemoProject {
  id: string;
  name: string;
  datasetLabel: string;
  source: string;
  lastRunLabel: string;
  metrics: ValidationMetrics;
  validationCoverage: number;
  metadataCoverage: number;
}
