/* 只检查这份状态机器：分桶、原话位置、改口、矛盾、迟到回应、旧档。
   通过不代表模型读懂了人话。本文件不发网络请求。 */
var fs = require("fs");
var vm = require("vm");
var path = require("path");
var root = path.join(__dirname, "..", "_build");
var src = fs.readFileSync(path.join(root, "userstate.js"), "utf8");
var p2 = fs.readFileSync(path.join(root, "p2.js"), "utf8");
var v20 = fs.readFileSync(path.join(root, "v20.js"), "utf8");
if (/fetch\s*\(|XMLHttpRequest|https?:\/\//.test(src)) throw new Error("userstate.js 里不该有网络调用");
if (!/var LIVE_AI = false/.test(p2)) throw new Error("真实调用开关没有关掉");
if (!/!evalOn\(\) && typeof LIVE_AI !== "undefined" && LIVE_AI === false\) \{ resolve\(null\); return;/.test(p2)) throw new Error("发布默认仍应在发送前返回");
if (/var LIVE_AI/.test(v20)) throw new Error("v20 不该再声明另一份开关");
var ctx = {};
vm.runInNewContext(src, ctx);
var U = ctx.LingcunUserState;
var n = 0, fail = 0;
function ok(name, cond, extra) {
  n++;
  if (!cond) { fail++; console.log("FAIL " + name + (extra ? " " + extra : "")); }
  else console.log("ok " + name);
}
function texts(list) { return (list || []).map(function (x) { return x.text; }); }
function spansOk(state) {
  return ["facts", "constraints", "intents", "inferences"].every(function (k) {
    return state.current[k].every(function (x) {
      if (x.start < 0) return x.evidence === x.text;
      return state.text.slice(x.start, x.end) === x.text;
    });
  });
}

var resign = U.ingest("我想离职，钱够半年，也确认不想留在这行业", "idea");
ok("离职是意愿", texts(resign.current.intents).indexOf("我想离职") >= 0 && resign.current.intents.filter(function (x) { return x.text === "我想离职"; })[0].polarity === "want");
ok("钱是自述条件", texts(resign.current.constraints).indexOf("钱够半年") >= 0);
ok("离开行业是不想", resign.current.intents.some(function (x) { return x.text === "也确认不想留在这行业" && x.polarity === "dont"; }));
ok("没有补新目标", resign.current.facts.length === 0 && U.view(resign).unknowns.length === 0 && JSON.stringify(U.view(resign)).indexOf("学习") < 0);
ok("原话位置对得上", spansOk(resign));

var neg = U.ingest("不是我做过培训师", "s");
ok("否定整句留下", neg.current.facts.length === 0 && texts(neg.current.constraints).indexOf("不是我做过培训师") >= 0);

var reported = U.ingest("他说我应该离职", "s");
ok("转述不是本人事实", reported.current.facts.length === 0 && reported.current.intents.length === 0 && reported.current.inferences[0].polarity === "reported");
ok("转述不进贴纸", U.stickers(reported).length === 0);

var hyp = U.ingest("如果我去学陶艺", "s");
ok("假设是待确认", hyp.current.facts.length === 0 && hyp.current.inferences[0].polarity === "hypothesis");

var both = U.ingest("我想离职，又不想离职", "s");
ok("矛盾两边都在", both.current.intents.length === 2 && both.contradictions.length === 1);
ok("没有替人选边", texts(both.current.intents).indexOf("我想离职") >= 0 && texts(both.current.intents).indexOf("又不想离职") >= 0);

var pair = U.ingest("想多陪孩子，又想独处", "s");
ok("两个都想不算已解决", pair.current.intents.length === 2 && pair.contradictions.length === 0);

var changed = U.ingest("我想学摄影", "idea");
changed = U.replaceSource(changed, "现在发现其实只想出门走走", "idea");
ok("旧意愿进历史", changed.history.some(function (x) { return x.text === "我想学摄影" && x.status === "superseded"; }));
ok("旧意愿不在当前", texts(changed.current.intents).indexOf("我想学摄影") < 0 && texts(changed.current.intents).indexOf("现在发现其实只想出门走走") >= 0);
var before = JSON.stringify(changed.current);
ok("迟到回应被拒绝", U.acceptLate(changed, 1, [{ text: "我想学摄影" }]) === false);
ok("迟到回应不改当前", JSON.stringify(changed.current) === before && changed.lateRejected.length === 1);

var same = U.ingest("上次想学摄影，现在发现其实只想出门走走", "idea");
ok("同一句里的上次被取代", same.history.some(function (x) { return x.text === "上次想学摄影" && x.status === "superseded"; }) && texts(same.current.intents).indexOf("上次想学摄影") < 0);

var bread = U.ingest("我想烤面包，没有锅，钱为0", "s");
ok("未知资源不补", JSON.stringify(U.view(bread)).indexOf("教程") < 0 && JSON.stringify(U.view(bread)).indexOf("烤箱") < 0 && U.view(bread).unknowns.length === 0);
ok("锅和钱是条件", texts(bread.current.constraints).indexOf("没有锅") >= 0 && texts(bread.current.constraints).indexOf("钱为0") >= 0);

var guess = U.ingest("如果以后去做陶艺", "s");
var gid = guess.current.inferences[0].id;
U.confirm(guess, gid);
ok("确认后才进入当前", guess.current.inferences.length === 0 && U.stickers(guess).indexOf("如果以后去做陶艺") >= 0 && guess.current.facts[0].confirmed === true);
U.withdraw(guess, guess.current.facts[0].id);
ok("撤回后只留历史", U.stickers(guess).indexOf("如果以后去做陶艺") < 0 && guess.history.some(function (x) { return x.status === "withdrawn"; }));

var old = U.migrate({ idea: "办过线下活动策划", notes: "现场观察十年", lib: ["讲故事", "做内容"] });
ok("旧档只读原话", U.stickers(old).indexOf("办过线下活动策划") >= 0 && JSON.stringify(old).indexOf("现场观察") < 0 && JSON.stringify(old).indexOf("讲故事") < 0);

var round = JSON.parse(JSON.stringify(changed));
ok("保存后版本和类型还在", round.inputRev === 2 && round.history[0].status === "superseded" && round.current.intents[0].bucket === "intent");

var a = U.ingest("我想离职", "a");
var b = U.ingest("我想烤面包", "b");
ok("别的输入不会串进来", JSON.stringify(a).indexOf("烤面包") < 0 && JSON.stringify(b).indexOf("离职") < 0);

U.refuseExternal(a);
ok("外部材料写不进事实", JSON.stringify(a.current).indexOf("年轻人") < 0);

var down = U.view(resign);
var consumed = down.facts.concat(down.constraints, down.intents).map(function (x) { return x.text; }).sort().join("|");
ok("下游和贴纸是同一份", U.stickers(resign).slice().sort().join("|") === consumed);
ok("推测不在下游已知条件里", consumed.indexOf("如果") < 0);

console.log(fail ? ("FAILED " + fail + "/" + n) : ("passed " + n));
process.exit(fail ? 1 : 0);
