#!/usr/bin/env python3
# v0.0.19：建成的 page/index.html 里不再留下旧薰衣草色，也不再留毛玻璃 / blur()。
# onblur 这类事件名不动（那不是视觉模糊）。
import pathlib, re, sys

p = pathlib.Path("page/index.html")
s = p.read_text(encoding="utf-8")

HEX = {
    "#F3F0F9": "#F7F0DF",
    "#C9B8F5": "#5E72B5",
    "#231C45": "#232B55",
    "#2A2152": "#4A5C9B",
    # 同族淡紫，避免分享图和光晕还停在旧色上
    "#B9A6EE": "#5E72B5",
    "#B4A1EF": "#4A5C9B",
    "#B7A4EE": "#5E72B5",
    "#D3C6F6": "#E9DDBF",
    "#D9CEF8": "#E9DDBF",
    "#EAE4F8": "#F7F0DF",
    "#F2EFF8": "#FFFBF1",
    "#E7E0F6": "#F7F0DF",
    "#F7F4FF": "#FFFBF1",
    "#F7F4FC": "#F7F0DF",
    "#E4E1EA": "#E9DDBF",
    "#B9B4C8": "#4A5C9B",
    "#DAD6E4": "#E9DDBF",
    "#ECE8FF": "#F7F0DF",
    "#7C6BD6": "#5E72B5",
    "#6B4A6A": "#232B55",
    "#7A1F3D": "#232B55",
}

def hexsub(m):
    return HEX[m.group(0).upper()]

s = re.sub(r"#(?:F3F0F9|C9B8F5|231C45|2A2152|B9A6EE|B4A1EF|B7A4EE|D3C6F6|D9CEF8|EAE4F8|F2EFF8|E7E0F6|F7F4FF|F7F4FC|E4E1EA|B9B4C8|DAD6E4|ECE8FF|7C6BD6|6B4A6A|7A1F3D)", hexsub, s, flags=re.I)

RGB = {
    (243, 240, 249): (247, 240, 223),
    (201, 184, 245): (94, 114, 181),
    (35, 28, 69): (35, 43, 85),
    (42, 33, 82): (74, 92, 155),
    (60, 45, 120): (35, 43, 85),
    (140, 120, 200): (74, 92, 155),
}

def rgbsub(m):
    nums = re.findall(r"[\d.]+", m.group(0))
    key = (int(float(nums[0])), int(float(nums[1])), int(float(nums[2])))
    if key not in RGB:
        return m.group(0)
    r, g, b = RGB[key]
    if m.group(0).lower().startswith("rgba"):
        alpha = nums[3] if len(nums) > 3 else "1"
        return "rgba(%d, %d, %d, %s)" % (r, g, b, alpha)
    return "rgb(%d, %d, %d)" % (r, g, b)

s = re.sub(
    r"rgba?\(\s*(?:243\s*,\s*240\s*,\s*249|201\s*,\s*184\s*,\s*245|35\s*,\s*28\s*,\s*69|42\s*,\s*33\s*,\s*82|60\s*,\s*45\s*,\s*120|140\s*,\s*120\s*,\s*200)(?:\s*,\s*[\d.]+)?\s*\)",
    rgbsub,
    s,
    flags=re.I,
)

# 拼进字符串的颜色，例如 "rgba(35,28,69," + alpha，没有成对的括号
for a, b in (
    ("243, 240, 249", "247, 240, 223"),
    ("243,240,249", "247, 240, 223"),
    ("201, 184, 245", "94, 114, 181"),
    ("201,184,245", "94, 114, 181"),
    ("35, 28, 69", "35, 43, 85"),
    ("35,28,69", "35, 43, 85"),
    ("42, 33, 82", "74, 92, 155"),
    ("42,33,82", "74, 92, 155"),
    ("60, 45, 120", "35, 43, 85"),
    ("60,45,120", "35, 43, 85"),
    ("140, 120, 200", "74, 92, 155"),
    ("140,120,200", "74, 92, 155"),
):
    s = s.replace(a, b)

s = re.sub(r"(?:-webkit-)?backdrop-filter\s*:[^;}{]*;?", "", s, flags=re.I)
s = re.sub(r"(?:-webkit-)?filter\s*:\s*blur\([^)]*\)\s*;?", "", s, flags=re.I)

p.write_text(s, encoding="utf-8")

low = s.lower()
bad = []
for token in ("#f3f0f9", "#c9b8f5", "#231c45", "#2a2152", "backdrop-filter"):
    if token in low:
        i = low.find(token)
        bad.append(token + " @ " + s[max(0, i - 40):i + 60].replace("\n", " "))
if re.search(r"blur\s*\(", low):
    i = low.find("blur")
    bad.append("blur( @ " + s[max(0, i - 40):i + 40].replace("\n", " "))
for trip in ("243,240,249", "243, 240, 249", "201,184,245", "201, 184, 245", "35,28,69", "35, 28, 69", "42,33,82", "42, 33, 82"):
    if trip in low:
        bad.append("rgb " + trip)
if bad:
    sys.stderr.write("PALETTE_FAIL\n" + "\n".join(bad) + "\n")
    sys.exit(1)
print("PALETTE_OK")
