/* 次数闸的离线证明。不发网络请求。临时账本，不写正式的 20 次账。 */
var fs = require("fs");
var os = require("os");
var path = require("path");
var crypto = require("crypto");
var { spawn } = require("child_process");
var budget = require("./ai-budget");
var dir = fs.mkdtempSync(path.join(os.tmpdir(), "ai-budget-"));
process.env.AI_LEDGER_DIR = dir;
process.env.AI_BUDGET_CAP = "3";
var n = 0, fail = 0;
function ok(name, cond, extra) {
  n++;
  if (!cond) { fail++; console.log("FAIL " + name + (extra ? " " + extra : "")); }
  else console.log("ok " + name);
}
function reserve(kind) {
  return budget.reserve({ route: "relay", kind: kind || "test", channel: "script" });
}

var a = reserve("understand");
var b = reserve("attempt");
ok("前两次占用成功", a.ok && b.ok && b.used === 2, JSON.stringify(b));
budget.note(a.id, { status: "http", http: 500, ok: false, error: "boom" });
var c = reserve("retry");
ok("失败和重试都占次数", c.ok && c.id === 3);
var d = reserve("again");
ok("到达上限后拒绝", d.ok === false && d.reason === "cap" && d.used === 3, JSON.stringify(d));

var text = fs.readFileSync(path.join(dir, "ai-ledger.jsonl"), "utf8");
ok("账本没有密钥或正文", text.indexOf("Bearer") < 0 && text.indexOf("sk-") < 0 && text.indexOf("api_key") < 0);
ok("账本记下路径和时间", /"kind":"understand"/.test(text) && /"event":"result"/.test(text) && /"t":"/.test(text));

fs.writeFileSync(path.join(dir, "ai-ledger.jsonl"), "");
var afterWipe = reserve("wiped");
ok("删掉流水也不能把高水位清零", afterWipe.ok === false && afterWipe.reason === "cap", JSON.stringify(afterWipe));

var childCode = [
  "process.env.AI_LEDGER_DIR=" + JSON.stringify(dir) + ";",
  "process.env.AI_BUDGET_CAP='3';",
  "var b=require(" + JSON.stringify(path.join(__dirname, "ai-budget.js")) + ");",
  "process.stdout.write(JSON.stringify(b.reserve({route:'relay',kind:'child',channel:'script'})));"
].join("");
function once() {
  return new Promise(function (resolve) {
    var child = spawn(process.execPath, ["-e", childCode], { env: process.env });
    var out = "";
    child.stdout.on("data", function (buf) { out += buf; });
    child.on("close", function () { resolve(JSON.parse(out)); });
  });
}
Promise.all([once(), once(), once(), once()]).then(function (rows) {
  var wins = rows.filter(function (r) { return r.ok; }).length;
  ok("重启后的并发进程不能越过上限", wins === 0, JSON.stringify(rows));
  var fresh = fs.mkdtempSync(path.join(os.tmpdir(), "ai-budget-race-"));
  var raceCode = [
    "process.env.AI_LEDGER_DIR=" + JSON.stringify(fresh) + ";",
    "process.env.AI_BUDGET_CAP='3';",
    "var b=require(" + JSON.stringify(path.join(__dirname, "ai-budget.js")) + ");",
    "process.stdout.write(JSON.stringify(b.reserve({route:'relay',kind:'race',channel:'script'})));"
  ].join("");
  function race() {
    return new Promise(function (resolve) {
      var child = spawn(process.execPath, ["-e", raceCode], { env: process.env });
      var out = "";
      child.stdout.on("data", function (buf) { out += buf; });
      child.on("close", function () { resolve(JSON.parse(out)); });
    });
  }
  return Promise.all([race(), race(), race(), race(), race(), race(), race(), race()]).then(function (raced) {
    var got = raced.filter(function (r) { return r.ok; }).length;
    ok("八个进程同时抢，只有上限份数成功", got === 3, JSON.stringify(raced.map(function (r) { return r.ok ? r.id : r.reason; })));
    var snap = JSON.parse(fs.readFileSync(path.join(fresh, "ai-ledger.highwater"), "utf8"));
    ok("高水位等于成功次数", snap === 3, String(snap));
    var audit = budget.auditProduct(path.join(__dirname, "..", "_build"));
    ok("产品开关仍关闭且发送前要过闸", audit.liveOff && audit.returnsBeforeFetch && audit.fetchClaims && audit.otherModelFetches.length === 0, JSON.stringify(audit));
    var frozen = fs.readFileSync(path.join(__dirname, "round4_frozen.json"));
    var hash = crypto.createHash("sha256").update(frozen).digest("hex");
    var expected = fs.readFileSync(path.join(__dirname, "round4_frozen.sha256"), "utf8").trim();
    ok("冻结题哈希没被改", hash === expected, hash);
    var cases = JSON.parse(frozen.toString());
    ok("八题且不重复旧留出", cases.cases.length === 8 && cases.cases.every(function (c) { return c.input.indexOf("离职") < 0 && c.input.indexOf("烤箱") < 0 && c.input.indexOf("摄影") < 0; }));
    console.log(fail ? ("FAILED " + fail + "/" + n) : ("passed " + n));
    process.exit(fail ? 1 : 0);
  });
}).catch(function (e) { console.error(e); process.exit(1); });
