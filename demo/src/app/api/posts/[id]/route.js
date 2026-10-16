import { read } from "@/lib/store.js";
import { handle, ok } from "@/lib/errors.js";
import { postDetail } from "@/lib/domain.js";
import { currentUser } from "@/lib/auth.js";

export const dynamic = "force-dynamic";

export function GET(request, { params }) {
  return handle(async () => {
    const { id } = await params;
    const db = read();
    return ok(postDetail(db, id, currentUser(db, request)));
  });
}
