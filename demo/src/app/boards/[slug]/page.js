"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, Megaphone, MessageSquare, ThumbsUp, Users } from "lucide-react";
import { CATEGORY_LABELS, POST_STATUS_LABELS, apiFetch, formatTime } from "@/lib/client";

export default function BoardPage() {
  const params = useParams();
  const slug = params.slug;
  const [detail, setDetail] = useState(null);
  const [me, setMe] = useState(null);
  const [organizations, setOrganizations] = useState([]);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [postForm, setPostForm] = useState({ title: "", body: "" });
  const [announcement, setAnnouncement] = useState({ title: "", body: "" });

  const load = useCallback(async () => {
    try {
      const [detailData, meData] = await Promise.all([
        apiFetch(`/api/boards/${slug}`),
        apiFetch("/api/me").catch(() => ({ user: null })),
      ]);
      setDetail(detailData);
      setMe(meData.user);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }, [slug]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    apiFetch("/api/orgs")
      .then((data) => setOrganizations(data.organizations))
      .catch(() => setOrganizations([]));
  }, []);

  const isModerator =
    me?.role === "admin" ||
    (detail?.membership?.role === "moderator" && detail?.membership?.status === "active");

  async function run(action, successMessage) {
    setNotice("");
    setError("");
    try {
      await action();
      await load();
      if (successMessage) setNotice(successMessage);
    } catch (err) {
      setError(err.message);
    }
  }

  if (error && !detail) {
    return (
      <div className="stack">
        <div className="notice notice--error">{error}</div>
        <Link href="/" className="btn btn--ghost">
          返回板块发现
        </Link>
      </div>
    );
  }

  if (!detail) {
    return <div className="empty">正在加载板块</div>;
  }

  const { board, organization, membership, canPost, posts, announcements } = detail;
  const visiblePosts = posts.filter((post) =>
    isModerator ? post.status !== "removed" : post.status === "published",
  );
  const claimableOrganizations = organizations.filter(
    (org) => org.ownerUserId === me?.id && org.verifyStatus === "verified",
  );

  return (
    <div className="stack" style={{ gap: 18 }}>
      <div className="page-head">
        <div>
          <div className="row">
            <h1 className="page-title detail-title">{board.name}</h1>
            <span className="tag tag--muted">
              {CATEGORY_LABELS[board.category] ?? CATEGORY_LABELS.other}
            </span>
            {organization?.verifyStatus === "verified" ? (
              <span className="tag tag--verified">
                <BadgeCheck size={13} aria-hidden />
                {organization.name}
              </span>
            ) : null}
          </div>
          <p className="page-sub">{board.description}</p>
          <div className="list-item__meta">
            <span className="metric">
              <Users size={13} aria-hidden />
              {board.memberCount} 名成员
            </span>
            <span>{board.postCount} 篇帖子</span>
            {board.requireApproval ? <span className="tag tag--warn">发帖需审核</span> : null}
            {membership ? (
              <span className="tag tag--accent">
                {membership.role === "moderator" ? "我是版主" : "已加入"}
              </span>
            ) : null}
          </div>
        </div>

        <div className="row">
          {!me ? (
            <Link href="/login" className="btn">
              登录后加入
            </Link>
          ) : membership ? null : (
            <button
              type="button"
              className="btn"
              onClick={() =>
                run(() => apiFetch(`/api/boards/${slug}/join`, { method: "POST" }), "已加入板块")
              }
            >
              加入板块
            </button>
          )}
        </div>
      </div>

      {notice ? <div className="notice notice--ok">{notice}</div> : null}
      {error && detail ? <div className="notice notice--error">{error}</div> : null}

      <div className="two-col">
        <div className="stack">
          <div className="card card--flat">
            <div className="section-head">
              <span className="section-title">发布新帖</span>
              {board.requireApproval ? (
                <span className="tag tag--warn">需版主审核后公开</span>
              ) : null}
            </div>
            {canPost ? (
              <form
                className="stack"
                onSubmit={(event) => {
                  event.preventDefault();
                  run(async () => {
                    const data = await apiFetch(`/api/boards/${slug}/posts`, {
                      method: "POST",
                      body: postForm,
                    });
                    setPostForm({ title: "", body: "" });
                    return data;
                  }, "帖子已提交");
                }}
              >
                <div className="field">
                  <label className="field-label" htmlFor="post-title">
                    标题
                  </label>
                  <input
                    id="post-title"
                    className="input"
                    value={postForm.title}
                    maxLength={80}
                    onChange={(event) => setPostForm({ ...postForm, title: event.target.value })}
                    required
                  />
                </div>
                <div className="field">
                  <label className="field-label" htmlFor="post-body">
                    正文
                  </label>
                  <textarea
                    id="post-body"
                    className="textarea"
                    value={postForm.body}
                    maxLength={5000}
                    onChange={(event) => setPostForm({ ...postForm, body: event.target.value })}
                    required
                  />
                </div>
                <div className="row">
                  <button type="submit" className="btn">
                    发布
                  </button>
                </div>
              </form>
            ) : (
              <p className="muted small">
                {me ? "加入该板块后即可发帖。" : "登录并加入该板块后即可发帖。"}
              </p>
            )}
          </div>

          <div className="stack">
            <div className="section-head">
              <span className="section-title">帖子</span>
              <span className="muted small">{visiblePosts.length} 篇</span>
            </div>

            {visiblePosts.length === 0 ? (
              <div className="empty">这个板块还没有帖子</div>
            ) : (
              visiblePosts.map((post) => (
                <div
                  key={post.id}
                  className="list-item list-item--static stack"
                  style={{ gap: 10 }}
                >
                  <div className="list-item__head">
                    <Link href={`/posts/${post.id}`} className="list-item__title">
                      {post.title}
                    </Link>
                    {post.status !== "published" ? (
                      <span
                        className={post.status === "pending" ? "tag tag--warn" : "tag tag--danger"}
                      >
                        {POST_STATUS_LABELS[post.status]}
                      </span>
                    ) : null}
                  </div>
                  <p className="excerpt">{post.body.slice(0, 120)}</p>
                  <div className="list-item__meta">
                    <span>{post.authorName}</span>
                    <span>{formatTime(post.createdAt)}</span>
                    <span className="metric">
                      <ThumbsUp size={13} aria-hidden />
                      {post.likeCount}
                    </span>
                    <span className="metric">
                      <MessageSquare size={13} aria-hidden />
                      {post.commentCount}
                    </span>
                  </div>
                  {isModerator && post.status === "pending" ? (
                    <div className="row">
                      <button
                        type="button"
                        className="btn btn--sm"
                        onClick={() =>
                          run(
                            () =>
                              apiFetch(`/api/posts/${post.id}/moderate`, {
                                method: "POST",
                                body: { action: "approve" },
                              }),
                            "已通过审核",
                          )
                        }
                      >
                        通过
                      </button>
                      <button
                        type="button"
                        className="btn btn--sm btn--ghost"
                        onClick={() =>
                          run(() =>
                            apiFetch(`/api/posts/${post.id}/moderate`, {
                              method: "POST",
                              body: { action: "reject" },
                            }),
                          )
                        }
                      >
                        驳回
                      </button>
                    </div>
                  ) : null}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="stack">
          <div className="card card--flat stack" style={{ gap: 10 }}>
            <div className="section-title">
              <Megaphone size={15} aria-hidden style={{ verticalAlign: "-2px", marginRight: 6 }} />
              板块公告
            </div>
            {announcements.length === 0 ? (
              <p className="muted small">暂无公告</p>
            ) : (
              announcements.map((item) => (
                <div key={item.id} className="stack" style={{ gap: 4 }}>
                  <div className="card-title" style={{ fontSize: 14 }}>
                    {item.title}
                  </div>
                  <p className="small prose">{item.body}</p>
                  <div className="tiny muted">
                    {item.authorName} · {formatTime(item.createdAt)}
                  </div>
                  <hr className="divider" />
                </div>
              ))
            )}
            {isModerator ? (
              <form
                className="stack"
                style={{ gap: 8 }}
                onSubmit={(event) => {
                  event.preventDefault();
                  run(async () => {
                    const data = await apiFetch(`/api/boards/${slug}/announcements`, {
                      method: "POST",
                      body: announcement,
                    });
                    setAnnouncement({ title: "", body: "" });
                    return data;
                  }, "公告已发布");
                }}
              >
                <input
                  className="input"
                  placeholder="公告标题"
                  value={announcement.title}
                  maxLength={80}
                  onChange={(event) =>
                    setAnnouncement({ ...announcement, title: event.target.value })
                  }
                  required
                />
                <textarea
                  className="textarea"
                  style={{ minHeight: 68 }}
                  placeholder="公告内容"
                  value={announcement.body}
                  maxLength={2000}
                  onChange={(event) =>
                    setAnnouncement({ ...announcement, body: event.target.value })
                  }
                  required
                />
                <button type="submit" className="btn btn--sm">
                  发布公告
                </button>
              </form>
            ) : null}
          </div>

          {isModerator && !board.organizationId && claimableOrganizations.length > 0 ? (
            <div className="card card--flat stack" style={{ gap: 10 }}>
              <div className="section-title">认领为组织官方阵地</div>
              <p className="muted small">认证组织所有者可将本板块标记为官方阵地。</p>
              <div className="row">
                {claimableOrganizations.map((org) => (
                  <button
                    key={org.id}
                    type="button"
                    className="btn btn--sm btn--ghost"
                    onClick={() =>
                      run(
                        () =>
                          apiFetch(`/api/boards/${slug}/claim`, {
                            method: "POST",
                            body: { organizationId: org.id },
                          }),
                        "已认领为官方阵地",
                      )
                    }
                  >
                    {org.name}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {organization ? (
            <div className="card card--flat stack" style={{ gap: 8 }}>
              <div className="section-title">所属组织</div>
              <div className="row">
                <span>{organization.name}</span>
                {organization.verifyStatus === "verified" ? (
                  <span className="tag tag--verified">
                    <BadgeCheck size={13} aria-hidden />
                    已认证
                  </span>
                ) : (
                  <span className="tag tag--muted">待认证</span>
                )}
              </div>
              <p className="muted small">{organization.description}</p>
              <span className="tiny muted">
                {organization.kind === "club" ? "注册社团" : "自建小组"}
              </span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
