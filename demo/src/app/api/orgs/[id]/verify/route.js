import { write } from "@/lib/store.js";
import { handle, ok } from "@/lib/errors.js";
import { verifyOrganization } from "@/lib/domain.js";
import { requireUser } from "@/lib/auth.js";

export const dynamic = "force-dynamic";

export function POST(request, { params }) {
  return handle(async () => {
    const { id } = await params;
    const payload = await request.json().catch(() => ({}));
    const result = await write((db) =>
      verifyOrganization(db, requireUser(db, request), id, Boolean(payload.verify)),
    );
    return ok(result);
  });
}
