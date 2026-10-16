"use client";

import { useCallback, useEffect, useState } from "react";
import { Search } from "lucide-react";
import { FOUND_STATUS_LABELS, apiFetch, formatTime } from "@/lib/client";

const EMPTY_FORM = {
  kind: "found",
  title: "",
  description: "",
  location: "",
  contact: "",
};

export default function FoundPage() {
  const [items, setItems] = useState([]);
  const [me, setMe] = useState(null);
  const [keyword, setKeyword] = useState("");
  const [kind, setKind] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    try {
      const data = await apiFetch(`/api/found-items?q=${encodeURIComponent(keyword)}&kind=${kind}`);
      setItems(data.items);
      setError("");
    } catch (err) {
      setError(err.message);
    }
  }, [keyword, kind]);

  useEffect(() => {
    const timer = setTimeout(load, 200);
    return () => clearTimeout(timer);
  }, [load]);

  useEffect(() => {
    apiFetch("/api/me")
      .then((data) => setMe(data.user))
      .catch(() => setMe(null));
  }, []);

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
          <h1 className="page-title">失物招领</h1>
          <p className="page-sub">寻物与招领信息集中发布，任何人可浏览与搜索。</p>
        </div>
        {me ? (
          <button type="button" className="btn" onClick={() => setShowForm((value) => !value)}>
            发布信息
          </button>
        ) : (
          <a href="/login" className="btn">
            登录后发布
          </a>
        )}
      </div>

      {showForm ? (
        <form
          className="card stack"
          onSubmit={(event) => {
            event.preventDefault();
            run(async () => {
              const data = await apiFetch("/api/found-items", { method: "POST", body: form });
              setForm(EMPTY_FORM);
              setShowForm(false);
              return data;
            }, "信息已发布");
          }}
        >
          <div className="form-grid">
            <div className="field">
              <label className="field-label" htmlFor="found-kind">
                类型
              </label>
              <select
                id="found-kind"
                className="select"
                value={form.kind}
                onChange={(event) => setForm({ ...form, kind: event.target.value })}
              >
                <option value="found">招领（我捡到了东西）</option>
                <option value="lost">寻物（我丢了东西）</option>
              </select>
            </div>
            <div className="field">
              <label className="field-label" htmlFor="found-location">
                地点
              </label>
              <input
                id="found-location"
                className="input"
                value={form.location}
                maxLength={60}
                onChange={(event) => setForm({ ...form, location: event.target.value })}
                required
              />
            </div>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="found-title">
              标题
            </label>
            <input
              id="found-title"
              className="input"
              value={form.title}
              maxLength={80}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
              required
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="found-desc">
              描述
            </label>
            <textarea
              id="found-desc"
              className="textarea"
              value={form.description}
              maxLength={1000}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              required
            />
          </div>
          <div className="field">
            <label className="field-label" htmlFor="found-contact">
              联系方式
            </label>
            <input
              id="found-contact"
              className="input"
              value={form.contact}
              maxLength={60}
              onChange={(event) => setForm({ ...form, contact: event.target.value })}
              required
            />
          </div>
          <div className="row">
            <button type="submit" className="btn">
              发布
            </button>
            <button type="button" className="btn btn--ghost" onClick={() => setShowForm(false)}>
              取消
            </button>
          </div>
        </form>
      ) : null}

      <div className="search-bar">
        <div className="search-input">
          <Search size={16} aria-hidden />
          <input
            className="input"
            value={keyword}
            placeholder="搜索标题、描述或地点"
            onChange={(event) => setKeyword(event.target.value)}
            aria-label="搜索失物招领"
          />
        </div>
        <div className="chips">
          <button
            type="button"
            className={kind === "" ? "chip chip--active" : "chip"}
            onClick={() => setKind("")}
          >
            全部
          </button>
          <button
            type="button"
            className={kind === "lost" ? "chip chip--active" : "chip"}
            onClick={() => setKind("lost")}
          >
            寻物
          </button>
          <button
            type="button"
            className={kind === "found" ? "chip chip--active" : "chip"}
            onClick={() => setKind("found")}
          >
            招领
          </button>
        </div>
      </div>

      {notice ? <div className="notice notice--ok">{notice}</div> : null}
      {error ? <div className="notice notice--error">{error}</div> : null}

      {items.length === 0 ? (
        <div className="empty">没有匹配的信息</div>
      ) : (
        items.map((item) => (
          <div key={item.id} className="list-item list-item--static stack" style={{ gap: 10 }}>
            <div className="list-item__head">
              <span className="list-item__title">{item.title}</span>
              <div className="row">
                <span className={item.kind === "lost" ? "tag tag--warn" : "tag tag--accent"}>
                  {item.kind === "lost" ? "寻物" : "招领"}
                </span>
                <span
                  className={
                    item.status === "open"
                      ? "tag tag--muted"
                      : item.status === "claimed"
                        ? "tag tag--accent"
                        : "tag tag--muted"
                  }
                >
                  {FOUND_STATUS_LABELS[item.status]}
                </span>
              </div>
            </div>
            <p className="excerpt">{item.description}</p>
            <div className="list-item__meta">
              <span>地点：{item.location}</span>
              <span>发布者：{item.authorName}</span>
              <span>{formatTime(item.createdAt)}</span>
            </div>
            <div className="row">
              <span className="muted small">联系方式：{item.contact}</span>
              {item.status === "open" && me && item.authorId !== me.id ? (
                <button
                  type="button"
                  className="btn btn--sm"
                  onClick={() =>
                    run(
                      () =>
                        apiFetch(`/api/found-items/${item.id}/claim`, { method: "POST" }),
                      "已提交认领，请与发布者联系",
                    )
                  }
                >
                  认领
                </button>
              ) : null}
              {me && (item.authorId === me.id || me.role === "admin") && item.status !== "closed" ? (
                <button
                  type="button"
                  className="btn btn--sm btn--ghost"
                  onClick={() =>
                    run(() => apiFetch(`/api/found-items/${item.id}/close`, { method: "POST" }))
                  }
                >
                  关闭
                </button>
              ) : null}
            </div>
          </div>
        ))
      )}
    </div>
  );
}
