/**
 * Ожидаемая ошибка: обработчик ошибок отдаёт её `status` и `code` как есть.
 * Пример: `throw new AppError(404, "scheme_not_found", "Scheme not found")`.
 */
export class AppError extends Error {
  readonly status: number;
  /** Машинный код: строчные латинские буквы и `_`. */
  readonly code: string;

  constructor(status: number, code: string, message: string, options?: ErrorOptions) {
    super(message, options);
    this.name = "AppError";
    this.status = status;
    this.code = code;
  }
}
