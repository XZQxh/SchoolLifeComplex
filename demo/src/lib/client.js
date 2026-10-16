export async function apiFetch(path, options = {}) {
  const response = await fetch(path, {
    method: options.method ?? "GET",
    headers: options.body ? { "Content-Type": "application/json" } : undefined,
    body: options.body ? JSON.stringify(options.body) : undefined,
    cache: "no-store",
  });
  const payload = await response.json().catch(() => null);
  if (!payload || !payload.ok) {
    const error = new Error(payload?.error?.message ?? "请求失败");
    error.code = payload?.error?.code ?? "INTERNAL";
    throw error;
  }
  return payload.data;
}

export const CATEGORY_LABELS = {
  game: "游戏",
  anime: "动漫",
  sports: "文体",
  study: "学习",
  life: "生活",
  other: "其他",
};

export const FOUND_STATUS_LABELS = {
  open: "进行中",
  claimed: "已认领",
  closed: "已关闭",
};

export const POST_STATUS_LABELS = {
  pending: "待审",
  published: "已发布",
  rejected: "已驳回",
  removed: "已删除",
};

export function formatTime(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(
    date.getHours(),
  )}:${pad(date.getMinutes())}`;
}
