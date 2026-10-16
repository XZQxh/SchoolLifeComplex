import { write } from "@/lib/store.js";
import { handle, ok } from "@/lib/errors.js";
import { closeFoundItem } from "@/lib/domain.js";
import { requireUser } from "@/lib/auth.js";

export const dynamic = "force-dynamic";

export function POST(request, { params }) {
  return handle(async () => {
    const { id } = await params;
    const result = await write((db) => closeFoundItem(db, requireUser(db, request), id));
    return ok(result);
  });
}
