/* 全流程共用的模型次数闸。发送前占用，失败和重试也算。
   正式页面默认不发送。这里的账本只在脚本或显式注入时使用。
   不记录密钥、请求正文或回复正文。 */
var fs = require("fs");
var path = require("path");
var CANON = path.join(__dirname);
var CAP_DEFAULT = 20;

function rootDir() {
  return process.env.AI_LEDGER_DIR || CANON;
}
function cap() {
  if (process.env.AI_LEDGER_DIR && process.env.AI_BUDGET_CAP) {
    var n = Number(process.env.AI_BUDGET_CAP);
    if (n > 0) return n;
  }
  return CAP_DEFAULT;
}
function ledgerPath() { return path.join(rootDir(), "ai-ledger.jsonl"); }
function highPath() { return path.join(rootDir(), "ai-ledger.highwater"); }
function lockPath() { return path.join(rootDir(), "ai-ledger.lock"); }

function sleepSync(ms) {
  var sab = new SharedArrayBuffer(4);
  Atomics.wait(new Int32Array(sab), 0, 0, ms);
}
function withLock(fn) {
  var lock = lockPath();
  var i;
  for (i = 0; i < 400; i++) {
    try { fs.mkdirSync(lock); break; }
    catch (e) {
      if (e.code !== "EEXIST") throw e;
      try {
        var st = fs.statSync(lock);
        if (Date.now() - st.mtimeMs > 8000) fs.rmdirSync(lock);
      } catch (e2) {}
      sleepSync(5);
    }
  }
  if (i >= 400) throw new Error("ai-ledger lock");
  try { return fn(); }
  finally { try { fs.rmdirSync(lock); } catch (e3) {} }
}
function readHigh() {
  try { return parseInt(fs.readFileSync(highPath(), "utf8"), 10) || 0; }
  catch (e) { return 0; }
}
function countReserves() {
  var n = 0;
  try {
    fs.readFileSync(ledgerPath(), "utf8").split("\n").forEach(function (line) {
      if (!line) return;
      try { if (JSON.parse(line).event === "reserve") n++; } catch (e) {}
    });
  } catch (e2) {}
  return n;
}
function usedCount() {
  return Math.max(countReserves(), readHigh());
}
function clean(meta) {
  meta = meta || {};
  return {
    route: String(meta.route || "").slice(0, 40),
    kind: String(meta.kind || "").slice(0, 40),
    channel: String(meta.channel || "script").slice(0, 40)
  };
}
function reserve(meta) {
  var info = clean(meta);
  return withLock(function () {
    var used = usedCount();
    var limit = cap();
    if (used >= limit) return { ok: false, reason: "cap", used: used, cap: limit };
    var id = used + 1;
    var row = { id: id, t: new Date().toISOString(), event: "reserve", route: info.route, kind: info.kind, channel: info.channel, pid: process.pid };
    fs.appendFileSync(ledgerPath(), JSON.stringify(row) + "\n");
    fs.writeFileSync(highPath(), String(id));
    return { ok: true, id: id, used: id, cap: limit };
  });
}
function note(id, result) {
  result = result || {};
  var row = {
    id: id,
    t: new Date().toISOString(),
    event: "result",
    status: String(result.status || "").slice(0, 40),
    http: typeof result.http === "number" ? result.http : null,
    ok: !!result.ok,
    error: String(result.error || "").slice(0, 160)
  };
  return withLock(function () {
    fs.appendFileSync(ledgerPath(), JSON.stringify(row) + "\n");
    return row;
  });
}
function snapshot() {
  return withLock(function () {
    return { used: usedCount(), cap: cap(), ledger: ledgerPath() };
  });
}
function auditProduct(buildDir) {
  var p2 = fs.readFileSync(path.join(buildDir, "p2.js"), "utf8");
  var hits = [];
  ["v14.js", "v16.js", "v18.js", "v20.js", "p4.js", "p5.js"].forEach(function (name) {
    var text = fs.readFileSync(path.join(buildDir, name), "utf8");
    if (/chat\/completions/.test(text)) hits.push(name + ":chat");
    if (/lingcun-relay/.test(text)) hits.push(name + ":relay");
  });
  return {
    liveOff: /var LIVE_AI = false/.test(p2),
    returnsBeforeFetch: /!evalOn\(\) && typeof LIVE_AI !== "undefined" && LIVE_AI === false/.test(p2),
    fetchClaims: /claimModelSend\(/.test(p2) && /function fetchWith\(/.test(p2),
    otherModelFetches: hits
  };
}

module.exports = { reserve: reserve, note: note, snapshot: snapshot, cap: cap, auditProduct: auditProduct, CANON: CANON };
