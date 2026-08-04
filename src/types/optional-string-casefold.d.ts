// Describes an optional case-fold helper used only as a defensive runtime compatibility check.

export {};

declare global {
  interface String {
    casefold?: () => string;
  }
}
