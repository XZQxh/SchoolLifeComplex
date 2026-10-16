import { handle, ok } from "@/lib/errors.js";
import { clearSessionCookie } from "@/lib/auth.js";

export const dynamic = "force-dynamic";

export function POST() {
  return handle(async () => clearSessionCookie(ok({ done: true })));
}
