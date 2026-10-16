import { write } from "@/lib/store.js";
import { handle, ok } from "@/lib/errors.js";
import { login } from "@/lib/domain.js";
import { setSessionCookie } from "@/lib/auth.js";

export const dynamic = "force-dynamic";

export function POST(request) {
  return handle(async () => {
    const payload = await request.json().catch(() => ({}));
    const result = await write((db) => login(db, payload));
    return setSessionCookie(ok(result), result.user.id);
  });
}
