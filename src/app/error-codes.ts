export const ERROR_CODES = {
  validationFailed: "VALIDATION_FAILED",
  authUnauthorized: "AUTH_UNAUTHORIZED",
  authForbidden: "AUTH_FORBIDDEN",
  authInvalidCredentials: "AUTH_INVALID_CREDENTIALS",
  authEmailExists: "AUTH_EMAIL_EXISTS",
  workspaceNotFound: "WORKSPACE_NOT_FOUND",
  resourceNotFound: "RESOURCE_NOT_FOUND",
  dbUnavailable: "DB_UNAVAILABLE",
  complianceDenied: "COMPLIANCE_DENIED",
  complianceReviewRequired: "COMPLIANCE_REVIEW_REQUIRED",
} as const;

export type ErrorCode = (typeof ERROR_CODES)[keyof typeof ERROR_CODES];
