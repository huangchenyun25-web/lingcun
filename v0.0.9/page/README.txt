另存人生 v0.0.9 · 页面说明
==========================

文件：index.html（单个文件，CSS/JS 都在里面）。双击打开，或放到 GitHub Pages 的任一路径下都能用。
规则来源：《引导协议_v0.0.9.md》。改动依据：GitHub issue #8–#12（含 #11、#12 定稿评论）、《方案_#11#12_整体修改_v0.0.9.md》定稿、《实时反馈_待改.md》第 98–108 条。
源码分块在 ../_build/（p1.html 样式和骨架 / p2.js AI 入口层 / p3.js 类目配置 / p4.js 共用流程 / jd.js JD 库 / p5.js 能力对照、卡住能问、启动），
改完跑 ../_build/build.sh 拼成 index.html（会顺带 node --check）。

一、共用流程（六个固定阶段，只显示名字，不显示 n/m）
----------------------------------------------------
选想做的东西 → 补齐材料 → 做出第一版 → 检查与修改 → 保存 → 换材料再做/继续完善
- 「做成程度」在「检查与修改」里，排在「保存」之前；可以选「不确定，先跳过」。
- 每个阶段最后都有一行「下一步：…」和对应按钮。
- 每个阶段下面都有「卡住了？直接告诉我你看到什么」，问完点「回到这一步」，选择都还在原地。

二、类目配置（p3.js 的 CATS）
-----------------------------
小说创作 / 摄影作品整理 / 简历整理 / 小工具制作 / 经历复盘（活动、内容运营、项目或产品、其他，各有自己的题）/ 通用（对不上类目时用，不硬套）。
每份配置写：交付物、怎样算做成、预置问题（按缺的显示，已知的不再问）、产物结构（JSON Schema）、生成规则、本类事实规则、检查方式、换材料再做时保留哪些设置。
- 事实规则下放到类目：小说可以虚构（跳过的设定由 AI 创作）；简历、经历复盘不许编造、不许拔高，跳过的写「待补」。
- 每道选择题都有「不确定，先跳过」和「其他，我自己写」；跳过的项显示为「待补」。
- 生成粒度：中长篇小说先出结构再一段段展开；微小说/短篇直接写；简历直接出一版；照片先出编排预览（照片本身不发给 AI，只发说明）；小工具直接出单文件小网页。
- 内容类目只让 AI 返回内容（JSON），页面用模板排版；只有小工具让 AI 写 HTML。

三、AI 由谁来跑
--------------
1. 直连（用户自己的 API 密钥）：右上角「AI：…」。默认 stream:true（SSE），流式读不了就自动回退成一次性返回；格式不对修复重试一次。
   关思考（2026-10-23 按官方文档核对）：
     DeepSeek  模型 deepseek-flash（V4.1-Flash），默认开思考 → 发 thinking:{type:"disabled"}
     通义千问  模型 qwen-plus（混合思考，默认不开）→ 显式发 enable_thinking:false
     OpenAI    模型 gpt-6-luna → 发 reasoning_effort:"none"
   请求一开始就显示「已等 N 秒」和已写出的字；超过 10 秒出现「继续等 / 取消」。两分钟没回就停。
2. agent 模式（只给 agent 用，人看不到）：网址加 ?ai=agent，或 window.lingcunAI.enable()。
   任务块 <script type="application/json" data-ai-task="<id>">，字段：lingcun_task、id、type、category、role、instructions、fact_rule、inputs、output_schema、how_to_submit。
   交结果：window.lingcunAI.submit(id, 结果) 或隐藏表单（textarea[data-ai-result-for] + button[data-ai-submit]）。
   任务类型：novel_outline / novel_draft / novel_section / novel_revise / novel_revise_section / photo_layout / photo_revise /
            resume_draft / resume_revise / build_tool / revise_tool / case_page（改也用它）/ generic_draft / generic_revise / event_search / ask。
3. ?ai=mock：测试专用，界面上不出现；可加 &mockdelay=毫秒。

计时：每次请求在控制台打一行「[lingcun timing] {...}」，也可以读 window.lingcunAI.timings：
  started_at、first_token_ms（首字）、full_ms（完整）、parse_ms（解析）、retries（重试）、stream、stream_fallback、ok、error。

四、进度和存档
--------------
- 进度只存在这个浏览器的 localStorage（lingcun_v009_state），网址里不带任何进度；旧版 #state= 链接打开时会被清掉，不读取。
- 回来时显示「上次做到这里，留下了这个问题：…」+ 继续 / 修改 / 先放下。
- 换电脑：页面最下面「存档与恢复」→ 下载存档文件（.json），在新电脑上用「从存档文件恢复」。
- API 密钥单独存（lingcun_v009_apikey），不进存档文件，「忘掉密钥」可以删。

五、能力对照（可选增强模块）
---------------------------
只在复盘 / 简历的「检查与修改」和「换材料再做」里作为可选按钮出现。不打分、不出现孤立的「强」；只凭描述最多是「初步匹配度高」；
笼统的描述先追问「你本人具体做了哪几件事？结果是什么」；附没附 / 核对没 / 能不能公开分开记；依据写进正文；D1–D3 只在内部。
还没收 JD 的方向 → 给「写一段和这个方向有关的经历复盘」；还没看到相关经历的项 → 一键开一个补它的项目。

五b、第二轮（#16–#18）
--------------------
- 入口：写点东西 / 整理已有材料（目前只有照片）/ 做个小工具 + 说说你的想法 + 还没想好，看看例子；场景卡「讲清楚我自己」（简历 / 经历复盘 / 作品介绍，作品介绍走通用、写真实的事）。模糊时本地澄清，不调 AI。
- 背包：右上角「🎒 背包 (N)」，任何阶段可开；筛选；详情里选 查看成果 / 继续修改这一件 / 沿用设置做一件新的 / 下载 / 开始别的创作。项目新增 createdAt、updatedAt、from；AI 标题回写为项目名。
- 发布：注册 / 登录 / 新建仓库可点；「下载为 index.html（放 GitHub 用）」；选填用户名和仓库名生成上传页、Pages 设置页、预计网址（存在 state.gh）。

六、联网
--------
页首和页脚：「生成和修改时，你提供的相关内容会发送给所选的 AI 服务处理。额外搜索网上资料，只在你主动选择并确认搜索内容后进行。」
搜索只在经历复盘（活动）里：「查找这次活动的公开资料」，要先确认搜索词。页面本身不统计、不加载外部文件。

七、测试
--------
cd ../_test && npm i && node test.js   （结果写到 _test/result.txt，截图在 ../shots/）
真实计时脚本在 ../_timing/（需要环境变量 DEEPSEEK_API_KEY，脚本不打印密钥）。
