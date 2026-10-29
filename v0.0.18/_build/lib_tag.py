# 把第一步库原样内嵌成 <script type="application/json" id="lc-lib">（压成一行；"</" 转义，避免提前结束 script）
import json, os
SRC = os.path.join(os.path.dirname(os.path.abspath(__file__)), "first_step_lib_v2.json")
d = json.load(open(SRC, encoding="utf-8"))
s = json.dumps(d, ensure_ascii=False, separators=(",", ":")).replace("</", "<\\/")
print('<script type="application/json" id="lc-lib">' + s + "</script>")
