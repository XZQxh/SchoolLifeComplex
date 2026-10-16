const BASE = process.env.SMOKE_BASE ?? "http://127.0.0.1:3100";
const stamp = Date.now().toString().slice(-6);

let passed = 0;
let failed = 0;

function check(label, condition, detail = "") {
  if (condition) {
    passed += 1;
    console.log(`PASS  ${label}`);
  } else {
    failed += 1;
    console.log(`FAIL  ${label}${detail ? ` -> ${detail}` : ""}`);
  }
}

function sessionFrom(response) {
  const cookies = response.headers.getSetCookie?.() ?? [];
  const session = cookies.find((item) => item.startsWith("slc_session="));
  return session ? session.split(";")[0] : null;
}

async function call(path, { method = "GET", body, cookie } = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
      ...(cookie ? { Cookie: cookie } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await response.json().catch(() => null);
  return { status: response.status, json, session: sessionFrom(response) };
}

async function main() {
  const boardName = `冒烟测试板块${stamp}`;

  const anonymousBoards = await call("/api/boards");
  check("游客可浏览板块列表", anonymousBoards.status === 200 && anonymousBoards.json.ok);

  const registerA = await call("/api/auth/register", {
    method: "POST",
    body: { studentNo: `T${stamp}A`, name: "测试甲", password: "test1234" },
  });
  check("注册返回 200 并下发会话", registerA.status === 200 && Boolean(registerA.session));
  const cookieA = registerA.session;

  const duplicate = await call("/api/auth/register", {
    method: "POST",
    body: { studentNo: `T${stamp}A`, name: "重复", password: "test1234" },
  });
  check("重复学号注册被拒绝", duplicate.status === 409 && duplicate.json.error.code === "CONFLICT");

  const createBoard = await call("/api/boards", {
    method: "POST",
    cookie: cookieA,
    body: {
      name: boardName,
      description: "用于冒烟测试的板块，开启发帖审核。",
      category: "game",
      requireApproval: true,
    },
  });
  check("创建板块成功", createBoard.status === 200, JSON.stringify(createBoard.json));
  const slug = createBoard.json?.data?.board?.slug;

  const pendingBoard = await call(`/api/boards/${slug}/posts`, {
    method: "POST",
    cookie: cookieA,
    body: { title: "待审帖子", body: "开启审核后，这条帖子应先进入待审状态。" },
  });
  check(
    "开启审核的板块发帖进入待审",
    pendingBoard.json?.data?.post?.status === "pending",
    JSON.stringify(pendingBoard.json),
  );
  const pendingPostId = pendingBoard.json?.data?.post?.id;

  const authorView = await call(`/api/boards/${slug}`, { cookie: cookieA });
  check(
    "作者可见自己的待审帖",
    authorView.json?.data?.posts?.some((post) => post.id === pendingPostId) === true,
  );

  const guestView = await call(`/api/boards/${slug}`);
  check(
    "游客看不到待审帖",
    guestView.json?.data?.posts?.some((post) => post.id === pendingPostId) === false,
  );

  const registerB = await call("/api/auth/register", {
    method: "POST",
    body: { studentNo: `T${stamp}B`, name: "测试乙", password: "test1234" },
  });
  const cookieB = registerB.session;
  const userIdB = registerB.json?.data?.user?.id;
  check("第二个测试账号注册成功", Boolean(cookieB));

  const postBeforeJoin = await call(`/api/boards/${slug}/posts`, {
    method: "POST",
    cookie: cookieB,
    body: { title: "未加入就想发帖", body: "这条应当被拒绝。" },
  });
  check(
    "未加入板块不能发帖",
    postBeforeJoin.status === 403 && postBeforeJoin.json.error.code === "FORBIDDEN",
    JSON.stringify(postBeforeJoin.json),
  );

  const join = await call(`/api/boards/${slug}/join`, { method: "POST", cookie: cookieB });
  check("加入板块成功", join.status === 200, JSON.stringify(join.json));

  const postB = await call(`/api/boards/${slug}/posts`, {
    method: "POST",
    cookie: cookieB,
    body: { title: "测试乙的帖子", body: "用于验证举报与封禁流程。" },
  });
  const postBId = postB.json?.data?.post?.id;
  check("加入后可以发帖", Boolean(postBId));

  const approveA = await call(`/api/posts/${pendingPostId}/moderate`, {
    method: "POST",
    cookie: cookieA,
    body: { action: "approve" },
  });
  check("版主可通过待审帖子", approveA.json?.data?.post?.status === "published");

  const comment = await call(`/api/posts/${pendingPostId}/comments`, {
    method: "POST",
    cookie: cookieB,
    body: { body: "测试评论内容。" },
  });
  check("成员可以评论", comment.status === 200, JSON.stringify(comment.json));

  const like = await call(`/api/posts/${pendingPostId}/like`, { method: "POST", cookie: cookieB });
  check("成员可以点赞", like.json?.data?.liked === true);

  const report = await call("/api/reports", {
    method: "POST",
    cookie: cookieB,
    body: { targetType: "post", targetId: pendingPostId, reason: "冒烟测试举报" },
  });
  check("举报提交成功", report.status === 200 && report.json.data.merged === false);

  const mergeReport = await call("/api/reports", {
    method: "POST",
    cookie: cookieB,
    body: { targetType: "post", targetId: pendingPostId, reason: "重复举报同一内容" },
  });
  check("同一内容重复举报合并为一条", mergeReport.json?.data?.merged === true);

  const selfReport = await call("/api/reports", {
    method: "POST",
    cookie: cookieB,
    body: { targetType: "post", targetId: postBId, reason: "自己举报自己" },
  });
  check(
    "不能举报自己的内容",
    selfReport.status === 400 && selfReport.json.error.code === "VALIDATION",
    JSON.stringify(selfReport.json),
  );

  const queue = await call("/api/moderation/reports", { cookie: cookieA });
  const openReports = queue.json?.data?.reports ?? [];
  check("治理台出现举报", openReports.length === 1, JSON.stringify(queue.json));

  const reject = await call(`/api/moderation/reports/${openReports[0].id}`, {
    method: "POST",
    cookie: cookieA,
    body: { action: "reject" },
  });
  check("版主可驳回举报", reject.json?.data?.report?.status === "rejected");

  const queueAfterReject = await call("/api/moderation/reports", { cookie: cookieA });
  check("已驳回举报离开待处置队列", (queueAfterReject.json?.data?.reports ?? []).length === 0);

  const reportB = await call("/api/reports", {
    method: "POST",
    cookie: cookieA,
    body: { targetType: "post", targetId: postBId, reason: "测试封禁流程" },
  });
  check("版主可举报他人内容", reportB.status === 200, JSON.stringify(reportB.json));

  const queue2 = await call("/api/moderation/reports", { cookie: cookieA });
  const openReports2 = queue2.json?.data?.reports ?? [];
  check("治理台再次出现举报", openReports2.length === 1);

  const ban = await call(`/api/moderation/reports/${openReports2[0].id}`, {
    method: "POST",
    cookie: cookieA,
    body: { action: "ban" },
  });
  check("版主可封禁作者并结案", ban.json?.data?.report?.status === "resolved");

  const commentAfterBan = await call(`/api/posts/${pendingPostId}/comments`, {
    method: "POST",
    cookie: cookieB,
    body: { body: "被封禁后不应再能评论。" },
  });
  check(
    "被封禁的成员不能继续评论",
    commentAfterBan.status === 403 && commentAfterBan.json.error.code === "FORBIDDEN",
    JSON.stringify(commentAfterBan.json),
  );

  const unban = await call(`/api/boards/${slug}/members/${userIdB}/ban`, {
    method: "POST",
    cookie: cookieA,
    body: { banned: false },
  });
  check("版主可通过成员管理接口解封成员", unban.json?.data?.membership?.status === "active");

  const commentAfterUnban = await call(`/api/posts/${pendingPostId}/comments`, {
    method: "POST",
    cookie: cookieB,
    body: { body: "解封后可以正常评论。" },
  });
  check("解封后成员恢复评论权限", commentAfterUnban.status === 200);

  const queueAgain = await call("/api/moderation/reports", { cookie: cookieA });
  check("已处置举报从队列移除", (queueAgain.json?.data?.reports ?? []).length === 0);

  const guestCreateBoard = await call("/api/boards", {
    method: "POST",
    body: { name: `游客板块${stamp}`, description: "游客不应该能创建板块。", category: "other" },
  });
  check(
    "游客不能创建板块",
    guestCreateBoard.status === 401 && guestCreateBoard.json.error.code === "UNAUTHORIZED",
    JSON.stringify(guestCreateBoard.json),
  );

  const unverifiedOrg = await call("/api/orgs", {
    method: "POST",
    cookie: cookieA,
    body: { name: `未认证小组${stamp}`, kind: "group", description: "用于验证未认证组织不能认领板块。" },
  });
  const adminLogin = await call("/api/auth/login", {
    method: "POST",
    body: { studentNo: "000000", password: "admin123" },
  });
  const adminSession = adminLogin.session;
  check("管理员可以登录演示账号", Boolean(adminSession));

  check("申请组织入驻进入待认证状态", unverifiedOrg.json?.data?.organization?.verifyStatus === "pending");
  const unverifiedOrgId = unverifiedOrg.json?.data?.organization?.id;

  const claimBeforeVerify = await call(`/api/boards/${slug}/claim`, {
    method: "POST",
    cookie: cookieA,
    body: { organizationId: unverifiedOrgId },
  });
  check(
    "未认证组织不能认领板块",
    claimBeforeVerify.status === 403 && claimBeforeVerify.json.error.code === "FORBIDDEN",
    JSON.stringify(claimBeforeVerify.json),
  );

  const verifyOrg = await call(`/api/orgs/${unverifiedOrgId}/verify`, {
    method: "POST",
    cookie: adminSession,
    body: { verify: true },
  });
  check("管理员可认证组织", verifyOrg.json?.data?.organization?.verifyStatus === "verified");

  const claimBoard = await call(`/api/boards/${slug}/claim`, {
    method: "POST",
    cookie: cookieA,
    body: { organizationId: unverifiedOrgId },
  });
  check(
    "组织所有者可认领板块为官方阵地",
    claimBoard.json?.data?.board?.organizationId === unverifiedOrgId,
    JSON.stringify(claimBoard.json),
  );

  const claimTwice = await call(`/api/boards/${slug}/claim`, {
    method: "POST",
    cookie: cookieA,
    body: { organizationId: unverifiedOrgId },
  });
  check("重复认领同一板块直接通过（幂等）", claimTwice.status === 200);

  const foundItem = await call("/api/found-items", {
    method: "POST",
    cookie: cookieA,
    body: {
      kind: "found",
      title: "冒烟测试招领信息",
      description: "在图书馆门口捡到一把钥匙。",
      location: "图书馆门口",
      contact: "QQ 000000",
    },
  });
  const itemId = foundItem.json?.data?.item?.id;
  check("发布失物招领成功", Boolean(itemId));

  const claimSelf = await call(`/api/found-items/${itemId}/claim`, {
    method: "POST",
    cookie: cookieA,
  });
  check(
    "不能认领自己发布的信息",
    claimSelf.status === 400 && claimSelf.json.error.code === "VALIDATION",
    JSON.stringify(claimSelf.json),
  );

  const claim = await call(`/api/found-items/${itemId}/claim`, { method: "POST", cookie: cookieB });
  check("其他用户可认领", claim.json?.data?.item?.status === "claimed", JSON.stringify(claim.json));

  const claimAgain = await call(`/api/found-items/${itemId}/claim`, {
    method: "POST",
    cookie: cookieB,
  });
  check("已认领的信息不能重复认领", claimAgain.status === 409);

  const guestFound = await call("/api/found-items");
  check("游客可浏览失物招领", guestFound.status === 200 && guestFound.json.data.items.length > 0);

  const adminQueue = await call("/api/moderation/reports", { cookie: adminSession });
  check(
    "管理员看到全站范围",
    adminQueue.json?.data?.scope === "全站",
    JSON.stringify(adminQueue.json?.data?.scope),
  );

  console.log(`\n结果：${passed} 项通过，${failed} 项失败`);
  process.exit(failed === 0 ? 0 : 1);
}

main().catch((error) => {
  console.error("冒烟测试异常中断：", error);
  process.exit(1);
});
