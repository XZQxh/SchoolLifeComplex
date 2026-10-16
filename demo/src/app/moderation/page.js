"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, Flag, ShieldCheck } from "lucide-react";
import { apiFetch, formatTime } from "@/lib/client";

export default function ModerationPage() {
  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await apiFetch("/api/moderation/reports");
      setData(result);
      setError("");
    } catch (err) {
      setError(err.message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }, []);

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

  return (
    <div className="stack" style={{ gap: 18 }}>
      <div className="page-head">
        <div>
          <h1 className="page-title">治理台</h1>
          <p className="page-sub">
            待审内容与举报队列。版主只看到自己管理的板块，管理员看到全站。
          </p>
        </div>
        {data ? <span className="tag tag--muted">{data.scope}</span> : null}
      </div>

      {notice ? <div className="notice notice--ok">{notice}</div> : null}
      {error ? (
        <div className="stack">
          <div className="notice notice--error">{error}</div>
          <div className="row">
            <Link href="/login" className="btn btn--ghost btn--sm">
              去登录
            </Link>
            <Link href="/orgs" className="btn btn--sm">
              组织入驻
            </Link>
          </div>
        </div>
      ) : null}

      {loading && !data ? <div className="empty">正在加载治理队列</div> : null}

      {data ? (
        <div className="stack" style={{ gap: 18 }}>
          <div className="stack">
            <div className="section-head">
              <span className="section-title">
                <ShieldCheck size={15} aria-hidden style={{ verticalAlign: "-2px", marginRight: 6 }} />
                待审帖子
              </span>
              <span className="muted small">{data.pendingPosts.length} 条</span>
            </div>
            {data.pendingPosts.length === 0 ? (
              <div className="empty">没有待审内容</div>
            ) : (
              data.pendingPosts.map((post) => (
                <div key={post.id} className="list-item list-item--static stack" style={{ gap: 10 }}>
                  <div className="list-item__head">
                    <Link href={`/posts/${post.id}`} className="list-item__title">
                      {post.title}
                    </Link>
                    <span className="tag tag--muted">{post.boardName}</span>
                  </div>
                  <p className="excerpt">{post.body.slice(0, 160)}</p>
                  <div className="list-item__meta">
                    <span>{post.authorName}</span>
                    <span>{formatTime(post.createdAt)}</span>
                  </div>
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
                    <button
                      type="button"
                      className="btn btn--sm btn--danger"
                      onClick={() =>
                        run(() =>
                          apiFetch(`/api/posts/${post.id}/moderate`, {
                            method: "POST",
                            body: { action: "remove" },
                          }),
                        )
                      }
                    >
                      删除
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="stack">
            <div className="section-head">
              <span className="section-title">
                <Flag size={15} aria-hidden style={{ verticalAlign: "-2px", marginRight: 6 }} />
                举报队列
              </span>
              <span className="muted small">{data.reports.length} 条</span>
            </div>
            {data.reports.length === 0 ? (
              <div className="empty">没有待处置的举报</div>
            ) : (
              data.reports.map((report) => (
                <div key={report.id} className="list-item list-item--static stack" style={{ gap: 10 }}>
                  <div className="list-item__head">
                    <span className="list-item__title" style={{ fontSize: 14.5 }}>
                      {report.excerpt || "（无摘要）"}
                    </span>
                    <span className="tag tag--muted">{report.boardName}</span>
                  </div>
                  <div className="list-item__meta">
                    <span>被举报人：{report.targetAuthorName}</span>
                    <span>举报人：{report.reporterName}</span>
                    <span>{formatTime(report.createdAt)}</span>
                  </div>
                  <p className="excerpt">举报原因：{report.reason}</p>
                  <div className="row">
                    <button
                      type="button"
                      className="btn btn--sm btn--danger"
                      onClick={() =>
                        run(
                          () =>
                            apiFetch(`/api/moderation/reports/${report.id}`, {
                              method: "POST",
                              body: { action: "remove" },
                            }),
                          "已删除被举报内容",
                        )
                      }
                    >
                      删除内容
                    </button>
                    <button
                      type="button"
                      className="btn btn--sm btn--danger"
                      onClick={() =>
                        run(
                          () =>
                            apiFetch(`/api/moderation/reports/${report.id}`, {
                              method: "POST",
                              body: { action: "ban" },
                            }),
                          "已封禁作者",
                        )
                      }
                    >
                      封禁作者
                    </button>
                    <button
                      type="button"
                      className="btn btn--sm btn--ghost"
                      onClick={() =>
                        run(
                          () =>
                            apiFetch(`/api/moderation/reports/${report.id}`, {
                              method: "POST",
                              body: { action: "reject" },
                            }),
                          "已驳回举报",
                        )
                      }
                    >
                      驳回举报
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          <div className="stack">
            <div className="section-head">
              <span className="section-title">组织认证</span>
              <span className="muted small">{data.organizations.length} 条待处理</span>
            </div>
            {data.organizations.length === 0 ? (
              <div className="empty">
                {data.scope === "全站" ? "没有待认证的组织" : "组织认证由平台管理员处理"}
              </div>
            ) : (
              data.organizations.map((org) => (
                <div key={org.id} className="list-item list-item--static stack" style={{ gap: 10 }}>
                  <div className="list-item__head">
                    <span className="list-item__title" style={{ fontSize: 14.5 }}>
                      {org.name}
                    </span>
                    <span className="tag tag--muted">
                      {org.kind === "club" ? "注册社团" : "自建小组"}
                    </span>
                  </div>
                  <p className="excerpt">{org.description}</p>
                  <div className="row">
                    <button
                      type="button"
                      className="btn btn--sm"
                      onClick={() =>
                        run(
                          () =>
                            apiFetch(`/api/orgs/${org.id}/verify`, {
                              method: "POST",
                              body: { verify: true },
                            }),
                          "已认证该组织",
                        )
                      }
                    >
                      <BadgeCheck size={14} aria-hidden />
                      认证
                    </button>
                    <button
                      type="button"
                      className="btn btn--sm btn--ghost"
                      onClick={() =>
                        run(() =>
                          apiFetch(`/api/orgs/${org.id}/verify`, {
                            method: "POST",
                            body: { verify: false },
                          }),
                        )
                      }
                    >
                      驳回
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
