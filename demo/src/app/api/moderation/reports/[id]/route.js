import { write } from "@/lib/store.js";
import { handle, ok } from "@/lib/errors.js";
import { resolveReport } from "@/lib/domain.js";
import { requireUser } from "@/lib/auth.js";

export const dynamic = "force-dynamic";

export function POST(request, { params }) {
  return handle(async () => {
    const { id } = await params;
    const payload = await request.json().catch(() => ({}));
    const result = await write((db) =>
      resolveReport(db, requireUser(db, request), id, payload.action),
    );
    return ok(result);
  });
}
