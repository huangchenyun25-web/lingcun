# v0.0.12 起：按 page/index.html 里实际出现的字做子集（woff2）。只用 OFL 字体：得意黑、Noto Sans SC、Geist。
# 得意黑的保留字体名（Smiley / 得意黑）不能用在改过的版本上，所以子集内部改名为 LCHead（见 fonts/README.txt）。
import os, re, sys
from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = "/workspace/lingcun/design_next/fonts/files"
OUT = os.path.join(ROOT, "page", "fonts")
html = open(os.path.join(ROOT, "page", "index.html"), encoding="utf-8").read()
chars = set(html)
chars |= set(chr(c) for c in range(0x20, 0x7F))
chars |= set("，。、；：！？「」『』（）《》〈〉…—–·“”‘’％＋－＝／～　")
text = "".join(sorted(c for c in chars if ord(c) >= 0x20))
def sub(font, path, unicodes=None, txt=None):
    o = subset.Options(); o.flavor = "woff2"; o.layout_features = ["*"]; o.name_IDs = ["*"]; o.name_languages = ["*"]; o.notdef_outline = True; o.hinting = False
    s = subset.Subsetter(o)
    if unicodes: s.populate(unicodes=unicodes)
    else: s.populate(text=txt)
    s.subset(font); font.flavor = "woff2"; font.save(path)
    print(os.path.basename(path), os.path.getsize(path) // 1024, "KB")
def rename(font, fam):
    for r in font["name"].names:
        if r.nameID in (1, 4, 16): r.string = fam
        elif r.nameID == 6: r.string = fam + "-Regular"
        elif r.nameID == 3: r.string = fam + ";v0.0.14-subset"
# 标题：得意黑（静态）
f = TTFont(os.path.join(SRC, "SmileySans-Oblique.ttf")); rename(f, "LCHead"); sub(f, os.path.join(OUT, "lc-head.woff2"), txt=text)
# v0.0.13（#37）：AI 写的「第一步」也用得意黑显示。页面没用到的 GB2312 一级常用字另放一个文件 LCHeadX，
# 只排在 LCHead 后面兜底：浏览器只在 LCHead 缺字时才去下载它，平时不加载。
ext = set(bytes([a, b]).decode("gb2312") for a in range(0xB0, 0xD8) for b in range(0xA1, 0xFF) if not (a == 0xD7 and b > 0xF9))
ext = "".join(sorted(ext - set(text)))
f = TTFont(os.path.join(SRC, "SmileySans-Oblique.ttf")); rename(f, "LCHeadX"); sub(f, os.path.join(OUT, "lc-head-ext.woff2"), txt=ext)
# 正文：Noto Sans SC 可变字体，取 300 和 400 两个实例
for w in (300, 400):
    f = TTFont(os.path.join(SRC, "NotoSansSC.ttf")); f = instancer.instantiateVariableFont(f, {"wght": w}); sub(f, os.path.join(OUT, "lc-sans-%d.woff2" % w), txt=text)
# 英文和数字：Geist 可变（拉丁）
f = TTFont(os.path.join(SRC, "Geist.ttf")); sub(f, os.path.join(OUT, "geist.woff2"), unicodes=list(range(0x20, 0x7F)) + [0xA0, 0xB7, 0x2013, 0x2014, 0x2018, 0x2019, 0x201C, 0x201D, 0x2026])
