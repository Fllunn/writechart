import type { RequestHandler } from "express";
import { AppError } from "../errors.ts";

/** Всё, что дошло под `/api` и не нашло маршрута. */
export const notFound: RequestHandler = (req) => {
  throw new AppError(404, "not_found", `Route ${req.method} ${req.originalUrl} not found`);
};
