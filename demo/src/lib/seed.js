import crypto from "node:crypto";
import { hashPassword } from "./password.js";

function makeSlug(name, seed) {
  const suffix = crypto.createHash("sha256").update(`${name}:${seed}`).digest("hex").slice(0, 8);
  return `board-${suffix}`;
}

export function createSeedDatabase() {
  const now = new Date().toISOString();

  const users = [
    {
      id: "u_1",
      studentNo: "000000",
      name: "平台管理员",
      passwordHash: hashPassword("admin123", "seedadminsalt"),
      role: "admin",
      verifyStatus: "verified",
      reputation: 100,
      createdAt: now,
    },
    {
      id: "u_2",
      studentNo: "20230101",
      name: "林一诺",
      passwordHash: hashPassword("student123", "seedusersalt1"),
      role: "student",
      verifyStatus: "verified",
      reputation: 100,
      createdAt: now,
    },
    {
      id: "u_3",
      studentNo: "20230102",
      name: "周子航",
      passwordHash: hashPassword("student123", "seedusersalt2"),
      role: "student",
      verifyStatus: "pending",
      reputation: 98,
      createdAt: now,
    },
    {
      id: "u_4",
      studentNo: "20230103",
      name: "陈砚宁",
      passwordHash: hashPassword("student123", "seedusersalt3"),
      role: "student",
      verifyStatus: "none",
      reputation: 100,
      createdAt: now,
    },
  ];

  const organizations = [
    {
      id: "o_1",
      name: "星轨动漫社",
      kind: "club",
      description: "校团委备案社团，日常活动为番剧放映、同人创作与漫展出行。",
      ownerUserId: "u_2",
      verifyStatus: "verified",
      verifiedAt: now,
      createdAt: now,
    },
    {
      id: "o_2",
      name: "王者荣耀开黑小组",
      kind: "group",
      description: "自建开黑小组，每晚八点固定组队，周末打排位。",
      ownerUserId: "u_3",
      verifyStatus: "pending",
      verifiedAt: null,
      createdAt: now,
    },
  ];

  const boards = [
    {
      id: "b_1",
      slug: makeSlug("星轨动漫社", "1"),
      name: "星轨动漫社",
      description: "动漫社的官方阵地：活动通知、番剧讨论、同人作品与招新信息。",
      category: "anime",
      requireApproval: false,
      ownerUserId: "u_2",
      organizationId: "o_1",
      createdAt: now,
    },
    {
      id: "b_2",
      slug: makeSlug("王者荣耀开黑小组", "2"),
      name: "王者荣耀开黑小组",
      description: "组队开黑、英雄攻略、段位交流。进群先看置顶公告。",
      category: "game",
      requireApproval: true,
      ownerUserId: "u_3",
      organizationId: "o_2",
      createdAt: now,
    },
    {
      id: "b_3",
      slug: makeSlug("考研自习室", "3"),
      name: "考研自习室",
      description: "自习打卡、资料分享、择校讨论。内容需要版主审核后显示。",
      category: "study",
      requireApproval: true,
      ownerUserId: "u_2",
      organizationId: null,
      createdAt: now,
    },
  ];

  const memberships = [
    { id: "m_1", boardId: "b_1", userId: "u_2", role: "moderator", status: "active", joinedAt: now },
    { id: "m_2", boardId: "b_1", userId: "u_3", role: "member", status: "active", joinedAt: now },
    { id: "m_3", boardId: "b_2", userId: "u_3", role: "moderator", status: "active", joinedAt: now },
    { id: "m_4", boardId: "b_2", userId: "u_4", role: "member", status: "active", joinedAt: now },
    { id: "m_5", boardId: "b_3", userId: "u_2", role: "moderator", status: "active", joinedAt: now },
  ];

  const posts = [
    {
      id: "p_1",
      boardId: "b_1",
      authorId: "u_2",
      title: "秋招新进度与本周放映安排",
      body: "本周五晚七点在活动中心 302 放映《春宵苦短，少女前进吧》。招新摊位已确认在军训场东侧，报名表见公告区。第一次参加的同学直接在帖子里留言即可，我们会拉你进小组。",
      status: "published",
      likeCount: 3,
      createdAt: now,
    },
    {
      id: "p_2",
      boardId: "b_1",
      authorId: "u_3",
      title: "同人图存档：去年漫展的展位布置",
      body: "把去年漫展我们展位的照片和布置方案整理在这里，方便今年直接复用。主要经验是灯带要提前两天试电，展板高度别超过一米五。",
      status: "published",
      likeCount: 5,
      createdAt: now,
    },
    {
      id: "p_3",
      boardId: "b_2",
      authorId: "u_3",
      title: "新赛季打野节奏整理",
      body: "开局两分钟优先拿河道蟹，四分钟左右看对面打野动向决定是否反蹲。这份笔记是新赛季改版后的思路，欢迎补充。",
      status: "pending",
      likeCount: 0,
      createdAt: now,
    },
  ];

  const comments = [
    {
      id: "c_1",
      postId: "p_1",
      authorId: "u_3",
      body: "周五我有课到六点半，可能晚到十分钟。",
      status: "published",
      createdAt: now,
    },
    {
      id: "c_2",
      postId: "p_1",
      authorId: "u_4",
      body: "第一次参加，需要自带什么东西吗？",
      status: "published",
      createdAt: now,
    },
  ];

  const reactions = [
    { id: "r_1", postId: "p_1", userId: "u_3" },
    { id: "r_2", postId: "p_1", userId: "u_4" },
    { id: "r_3", postId: "p_2", userId: "u_4" },
  ];

  const announcements = [
    {
      id: "an_1",
      boardId: "b_1",
      authorId: "u_2",
      title: "招新报名截止到本月 20 日",
      body: "线上报名截止本月 20 日，之后转入线下面谈。报名时请写明想参加的创作方向。",
      createdAt: now,
    },
  ];

  const foundItems = [
    {
      id: "f_1",
      kind: "found",
      title: "在图书馆三楼捡到一张校园卡",
      description: "卡面姓名为陈同学，专业与学号已拍照留证，请本人联系我核对。",
      location: "图书馆三楼自习区",
      contact: "QQ 1234567",
      status: "open",
      authorId: "u_2",
      claimedBy: null,
      createdAt: now,
    },
    {
      id: "f_2",
      kind: "lost",
      title: "丢了一副黑色有线耳机",
      description: "耳机盒上有贴纸，大概在体育馆到六号教学楼的路上丢的。",
      location: "体育馆至六号教学楼",
      contact: "微信 chenyn",
      status: "open",
      authorId: "u_4",
      claimedBy: null,
      createdAt: now,
    },
  ];

  return {
    meta: { seq: { u: 4, o: 2, b: 3, m: 5, p: 3, c: 2, r: 3, rp: 0, an: 1, f: 2, sub: 0 } },
    users,
    organizations,
    boards,
    memberships,
    posts,
    comments,
    reactions,
    reports: [],
    announcements,
    foundItems,
    subscriptions: [],
  };
}
