export class AppError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'AppError';
  }
}

// 技術的なエラーを日本語の分かりやすいメッセージへ変換する
export function toUserMessage(error: unknown, fallback: string): string {
  if (error instanceof AppError) return error.message;
  return fallback;
}
