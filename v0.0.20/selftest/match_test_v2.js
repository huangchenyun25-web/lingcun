/* v0.0.15：用页面里真正的匹配代码跑一遍（v0.0.14 + 库 v1 对比 v0.0.15 + 库 v2）。跑法：node match_test_v2.js */
const fs = require('fs'), path = require('path');
function make(build, lib) {
  const SRC = fs.readFileSync(path.resolve(__dirname, build), 'utf8');
  const CODE = SRC.slice(SRC.indexOf('var KW_NEG'), SRC.indexOf('function libAssign'));
  const LIB = JSON.parse(fs.readFileSync(path.resolve(__dirname, lib), 'utf8'));
  const LIB_CAT = { create: "创造", learn: "学习技能", career: "转行" };
  const CAREER_RE = /转行|转去|转岗|跳槽|换工作|换行业|换个(行业|工作|岗位|方向)/;
  eval(CODE); return { LIB, f: libMatch };
}
const B = make('../v0.0.14/_build/v14.js', 'first_step_lib_v1.json'), A = make('../v0.0.15/_build/v14.js', 'first_step_lib_v2.json');
const OLD = ["我想做一个游戏","我想办一场线下活动","我想做一个线上 NFT 展览","我想做点新东西","我想学日语","零基础学韩语","想考雅思","学Python","我想转行做产品经理","想换工作去做数据分析","做一个品牌活动","开一家咖啡店","学做PPT演讲presentation","我要开一个新的campaign项目","做一个程序","学剪辑","想转去做游戏策划","学画画","做一个播客","写一本小说","建一个读书俱乐部","学吉他","考研","做个小程序记账"];
const NEW = ["学编舞|create","学编舞|learn","学编舞|career","我想学编舞|","编舞|","想编一支舞|create","想学冥想|","想学冥想|learn","学瑜伽|learn","学芭蕾|learn","学架子鼓|learn","学攀岩|create","学游泳|create","学游泳|learn","想学跑步|create","学做饭|create","学吉他|learn","学钢琴|learn","学做小程序|learn","学做App|learn","学做网站|learn","做一个跳舞小游戏|create","鼓励自己早起|learn","编一份周报模板|create","想转行做产品经理|learn"];
const rows = []; let changedOld = 0;
for (const s of OLD.map(x => x + '|').concat(NEW)) {
  const [t, act] = s.split('|'), b = B.f(t, act), a = A.f(t, act);
  const bs = b.lc + '/' + b.id + (b.borrow ? '→借' + b.borrow : ''), as = a.lc + '/' + a.id + (a.borrow ? '→借' + a.borrow : '');
  if (!act && OLD.includes(t) && bs !== as) changedOld++;
  rows.push([t + (act ? '（' + act + '）' : ''), bs, as, bs === as ? '' : '变']);
}
const md = '| 原话 | v0.0.14 | v0.0.15 | |\n|---|---|---|---|\n' + rows.map(r => '| ' + r.join(' | ') + ' |').join('\n') + '\n\n旧用例结果变化：' + changedOld + ' 条（想学冥想按拍板 3 改成冥想条目，不在旧用例里）\n';
fs.writeFileSync(path.resolve(__dirname, 'match_test_v2_result.md'), md); console.log(md);
