另存人生 v0.0.8 · 页面说明
==========================

文件：index.html（单个文件，CSS/JS 都在里面）。双击打开，或放到 GitHub Pages 的任一路径下都能用。
规则来源：《引导协议_v0.0.8.md》。改动依据：《实时反馈_待改.md》第 68–89 条；GitHub issue #1–#6。

一、这一版做了什么
------------------
- 一切在页面里产生（第 78 条）：追问、做出小网页、预览、自动检查、改一处、下载、保存；复盘案例的提问、生成、预览、数字核对、包装、策划提案，都在这一页里。
  已删除：「复制说明给你的 AI」、进度回传码、召唤摘要指令、回来报告页。
- 拟人化开场（第 75 条）；不问电脑还是手机、不做设备判断（第 74 条）。
- 改成「已有证据」要答两道选择题，页面判断强 / 待补强 / 退回（第 68 条；第 89 条放宽：非英文项「公开链接或账号 / 数据或报告」+「主导 / 参与执行」= 强，只有「协助过 / 只做过一点」或「其他」没写才退回；英文项不变）。
- 题目说人话、项目卡写死输入例子、AI 的问题都带 A/B/C +「其他」（第 69 条）。
- 复盘案例：7 道题的固定顺序、上传图片或上网找 A/B 候选、过去时、设想单列、包装、策划提案单独成文、下载一页 html、OpenDesign 外链（第 73、76、77、79、80 条）。
- 保存后一定有下一步（第 81 条）；做成程度三档（第 82 条）；经历数据三级 D1–D3 只作页面内部逻辑（第 83、88 条，已定）：页面不显示级别、没有级别选择，只给「还可以补点什么」的提示，到 D3 一句肯定；级别仍驱动提示和第 68 条升级；两条滑轴（第 84 条）；公开方式六选一（第 72 条）。

二、AI 由谁来跑（AI 入口层，第 85 条）
--------------------------------------
页面右上角「AI：……」可以随时换。第一次需要 AI 时页面会问一次。

1. agent 模式（只给 Codex / Claude Code / Grok Bot 这类 agent 用；第 86 条）
   - 只在明确要求时打开：网址加 ?ai=agent，或在页面里调用 window.lingcunAI.enable()（只在本次打开有效，不存盘）；
     window.lingcunAI.disable() 退出。页面不按 navigator.webdriver 等自动化特征猜——真人的浏览器也可能被识别成自动化。
   - 人看不到任务块：页面上只有一行「AI 正在帮你想…」（可展开「等太久了？换一种方式」），结果交回后是正常的选择题和预览。
     右上角设置里也没有 agent 选项；没密钥的人看到的是下面第 3 条的三条路。
   - 给机器读（都在 DOM 里，不可见）：
       <script type="application/json" id="ai-task-<id>" data-ai-task="<id>">  任务 JSON：lingcun_task、id、type、role、instructions、inputs、output_schema、how_to_submit
       <form hidden data-ai-form="<id>">
         <textarea data-ai-result-for="<id>">   写结果 JSON
         <button data-ai-submit="<id>">         对它调 click()
         <output data-ai-error-for="<id>">      格式错误写在这里
   - 脚本接口：
       window.lingcunAI.enable() / disable()
       window.lingcunAI.pending()          → 待办任务数组
       window.lingcunAI.submit(id, 结果)    → {ok:true} 或 {ok:false, errors:[...]}
       （结果可以是对象，也可以是 JSON 字符串；允许包在 ```json 代码块里）
       window.lingcunAI.mode() / setMode("agent"|"direct")
   - 页面最上面有 <meta name="lingcun-ai-protocol"> 和一段 HTML 注释，写的就是上面这些。
   - 任务类型：tool_questions / build_tool / revise_tool / case_page / case_pack / next_plan / event_search / match_score。

2. 用我的 API 密钥（直接打开网页的人）
   - 预设：DeepSeek（https://api.deepseek.com，模型 deepseek-flash）
           通义千问 · 阿里云百炼 OpenAI 兼容模式（https://dashscope.aliyuncs.com/compatible-mode/v1，模型 qwen-plus）
           OpenAI（https://api.openai.com/v1，模型 gpt-6-luna）
           其他 OpenAI 兼容接口（自己填地址和模型名）
     地址和模型名都能改；模型名按 2026-10 能查到的服务商文档填写，没用有效密钥实测过。
   - 浏览器直接 POST {地址}/chat/completions，带 Authorization: Bearer 密钥，response_format=json_object；格式不对自动请模型重答一次；2 分钟超时。
   - 密钥只存在这个浏览器的 localStorage（键名 lingcun_v008_apikey），不写进进度、不写进 #state= 存档链接、不发给另存人生；「忘掉密钥」按钮会删掉它。「清空进度」不删密钥。
   - 页面上写清了：你写的内容会从浏览器直接发给你选的服务商；密钥能花你账户的额度，别在公用电脑上存。
   - 联网搜索（复盘案例「上网找找」）只在通义预设下打开（enable_search）；兼容模式不返回来源，搜到的链接要用户自己点开核对。别的预设会提示：换成通义 / 自己贴链接 / 跳过。

3. 还没有密钥的人（第 87 条；原来的「先不用 AI」模式已去掉）
   - 走到要 AI 的一步，只看到「这一步要请 AI 帮忙想」和三条路，没有 JSON：
       填 API 密钥 —— 打开密钥表单，填好点「保存」，这一步自己接着跑；
       还没有密钥？怎么拿一个 —— 三步大白话 + 官方链接（2026-10-23 核对过能打开）：
         DeepSeek 开放平台 API Keys：https://platform.deepseek.com/api_keys （DeepSeek 官方文档首页指向这里；本机 curl 直接打开被它的防护拦了，浏览器里正常）
         阿里云百炼 API Key：https://bailian.console.aliyun.com/cn-beijing/model/settings/api-key
         百炼官方说明《获取与配置 API Key》：https://help.aliyun.com/zh/model-studio/get-api-key
         只写「按用量计费，以服务商页面为准」，不写价格；
       先保存进度，拿到密钥再回来 —— 存进度（本浏览器 + #state=），说清回来的办法：同一浏览器再打开点「接着做」，换设备用「复制存档链接」。
   - 评分「先不评，空着」、上网找「自己贴链接 / 跳过」、「换一个更小的题目」照旧在。
   - 以前存过「不用 AI」设置的浏览器，打开后当作还没填密钥。

4. 测试专用：网址加 ?ai=mock，用内置模拟结果。界面上不出现这个选项。

三、跨域（CORS）实测
--------------------
测试时间：2026-10-23 16:03（北京时间）。方法：从测试机用 curl 模拟浏览器发预检（OPTIONS，带 Origin、Access-Control-Request-Headers: authorization,content-type），再用一个无效密钥 POST 一次看错误响应。测试机不在中国大陆网络。

| 服务 | 预检（Origin: GitHub Pages 域名） | 预检（Origin: null，即双击打开的文件） | 无效密钥时的 401 带不带跨域许可 |
|---|---|---|---|
| DeepSeek api.deepseek.com | 通过（回显来源） | 通过 | 带，页面能读到「密钥不对」 |
| 通义 dashscope.aliyuncs.com/compatible-mode/v1 | 通过（*） | 通过（*） | 带，页面能读到「密钥不对」 |
| OpenAI api.openai.com/v1 | 通过（回显来源） | 通过 | 不带：密钥错时页面只能提示「连不上」 |

没测的（不要当成已经可用）：
- 用有效密钥的完整调用（三家都没测）。
- 在中国大陆网络下打开页面直连（OpenAI 一般连不上；DeepSeek、通义理论上可以，没实测）。
- 通义新版控制台给的「业务空间」地址（xxx.cn-beijing.maas.aliyuncs.com/compatible-mode/v1）的跨域情况。
- 各家对 response_format=json_object 的实际支持、模型名是否仍有效。
- 「其他」预设的任何服务。
页面里的直连代码路径（跨域预检、Authorization、JSON 修复重试、错误提示）用本机假接口在真实浏览器里测过，见 _test。

四、隐私与网络
--------------
- 默认打开不发任何网络请求（自动测试核对过）。官网 JD 来源、OpenDesign、搜索候选的来源都是普通链接，点了才打开。
- 只有你选了「用我的 API 密钥」，你写的内容才会从浏览器发给你选的服务商。
- 进度：localStorage（lingcun_v008_state）+ 地址里的 #state=。存档链接只带进度和文字，不带做出来的文件（小网页 html）和图片。图片单独存在本浏览器（lingcun_v008_files_<项目>_img），最多 3 张、缩到 1000 像素以内。
- 预览：沙箱 iframe（只给 allow-scripts，没有 allow-same-origin），再加一条 CSP 禁止联网；预览里的存储是临时的。

五、OpenDesign
--------------
保存后的下一步和资产页都有「拿去 OpenDesign 做可视化作品集」：只是外链（https://open-design.ai/solutions/ai-website-builder/portfolio/）+ 做法说明，标「打通方式待查」。
还没查清/没做：它有没有可以直接接入或嵌入的接口；能不能直接读我们下载的 html。按目前能看到的资料，它要装桌面应用或用云端版，并接上用户自己的 AI，和第 78 条「一切在页面里」有冲突，待 Chenyun 定。

六、还没做 / 没测
-----------------
- 未收 JD 的方向：页面里收集 JD 这一步没做，现在直接跳到复盘案例。
- 我们自己的 API + 后端（第 70 条），留到下一轮。
- 有效密钥的真实调用、中国大陆网络、手机实机。
- 真实 agent（Codex / Claude Code）走完整条路：只用自动测试模拟过 agent 交回结果（window.lingcunAI 和隐藏表单两种方式）。
- 语音输入沿用 v0.0.7（浏览器自带），本版没重测。

七、自动测试
------------
cd v0.0.8/_test && npm i && node test.js（需要本机 Chrome：/usr/bin/google-chrome）。截图在 page/shots/。
