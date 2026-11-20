import { z } from "zod";

/** Тело любого ответа API с кодом 4xx или 5xx (specs/api-errors); кроме 503 от `/api/health/ready`. */
export const ApiError = z.object({
  error: z.object({
    /** Машинный код: строчные латинские буквы и `_`, например `not_found`. */
    code: z.string().regex(/^[a-z_]+$/),
    /** Текст для человека. */
    message: z.string(),
    /** Подробности; форма зависит от `code`, например `ValidationDetails` для `validation_failed`. */
    details: z.unknown().optional(),
  }),
});
export type ApiError = z.infer<typeof ApiError>;

/** `details` ошибки `validation_failed`: путь к полю и текст по каждой ошибке проверки. */
export const ValidationDetails = z.array(
  z.object({
    path: z.array(z.union([z.string(), z.number()])),
    message: z.string(),
  }),
);
export type ValidationDetails = z.infer<typeof ValidationDetails>;
