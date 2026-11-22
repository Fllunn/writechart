// Лимиты размера схемы (спека «Лимиты размера»). Длину кода фронт проверяет до разбора, ядро — ещё раз.

export const limits = {
  /** Символов в коде. */
  codeLength: 50_000,
  /** Уровней вложенности конструкций. */
  depth: 50,
  /** Блоков в схеме, вместе с «Начало» и «Конец». */
  blocks: 2000,
} as const;

export const limitMessages = {
  codeLength: "Код слишком длинный: больше 50 000 символов",
  depth: "Слишком глубокая вложенность: больше 50 уровней",
  blocks: "Схема слишком большая: больше 2000 блоков",
} as const;

/** Сообщение, если код длиннее лимита, иначе `undefined`. */
export function checkCodeLength(code: string): string | undefined {
  return code.length > limits.codeLength ? limitMessages.codeLength : undefined;
}
