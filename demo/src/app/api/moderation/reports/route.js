import { read } from "@/lib/store.js";
import { handle, ok } from "@/lib/errors.js";
import { listModeration } from "@/lib/domain.js";
import { requireUser } from "@/lib/auth.js";

export const dynamic = "force-dynamic";

export function GET(request) {
  return handle(async () => {
    const db = read();
    return ok(listModeration(db, requireUser(db, request)));
  });
}
