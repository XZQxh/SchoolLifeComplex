"use client";

import { useCallback, useEffect, useState } from "react";
import { BadgeCheck } from "lucide-react";
import { apiFetch } from "@/lib/client";

const EMPTY_FORM = { name: "", kind: "group", description: "" };

export default function OrgsPage() {
  const [organizations, setOrganizations] = useState([]);
  const [me, setMe] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await apiFetch("/api/orgs");
      setOrganizations(data.organizations);
    } catch (err) {
      setError(err.message);
    }
  }, []);

  useEffect(() => {
    load();
    apiFetch("/api/me")
      .then((data) => setMe(data.user))
      .catch(() => setMe(null));
  }, [load]);

  async function submit(event) {
    event.preventDefault();
    setError("");
    setNotice("");
    try {
      await apiFetch("/api/orgs", { method: "POST", body: form });
      setForm(EMPTY_FORM);
      setNotice("入驻申请已提交，等待平台管理员认证");
      await load();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="stack" style={{ gap: 18 }}>
      <div>
        <h1 className="page-title">组织入驻</h1>
        <p className="page-sub">
          注册社团与自建兴趣小组都可以申请成为组织，认证后可在板块上显示认证标识。
        </p>
      </div>

      {notice ? <div className="notice notice--ok">{notice}</div> : null}
      {error ? <div className="notice notice--error">{error}</div> : null}

      <div className="two-col">
        <div className="stack">
          <div className="section-head">
            <span className="section-title">组织列表</span>
            <span className="muted small">{organizations.length} 个</span>
          </div>
          {organizations.length === 0 ? (
            <div className="empty">还没有组织</div>
          ) : (
            organizations.map((org) => (
              <div key={org.id} className="list-item list-item--static stack" style={{ gap: 8 }}>
                <div className="list-item__head">
                  <span className="list-item__title">{org.name}</span>
                  <div className="row">
                    <span className="tag tag--muted">
                      {org.kind === "club" ? "注册社团" : "自建小组"}
                    </span>
                    {org.verifyStatus === "verified" ? (
                      <span className="tag tag--verified">
                        <BadgeCheck size={13} aria-hidden />
                        已认证
                      </span>
                    ) : org.verifyStatus === "pending" ? (
                      <span className="tag tag--warn">待认证</span>
                    ) : (
                      <span className="tag tag--danger">已驳回</span>
                    )}
                  </div>
                </div>
                <p className="excerpt">{org.description}</p>
                <div className="list-item__meta">
                  <span>负责人：{org.ownerName}</span>
                  <span>官方板块：{org.boardCount} 个</span>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="stack">
          {me ? (
            <form className="card card--flat stack" onSubmit={submit}>
              <div className="section-title">申请入驻</div>
              <div className="field">
                <label className="field-label" htmlFor="org-name">
                  组织名称
                </label>
                <input
                  id="org-name"
                  className="input"
                  value={form.name}
                  maxLength={30}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  required
                />
              </div>
              <div className="field">
                <label className="field-label" htmlFor="org-kind">
                  组织类型
                </label>
                <select
                  id="org-kind"
                  className="select"
                  value={form.kind}
                  onChange={(event) => setForm({ ...form, kind: event.target.value })}
                >
                  <option value="group">自建兴趣小组</option>
                  <option value="club">注册社团</option>
                </select>
              </div>
              <div className="field">
                <label className="field-label" htmlFor="org-desc">
                  组织简介
                </label>
                <textarea
                  id="org-desc"
                  className="textarea"
                  style={{ minHeight: 76 }}
                  value={form.description}
                  maxLength={200}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                  required
                />
              </div>
              <button type="submit" className="btn">
                提交申请
              </button>
            </form>
          ) : (
            <div className="card card--flat stack">
              <div className="section-title">申请入驻</div>
              <p className="muted small">登录后可以提交组织入驻申请。</p>
              <a href="/login" className="btn btn--sm">
                去登录
              </a>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
