/* 行动前提的本地检查。通过不代表模型读懂了做法，也没有发出网络请求。 */
var fs = require("fs");
var vm = require("vm");
var path = require("path");
var root = path.join(__dirname, "..", "_build");
var user = fs.readFileSync(path.join(root, "userstate.js"), "utf8");
var pre = fs.readFileSync(path.join(root, "premises.js"), "utf8");
var v20 = fs.readFileSync(path.join(root, "v20.js"), "utf8");
if (/fetch\s*\(|XMLHttpRequest|https?:\/\//.test(pre)) throw new Error("premises.js 不该有网络调用");
if (/烤箱|教程|清单|景德镇/.test(pre)) throw new Error("前提检查不该写领域词");
if (!/LingcunPremises\.settle\(/.test(v20)) throw new Error("候选没有走进前提检查");
if (!/id="premise-note"/.test(v20) && !/premise-note/.test(v20)) throw new Error("检查结果没有接到页面");
var ctx = {};
vm.runInNewContext(user + "\n" + pre, ctx);
var U = ctx.LingcunUserState, P = ctx.LingcunPremises;
var n = 0, fail = 0;
function ok(name, cond, extra) {
  n++;
  if (!cond) { fail++; console.log("FAIL " + name + (extra ? " " + extra : "")); }
  else console.log("ok " + name);
}
function need(pack, resource) {
  var rows = [];
  (pack.results || [pack]).forEach(function (r) { (r.needs || []).forEach(function (item) { if (item.resource === resource) rows.push(item); }); });
  return rows[0];
}

var sky = U.ingest("我想观测流星", "idea");
var look = { text: "今晚只抬头看两分钟", author: "candidate", needs: [], uses: ["r1-1"] };
var bare = P.settle(sky, [look]);
ok("没提资源仍可展示", bare.verdict === "show" && bare.display.action === look.text && bare.verified === false, JSON.stringify(bare.display && bare.display.note));
ok("没声明的前提不算已经可行", bare.display.needs.length === 0 && /没有读懂整句话/.test(bare.display.note));

var owned = U.ingest("我有望远镜", "idea");
var ownedId = owned.current.facts[0].id;
var useScope = { text: "把望远镜对着北方", needs: [{ resource: "望远镜", key: true, claim: "have", evidenceId: ownedId }], uses: [ownedId] };
var ownedPack = P.settle(owned, [useScope]);
ok("原话里有的资源可以通过", ownedPack.verified === true && need(ownedPack, "望远镜").status === "met" && need(ownedPack, "望远镜").evidenceText === "我有望远镜");

var none = U.ingest("我想观测流星，没有望远镜", "idea");
var blocked = { text: "先架好望远镜", needs: [{ resource: "望远镜", key: true, claim: "have" }], uses: [] };
var open = { text: "今晚只抬头看两分钟", needs: [], uses: [] };
var denied = P.settle(none, [blocked, open]);
ok("否定条件拦住架望远镜", denied.results[0].verdict === "revise" && need(denied, "望远镜").status === "denied");
ok("不靠望远镜的做法继续", denied.verdict === "show" && denied.display.action === open.text && denied.display.action.indexOf("望远镜") < 0);

var phone = U.ingest("我有手机", "idea");
var phoneId = phone.current.facts[0].id;
var parts = { text: "用手机打开付费软件并联网同步", needs: [
  { resource: "手机", key: true, claim: "have", evidenceId: phoneId },
  { resource: "付费软件", key: true, claim: "have", evidenceId: phoneId },
  { resource: "网络", key: true, claim: "have" }
] };
var partial = P.review(phone, parts);
ok("手机不能代替软件和网络", partial.needs[0].status === "met" && partial.needs[1].status === "invalid" && partial.needs[2].status === "unknown" && partial.verdict === "clarify" && partial.question.indexOf("付费软件") >= 0 && partial.question.indexOf("网络") < 0, JSON.stringify(partial.needs));

var back = P.answer(phone, [parts], "我有付费软件");
ok("确认写回同一份记录", phone.current.facts.some(function (f) { return f.text === "我有付费软件" && f.sourceId === "premise"; }));
ok("写回后只剩网络没确认", back.verdict === "clarify" && back.question.indexOf("网络") >= 0 && back.results[0].needs[1].status === "met");

U.withdraw(phone, phoneId);
var afterWithdraw = P.review(phone, { text: "只用手机记两笔", needs: [{ resource: "手机", key: true, claim: "have", evidenceId: phoneId }] });
ok("撤回后旧资源不能通过", afterWithdraw.needs[0].status !== "met" && afterWithdraw.verified === false, afterWithdraw.needs[0].status + afterWithdraw.needs[0].reason);

var old = U.ingest("我有谱架", "idea");
var oldId = old.current.facts[0].id;
old = U.replaceSource(old, "现在只想先哼一遍", "idea");
var stale = P.review(old, { text: "把谱架摆好", needs: [{ resource: "谱架", key: true, claim: "have", evidenceId: oldId }] });
ok("旧版本不能通过", stale.needs[0].status === "invalid" && /旧版本/.test(stale.needs[0].reason), stale.needs[0].reason);

var guess = U.ingest("如果我有潜水泵", "idea");
var gid = guess.current.inferences[0].id;
var guessed = P.review(guess, { text: "启动潜水泵", needs: [{ resource: "潜水泵", key: true, claim: "have", evidenceId: gid }] });
ok("推测不能当成已有", guessed.needs[0].status === "invalid" && guessed.verified === false, guessed.needs[0].reason);

var researched = P.review(sky, { text: "按案例去买一台设备", needs: [{ resource: "设备", key: true, claim: "have", evidenceId: "E01" }], research: [{ id: "E01", text: "案例里的人有设备" }] });
ok("研究案例不能通过", researched.needs[0].status === "invalid" && researched.cites.some(function (c) { return c.bucket === "research" && !c.ok; }) && JSON.stringify(sky.current).indexOf("设备") < 0);

var pot = U.ingest("我想烤面包，没有锅", "idea");
var hot = P.settle(pot, [{ text: "把锅预热十分钟", needs: [{ resource: "锅", key: true, claim: "have" }] }]);
ok("没有锅的做法被拦住", hot.verdict === "revise" && hot.display && hot.display.action.indexOf("锅") < 0 && hot.display.author === "premise-alt", hot.display && hot.display.action);
ok("替代没有被标成已核实", hot.verified === false && hot.display.verified === false);

var handwritten = P.review(pot, { text: "把锅预热十分钟", author: "user", needs: [] });
ok("手写行动不被改写", handwritten.action === "把锅预热十分钟" && handwritten.userOwned === true && handwritten.verified === false && handwritten.verdict === "revise");

var organ = U.ingest("我想修管风琴，没有谱架", "idea");
var stand = P.settle(organ, [
  { text: "先把谱架立起来", needs: [{ resource: "谱架", key: true, claim: "have" }] },
  { text: "先哼出想修的那一段", needs: [] }
]);
ok("没见过的资源同样被拦住", stand.results[0].verdict === "revise" && stand.display.action === "先哼出想修的那一段");

var both = U.ingest("我有琴，又没有琴", "idea");
var clash = P.review(both, { text: "用琴弹一个音", needs: [{ resource: "琴", key: true }] });
ok("冲突不选边", clash.needs[0].status === "conflict" && clash.verdict === "revise", clash.needs[0].reason);

var saved = JSON.parse(JSON.stringify({ record: pot, premise: hot }));
ok("保存后前提和未确认还在", saved.premise.pending === true && saved.premise.verified === false && saved.premise.results[0].needs[0].status === "denied" && saved.record.current.constraints[0].text === "没有锅");
var restored = P.settle(saved.record, [{ text: "把锅预热十分钟", needs: [{ resource: "锅", key: true, claim: "have" }] }]);
ok("恢复后仍不把没有锅当成已有", restored.verdict === "revise" && restored.verified === false);

console.log("\n例一 之前：没有锅仍可能被写成把锅预热。之后：");
console.log(JSON.stringify({ needs: hot.results[0].needs, verdict: hot.verdict, shown: hot.display.action, verified: hot.verified }, null, 2));
console.log("\n例二 之前：有手机会被当成也能开付费软件、也能联网。之后：");
console.log(JSON.stringify({ needs: partial.needs, verdict: partial.verdict, question: partial.question, verified: partial.verified }, null, 2));

console.log(fail ? ("FAILED " + fail + "/" + n) : ("passed " + n));
process.exit(fail ? 1 : 0);
