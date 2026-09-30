export interface ParsedApiError {
  code?: string;
  message?: string;
}

interface ApiErrorShape {
  response?: {
    data?: {
      code?: string;
      message?: string;
      errors?: Record<string, string>;
      detail?:
        | string
        | { code?: string; message?: string; msg?: string }
        | Array<{ code?: string; message?: string; msg?: string }>;
    };
  };
}

export function parseApiError(err: unknown): ParsedApiError {
  const data = (err as ApiErrorShape)?.response?.data;
  if (!data) return {};

  if (Array.isArray(data.detail)) {
    const first = data.detail.find(
      (item) => item?.message || item?.msg || item?.code,
    );
    return {
      code: first?.code ?? data.code,
      message:
        first?.message ??
        first?.msg ??
        data.message ??
        "La solicitud contiene datos inválidos.",
    };
  }

  if (typeof data.detail === "string") {
    return { code: data.code, message: data.detail };
  }

  if (data.detail && typeof data.detail === "object") {
    return {
      code: data.detail.code ?? data.code,
      message: data.detail.message ?? data.detail.msg ?? data.message,
    };
  }

  return { code: data.code, message: data.message };
}

export function getApiErrorMessage(
  err: unknown,
  fallback: string,
  codeMessages: Record<string, string> = {},
): string {
  const data = (err as ApiErrorShape)?.response?.data;
  const firstFieldError = data?.errors
    ? Object.values(data.errors).find(Boolean)
    : undefined;
  const parsed = parseApiError(err);
  if (parsed.code && codeMessages[parsed.code]) {
    return codeMessages[parsed.code];
  }
  return parsed.message ?? firstFieldError ?? fallback;
}
