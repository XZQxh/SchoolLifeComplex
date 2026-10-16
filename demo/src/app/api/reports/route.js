import { write } from "@/lib/store.js";
import { handle, ok } from "@/lib/errors.js";
import { createReport } from "@/lib/domain.js";
import { requireUser } from "@/lib/auth.js";

export const dynamic = "force-dynamic";

export function POST(request) {
  return handle(async () => {
    const payload = await request.json().catch(() => ({}));
    const result = await write((db) => createReport(db, requireUser(db, request), payload));
    return ok(result);
  });
}
