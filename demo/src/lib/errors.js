export class ApiError extends Error {
  constructor(code, message) {
    super(message);
    this.code = code;
  }
}

export const badRequest = (message) => new ApiError("VALIDATION", message);
export const unauthorized = (message = "请先登录") => new ApiError("UNAUTHORIZED", message);
export const forbidden = (message = "没有操作权限") => new ApiError("FORBIDDEN", message);
export const notFound = (message = "目标不存在") => new ApiError("NOT_FOUND", message);
export const conflict = (message) => new ApiError("CONFLICT", message);

const STATUS_BY_CODE = {
  VALIDATION: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
};

export function ok(data) {
  return Response.json({ ok: true, data });
}

export function fail(error) {
  const code = error instanceof ApiError ? error.code : "INTERNAL";
  const status = STATUS_BY_CODE[code] ?? 500;
  const message = error instanceof ApiError ? error.message : "服务器内部错误";
  if (code === "INTERNAL") {
    console.error(error);
  }
  return Response.json({ ok: false, error: { code, message } }, { status });
}

export async function handle(fn) {
  try {
    return await fn();
  } catch (error) {
    return fail(error);
  }
}
