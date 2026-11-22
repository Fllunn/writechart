// Структура программы: дерево шагов алгоритма, не зависит от языка.
// Текст уже в математической записи (см. notation.ts).

/** Кусок текста блока. */
export type TextPart =
  | { readonly kind: "text"; readonly text: string }
  /** Надстрочный текст: показатель степени. */
  | { readonly kind: "sup"; readonly text: string }
  /** Строка из кода: рисуется в «ёлочках». */
  | { readonly kind: "quoted"; readonly text: string }
  /** Принудительный перенос строки. */
  | { readonly kind: "break" };

export type Text = readonly TextPart[];

interface StepBase {
  /** Строка кода, с 1. */
  readonly line: number;
}

export interface ProcessStep extends StepBase {
  readonly kind: "process";
  readonly text: Text;
}

export interface InputStep extends StepBase {
  readonly kind: "input";
  readonly text: Text;
}

export interface OutputStep extends StepBase {
  readonly kind: "output";
  readonly text: Text;
}

export interface IfStep extends StepBase {
  readonly kind: "if";
  readonly condition: Text;
  readonly then: readonly Step[];
  /** `elif` — `IfStep` внутри `else`. */
  readonly else: readonly Step[];
}

export interface WhileStep extends StepBase {
  readonly kind: "while";
  readonly condition: Text;
  readonly body: readonly Step[];
}

/** Конструкция, которой нет в этой версии: блок с первой строкой кода, без тела. */
export interface UnsupportedStep extends StepBase {
  readonly kind: "unsupported";
  /** Слово конструкции для предупреждения: `for`, `def`, `while … else`. */
  readonly keyword: string;
  readonly firstLine: string;
}

export type Step = ProcessStep | InputStep | OutputStep | IfStep | WhileStep | UnsupportedStep;

export interface Program {
  readonly body: readonly Step[];
}

/** Ошибка или предупреждение для пользователя. */
export interface Diagnostic {
  /** Строка кода, с 1; нет — сообщение про весь код. */
  readonly line?: number;
  /** Готовый текст, например «Строка 2: for пока не поддерживается». */
  readonly message: string;
}
