export interface ActionInputs {
  branchPattern: string;
  failIfInvalidBranchName: boolean;
  ignoreBranchPatterns: string[];
  skipDependabot: boolean;
  invalidLabel: string;
  usePrReview: boolean;
  minLength: number | null;
  maxLength: number | null;
  checkPrTitle: boolean;
  requireTicketId: boolean;
  invalidCommentTemplate: string | null;
  successCommentTemplate: string | null;
  skipCommentTemplate: string | null;
  commentOnSuccess: boolean;
}
