import { spawn, execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const EDGE = "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const BASE = process.env.SMOKE_BASE ?? "http://127.0.0.1:3100";
const PORT = 9339;
const profile = path.join(os.tmpdir(), `slc-edge-${Date.now()}`);
const outDir = path.join(process.cwd(), "screenshots");

fs.mkdirSync(outDir, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function findTarget() {
  for (let i = 0; i < 80; i += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${PORT}/json/list`);
      const list = await response.json();
      const page = list.find((item) => item.type === "page");
      if (page) return page;
    } catch {
      /* 浏览器尚未就绪 */
    }
    await sleep(250);
  }
  throw new Error("未能连接到浏览器调试端口");
}

async function main() {
  console.log(`CHROME ${EDGE}`);
  const child = spawn(
    EDGE,
    [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--no-default-browser-check",
      `--remote-debugging-port=${PORT}`,
      `--user-data-dir=${profile}`,
      "--window-size=1280,900",
      "about:blank",
    ],
    { stdio: "ignore" },
  );

  const target = await findTarget();
  const socket = new WebSocket(target.webSocketDebuggerUrl);
  await new Promise((resolve, reject) => {
    socket.onopen = resolve;
    socket.onerror = reject;
  });

  let seq = 0;
  const pending = new Map();
  socket.onmessage = (event) => {
    const message = JSON.parse(event.data);
    if (message.id && pending.has(message.id)) {
      const { resolve, reject } = pending.get(message.id);
      pending.delete(message.id);
      if (message.error) reject(new Error(message.error.message));
      else resolve(message.result);
    }
  };

  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const id = ++seq;
      pending.set(id, { resolve, reject });
      socket.send(JSON.stringify({ id, method, params }));
    });

  const evaluate = async (expression) => {
    const result = await send("Runtime.evaluate", {
      expression,
      returnByValue: true,
      awaitPromise: true,
    });
    return result.result.value;
  };

  const goto = async (url, waitFor) => {
    await send("Page.navigate", { url });
    for (let i = 0; i < 60; i += 1) {
      await sleep(250);
      const ready = await evaluate(`document.readyState === "complete"`);
      if (ready) {
        const satisfied = await evaluate(waitFor);
        if (satisfied) return true;
      }
    }
    return false;
  };

  const shoot = async (name) => {
    const shot = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    const file = path.join(outDir, name);
    fs.writeFileSync(file, Buffer.from(shot.data, "base64"));
    console.log(`SHOT ${file}`);
  };

  await send("Page.enable");
  await send("Runtime.enable");

  const results = [];

  const homeOk = await goto(`${BASE}/`, `document.querySelectorAll('a[href^="/boards/"]').length > 0`);
  const boardCount = await evaluate(`document.querySelectorAll('a[href^="/boards/"]').length`);
  results.push(["首页渲染出板块卡片", homeOk && boardCount > 0, `卡片数 ${boardCount}`]);
  await shoot("home-desktop.png");

  await send("Emulation.setDeviceMetricsOverride", {
    width: 390,
    height: 844,
    deviceScaleFactor: 2,
    mobile: true,
  });
  await sleep(600);
  const mobileOverflow = await evaluate(
    `JSON.stringify({ scrollW: document.documentElement.scrollWidth, clientW: document.documentElement.clientWidth })`,
  );
  const parsed = JSON.parse(mobileOverflow);
  results.push([
    "移动端无横向溢出",
    parsed.scrollW <= parsed.clientW + 1,
    `scrollWidth ${parsed.scrollW} / clientWidth ${parsed.clientW}`,
  ]);
  await shoot("home-mobile.png");
  await send("Emulation.clearDeviceMetricsOverride");
  await sleep(400);

  const firstBoardHref = await evaluate(
    `document.querySelector('a[href^="/boards/"]')?.getAttribute('href') ?? ""`,
  );
  const boardOk = await goto(
    `${BASE}${firstBoardHref}`,
    `document.body.innerText.includes('板块公告')`,
  );
  const boardText = await evaluate(`document.body.innerText.slice(0, 400)`);
  results.push(["板块页渲染", boardOk && boardText.length > 0, boardText.replace(/\n/g, " | ").slice(0, 160)]);
  await shoot("board-desktop.png");

  const foundOk = await goto(`${BASE}/found`, `document.body.innerText.includes('失物招领')`);
  const foundText = await evaluate(`document.body.innerText.slice(0, 300)`);
  results.push(["失物招领页渲染", foundOk, foundText.replace(/\n/g, " | ").slice(0, 160)]);
  await shoot("found-desktop.png");

  const loginOk = await goto(`${BASE}/login`, `document.body.innerText.includes('演示账号')`);
  results.push(["登录页渲染", loginOk, ""]);

  const moderationOk = await goto(
    `${BASE}/moderation`,
    `document.body.innerText.includes('治理台')`,
  );
  const moderationText = await evaluate(`document.body.innerText.slice(0, 200)`);
  results.push([
    "治理台未登录时给出提示",
    moderationOk && moderationText.includes("登录"),
    moderationText.replace(/\n/g, " | ").slice(0, 160),
  ]);

  let failures = 0;
  for (const [label, ok, detail] of results) {
    if (ok) console.log(`PASS  ${label}`);
    else {
      failures += 1;
      console.log(`FAIL  ${label} -> ${detail}`);
    }
  }

  socket.close();
  try {
    execFile("taskkill", ["/pid", String(child.pid), "/T", "/F"], () => {});
  } catch {
    child.kill();
  }
  console.log(failures === 0 ? "UI 检查全部通过" : `UI 检查存在 ${failures} 项失败`);
  process.exitCode = failures === 0 ? 0 : 1;
}

main().catch((error) => {
  console.error("界面检查失败：", error);
  process.exitCode = 1;
});
