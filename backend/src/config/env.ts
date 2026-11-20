import { z } from "zod";

// `--env-file` превращает `PORT=` в "", поэтому пустое значение = не задано.
const optional = <T extends z.ZodType>(schema: T) =>
  z.preprocess((value) => (value === "" ? undefined : value), schema);

const EnvSchema = z.object({
  NODE_ENV: optional(z.enum(["development", "production", "test"]).default("development")),
  HOST: optional(z.string().default("127.0.0.1")),
  PORT: optional(z.coerce.number().int().min(1).max(65535).default(3000)),
  DATABASE_URL: optional(z.url({ protocol: /^postgres(ql)?$/ })),
  LOG_LEVEL: optional(
    z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
  ),
});

export type Env = z.infer<typeof EnvSchema>;

export function parseEnv(source: Record<string, string | undefined>) {
  return EnvSchema.safeParse(source);
}
