export interface ActionInputs {
  branchPattern: string;
  failIfInvalidBranchName: boolean;
  ignoreBranchPatterns: string[];
  skipDependabot: boolean;
  invalidLabel: string;
  usePrReview: boolean;
}
