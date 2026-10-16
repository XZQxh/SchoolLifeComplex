import { write } from "@/lib/store.js";
import { handle, ok } from "@/lib/errors.js";
import { setMemberBan } from "@/lib/domain.js";
import { requireUser } from "@/lib/auth.js";

export const dynamic = "force-dynamic";

export function POST(request, { params }) {
  return handle(async () => {
    const { slug, userId } = await params;
    const payload = await request.json().catch(() => ({}));
    const result = await write((db) =>
      setMemberBan(db, requireUser(db, request), slug, userId, Boolean(payload.banned)),
    );
    return ok(result);
  });
}
