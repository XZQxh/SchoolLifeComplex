"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { apiFetch } from "@/lib/client";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState("login");
  const [studentNo, setStudentNo] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    try {
      if (mode === "login") {
        await apiFetch("/api/auth/login", {
          method: "POST",
          body: { studentNo, password },
        });
      } else {
        await apiFetch("/api/auth/register", {
          method: "POST",
          body: { studentNo, name, password },
        });
      }
      router.push("/");
      router.refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="stack" style={{ maxWidth: 420 }}>
      <div>
        <h1 className="page-title">{mode === "login" ? "登录" : "注册"}</h1>
        <p className="page-sub">使用学号与密码进入校园兴趣社区。</p>
      </div>

      <div className="chips">
        <button
          type="button"
          className={mode === "login" ? "chip chip--active" : "chip"}
          onClick={() => setMode("login")}
        >
          登录
        </button>
        <button
          type="button"
          className={mode === "register" ? "chip chip--active" : "chip"}
          onClick={() => setMode("register")}
        >
          注册
        </button>
      </div>

      <form className="card stack" onSubmit={submit}>
        <div className="field">
          <label className="field-label" htmlFor="student-no">
            学号
          </label>
          <input
            id="student-no"
            className="input"
            value={studentNo}
            minLength={4}
            maxLength={20}
            onChange={(event) => setStudentNo(event.target.value)}
            required
          />
        </div>

        {mode === "register" ? (
          <div className="field">
            <label className="field-label" htmlFor="student-name">
              姓名
            </label>
            <input
              id="student-name"
              className="input"
              value={name}
              maxLength={20}
              onChange={(event) => setName(event.target.value)}
              required
            />
          </div>
        ) : null}

        <div className="field">
          <label className="field-label" htmlFor="password">
            密码
          </label>
          <input
            id="password"
            className="input"
            type="password"
            value={password}
            minLength={6}
            maxLength={64}
            onChange={(event) => setPassword(event.target.value)}
            required
          />
        </div>

        {error ? <div className="notice notice--error">{error}</div> : null}

        <button type="submit" className="btn" disabled={submitting}>
          {submitting ? "提交中" : mode === "login" ? "登录" : "注册并登录"}
        </button>
      </form>

      <div className="notice">
        演示账号：管理员 000000 / admin123；学生 20230101 / student123。
      </div>
    </div>
  );
}
