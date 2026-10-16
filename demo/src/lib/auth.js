import { forbidden, unauthorized } from "./errors.js";
import { verifyPassword } from "./password.js";

export const SESSION_COOKIE = "slc_session";

export function sessionUserId(request) {
  return request.cookies?.get?.(SESSION_COOKIE)?.value ?? null;
}

export function findUser(db, userId) {
  if (!userId) return null;
  return db.users.find((user) => user.id === userId) ?? null;
}

export function currentUser(db, request) {
  return findUser(db, sessionUserId(request));
}

export function requireUser(db, request) {
  const user = currentUser(db, request);
  if (!user) throw unauthorized();
  return user;
}

export function findMembership(db, boardId, userId) {
  if (!userId) return null;
  return db.memberships.find((m) => m.boardId === boardId && m.userId === userId) ?? null;
}

export function isModerator(db, boardId, user) {
  if (!user) return false;
  if (user.role === "admin") return true;
  const membership = findMembership(db, boardId, user.id);
  return Boolean(membership && membership.role === "moderator");
}

export function requireMembership(db, request, boardId) {
  const user = requireUser(db, request);
  if (user.role === "admin") return { user, membership: null };
  const membership = findMembership(db, boardId, user.id);
  if (!membership) throw forbidden("需要先加入该板块");
  if (membership.status === "banned") throw forbidden("你已被该板块封禁");
  return { user, membership };
}

export function requireModerator(db, request, boardId) {
  const user = requireUser(db, request);
  if (!isModerator(db, boardId, user)) throw forbidden("需要版主权限");
  return user;
}

export function verifyCredentials(user, password) {
  return Boolean(user) && verifyPassword(password, user.passwordHash);
}

export function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    name: user.name,
    role: user.role,
    verifyStatus: user.verifyStatus,
    reputation: user.reputation,
  };
}

export function setSessionCookie(response, userId) {
  response.headers.append(
    "Set-Cookie",
    `${SESSION_COOKIE}=${userId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800`,
  );
  return response;
}

export function clearSessionCookie(response) {
  response.headers.append(
    "Set-Cookie",
    `${SESSION_COOKIE}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`,
  );
  return response;
}
