import { read, write } from "@/lib/store.js";
import { handle, ok } from "@/lib/errors.js";
import { createFoundItem, listFoundItems } from "@/lib/domain.js";
import { requireUser } from "@/lib/auth.js";

export const dynamic = "force-dynamic";

export function GET(request) {
  return handle(async () => {
    const url = new URL(request.url);
    return ok(
      listFoundItems(read(), {
        q: url.searchParams.get("q") ?? "",
        kind: url.searchParams.get("kind") ?? "",
      }),
    );
  });
}

export function POST(request) {
  return handle(async () => {
    const payload = await request.json().catch(() => ({}));
    const result = await write((db) =>
      createFoundItem(db, requireUser(db, request), payload),
    );
    return ok(result);
  });
}
