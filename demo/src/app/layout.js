import "./globals.css";
import SiteHeader from "@/components/SiteHeader";

export const metadata = {
  title: "校园兴趣社区",
  description: "面向在校生的校园兴趣社区：兴趣板块、组织阵地与信息互助",
};

export const viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="zh-CN">
      <body>
        <SiteHeader />
        <main className="page">{children}</main>
        <footer className="site-footer">
          校园兴趣社区（课程设计演示工程）· 不接入任何学校官方系统
        </footer>
      </body>
    </html>
  );
}
