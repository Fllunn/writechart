import type { ApiError, ValidationDetails } from "@writechart/shared/api-error";
import type { ErrorRequestHandler } from "express";
import { ZodError } from "zod";
import { AppError } from "../errors.ts";

type Reply = { status: number; error: ApiError["error"] };

// Ошибки express.json() (body-parser) помечены полем `type`.
function bodyParserType(error: unknown): unknown {
  return typeof error === "object" && error !== null && "type" in error ? error.type : undefined;
}

function toReply(error: unknown): Reply | undefined {
  if (error instanceof AppError) {
    return { status: error.status, error: { code: error.code, message: error.message } };
  }
  if (error instanceof ZodError) {
    return {
      status: 400,
      error: {
        code: "validation_failed",
        message: "Request validation failed",
        details: error.issues.map((issue) => ({
          path: issue.path.map((key) => (typeof key === "symbol" ? String(key) : key)),
          message: issue.message,
        })) satisfies ValidationDetails,
      },
    };
  }
  switch (bodyParserType(error)) {
    case "entity.parse.failed":
      return {
        status: 400,
        error: { code: "invalid_json", message: "Request body is not valid JSON" },
      };
    case "entity.too.large":
      return {
        status: 413,
        error: { code: "payload_too_large", message: "Request body is too large" },
      };
    default:
      return undefined;
  }
}

/** Единый ответ об ошибке `{ error: { code, message, details? } }` (specs/api-errors). */
export const errorHandler: ErrorRequestHandler = (error, req, res, next) => {
  // Ответ уже начат: дописать JSON нельзя, отдаём Express, он закроет соединение.
  if (res.headersSent) {
    next(error);
    return;
  }

  const reply = toReply(error);
  if (reply) {
    res.status(reply.status).json({ error: reply.error } satisfies ApiError);
    return;
  }

  // Непредвиденная ошибка: стек — только в лог, в ответ — общий текст.
  req.log.error({ err: error }, "Unhandled error");
  res.status(500).json({
    error: { code: "internal_error", message: "Internal server error" },
  } satisfies ApiError);
};
