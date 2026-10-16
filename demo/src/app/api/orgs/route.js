import { read, write } from "@/lib/store.js";
import { handle, ok } from "@/lib/errors.js";
import { createOrganization, listOrganizations } from "@/lib/domain.js";
import { requireUser } from "@/lib/auth.js";

export const dynamic = "force-dynamic";

export function GET() {
  return handle(async () => ok(listOrganizations(read())));
}

export function POST(request) {
  return handle(async () => {
    const payload = await request.json().catch(() => ({}));
    const result = await write((db) =>
      createOrganization(db, requireUser(db, request), payload),
    );
    return ok(result);
  });
}
