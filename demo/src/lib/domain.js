import crypto from "node:crypto";
import { nextId } from "./store.js";
import { badRequest, conflict, forbidden, notFound } from "./errors.js";
import {
  findMembership,
  findUser,
  isModerator,
  publicUser,
  verifyCredentials,
} from "./auth.js";
import { hashPassword } from "./password.js";

const CATEGORIES = ["game", "anime", "sports", "study", "life", "other"];
const ORG_KINDS = ["club", "group"];

/* ---------- 通用校验 ---------- */

function requireText(value, label, { min = 1, max = 2000 } = {}) {
  const text = typeof value === "string" ? value.trim() : "";
  if (text.length < min) throw badRequest(`${label}不能为空`);
  if (text.length > max) throw badRequest(`${label}不能超过 ${max} 个字符`);
  return text;
}

function slugForBoard(name) {
  const suffix = crypto
    .createHash("sha256")
    .update(`${name}:${Date.now()}:${Math.random()}`)
    .digest("hex")
    .slice(0, 8);
  return `board-${suffix}`;
}

function toIso() {
  return new Date().toISOString();
}

/* ---------- 查询辅助 ---------- */

function boardBySlug(db, slug) {
  const board = db.boards.find((b) => b.slug === slug);
  if (!board) throw notFound("板块不存在");
  return board;
}

function boardById(db, boardId) {
  const board = db.boards.find((b) => b.id === boardId);
  if (!board) throw notFound("板块不存在");
  return board;
}

function userName(db, userId) {
  return findUser(db, userId)?.name ?? "已注销用户";
}

function memberCount(db, boardId) {
  return db.memberships.filter((m) => m.boardId === boardId && m.status === "active").length;
}

function canViewPost(post, db, user, membership) {
  if (post.status === "published") return true;
  if (post.status === "removed") return user?.role === "admin";
  if (!user) return false;
  if (post.authorId === user.id) return true;
  return isModerator(db, post.boardId, user) || (membership?.role === "moderator");
}

function decoratePost(db, post, user) {
  const commentCount = db.comments.filter(
    (c) => c.postId === post.id && c.status === "published",
  ).length;
  return {
    ...post,
    authorName: userName(db, post.authorId),
    commentCount,
    likedByMe: Boolean(user && db.reactions.some((r) => r.postId === post.id && r.userId === user.id)),
  };
}

/* ---------- M1 身份与准入 ---------- */

export function register(db, payload) {
  const studentNo = requireText(payload.studentNo, "学号", { min: 4, max: 20 });
  if (!/^[0-9A-Za-z]+$/.test(studentNo)) throw badRequest("学号只能包含数字与字母");
  const name = requireText(payload.name, "姓名", { min: 1, max: 20 });
  const password = typeof payload.password === "string" ? payload.password : "";
  if (password.length < 6 || password.length > 64) throw badRequest("密码长度需在 6 到 64 位之间");
  if (db.users.some((u) => u.studentNo === studentNo)) throw conflict("该学号已注册");

  const user = {
    id: nextId(db, "u"),
    studentNo,
    name,
    passwordHash: hashPassword(password),
    role: "student",
    verifyStatus: "none",
    reputation: 100,
    createdAt: toIso(),
  };
  db.users.push(user);
  return { user: publicUser(user) };
}

export function login(db, payload) {
  const studentNo = requireText(payload.studentNo, "学号");
  const password = typeof payload.password === "string" ? payload.password : "";
  const user = db.users.find((u) => u.studentNo === studentNo);
  if (!verifyCredentials(user, password)) throw badRequest("学号或密码错误");
  return { user: publicUser(user) };
}

export function me(db, user) {
  return { user: publicUser(user) };
}

/* ---------- M2 兴趣板块 ---------- */

export function listBoards(db, { q = "", category = "" } = {}) {
  const keyword = q.trim().toLowerCase();
  const boards = db.boards
    .filter((board) => {
      if (category && board.category !== category) return false;
      if (!keyword) return true;
      return (
        board.name.toLowerCase().includes(keyword) ||
        board.description.toLowerCase().includes(keyword)
      );
    })
    .map((board) => {
      const organization = db.organizations.find((o) => o.id === board.organizationId) ?? null;
      return {
        id: board.id,
        slug: board.slug,
        name: board.name,
        description: board.description,
        category: board.category,
        requireApproval: board.requireApproval,
        memberCount: memberCount(db, board.id),
        postCount: db.posts.filter((p) => p.boardId === board.id && p.status === "published").length,
        organization: organization
          ? { id: organization.id, name: organization.name, verifyStatus: organization.verifyStatus }
          : null,
      };
    })
    .sort((a, b) => b.postCount - a.postCount || b.memberCount - a.memberCount);

  return { boards, categories: CATEGORIES };
}

export function createBoard(db, user, payload) {
  const name = requireText(payload.name, "板块名称", { min: 2, max: 30 });
  const description = requireText(payload.description, "板块简介", { min: 4, max: 200 });
  const category = CATEGORIES.includes(payload.category) ? payload.category : "other";
  if (db.boards.some((b) => b.name === name)) throw conflict("板块名称已存在");

  const board = {
    id: nextId(db, "b"),
    slug: slugForBoard(name),
    name,
    description,
    category,
    requireApproval: Boolean(payload.requireApproval),
    ownerUserId: user.id,
    organizationId: null,
    createdAt: toIso(),
  };
  db.boards.push(board);
  db.memberships.push({
    id: nextId(db, "m"),
    boardId: board.id,
    userId: user.id,
    role: "moderator",
    status: "active",
    joinedAt: toIso(),
  });
  return { board };
}

export function boardDetail(db, slug, user) {
  const board = boardBySlug(db, slug);
  const organization = db.organizations.find((o) => o.id === board.organizationId) ?? null;
  const membership = findMembership(db, board.id, user?.id);
  const posts = db.posts
    .filter((p) => p.boardId === board.id && canViewPost(p, db, user, membership))
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .map((p) => decoratePost(db, p, user));
  const announcements = db.announcements
    .filter((a) => a.boardId === board.id)
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .map((a) => ({ ...a, authorName: userName(db, a.authorId) }));

  return {
    board: { ...board, memberCount: memberCount(db, board.id), postCount: posts.length },
    organization,
    membership: membership
      ? { role: membership.role, status: membership.status }
      : null,
    canPost: Boolean(user) && (user.role === "admin" || membership?.status === "active"),
    posts,
    announcements,
  };
}

export function joinBoard(db, user, slug) {
  const board = boardBySlug(db, slug);
  const existing = findMembership(db, board.id, user.id);
  if (existing) {
    if (existing.status === "banned") throw forbidden("你已被该板块封禁");
    throw conflict("你已经加入该板块");
  }
  const membership = {
    id: nextId(db, "m"),
    boardId: board.id,
    userId: user.id,
    role: "member",
    status: "active",
    joinedAt: toIso(),
  };
  db.memberships.push(membership);
  return { membership: { role: membership.role, status: membership.status } };
}

export function setMemberBan(db, actor, slug, targetUserId, banned) {
  const board = boardBySlug(db, slug);
  if (!isModerator(db, board.id, actor)) throw forbidden("需要版主权限");
  if (targetUserId === actor.id) throw badRequest("不能封禁自己");
  const membership = findMembership(db, board.id, targetUserId);
  if (!membership) throw notFound("该用户不是本板块成员");
  membership.status = banned ? "banned" : "active";
  return { membership: { userId: membership.userId, status: membership.status } };
}

/* ---------- M3 内容与互动 ---------- */

export function createPost(db, user, slug, payload) {
  const board = boardBySlug(db, slug);
  const title = requireText(payload.title, "标题", { min: 2, max: 80 });
  const body = requireText(payload.body, "正文", { min: 2, max: 5000 });
  const membership = findMembership(db, board.id, user.id);
  if (user.role !== "admin") {
    if (!membership) throw forbidden("需要先加入该板块");
    if (membership.status === "banned") throw forbidden("你已被该板块封禁");
  }

  const post = {
    id: nextId(db, "p"),
    boardId: board.id,
    authorId: user.id,
    title,
    body,
    status: board.requireApproval ? "pending" : "published",
    likeCount: 0,
    createdAt: toIso(),
  };
  db.posts.push(post);
  return { post: decoratePost(db, post, user) };
}

export function postDetail(db, postId, user) {
  const post = db.posts.find((p) => p.id === postId);
  if (!post) throw notFound("帖子不存在");
  const board = boardById(db, post.boardId);
  const membership = findMembership(db, board.id, user?.id);
  if (!canViewPost(post, db, user, membership)) throw notFound("帖子不存在");

  const canModerate = isModerator(db, board.id, user);
  const comments = db.comments
    .filter((c) => c.postId === post.id && (c.status === "published" || canModerate))
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1))
    .map((c) => ({ ...c, authorName: userName(db, c.authorId) }));

  return {
    post: decoratePost(db, post, user),
    board: { id: board.id, slug: board.slug, name: board.name },
    comments,
    canInteract: Boolean(user) && (user.role === "admin" || membership?.status === "active"),
    canModerate,
  };
}

export function createComment(db, user, postId, payload) {
  const post = db.posts.find((p) => p.id === postId);
  if (!post || post.status === "removed") throw notFound("帖子不存在");
  const body = requireText(payload.body, "评论内容", { min: 1, max: 1000 });
  const membership = findMembership(db, post.boardId, user.id);
  if (user.role !== "admin") {
    if (!membership) throw forbidden("需要先加入该板块");
    if (membership.status === "banned") throw forbidden("你已被该板块封禁");
  }
  const comment = {
    id: nextId(db, "c"),
    postId,
    authorId: user.id,
    body,
    status: "published",
    createdAt: toIso(),
  };
  db.comments.push(comment);
  return { comment: { ...comment, authorName: userName(db, comment.authorId) } };
}

export function toggleLike(db, user, postId) {
  const post = db.posts.find((p) => p.id === postId);
  if (!post || post.status === "removed") throw notFound("帖子不存在");
  const membership = findMembership(db, post.boardId, user.id);
  if (user.role !== "admin" && (!membership || membership.status !== "active")) {
    throw forbidden("需要先加入该板块");
  }
  const index = db.reactions.findIndex((r) => r.postId === postId && r.userId === user.id);
  if (index >= 0) {
    db.reactions.splice(index, 1);
    post.likeCount = Math.max(0, post.likeCount - 1);
    return { liked: false, likeCount: post.likeCount };
  }
  db.reactions.push({ id: nextId(db, "r"), postId, userId: user.id });
  post.likeCount += 1;
  return { liked: true, likeCount: post.likeCount };
}

export function moderatePost(db, actor, postId, action) {
  const post = db.posts.find((p) => p.id === postId);
  if (!post) throw notFound("帖子不存在");
  if (!isModerator(db, post.boardId, actor)) throw forbidden("需要版主权限");

  if (action === "approve") {
    if (post.status !== "pending" && post.status !== "rejected") {
      throw badRequest("当前状态不能审核通过");
    }
    post.status = "published";
  } else if (action === "reject") {
    if (post.status !== "pending") throw badRequest("只有待审帖子可以驳回");
    post.status = "rejected";
  } else if (action === "remove") {
    if (post.status === "removed") throw badRequest("帖子已被删除");
    post.status = "removed";
  } else {
    throw badRequest("未知的审核动作");
  }
  return { post: decoratePost(db, post, actor) };
}

/* ---------- M4 组织与活动 ---------- */

export function listOrganizations(db) {
  const organizations = db.organizations.map((org) => ({
    ...org,
    ownerName: userName(db, org.ownerUserId),
    boardCount: db.boards.filter((b) => b.organizationId === org.id).length,
  }));
  return { organizations };
}

export function createOrganization(db, user, payload) {
  const name = requireText(payload.name, "组织名称", { min: 2, max: 30 });
  const description = requireText(payload.description, "组织简介", { min: 4, max: 200 });
  const kind = ORG_KINDS.includes(payload.kind) ? payload.kind : "group";
  if (db.organizations.some((o) => o.name === name)) throw conflict("组织名称已存在");
  const organization = {
    id: nextId(db, "o"),
    name,
    kind,
    description,
    ownerUserId: user.id,
    verifyStatus: "pending",
    verifiedAt: null,
    createdAt: toIso(),
  };
  db.organizations.push(organization);
  return { organization };
}

export function verifyOrganization(db, actor, organizationId, verify) {
  if (actor.role !== "admin") throw forbidden("只有平台管理员可以认证组织");
  const organization = db.organizations.find((o) => o.id === organizationId);
  if (!organization) throw notFound("组织不存在");
  organization.verifyStatus = verify ? "verified" : "rejected";
  organization.verifiedAt = verify ? toIso() : null;
  return { organization };
}

export function claimBoard(db, user, slug, organizationId) {
  const board = boardBySlug(db, slug);
  const organization = db.organizations.find((o) => o.id === organizationId);
  if (!organization) throw notFound("组织不存在");
  if (organization.ownerUserId !== user.id) throw forbidden("只有该组织的所有者可以认领板块");
  if (organization.verifyStatus !== "verified") throw forbidden("组织尚未通过认证");
  if (!isModerator(db, board.id, user)) throw forbidden("只有本板块版主可以认领板块");
  if (board.organizationId && board.organizationId !== organization.id) {
    throw conflict("该板块已被其他组织认领");
  }
  board.organizationId = organization.id;
  return { board: { id: board.id, slug: board.slug, organizationId: board.organizationId } };
}

export function createAnnouncement(db, actor, slug, payload) {
  const board = boardBySlug(db, slug);
  if (!isModerator(db, board.id, actor)) throw forbidden("需要版主权限");
  const title = requireText(payload.title, "公告标题", { min: 2, max: 80 });
  const body = requireText(payload.body, "公告内容", { min: 2, max: 2000 });
  const announcement = {
    id: nextId(db, "an"),
    boardId: board.id,
    authorId: actor.id,
    title,
    body,
    createdAt: toIso(),
  };
  db.announcements.push(announcement);
  return { announcement };
}

/* ---------- 治理 ---------- */

function reportTarget(db, targetType, targetId) {
  if (targetType === "post") {
    const post = db.posts.find((p) => p.id === targetId);
    if (!post) throw notFound("举报目标不存在");
    return { kind: post, boardId: post.boardId, authorId: post.authorId, excerpt: post.title };
  }
  if (targetType === "comment") {
    const comment = db.comments.find((c) => c.id === targetId);
    if (!comment) throw notFound("举报目标不存在");
    const post = db.posts.find((p) => p.id === comment.postId);
    return {
      kind: comment,
      boardId: post?.boardId ?? "",
      authorId: comment.authorId,
      excerpt: comment.body.slice(0, 40),
    };
  }
  throw badRequest("举报目标类型不合法");
}

export function createReport(db, user, payload) {
  const reason = requireText(payload.reason, "举报原因", { min: 2, max: 200 });
  const target = reportTarget(db, payload.targetType, payload.targetId);
  if (target.authorId === user.id) throw badRequest("不能举报自己发布的内容");
  if (target.kind.status === "removed") throw badRequest("该内容已被删除");

  const existing = db.reports.find(
    (r) =>
      r.targetType === payload.targetType &&
      r.targetId === payload.targetId &&
      r.status === "open",
  );
  if (existing) {
    existing.reason = `${existing.reason}；${user.name}：${reason}`;
    existing.reporterIds.push(user.id);
    return { report: existing, merged: true };
  }

  const report = {
    id: nextId(db, "rp"),
    targetType: payload.targetType,
    targetId: payload.targetId,
    boardId: target.boardId,
    reporterId: user.id,
    reporterIds: [user.id],
    reason,
    status: "open",
    handledBy: null,
    handledAt: null,
    action: null,
    excerpt: target.excerpt,
    createdAt: toIso(),
  };
  db.reports.push(report);
  return { report, merged: false };
}

export function listModeration(db, user) {
  const boardIds =
    user.role === "admin"
      ? db.boards.map((b) => b.id)
      : db.memberships
          .filter((m) => m.userId === user.id && m.role === "moderator")
          .map((m) => m.boardId);

  const reports = db.reports
    .filter((r) => r.status === "open" && boardIds.includes(r.boardId))
    .map((r) => ({
      ...r,
      boardName: db.boards.find((b) => b.id === r.boardId)?.name ?? "未知板块",
      reporterName: userName(db, r.reporterId),
      targetAuthorName: userName(
        db,
        r.targetType === "post"
          ? db.posts.find((p) => p.id === r.targetId)?.authorId
          : db.comments.find((c) => c.id === r.targetId)?.authorId,
      ),
    }));

  const pendingPosts = db.posts
    .filter((p) => p.status === "pending" && boardIds.includes(p.boardId))
    .map((p) => ({ ...decoratePost(db, p, user), boardName: db.boards.find((b) => b.id === p.boardId)?.name }));

  const organizations =
    user.role === "admin"
      ? db.organizations.filter((o) => o.verifyStatus === "pending")
      : [];

  return {
    reports,
    pendingPosts,
    organizations,
    scope: user.role === "admin" ? "全站" : "我管理的板块",
    boardNames: db.boards.filter((b) => boardIds.includes(b.id)).map((b) => b.name),
  };
}

export function resolveReport(db, actor, reportId, action) {
  const report = db.reports.find((r) => r.id === reportId);
  if (!report) throw notFound("举报记录不存在");
  if (report.status !== "open") throw badRequest("该举报已处置");
  if (!isModerator(db, report.boardId, actor)) throw forbidden("无权处置该板块的举报");

  if (action === "remove") {
    if (report.targetType === "post") {
      const post = db.posts.find((p) => p.id === report.targetId);
      if (post) post.status = "removed";
    } else {
      const comment = db.comments.find((c) => c.id === report.targetId);
      if (comment) comment.status = "removed";
    }
    report.status = "resolved";
  } else if (action === "ban") {
    const target = reportTarget(db, report.targetType, report.targetId);
    const membership = findMembership(db, report.boardId, target.authorId);
    if (!membership) throw badRequest("目标作者不是本板块成员，无法封禁");
    membership.status = "banned";
    report.status = "resolved";
  } else if (action === "reject") {
    report.status = "rejected";
  } else {
    throw badRequest("未知的处置动作");
  }

  report.action = action;
  report.handledBy = actor.id;
  report.handledAt = toIso();
  return { report };
}

/* ---------- M5 信息互助 ---------- */

export function listFoundItems(db, { q = "", kind = "" } = {}) {
  const keyword = q.trim().toLowerCase();
  const items = db.foundItems
    .filter((item) => {
      if (kind && item.kind !== kind) return false;
      if (!keyword) return true;
      return (
        item.title.toLowerCase().includes(keyword) ||
        item.description.toLowerCase().includes(keyword) ||
        item.location.toLowerCase().includes(keyword)
      );
    })
    .sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
    .map((item) => ({ ...item, authorName: userName(db, item.authorId) }));
  return { items };
}

export function createFoundItem(db, user, payload) {
  const kind = payload.kind === "lost" ? "lost" : "found";
  const title = requireText(payload.title, "标题", { min: 2, max: 80 });
  const description = requireText(payload.description, "描述", { min: 2, max: 1000 });
  const location = requireText(payload.location, "地点", { min: 2, max: 60 });
  const contact = requireText(payload.contact, "联系方式", { min: 2, max: 60 });
  const item = {
    id: nextId(db, "f"),
    kind,
    title,
    description,
    location,
    contact,
    status: "open",
    authorId: user.id,
    claimedBy: null,
    createdAt: toIso(),
  };
  db.foundItems.push(item);
  return { item };
}

export function claimFoundItem(db, user, itemId) {
  const item = db.foundItems.find((i) => i.id === itemId);
  if (!item) throw notFound("信息不存在");
  if (item.status !== "open") throw conflict("该信息已认领或已关闭");
  if (item.authorId === user.id) throw badRequest("不能认领自己发布的信息");
  item.status = "claimed";
  item.claimedBy = user.id;
  return { item: { ...item, contactFrom: userName(db, item.authorId) } };
}

export function closeFoundItem(db, user, itemId) {
  const item = db.foundItems.find((i) => i.id === itemId);
  if (!item) throw notFound("信息不存在");
  if (item.authorId !== user.id && user.role !== "admin") throw forbidden("只有发布者可以关闭");
  if (item.status === "closed") throw badRequest("该信息已关闭");
  item.status = "closed";
  return { item };
}
