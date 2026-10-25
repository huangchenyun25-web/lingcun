另存人生 v0.0.13 · 字体
======================
全部是 SIL Open Font License 1.1 字体，按页面实际用到的字做了 woff2 子集（../../_build/fonts.py，fontTools）。许可原文就在这个文件夹里。

lc-head.woff2      得意黑 Smiley Sans（Oblique）子集。OFL 规定改过的版本不能沿用保留字体名「Smiley」「得意黑」，所以子集内部字体名改成 LCHead。许可：OFL_SmileySans.txt
lc-head-ext.woff2  同一款得意黑，页面没用到的 GB2312 一级常用字（AI 写的「第一步」可能用到）。CSS 名 LCHeadX，只排在 LCHead 后面兜底，缺字时浏览器才下载。
lc-sans-300.woff2  Noto Sans SC 可变字体取 wght 300 的实例再子集（正文）。CSS 名 LCSans。许可：OFL_NotoSansSC.txt
lc-sans-400.woff2  Noto Sans SC wght 400 实例的子集（13px 及以下的小字）。CSS 名 LCSans。
geist.woff2        Geist 可变字体，只留拉丁字母、数字和常用标点（英文和数字）。许可：OFL_Geist.txt

用户自己输入的内容不用这些字体，走系统字体。页面里没有 MiSans、HarmonyOS Sans、OPPO Sans、阿里巴巴普惠体。
