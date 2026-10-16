import { read } from "@/lib/store.js";
import { handle, ok } from "@/lib/errors.js";
import { me } from "@/lib/domain.js";
import { currentUser } from "@/lib/auth.js";

export const dynamic = "force-dynamic";

export function GET(request) {
  return handle(async () => {
    const db = read();
    return ok(me(db, currentUser(db, request)));
  });
}
