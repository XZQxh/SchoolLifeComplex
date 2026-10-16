import fs from "node:fs";
import path from "node:path";

const target = path.join(process.cwd(), "data", "db.json");

if (fs.existsSync(target)) {
  fs.rmSync(target);
  console.log(`已删除 ${target}`);
} else {
  console.log("没有需要删除的数据文件");
}
