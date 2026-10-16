import { write } from "@/lib/store.js";
import { handle, ok } from "@/lib/errors.js";
import { createAnnouncement } from "@/lib/domain.js";
import { requireUser } from "@/lib/auth.js";

export const dynamic = "force-dynamic";

export function POST(request, { params }) {
  return handle(async () => {
    const { slug } = await params;
    const payload = await request.json().catch(() => ({}));
    const result = await write((db) =>
      createAnnouncement(db, requireUser(db, request), slug, payload),
    );
    return ok(result);
  });
}
