export type AppErrorCode =
  | "VALIDATION_FAILED"
  | "RATE_VERSION_NOT_FOUND"
  | "CALCULATION_PRECONDITION_FAILED"
  | "PROTOTYPE_CALCULATOR_DISABLED"
  | "ASSESSMENT_NOT_FOUND"
  | "PDF_GENERATION_FAILED"
  | "EMAIL_DELIVERY_FAILED"

export class AppError extends Error {
  constructor(
    public readonly code: AppErrorCode,
    message: string,
    public readonly status = 400
  ) {
    super(message)
  }
}
