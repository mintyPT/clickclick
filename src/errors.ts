export type ClickClickErrorCode =
  | "INVALID_INPUT"
  | "MISSING_SELECTOR"
  | "TEXT_FIT_OVERFLOW"
  | "BROWSER_LAUNCH_FAILED"
  | "RENDER_FAILED";

export class ClickClickError extends Error {
  readonly code: ClickClickErrorCode;
  readonly details?: unknown;

  constructor(code: ClickClickErrorCode, message: string, details?: unknown) {
    super(message);
    this.name = "ClickClickError";
    this.code = code;
    this.details = details;
  }
}
