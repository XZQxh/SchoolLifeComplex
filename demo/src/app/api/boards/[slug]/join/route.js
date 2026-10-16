import { write } from "@/lib/store.js";
import { handle, ok } from "@/lib/errors.js";
import { joinBoard } from "@/lib/domain.js";
import { requireUser } from "@/lib/auth.js";

export const dynamic = "force-dynamic";

export function POST(request, { params }) {
  return handle(async () => {
    const { slug } = await params;
    const result = await write((db) => joinBoard(db, requireUser(db, request), slug));
    return ok(result);
  });
}
