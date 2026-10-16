import { read, write } from "@/lib/store.js";
import { handle, ok } from "@/lib/errors.js";
import { createBoard, listBoards } from "@/lib/domain.js";
import { requireUser } from "@/lib/auth.js";

export const dynamic = "force-dynamic";

export function GET(request) {
  return handle(async () => {
    const db = read();
    const url = new URL(request.url);
    return ok(
      listBoards(db, {
        q: url.searchParams.get("q") ?? "",
        category: url.searchParams.get("category") ?? "",
      }),
    );
  });
}

export function POST(request) {
  return handle(async () => {
    const payload = await request.json().catch(() => ({}));
    const result = await write((db) => createBoard(db, requireUser(db, request), payload));
    return ok(result);
  });
}
