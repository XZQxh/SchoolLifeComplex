import { read } from "@/lib/store.js";
import { handle, ok } from "@/lib/errors.js";
import { boardDetail } from "@/lib/domain.js";
import { currentUser } from "@/lib/auth.js";

export const dynamic = "force-dynamic";

export function GET(request, { params }) {
  return handle(async () => {
    const { slug } = await params;
    const db = read();
    return ok(boardDetail(db, slug, currentUser(db, request)));
  });
}
