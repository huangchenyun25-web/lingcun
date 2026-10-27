#!/bin/sh
# v0.0.17：在 v0.0.16 基础上加 v17.css / v17.js（宽屏入口两栏；去掉重复副标题）。
# v0.0.16：在 v0.0.15 基础上加 v16.css / v16.js（入口 2A、结果三行、分享卡、庆祝档、Rive ST01/L01、静音、四 bug、分享计数 3A）。
# v0.0.15：只管第一步、现实行动、定时间地点、摘星完成态；库 first_step_lib_v2.json。
cd "$(dirname "$0")/.." && python3 _build/lib_tag.py > /tmp/lc_lib14.html && head -n -1 _build/p1_body.html > /tmp/lc_body14a.html && tail -n 1 _build/p1_body.html > /tmp/lc_body14b.html && \
cat _build/p0_head.html _build/p1.css _build/v14.css _build/v15.css _build/v16.css _build/v17.css /tmp/lc_body14a.html /tmp/lc_lib14.html /tmp/lc_body14b.html _build/p2.js _build/p3.js _build/p4.js _build/jd.js _build/fx.js _build/v12.js _build/v13.js _build/v14.js _build/v15.js _build/v16.js _build/v17.js _build/p5.js > page/index.html && python3 -c "
import re;s=open('page/index.html').read();open('/tmp/x14.js','w').write(re.search(r'<script>(.*)</script>\s*</body>',s,re.S).group(1))" && node --check /tmp/x14.js && echo BUILD_OK
if [ "$1" != "nofonts" ]; then /workspace/fontenv/bin/python _build/fonts.py && echo FONTS_OK; fi
