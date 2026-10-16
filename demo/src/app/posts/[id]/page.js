"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, Flag, MessageSquare, ThumbsUp } from "lucide-react";
import { POST_STATUS_LABELS, apiFetch, formatTime } from "@/lib/client";

const REASONS = ["垃圾广告", "人身攻击", "违法违规内容", "与板块主题无关", "其他"];

export default function PostPage() {
  const params = useParams();
  const id = params.id;
  const [detail, setDetail] = useState(null);
  const [me, setMe] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [comment, setComment] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);

  const load = useCallback(async () => {
    try {
      const [detailData, meData] = await Promise.all([
        apiFetch(`/api/posts/${id}`),
        apiFetch("/api/me").catch(() => ({ user: null })),
      ]);
      setDetail(detailData);
      setMe(meData.user);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

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
    return <div className="empty">正在加载帖子</div>;
  }

  const { post, board, comments, canInteract, canModerate } = detail;

  return (
    <div className="stack" style={{ gap: 16 }}>
      <Link href={`/boards/${board.slug}`} className="row muted small">
        <ChevronLeft size={15} aria-hidden />
        {board.name}
      </Link>

      <div className="card card--flat stack">
        <div className="row row--between" style={{ alignItems: "flex-start" }}>
          <h1 className="page-title detail-title" style={{ fontSize: 20 }}>
            {post.title}
          </h1>
          {post.status !== "published" ? (
            <span className={post.status === "pending" ? "tag tag--warn" : "tag tag--danger"}>
              {POST_STATUS_LABELS[post.status]}
            </span>
          ) : null}
        </div>
        <div className="list-item__meta">
          <span>{post.authorName}</span>
          <span>{formatTime(post.createdAt)}</span>
        </div>
        <p className="prose">{post.body}</p>
        <hr className="divider" />
        <div className="row">
          <button
            type="button"
            className={post.likedByMe ? "btn btn--sm btn--active" : "btn btn--sm btn--ghost"}
            onClick={() =>
              run(() => apiFetch(`/api/posts/${id}/like`, { method: "POST" }))
            }
          >
            <ThumbsUp size={14} aria-hidden />
            {post.likeCount}
          </button>
          <button
            type="button"
            className="btn btn--sm btn--ghost"
            onClick={() => setReportOpen((value) => !value)}
          >
            <Flag size={14} aria-hidden />
            举报
          </button>
          {canModerate ? (
            <>
              {post.status === "pending" ? (
                <button
                  type="button"
                  className="btn btn--sm"
                  onClick={() =>
                    run(() =>
                      apiFetch(`/api/posts/${id}/moderate`, {
                        method: "POST",
                        body: { action: "approve" },
                      }),
                      "已通过审核",
                    )
                  }
                >
                  通过
                </button>
              ) : null}
              <button
                type="button"
                className="btn btn--sm btn--ghost"
                onClick={() =>
                  run(() =>
                    apiFetch(`/api/posts/${id}/moderate`, {
                      method: "POST",
                      body: { action: "reject" },
                    }),
                  )
                }
              >
                驳回
              </button>
              <button
                type="button"
                className="btn btn--sm btn--danger"
                onClick={() =>
                  run(() =>
                    apiFetch(`/api/posts/${id}/moderate`, {
                      method: "POST",
                      body: { action: "remove" },
                    }),
                    "帖子已删除",
                  )
                }
              >
                删除
              </button>
            </>
          ) : null}
        </div>

        {reportOpen ? (
          <div className="stack" style={{ gap: 8 }}>
            <div className="field">
              <label className="field-label" htmlFor="report-reason">
                举报原因
              </label>
              <select
                id="report-reason"
                className="select"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
              >
                {REASONS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </div>
            <div className="row">
              <button
                type="button"
                className="btn btn--sm"
                onClick={() =>
                  run(async () => {
                    const data = await apiFetch("/api/reports", {
                      method: "POST",
                      body: { targetType: "post", targetId: id, reason },
                    });
                    setReportOpen(false);
                    return data;
                  }, "举报已提交，等待版主处置")
                }
              >
                提交举报
              </button>
              <button
                type="button"
                className="btn btn--sm btn--ghost"
                onClick={() => setReportOpen(false)}
              >
                取消
              </button>
            </div>
          </div>
        ) : null}
      </div>

      {notice ? <div className="notice notice--ok">{notice}</div> : null}
      {error && detail ? <div className="notice notice--error">{error}</div> : null}

      <div className="stack">
        <div className="section-head">
          <span className="section-title">
            <MessageSquare size={15} aria-hidden style={{ verticalAlign: "-2px", marginRight: 6 }} />
            评论
          </span>
          <span className="muted small">{comments.length} 条</span>
        </div>

        {comments.length === 0 ? (
          <div className="empty">还没有评论</div>
        ) : (
          comments.map((item) => (
            <div key={item.id} className="list-item list-item--static">
              <div className="list-item__meta" style={{ marginTop: 0 }}>
                <span>{item.authorName}</span>
                <span>{formatTime(item.createdAt)}</span>
                {item.status === "removed" ? (
                  <span className="tag tag--danger">已删除</span>
                ) : null}
              </div>
              <p className="prose small" style={{ marginTop: 6 }}>
                {item.body}
              </p>
              <div className="row" style={{ marginTop: 8 }}>
                <button
                  type="button"
                  className="btn btn--sm btn--ghost"
                  onClick={() =>
                    run(() =>
                      apiFetch("/api/reports", {
                        method: "POST",
                        body: {
                          targetType: "comment",
                          targetId: item.id,
                          reason: "由帖子页提交的举报",
                        },
                      }),
                      "举报已提交",
                    )
                  }
                >
                  <Flag size={13} aria-hidden />
                  举报
                </button>
              </div>
            </div>
          ))
        )}

        <div className="card card--flat">
          {canInteract ? (
            <form
              className="stack"
              style={{ gap: 8 }}
              onSubmit={(event) => {
                event.preventDefault();
                run(async () => {
                  const data = await apiFetch(`/api/posts/${id}/comments`, {
                    method: "POST",
                    body: { body: comment },
                  });
                  setComment("");
                  return data;
                });
              }}
            >
              <textarea
                className="textarea"
                style={{ minHeight: 72 }}
                placeholder="写下你的评论"
                value={comment}
                maxLength={1000}
                onChange={(event) => setComment(event.target.value)}
                required
              />
              <div className="row">
                <button type="submit" className="btn btn--sm">
                  发表评论
                </button>
              </div>
            </form>
          ) : (
            <p className="muted small">
              {me ? "加入该板块后即可评论。" : "登录并加入该板块后即可评论。"}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
