"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { LogIn, LogOut, Shield, PackageSearch, Users } from "lucide-react";
import { apiFetch } from "@/lib/client";

export default function SiteHeader() {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let alive = true;
    apiFetch("/api/me")
      .then((data) => {
        if (alive) setUser(data.user);
      })
      .catch(() => {
        if (alive) setUser(null);
      })
      .finally(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
    };
  }, []);

  async function logout() {
    await apiFetch("/api/auth/logout", { method: "POST" }).catch(() => null);
    setUser(null);
    window.location.href = "/";
  }

  return (
    <header className="site-header">
      <div className="site-header__inner">
        <Link href="/" className="brand">
          校园兴趣社区
        </Link>

        <nav className="site-nav">
          <Link href="/orgs" className="nav-link" title="组织入驻">
            <Users size={16} aria-hidden />
            <span>组织入驻</span>
          </Link>
          <Link href="/found" className="nav-link" title="失物招领">
            <PackageSearch size={16} aria-hidden />
            <span>失物招领</span>
          </Link>
          <Link href="/moderation" className="nav-link" title="治理台">
            <Shield size={16} aria-hidden />
            <span>治理台</span>
          </Link>
        </nav>

        <div className="site-account">
          {!ready ? (
            <span className="muted small">加载中</span>
          ) : user ? (
            <>
              <span className="account-name">
                {user.name}
                {user.role === "admin" ? <span className="tag tag--admin">管理员</span> : null}
                {user.verifyStatus === "verified" ? (
                  <span className="tag tag--verified">已认证</span>
                ) : null}
              </span>
              <button type="button" className="btn btn--ghost btn--sm" onClick={logout}>
                <LogOut size={15} aria-hidden />
                退出
              </button>
            </>
          ) : (
            <Link href="/login" className="btn btn--sm">
              <LogIn size={15} aria-hidden />
              登录
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
