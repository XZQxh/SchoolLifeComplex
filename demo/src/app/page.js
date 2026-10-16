"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { BadgeCheck, FileText, Plus, Search, Users } from "lucide-react";
import { CATEGORY_LABELS, apiFetch } from "@/lib/client";

const EMPTY_FORM = { name: "", description: "", category: "game", requireApproval: false };

export default function HomePage() {
  const router = useRouter();
  const [boards, setBoards] = useState([]);
  const [categories, setCategories] = useState([]);
  const [user, setUser] = useState(null);
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    apiFetch("/api/me")
      .then((data) => setUser(data.user))
      .catch(() => setUser(null));
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLoading(true);
      apiFetch(`/api/boards?q=${encodeURIComponent(keyword)}&category=${category}`)
        .then((data) => {
          setBoards(data.boards);
          setCategories(data.categories);
          setError("");
        })
        .catch((err) => setError(err.message))
        .finally(() => setLoading(false));
    }, 220);
    return () => clearTimeout(timer);
  }, [keyword, category]);

  async function submitBoard(event) {
    event.preventDefault();
    setSubmitting(true);
    setFormError("");
    try {
      const data = await apiFetch("/api/boards", { method: "POST", body: form });
      setForm(EMPTY_FORM);
      setShowForm(false);
      router.push(`/boards/${data.board.slug}`);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="stack" style={{ gap: 20 }}>
      <div className="page-head">
        <div>
          <h1 className="page-title">板块发现</h1>
          <p className="page-sub">
            按兴趣组织的校园板块。任何人可以浏览，加入后即可参与讨论。
          </p>
        </div>
        {user ? (
          <button
            type="button"
            className="btn"
            onClick={() => setShowForm((value) => !value)}
          >
            <Plus size={16} aria-hidden />
            创建板块
          </button>
        ) : (
          <Link href="/login" className="btn">
            <Plus size={16} aria-hidden />
            登录后创建板块
          </Link>
        )}
      </div>

      {showForm ? (
        <form className="card stack" onSubmit={submitBoard}>
          <div className="section-title">新建板块</div>
          <div className="form-grid">
            <div className="field">
              <label className="field-label" htmlFor="board-name">
                板块名称
              </label>
              <input
                id="board-name"
                className="input"
                value={form.name}
                maxLength={30}
                onChange={(event) => setForm({ ...form, name: event.target.value })}
                required
              />
            </div>
            <div className="field">
              <label className="field-label" htmlFor="board-category">
                分类
              </label>
              <select
                id="board-category"
                className="select"
                value={form.category}
                onChange={(event) => setForm({ ...form, category: event.target.value })}
              >
                {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="field">
            <label className="field-label" htmlFor="board-desc">
              板块简介
            </label>
            <textarea
              id="board-desc"
              className="textarea"
              value={form.description}
              maxLength={200}
              onChange={(event) => setForm({ ...form, description: event.target.value })}
              required
            />
          </div>
          <label className="row small" htmlFor="board-approval">
            <input
              id="board-approval"
              type="checkbox"
              checked={form.requireApproval}
              onChange={(event) => setForm({ ...form, requireApproval: event.target.checked })}
            />
            新帖需要版主审核后才公开显示
          </label>
          {formError ? <div className="notice notice--error">{formError}</div> : null}
          <div className="row">
            <button type="submit" className="btn" disabled={submitting}>
              {submitting ? "提交中" : "创建板块"}
            </button>
            <button
              type="button"
              className="btn btn--ghost"
              onClick={() => setShowForm(false)}
            >
              取消
            </button>
          </div>
        </form>
      ) : null}

      <div className="stack">
        <div className="search-bar">
          <div className="search-input">
            <Search size={16} aria-hidden />
            <input
              className="input"
              value={keyword}
              placeholder="搜索板块名称或简介"
              onChange={(event) => setKeyword(event.target.value)}
              aria-label="搜索板块"
            />
          </div>
          <div className="chips">
            <button
              type="button"
              className={category === "" ? "chip chip--active" : "chip"}
              onClick={() => setCategory("")}
            >
              全部
            </button>
            {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
              <button
                key={value}
                type="button"
                className={category === value ? "chip chip--active" : "chip"}
                onClick={() => setCategory(value)}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {error ? <div className="notice notice--error">{error}</div> : null}

        {loading && boards.length === 0 ? (
          <div className="empty">正在加载板块</div>
        ) : boards.length === 0 ? (
          <div className="empty">没有匹配的板块</div>
        ) : (
          <div className="board-grid">
            {boards.map((board) => (
              <Link key={board.id} href={`/boards/${board.slug}`} className="card card-link">
                <div className="row row--between" style={{ alignItems: "flex-start" }}>
                  <span className="card-title">{board.name}</span>
                  <span className="tag tag--muted">
                    {CATEGORY_LABELS[board.category] ?? CATEGORY_LABELS.other}
                  </span>
                </div>
                <p className="card-desc">{board.description}</p>
                <div className="list-item__meta">
                  {board.organization && board.organization.verifyStatus === "verified" ? (
                    <span className="tag tag--verified">
                      <BadgeCheck size={13} aria-hidden />
                      {board.organization.name}
                    </span>
                  ) : board.organization ? (
                    <span className="tag tag--muted">{board.organization.name}（待认证）</span>
                  ) : (
                    <span className="tag tag--muted">自建板块</span>
                  )}
                  {board.requireApproval ? <span className="tag tag--warn">发帖需审核</span> : null}
                  <span className="metric">
                    <Users size={13} aria-hidden />
                    {board.memberCount}
                  </span>
                  <span className="metric">
                    <FileText size={13} aria-hidden />
                    {board.postCount}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
