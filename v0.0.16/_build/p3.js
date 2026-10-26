
  /* ========== 类目配置（#8：共用流程 + 类目配置） ==========
     每个类目一份配置：起步问题（预置，按缺什么显示，不让 AI 现场出题）、产物结构、生成规则（含这一类自己的事实规则）、
     生成粒度、检查方式、下一步。全局提示词里不再有「不编造人名、数字、日期、结果」，这条按类目放在 factRule 里。 */
  function F(id, type, t, o, x) { var f = { id: id, type: type, t: t, o: o || [] }; for (var k in (x || {})) f[k] = x[k]; return f; }
  var EXP_TYPES = ["活动（线下活动、快闪、展览、发布会）", "内容运营（账号、选题、写稿、视频）", "项目或产品（需求、方案、上线）", "其他（读书会、志愿服务、比赛……）"];
  function expType(p) { var a = p.a.x_type; if (!a || a.skip || a.other) return "other"; return ["event", "content", "project", "other"][a.i] || "other"; }
  function isType(t) { return function (p) { return expType(p) === t; }; }
  var LEVEL = ["主导：从想法到落地主要是我定的", "执行：我负责其中一块，按方案做完", "协助：我帮忙做了一部分"];
  /* #20【改写】的底线：重组事实、提炼可迁移经验，保留真实职责与成果；不能只换一套行业词，就成了做过新领域的证明 */
  var REWRITE_RULE = "改写的底线：可以围绕用户想去的新方向重新组织事实、提炼可迁移的经验，但保留真实的职责和成果；不能只把行业词换掉，就把没做过的新领域工作写成做过。新方向只能出现在「想去的方向」和 transfer（可迁移的经验）里，不能写进过去的职位、公司、经历条目。";
  var CATS = {
    novel: { id: "novel", name: "小说创作", icon: "", one: "按你的设定写一篇小说：短的直接出正文，长的先出结构再一段段展开",
      eg: "例：一个外卖员在雨夜捡到一只会说话的猫，三千字，温暖一点",
      kw: /小说|故事|短篇|长篇|中篇|微小说|网文|童话|写文/,
      deliverable: "一篇按你的设定写的小说（短的直接出正文；中长篇先出结构，再一段一段展开）",
      done: "能从头读到尾，人物和情节符合你的设定；换一组设定还能再写一篇",
      firstStep: "今天可以先试的一小步：只写一个场景，五百字左右的微小说。",
      take: "一篇你定设定、AI 帮着写出来的小说（中长篇这一局带走：完整的故事结构＋写好的第一段，后面几段之后接着展开）",
      factRule: "这是虚构创作：情节、人物、对白、地点都可以虚构。但用户给定的设定（人物名字、关键情节、文风、篇幅、人称）必须遵守，不改名、不改结局方向。inputs 里写着「待补」的设定，表示用户没定，可以由你来创作。",
      keep: ["n_type", "n_style", "n_len", "n_pov"],
      fields: [
        F("n_plot", "text", "情节：大概发生了什么？（起承转合，几句话就行）", null, { ph: "例：外卖员阿亮雨夜送餐，捡到一只会说话的猫；猫说它在等一个再也不会回来的人；阿亮帮它送最后一单；天亮时猫不见了，只留下一张旧照片。", must: false }),
        F("n_chars", "text", "人物：主角叫什么、是什么样的人？", null, { ph: "例：阿亮，28 岁，外卖员，话不多但心软" }),
        F("n_type", "one", "什么类型？", ["都市日常", "奇幻冒险", "悬疑推理", "科幻", "青春校园"], { guess: [/都市|日常/, /奇幻|魔法|冒险/, /悬疑|推理|凶案/, /科幻|机器人|太空|未来/, /校园|青春|高中|大学/] }),
        F("n_style", "one", "想要什么文风？", ["温暖治愈", "冷静克制", "幽默轻快", "诗意抒情"], { guess: [/温暖|治愈|温柔/, /冷静|克制|冷/, /幽默|搞笑|轻快|轻松/, /诗意|抒情|文艺/] }),
        F("n_len", "one", "多长？", ["微小说（500 字左右，直接出正文）", "短篇（3000 字左右，直接出正文）", "中篇（先出结构，再一段段展开）", "长篇（先出结构，再一段段展开）"], { guess: [/微小说|几百字|500/, /短篇|三千|3000/, /中篇|一万/, /长篇|连载|十万/] }),
        F("n_pov", "one", "谁来讲这个故事？", ["主角自己讲（我……）", "旁边的人看着讲（他 / 她……）"], { guess: [/第一人称|用我/, /第三人称/] })
      ],
      fix: ["情节不连贯", "人物不像我的设定", "文风不对", "太长或太短"],
      self: ["人物名字和我给的一样", "情节大方向是我想要的", "读起来是连贯的"]
    },
    /* v0.0.10（#20 记录 / #25）：真实的人和事单独一类，不进可虚构的小说规则 */
    essay: { id: "essay", name: "真实的记录（散文随笔）", icon: "", one: "把一个人、一件事、一段感受，写成一篇真实的散文或随笔，不虚构",
      eg: "例：写写妈妈做的那道番茄炒蛋，和我第一次学做它的那天",
      kw: /散文|随笔|日记|回忆录|记录一下|写写我/,
      deliverable: "一篇真实的记录：写你给的人和事，不编情节（几百字到一千五百字）",
      take: "一篇你读过、愿意留下的真实记录（写的都是真的人和事）",
      done: "读起来是你自己的事，没有编出来的情节；你愿意留下这一版",
      firstStep: "今天可以先试的一小步：只写一个画面，三五百字。",
      factRule: "这是真实的记录：写的是真实的人和事。可以润色语言、调整顺序、写出感受，但不编造用户没给的人物、事件、对话、地点、数字；细节不够就写得朴素一点，不要用想象补成事实。inputs 里写着「待补」的不要替用户编，把还可以补的细节列进 pending。",
      keep: ["e_len", "e_style"],
      fields: [
        F("e_about", "text", "写谁、写什么事？", null, { must: true, ph: "例：我妈，和她每年冬天腌的那坛萝卜" }),
        F("e_detail", "text", "记得的真实细节（一个画面、一句话、一个味道都行）", null, { ph: "例：她总用那只缺了口的蓝边碗；腌好那天会先夹一块给我尝" }),
        F("e_feel", "text", "现在回想起来，你的感受是什么？", null, { ph: "例：小时候嫌麻烦，现在自己也想学" }),
        F("e_len", "one", "多长？", ["短一点（五六百字）", "一千字左右", "一千五百字左右"], { guess: [/短一点|五百|几百字/, /一千字|1000/, /一千五|1500/] }),
        F("e_style", "one", "想要什么语气？", ["朴素平实", "温暖", "安静克制", "轻松一点"], { guess: [/朴素|平实/, /温暖|温柔/, /安静|克制/, /轻松|幽默/] })
      ],
      fix: ["有细节写得不对", "写进了我没说过的事", "语气不对", "太长或太短"],
      self: ["写的都是真的，没有编出来的情节", "人和事是我记得的样子", "读起来是连贯的"]
    },
    photo: { id: "photo", name: "摄影作品整理", icon: "", one: "把一组照片分组、排顺序，做成一页能给人看的展示页",
      eg: "例：把今年去海边拍的 8 张照片，排成一页发给朋友看的相册",
      kw: /照片|摄影|相册|拍的|图片整理|影集|胶片/,
      deliverable: "一页照片展示页：分好组、排好顺序、配上你的说明（照片只存在你的浏览器里）",
      done: "每张照片都排进去了，图和说明对得上，顺序是你想要的",
      firstStep: "今天可以先试的一小步：只挑 3 张最喜欢的照片，排成一页。",
      take: "一页排好顺序、配好说明的照片展示页",
      factRule: "只依据用户给的照片说明和主题来分组、起标题、写导语；你看不到照片本身，不要猜照片里拍了什么，不编造拍摄地点、时间、人物身份。没有说明的照片，note 里写「待补」。每张照片只能出现一次，photo_id 必须来自 inputs。",
      keep: ["ph_use", "ph_order"],
      fields: [
        F("ph_files", "photos", "放照片（最多 8 张；每张可以写一句说明）", null, { must: true }),
        F("ph_theme", "text", "这组照片的主题是什么？", null, { ph: "例：今年夏天的海边，和朋友的最后一次旅行" }),
        F("ph_use", "one", "做出来给谁看、怎么用？", ["发给朋友家人看的相册", "作品集里的一页", "发社交平台（九宫格 / 图文）", "留给自己做纪念"], { guess: [/朋友|家人/, /作品集/, /九宫格|朋友圈|小红书|发帖/, /纪念|留着/] }),
        F("ph_order", "one", "想怎么排？", ["按时间先后", "按地点或主题分组", "按情绪起伏（从安静到热闹）", "你帮我排"], { guess: [/时间|先后/, /地点|分组/, /情绪/, /帮我排/] })
      ],
      fix: ["分组不对", "顺序想换一下", "说明写得不对"],
      self: ["每张照片都在，没有漏掉", "图和说明对得上", "顺序是我想要的"]
    },
    resume: { id: "resume", name: "简历整理", icon: "", one: "把你的经历整理成一页结构清楚、不夸大的简历",
      eg: "例：把这几年做活动策划的经历，整理成一页能投内容运营的简历",
      kw: /简历|履历|求职材料|\bCV\b/i,
      deliverable: "一页简历：结构化的经历、成果和技能；你没给的写「待补」，不替你编",
      done: "事实都是你给的，没有增添；职责没有夸大；能直接下载",
      firstStep: "今天可以先试的一小步：只整理最近的一段经历。",
      take: "一页事实清楚、朝你想去的方向讲的简历（每一条你都核对过）",
      factRule: "这是事实材料：只依据 inputs 里的事实写，不编造人名、公司名、职位、数字、日期、结果；不拔高职责（「协助」不能写成「主导」），不用「精通」「显著提升」这类空话。inputs 里写着「待补」的地方，在对应位置原样写「待补」，并列进 pending，不要替用户填。" + REWRITE_RULE,
      keep: ["r_use", "r_len"],
      fields: [
        F("r_exp", "text", "你的经历：每段写在哪、做什么、大概什么时候、具体做了什么", null, { must: true, ph: "例：2022–2024 在某品牌公司做活动策划：负责 3 场线下快闪的方案和现场执行；对接场地和供应商。" }),
        F("r_result", "text", "有什么成果？（有数据就写，写明从哪来）", null, { ph: "例：一场 300 人的快闪，小红书笔记曝光 20 万（来自后台截图）" }),
        F("r_skill", "text", "会用的工具或技能", null, { ph: "例：剪映、Canva、Excel、基础英文写作" }),
        F("r_use", "one", "这份简历拿来做什么？", ["投某一类岗位", "给朋友内推", "自由职业接活", "先整理留档"], { guess: [/投|求职|岗位|面试/, /内推/, /接活|自由职业|接单/, /留档|整理一下/] }),
        F("r_target", "text", "想去的新方向（可选）：这份简历要讲给哪个方向听？", null, { ph: "例：GEO 方向的内容运营与产品增长" }),
        F("r_len", "one", "要多详细？", ["一页精简版", "详细版（每段多写几条）"], { guess: [/一页|精简/, /详细/] })
      ],
      fix: ["有内容写错了", "语气太夸张了", "太长了", "换个用途的写法"],
      self: ["每一条都是我真做过的", "没有把协助写成主导", "待补的地方我知道要补什么"]
    },
    tool: { id: "tool", name: "小工具制作", icon: "", one: "做一个只做一件事的小网页，数据只存在你自己的浏览器里",
      eg: "例：每周手抄投递记录表 → 一个能加一条、自动数出一共投了几家的小网页",
      kw: /小工具|小网页|网页|记账|打卡|计时|番茄钟|提醒|工具|\bapp\b/i,
      deliverable: "一个单文件小网页（index.html）：双击就能用，关掉再打开数据还在",
      done: "",
      firstStep: "今天可以先试的一小步：只做「记一笔、看列表」这一个功能。",
      take: "一个小网页（单个文件，双击就能打开）",
      factRule: "只做用户说的功能，不加用户没提的功能（提醒、积分、登录……）；页面里不放虚构的用户数据，示例要标明是示例。",
      keep: ["t_input"],
      fields: [
        F("t_scene", "text", "什么时候会用它？（那件重复、麻烦的事）", null, { must: true, ph: "例：每周手抄一次投递记录表，记投了哪家、结果怎样" }),
        F("t_input", "one", "每次要记下什么？", ["一句话：今天做了什么", "投了哪家、结果怎样", "做完了就勾一下", "一个数：花了多少钱、走了多少步"], { guess: [/一句话/, /对象|结果|投递/, /勾|做完/, /花了|多少钱|步数|数字/] }),
        F("t_action", "one", "希望它帮你做什么？", ["记下来，按时间列出来", "自动数一共多少条", "按日期或类别筛出来", "算总数和平均"], { guess: [/列出/, /数一共|几家|几条/, /筛/, /平均|总数/] })
      ],
      fix: [],
      self: ["在预览里记了一条，能看到", "功能是我要的那一个", "下载后双击能打开"]
    },
    exp: { id: "exp", name: "经历复盘", icon: "", one: "把你做过的一段真实经历，写成一页能给人看的复盘案例",
      eg: "例：把做过的一场 300 人品牌快闪，写成一页带数据来源的复盘",
      kw: /复盘|经历|做过的|案例|快闪|活动|项目经验/,
      deliverable: "一页复盘案例：面向谁、你做了什么、结果怎样；只写真实发生过的事，「如果再做一次」单独标为设想",
      done: "只写了你给的事实，角色没有说大；能下载；以后有材料可以再补",
      firstStep: "今天可以先试的一小步：先只写这件事叫什么、你负责了哪一块。",
      take: "一页讲清楚的经历复盘（事实你都核对过；想去的新方向只写成「可迁移的经验」）",
      factRule: "这是事实材料：只写过去真实发生过的事，用过去时；inputs 里没有的事实（人数、日期、结果、媒体名、主办方）一个都不许加；按 level 写清我负责的部分，不往大了说；inputs 里写着「待补」的，原样写「待补」并列进 missing，不替用户补成事实。「如果再做一次」只放进 if_again，是设想不是事实。" + REWRITE_RULE,
      keep: ["x_type"],
      fields: [
        F("x_type", "one", "这是哪一类经历？", EXP_TYPES, { must: true, guess: [/活动|快闪|展览|展会|发布会|市集/, /账号|公众号|小红书|抖音|内容|运营|写稿|视频/, /项目|产品|上线|需求/] }),
        F("x_name", "text", "这件事叫什么？大概什么时候？", null, { must: true, ph: "例：2024 年 5 月 · 某品牌城市快闪（300 人）" }),
        F("x_aud_ev", "one", "面向谁？", ["品牌的目标消费者", "普通观众 / 市民", "行业从业者 / 专业观众", "客户 / 合作方", "学生 / 年轻人"], { when: isType("event") }),
        F("x_did_ev", "many", "你做了什么？（可多选）", ["活动策划与方案", "现场执行与流程", "宣传内容（海报、笔记、短视频）", "场地、供应商、合作方对接", "物料与布置"], { when: isType("event") }),
        F("x_aud_ct", "one", "内容给谁看？", ["账号的粉丝", "潜在用户 / 潜在顾客", "品牌的目标消费者", "行业同行"], { when: isType("content") }),
        F("x_did_ct", "many", "你做了什么？（可多选）", ["选题策划", "写稿或写脚本", "拍摄或剪辑", "发布与排期", "看数据、做复盘"], { when: isType("content") }),
        F("x_plat_ct", "many", "在哪些平台？（可多选）", ["小红书", "公众号", "抖音", "视频号", "B站"], { when: isType("content") }),
        F("x_aud_pj", "one", "给谁用？", ["公司内部同事", "企业客户", "普通用户", "合作方"], { when: isType("project") }),
        F("x_did_pj", "many", "你做了什么？（可多选）", ["梳理需求", "设计方案", "推进和协调", "上线与验收", "跟踪数据"], { when: isType("project") }),
        F("x_aud_ot", "one", "面向谁？", ["普通人", "同行", "客户", "主要是我自己"], { when: isType("other") }),
        F("x_did_ot", "text", "你具体做了什么？", null, { when: isType("other"), ph: "例：组织了 20 人的读书会，每周选书、主持讨论" }),
        F("x_level", "one", "你在里面是什么角色？", LEVEL),
        F("x_dir", "text", "这段经历想讲给哪个新方向听？（可选）", null, { ph: "例：GEO 方向的内容运营与产品增长" }),
        F("x_data", "text", "有什么结果或数据？（没有就先跳过）", null, { ph: "例：到场 300 人；小红书笔记曝光 20 万" }),
        F("x_src", "one", "这些数从哪来？", ["主办方 / 公司统计", "平台后台数据", "公开报道", "我自己估算的"], { when: function (p) { return answeredText(p, "x_data"); } }),
        F("x_cmp", "one", "有没有对比或旁证？", ["有对比（比上一次、比目标、比同类）", "有旁证（报道、主办方或客户评价、获奖）", "都没有"], { when: function (p) { return answeredText(p, "x_data"); } })
      ],
      fix: ["有内容写错了", "语气太夸张了", "太长了"],
      self: ["每一条都是真实发生过的", "我的角色写得没有说大", "设想和事实分开了"]
    },
    /* v0.0.13（#37）：【创造】单独成类。只问概念、感受、类型、呈现；给的是框架和第一步，不写代码、不写完整作品 */
    create: { id: "create", name: "创造", icon: "", one: "一个游戏、一件作品或一个点子：定下概念、感受、类型和呈现，拿到第一步",
      eg: "例：我想做一个游戏",
      kw: /游戏|桌游|玩法|关卡|点子|创意|发明/,
      deliverable: "一个今天就能开始的第一步，加一份框架和粗估的路线",
      done: "",
      firstStep: "今天可以先试的一小步：只把概念写成一句话。",
      take: "",
      factRule: "这是构思，不是成品：只给框架、路线和一个具体的第一步，不写代码、不写完整作品。概念、感受、类型、呈现以用户选的为准；inputs 里写着「待补」的，按 user_idea 给一个最朴素的默认。时间都是粗估，按一个新手、业余时间来估。",
      keep: ["c_type", "c_show"],
      fields: [
        F("c_idea", "text", "想做个什么？", null, { must: true, ph: "例：我想做一个游戏" }),
        F("c_concept", "one", "它讲的是什么？", [], { lbl: "概念", dyn: true }),
        F("c_feel", "one", "做好之后，想让人有什么感觉？", ["有点暖，想给家里打个电话", "安静，像发了一会儿呆", "好笑，想转给朋友", "心里一紧，回头再想一遍"], { lbl: "感受" }),
        F("c_type", "one", "它更像哪一种？", ["一个故事（小说、漫画、绘本）", "一件拿在手里的东西（手作、周边）", "一段影像或声音（视频、播客、音乐）", "一个能点的小工具（网页、表格）"], { lbl: "类型" }),
        F("c_show", "one", "先用什么样子，把它摆出来？", ["纸上画几张草图", "一页说明文档", "能点的网页小原型", "几张效果图"], { lbl: "呈现" })
      ],
      fix: [],
      self: []
    },
    generic: { id: "generic", name: "其他（通用方式）", icon: "", one: "没有正好对应的类目，就用通用问题把要做的东西说清楚，不硬套",
      eg: "例：给家里的猫做一本成长手账；把读书笔记整理成一页书单",
      kw: null,
      deliverable: "按你选的形式做出来的一页东西（文字、清单、计划，或一个小网页）",
      done: "做出来的东西是你要的那个形式，内容对得上你的材料",
      firstStep: "今天可以先试的一小步：先做最小的一页，内容只写三条。",
      take: "一页按你选的形式做好的东西（文字、清单、计划，或一个小网页）",
      keep: ["g_form", "g_for"],
      fields: [
        F("g_what", "text", "你想做出的是什么？（一句话）", null, { must: true, ph: "例：给家里的猫做一本成长手账" }),
        F("g_form", "one", "最后拿到手的是哪一种？", ["一页文字（像一篇短文）", "一张清单或表格（能打印）", "一份分步骤的计划", "一个小网页（能点能记）"], { guess: [/一页|文章/, /清单|表格|书单|列表/, /计划|安排/, /网页|工具/] }),
        F("g_for", "one", "给谁用 / 给谁看？", ["我自己", "朋友家人", "同事或客户", "公开给不认识的人"]),
        F("g_kind", "one", "里面写的事，真的发生过吗？", ["真的发生过（不能编）", "是想象出来的（可以虚构）"]),
        F("g_mat", "text", "手上已有的材料（可选）", null, { ph: "例：猫的名字叫豆包，2023 年 3 月到家，现在 4 公斤" })
      ],
      fix: ["有内容写错了", "太长了", "想换个形式"],
      self: ["是我要的那个形式", "内容对得上我的材料", "待补的地方我知道要补什么"]
    }
  };
  var CAT_ORDER = ["novel", "essay", "photo", "resume", "tool", "exp", "create"];
  /* 【创造】里说的是游戏：卡片按游戏来问，类型给几个游戏做参照（只在游戏时出现） */
  var R_GAME = /游戏|桌游|\bgame\b|关卡|玩法/i;
  function isGame(p) { return R_GAME.test(String(p.idea || "") + " " + (p.a && p.a.c_idea && p.a.c_idea.v || "")); }
  var C_GAME = {
    c_concept: "这个游戏，讲的是什么？",
    c_feel: ["玩完，想让人有什么感觉？"],
    c_type: ["它更像哪一种？", ["找东西 · 解谜", "一路选择 · 看故事", "慢慢经营 · 收集", "跑跳 · 闯关"], ["像《纪念碑谷》", "像《Florence》", "像《旅行青蛙》", "像《蔚蓝》"]],
    c_show: ["先用什么样子，把它摆出来？", ["纸上画几张关卡草图", "一页规则 + 故事文档", "能点着玩的网页小原型", "几张手机截图样的画面"]]
  };
  /* 概念卡：选项由 AI 按用户原话现场写；还没到（或失败）时用这几个通用的 */
  var C_CONCEPT_FALLBACK = { game: ["一个人在空房间里，找一样丢了的东西", "两个人隔着一面墙，只能用声音合作", "一座城每天少一样东西，你来决定留下什么", "一家只在下雨天开门的小店"],
    any: ["从一个具体的人和他的一天讲起", "从一个奇怪的地方讲起", "从一件丢了又找回来的东西讲起", "从一个反常的规则讲起"] };
  function createField(p, f) {
    if (p.cat !== "create" || !f || f.id.indexOf("c_") !== 0) return f;
    var g = isGame(p), o = {}, k; for (k in f) o[k] = f[k];
    if (f.id === "c_concept") { o.t = g ? C_GAME.c_concept : f.t; o.o = (p.copts && p.copts.length ? p.copts : C_CONCEPT_FALLBACK[g ? "game" : "any"]).slice(0, 4); }
    if (g && f.id === "c_feel") o.t = C_GAME.c_feel[0];
    if (g && f.id === "c_type") { o.t = C_GAME.c_type[0]; o.o = C_GAME.c_type[1]; o.refs = C_GAME.c_type[2]; }
    if (g && f.id === "c_show") { o.t = C_GAME.c_show[0]; o.o = C_GAME.c_show[1]; }
    return o;
  }
  function genericFact(p) {
    var a = p.a.g_kind;
    /* #25：还没发生的计划，不能当成过去的经历写 */
    if (idx(p, "g_form") === 2) return "这是一份还没发生的计划：用将来时写成安排和步骤，不写成已经发生的事，也不写「取得了」「吸引了」这类结果；用户没给的时间、地点、人数、预算写「待补」并列进 pending，不替用户定。";
    return a && a.i === 1 ? "用户说明这是创作或设想：可以虚构，但要遵守用户给的设定；设想的内容要写成设想，不要写成已经发生的事实。"
      : "这是写真实的事：不编造用户没给的人名、数字、日期、结果；inputs 里写着「待补」的原样保留，并列进 pending，不替用户填。";
  }
  function factRule(p) { return p.cat === "generic" ? genericFact(p) : CATS[p.cat].factRule; }
  /* 只认清楚的关键词；对不上或同时对上几类，就走通用方式，不硬套近似类目（#8） */
  function matchCats(text) { text = String(text || ""); if (!text.trim()) return []; return CAT_ORDER.filter(function (k) { return CATS[k].kw && CATS[k].kw.test(text); }); }
  /* #25：关键词只是线索，不等于目标已确认。先看事实性质（真实 / 还没发生的计划 / 只要一份清单），再看类目词；
     只命中一个泛词（故事、活动、清单……）时，给出猜测并请用户确认，不直接当定论 */
  var R_REAL = /真实|真事|亲身|亲历|我妈|妈妈|母亲|我爸|爸爸|父亲|外婆|外公|奶奶|爷爷|姥姥|姥爷|家人|回忆|纪念|发生过|小时候|那年/;
  var R_FICTION = /小说|虚构|编一个|编个|想象|童话|奇幻|科幻|网文|脑洞/;
  var R_FUTURE = /下个月|下周|下星期|明天|明年|打算|准备|想办|要办|将要|即将|筹备|计划/;
  var R_PAST = /办过|做过|去年|上次|上个月|已经|复盘|曾经|那次|之前做/;
  var R_TOOL = /小工具|小网页|网页|网站|\bapp\b|应用|打卡|记账|计时|番茄钟|提醒|自动/i;
  var R_LIST = /清单|列表|书单|待办/;
  var STRONG = { novel: /小说|网文|童话/, essay: /散文|随笔|日记|回忆录/, photo: /照片|摄影|相册|影集/, resume: /简历|履历|\bCV\b/i, tool: /小工具|小网页|网页|记账|打卡|番茄钟/, exp: /复盘/, create: /游戏|桌游/ };
  function routeIdea(text) {
    var t = String(text || ""), m = matchCats(t);
    if (!t.trim()) return { cat: "", hits: [], strong: false, why: "" };
    if (R_REAL.test(t) && !R_FICTION.test(t) && (m.indexOf("novel") >= 0 || m.indexOf("essay") >= 0 || /故事|写写|写一写|写一篇|写篇/.test(t)))
      return { cat: "essay", hits: m, strong: false, pre: {}, alts: ["novel", "generic"], fact: "real", why: "你说的是真实的人和事，按「真实的记录」来写，不虚构" };
    if (R_FUTURE.test(t) && !R_PAST.test(t) && (m.indexOf("exp") >= 0 || /计划|方案|安排/.test(t)))
      return { cat: "generic", hits: m, strong: false, pre: { g_form: 2 }, alts: ["exp", "tool"], fact: "plan", why: "说的是还没发生的事，按「一份计划」来做，不当成过去的经历" };
    if (R_LIST.test(t) && !R_TOOL.test(t))
      return { cat: "generic", hits: m, strong: false, pre: { g_form: 1 }, alts: ["tool"], fact: "", why: "要的是一份能看、能打印的清单，不用做成小网页" };
    if (m.length === 1) { var kw = (t.match(CATS[m[0]].kw) || [""])[0]; return { cat: m[0], hits: m, strong: STRONG[m[0]] ? STRONG[m[0]].test(t) : false, pre: {}, alts: [], kw: kw, why: "因为提到了「" + kw + "」" }; }
    return { cat: "", hits: m, strong: false, why: "" };
  }

  /* ---------- 回答的读写（每道选择题都有「不确定，先跳过」和「其他，我自己写」） ---------- */
  function fieldsOf(p) { return CATS[p.cat].fields.filter(function (f) { return !f.when || f.when(p); }).map(function (f) { return createField(p, f); }); }
  function fieldById(p, id) { return createField(p, CATS[p.cat].fields.filter(function (f) { return f.id === id; })[0]); }
  function answeredText(p, id) { var a = p.a[id]; return !!(a && !a.skip && a.v && a.v.trim()); }
  function answered(p, f) {
    var a = p.a[f.id];
    if (f.type === "photos") return (p.photos || []).length > 0;
    if (!a) return false;
    if (a.skip) return true;
    if (f.type === "text") return !!(a.v && a.v.trim());
    if (f.type === "many") return (a.is && a.is.length) || !!(a.other && a.other.trim());
    return typeof a.i === "number" || !!(a.other && a.other.trim());
  }
  function isSkipped(p, f) { var a = p.a[f.id]; return !!(a && a.skip); }
  function valueOf(p, f) {
    var a = p.a[f.id];
    if (f.type === "photos") return (p.photos || []).map(function (x) { return { photo_id: x.id, caption: x.cap || PEND }; });
    if (!a || a.skip) return PEND;
    if (f.type === "text") return a.v && a.v.trim() ? a.v.trim() : PEND;
    if (f.type === "many") { var l = (a.is || []).map(function (i) { return f.o[i]; }); if (a.other && a.other.trim()) l.push(a.other.trim()); return l.length ? l : PEND; }
    if (typeof a.i === "number") return f.o[a.i];
    return a.other && a.other.trim() ? a.other.trim() : PEND;
  }
  function vText(p, id) { var f = fieldById(p, id); if (!f) return PEND; var v = valueOf(p, f); return Array.isArray(v) ? v.map(function (x) { return typeof x === "string" ? x : x.caption; }).join("、") : v; }
  function idx(p, id) { var a = p.a[id]; return a && typeof a.i === "number" && !a.skip ? a.i : -1; }
  function missingMust(p) { return fieldsOf(p).filter(function (f) { return f.must && (!answered(p, f) || isSkipped(p, f)); }); }
  function inputsOf(p) { var o = {}; fieldsOf(p).forEach(function (f) { o[f.t.replace(/[（(].*$/, "").replace(/[？?]$/, "")] = valueOf(p, f); }); return o; }
  function pendingList(p) { return fieldsOf(p).filter(function (f) { return f.type !== "photos" && (!answered(p, f) || isSkipped(p, f)); }).map(function (f) { return f.t.replace(/[（(].*$/, "").replace(/[？?]$/, ""); }); }
  function guessFrom(p, text) {
    if (!text) return;
    CATS[p.cat].fields.forEach(function (f) {
      if (p.a[f.id]) return;
      if (f.type === "one" && f.guess) { for (var i = 0; i < f.guess.length; i++) if (f.guess[i] && f.guess[i].test(text)) { p.a[f.id] = { i: i, guessed: true }; return; } }
    });
  }
  function novelMode(p) { var L = idx(p, "n_len"); return L === 2 || L === 3 ? "outline" : "direct"; }

  /* ========== AI 任务：类目自己的产物结构 + 生成规则；内容类目只返回内容，由页面模板排版（#9） ========== */
  function T(p, type, title, role, instructions, inputs, schema, extra) {
    /* #25：用户的原话直接进任务，不只读字段 */
    if (p.idea && String(p.idea).trim() && type !== "event_search") { inputs = clone(inputs); inputs.user_idea = String(p.idea).trim(); instructions = instructions.concat(["user_idea 是用户自己的原话：做出来的东西要对得上它；它和字段冲突时以字段为准，但不要丢掉原话里的意思。"]); }
    var t = { type: type, key: type + ":" + p.id, category: CATS[p.cat].name, title: title, role: role, instructions: instructions, factRule: factRule(p), inputs: inputs, schema: schema, onSmaller: function () { smaller(p); } };
    for (var k in (extra || {})) t[k] = extra[k];
    return t;
  }
  var SEC_TEXT = { type: "object", required: ["heading", "text"], properties: { heading: STR(40), text: STR(6000) } };
  var NOVEL_OUTLINE = { type: "object", required: ["title", "logline", "sections", "style_note"], properties: { title: STR(40), logline: STR(160), sections: { type: "array", minItems: 3, maxItems: 6, items: { type: "object", required: ["heading", "summary"], properties: { heading: STR(30), summary: STR(240) } } }, style_note: STR(160) } };
  var NOVEL_DRAFT = { type: "object", required: ["title", "sections"], properties: { title: STR(40), sections: { type: "array", minItems: 1, maxItems: 5, items: SEC_TEXT } } };
  var NOVEL_REV = { type: "object", required: ["title", "sections"], properties: { title: STR(40), sections: { type: "array", minItems: 1, maxItems: 6, items: SEC_TEXT } } };
  var RESUME = { type: "object", required: ["headline", "summary", "experiences", "skills", "pending"], properties: { headline: STR(60), summary: STR(240),
    experiences: { type: "array", minItems: 1, maxItems: 6, items: { type: "object", required: ["org", "role", "period", "bullets"], properties: { org: STR(60), role: STR(60), period: STR(40), bullets: STRS(1, 6, 160) } } },
    skills: { type: "array", maxItems: 12, items: STR(40) }, pending: { type: "array", maxItems: 8, items: STR(80) }, transfer: { type: "array", maxItems: 4, items: STR(160) } } };
  var ESSAY = { type: "object", required: ["title", "sections", "pending"], properties: { title: STR(40), sections: { type: "array", minItems: 1, maxItems: 4, items: SEC_TEXT }, pending: { type: "array", maxItems: 6, items: STR(80) } } };
  var PHOTO = { type: "object", required: ["title", "intro", "groups"], properties: { title: STR(40), intro: STR(200), groups: { type: "array", minItems: 1, maxItems: 6, items: { type: "object", required: ["name", "photos"], properties: { name: STR(30), note: STR0(160), photos: { type: "array", minItems: 1, maxItems: 8, items: { type: "object", required: ["photo_id", "note"], properties: { photo_id: STR(8), note: STR(120) } } } } } } } };
  var CASE = { type: "object", required: ["title", "one_line", "background", "my_role", "what_i_did", "results", "evidence_sentence", "if_again", "missing"],
    properties: { title: STR(60), one_line: STR(140), background: STR(300), my_role: STR(200), what_i_did: STRS(1, 6), results: STRS(1, 6), evidence_sentence: STR(160), if_again: STRS(1, 3), missing: { type: "array", maxItems: 6, items: { type: "string" } }, transfer: { type: "array", maxItems: 4, items: STR(160) } } };
  var GENERIC = { type: "object", required: ["title", "summary", "sections", "pending"], properties: { title: STR(40), summary: STR(200), sections: { type: "array", minItems: 1, maxItems: 6, items: { type: "object", required: ["heading", "points"], properties: { heading: STR(40), points: STRS(1, 8, 200) } } }, pending: { type: "array", maxItems: 8, items: STR(80) } } };
  var TOOL = { type: "object", required: ["html", "summary", "how_to_use", "next_tweaks"], properties: { html: { type: "string", minLength: 100, maxLength: 80000 }, summary: STR(120), how_to_use: STRS(1, 4, 80), next_tweaks: STRS(3, 3, 40) } };
  /* v0.0.13（#37）：【创造】的三个小任务，输出都是一小段 JSON（不写代码） */
  var C_CONCEPTS = { type: "object", required: ["options"], properties: { options: STRS(4, 4, 30) } };
  var C_ROUTE = { type: "array", minItems: 3, maxItems: 5, items: { type: "object", required: ["step", "tool", "time"], properties: { step: STR(14), tool: STR(18), time: STR(12) } } };
  var C_PLAN = { type: "object", required: ["goal", "route", "total", "help"], properties: { goal: STR(60), route: C_ROUTE, total: STR(12), help: STR(40) } };
  var C_STEP = { type: "object", required: ["title", "first_step", "time", "tags"], properties: { title: STR(24), first_step: STR(40), time: STR(12), tags: STRS(1, 2, 12), route: C_ROUTE, total: STR(12) } };
  function createIdea(p) { return answeredText(p, "c_idea") ? p.a.c_idea.v.trim() : String(p.idea || "").trim() || PEND; }
  function createSet(p) { var o = { 想做的: createIdea(p) }; ["c_concept", "c_feel", "c_type", "c_show"].forEach(function (id) { var f = fieldById(p, id); o[f.lbl] = vText(p, id); }); return o; }
  function taskConcepts(p) {
    return T(p, "create_concepts", "想几个概念", "陪人把一个想法想清楚的搭档", ["按 user_idea 写 4 个方向不同的概念（options），每个一句话、12–22 个字。", "每个概念落在一个具体的画面或处境上（谁、在哪、发生了什么），不写类型名，不写「一款……的游戏」这类空话。", "4 个之间要差得开：题材、地点、主角都别重复。"],
      { idea: createIdea(p) }, C_CONCEPTS, { key: "create_concepts:" + p.id });
  }
  function taskPlan(p, req) {
    return T(p, "create_plan", "排一条路线", "陪人把一个想法想清楚的搭档", ["goal：把 settings 合成一句细化后的目标（30 字以内），讲清做的是什么、想让人有什么感觉。", "route：从现在到「能拿给别人看的第一版」，3–5 段。每段 step 写做什么（2–7 个字），tool 写用什么工具或材料（具体的名字，例如 纸笔、Figma、Godot、剪映），time 写大概多久（「约 2 周」这种）。按一个新手、业余时间来估，宁可多估。", "total：把每段加起来的合计（「约 7 周」这种）。", "help：用户的口吻写一句「帮我……」，是这一局 AI 可以帮他想清楚的一件具体的事（不是写代码，不是替他做完）。"].concat(req ? ["request 是用户对路线的修改意见：照着改，其他不动。"] : []),
      req ? { settings: createSet(p), current: p.plan ? { goal: p.plan.goal, route: p.plan.route, total: p.plan.total } : null, request: req } : { settings: createSet(p) }, C_PLAN, { key: "create_plan:" + p.id });
  }
  function createPlanIn(p) { var pl = p.plan || {}; return { 目标: pl.goal || PEND, 路线: pl.route && pl.route.length ? pl.route.map(function (r) { return r.step + "（" + r.tool + "，" + r.time + "）"; }).join(" → ") : PEND, 希望它帮你做什么: pl.help || PEND }; }
  function taskStep(p, req) {
    var hasRoute = !!(p.plan && p.plan.route && p.plan.route.length);
    return T(p, "create_step", "出第一步", "陪人把一个想法想清楚的搭档", ["first_step：今天就能开始的一个具体动作，一句话（30 字以内），动词开头，做完能看到一个小东西。要紧扣 settings 里的呈现方式和「希望它帮你做什么」。", "time：做这一步大概要多久（「约 30 分钟」这种，最多 1 小时）。tags：做这一步要用到的 1–2 样东西（「纸和笔」这种，每样 6 个字以内）。", "title：给这个作品起一个 2–10 个字的暂定名。", hasRoute ? "route 和 total 不用写。" : "route：从现在到能拿给别人看的第一版，3–5 段（step / tool / time），total 写合计。", "不写代码，不写完整作品，不写长期规划的细节。"].concat(req ? ["request 是用户的修改意见：照着改。"] : []),
      { settings: createSet(p), plan: createPlanIn(p), request: req || undefined }, C_STEP);
  }
  function toolCheck(o) {
    var e = [], h = o && o.html || "";
    if (!/<html[\s>]/i.test(h) || !/<\/html>/i.test(h)) e.push("html 要是一个完整文件（从 <html> 到 </html>）");
    if (/其余(代码|部分)?(不变|同上)|此处省略|\.\.\.\s*<\/script>/.test(h)) e.push("html 里有省略，要给完整文件");
    return e;
  }
  function photoCheck(p) { return function (o) { var ids = (p.photos || []).map(function (x) { return x.id; }), seen = {}, e = []; (o.groups || []).forEach(function (g) { (g.photos || []).forEach(function (x) { if (ids.indexOf(x.photo_id) < 0) e.push("photo_id " + x.photo_id + " 不在 inputs 里"); if (seen[x.photo_id]) e.push("photo_id " + x.photo_id + " 出现了两次"); seen[x.photo_id] = 1; }); }); return e; }; }
  function setting(p) { var o = inputsOf(p); if (S.entry.goal) o["用户想往哪去（可选）"] = S.entry.goal; return o; }
  function taskDraft(p) {
    var c = p.cat, len = { 0: "全文 400–700 字", 1: "全文 2500–3500 字，分 3–5 节" }[idx(p, "n_len")] || "全文 400–700 字";
    if (c === "novel" && novelMode(p) === "outline")
      return T(p, "novel_outline", "先出故事结构", "陪人写小说的编辑", ["按 settings 写一份故事结构：title、logline（一句话讲清这个故事）、sections 3–6 段（每段 heading + 两三句 summary），按起承转合安排。", "这一步只写结构，不写正文；正文之后一段一段展开。", "style_note 一句话说这篇的文风和人称。"], { settings: setting(p) }, NOVEL_OUTLINE);
    if (c === "novel")
      return T(p, "novel_draft", "直接写出正文", "陪人写小说的作者", ["按 settings 直接写出正文：" + len + "。", "sections 每节一个小标题（heading）和正文（text），正文分段用换行。", "遵守用户给的人物名字、情节、文风和人称。"], { settings: setting(p) }, NOVEL_DRAFT);
    if (c === "essay")
      return T(p, "essay_draft", "写成一篇真实的记录", "陪人把真实的人和事写下来的编辑", ["按 materials 写一篇真实的记录：" + ({ 0: "全文 500–700 字", 1: "全文 900–1200 字", 2: "全文 1300–1700 字" }[idx(p, "e_len")] || "全文 600–1000 字") + "，sections 1–3 节，每节 heading + text，正文分段用换行。", "只写 materials 里有的人、事、细节；感受可以写得细，但不添用户没说过的情节和对话。", "pending 列出可以补上、会让它更具体的真实细节（问题的形式，例如「那只碗是什么颜色」）。"], { materials: setting(p) }, ESSAY);
    if (c === "resume")
      return T(p, "resume_draft", "直接出一版简历", "帮人整理简历的朋友，懂招聘但不夸大", ["直接出第一版简历：headline 一句话定位，summary 两三句；experiences 每段写 org、role、period、bullets（每条一件具体的事，动词开头）。", "skills 只列用户写过的。用户没给的（时间、公司名、数字）写「待补」，并在 pending 里列出要补什么。", idx(p, "r_len") === 1 ? "详细版：每段 3–6 条。" : "一页精简版：每段 2–4 条，整页读完不超过一分钟。"].concat(rewriteIns(p, "r_target")), { materials: setting(p) }, RESUME);
    if (c === "photo")
      return T(p, "photo_layout", "先给一个编排预览", "帮人整理摄影作品的编辑", ["先给编排预览：把 photos 里的每张照片分进 1–6 组，每组一个名字（name）和一句话（note），组内按顺序列 photo_id 和一句照片说明（note）。", "每张照片正好出现一次。title 和 intro 依据主题和说明来写。", "按用户选的排法排；选「你帮我排」就按说明里的线索排，说明不够就按原顺序。"], { materials: setting(p) }, PHOTO, { check: photoCheck(p) });
    if (c === "create") return taskStep(p);
    if (c === "tool" || (c === "generic" && idx(p, "g_form") === 3))
      return T(p, "build_tool", "做出第一版小网页", "写单文件小网页的工程师，写给零基础的人用", ["做一个单文件 index.html：CSS 和 JS 都写在里面，界面中文，数据只用 localStorage；不引用任何外部文件、字体或 CDN，不联网，不要 API 密钥。", "只做 materials 里说的那一件事；用户没说的功能不加。", "html 给完整文件，不许出现省略号或「其余不变」。", "summary 一句话说做出来的是什么；how_to_use 给 2–4 步大白话用法；next_tweaks 给 3 个下一步可以改的小地方。"], { materials: setting(p) }, TOOL, { check: toolCheck });
    if (c === "exp")
      return T(p, "case_page", "写成一页复盘案例", "帮人把过去的真实经历写成复盘案例的编辑", ["按 facts 写一页复盘案例：title、one_line、background、my_role、what_i_did（具体做了的事）、results、evidence_sentence（一句能放进简历的话，没有数据就不写数字）、if_again（2–3 条设想）、missing（还缺、补上会更有说服力的事实）。", "保持简短：整页读完不超过一分钟。"].concat(rewriteIns(p, "x_dir")), { facts: caseFacts(p) }, CASE);
    return T(p, "generic_draft", "做出第一版", "陪人把想法做出来的搭档", ["按 materials 做出第一版：title、summary（一两句说这是什么）、sections（每节 heading + points）。", "形式按 materials 里选的来（一页文字 / 清单 / 计划）；保持短小，先做最小的一版。", "pending 列出还缺、需要用户补的内容。"], { materials: setting(p) }, GENERIC);
  }
  function rewriteIns(p, fid) {
    if (!answeredText(p, fid)) return ["没有新方向：transfer 返回空数组。"];
    return ["用户想去的新方向是「" + p.a[fid].v.trim() + "」：把和它有关的、用户真实做过的事排在前面讲清楚；transfer 写 2–3 条可迁移的经验，格式「原来做的事 → 和新方向的关系」。", "新方向只出现在 headline / summary 的意向表述和 transfer 里；过去的职位、公司、经历条目保持用户给的原样，不改成新方向的说法。"];
  }
  function taskSection(p, k) {
    var o = p.out, prev = o.sections.slice(0, k).map(function (s) { return { heading: s.heading, summary: s.summary, written: !!s.text }; });
    var per = idx(p, "n_len") === 3 ? "1200–1800 字" : "800–1200 字";
    return T(p, "novel_section", "展开第 " + (k + 1) + " 段", "陪人写小说的作者", ["只写 outline 里第 index+1 段的正文（" + per + "），heading 用这一段的小标题。", "接得上前面几段的 summary，不提前写后面的情节。遵守 settings 里的人物名字、文风、人称。"],
      { settings: setting(p), outline: { title: o.title, logline: o.logline, sections: o.sections.map(function (s) { return { heading: s.heading, summary: s.summary }; }), style_note: o.style_note }, index: k, before: prev }, SEC_TEXT, { key: "novel_section:" + p.id + ":" + k });
  }
  function taskRevise(p, req, part) {
    var c = p.cat, ins = "只按 request 改，没提到的地方不动。";
    if (c === "novel") {
      if (typeof part === "number" && part >= 0) return T(p, "novel_revise_section", "改第 " + (part + 1) + " 段", "陪人写小说的作者", [ins, "只重写这一段（current），输出 heading 和改好后的 text。"], { settings: setting(p), current: p.out.sections[part], request: req }, SEC_TEXT);
      return T(p, "novel_revise", "按你说的改", "陪人写小说的作者", [ins, "输出改好后的整篇：只包含 current 里已经写好的这几段，段数和顺序不变。"], { settings: setting(p), current: { title: p.out.title, sections: p.out.sections.filter(function (s) { return s.text; }).map(function (s) { return { heading: s.heading, text: s.text }; }) }, request: req }, NOVEL_REV);
    }
    if (c === "essay") return T(p, "essay_revise", "按你说的改", "陪人把真实的人和事写下来的编辑", [ins, "输出改好后的整篇（同样的结构）。仍然只写真实的人和事。"], { materials: setting(p), current: p.out, request: req }, ESSAY);
    if (c === "create") return taskStep(p, req);
    if (c === "resume") return T(p, "resume_revise", "按你说的改简历", "帮人整理简历的朋友", [ins, "输出改好后的整份简历（同样的结构）。"], { materials: setting(p), current: p.out, request: req }, RESUME);
    if (c === "photo") return T(p, "photo_revise", "按你说的重新编排", "帮人整理摄影作品的编辑", [ins, "输出改好后的整份编排。每张照片正好出现一次。"], { materials: setting(p), current: p.out, request: req }, PHOTO, { check: photoCheck(p) });
    if (p.out && p.out.html !== undefined) return T(p, "revise_tool", "按你说的改一处", "写单文件小网页的工程师", ["在 current_html 的基础上只改 request 说的那一处，别的不动。", "输出改完后的完整 index.html，不许省略。仍然单文件、不联网、不引用外部文件。", "summary 一句话说改了什么；how_to_use 说怎么用新版本（提醒整份覆盖旧文件）；next_tweaks 再给 3 个可以改的小地方。"], { materials: setting(p), current_html: p.out.html, request: req }, TOOL, { check: toolCheck });
    if (c === "exp") return T(p, "case_page", "按你说的重写", "帮人把过去的真实经历写成复盘案例的编辑", [ins, "输出改好后的整页复盘（同样的结构）。"], { facts: caseFacts(p), current: p.out, request: req }, CASE);
    return T(p, "generic_revise", "按你说的改", "陪人把想法做出来的搭档", [ins, "输出改好后的整份（同样的结构）。"], { materials: setting(p), current: p.out, request: req }, GENERIC);
  }
  function caseFacts(p) {
    var t = expType(p), aud = { event: "x_aud_ev", content: "x_aud_ct", project: "x_aud_pj", other: "x_aud_ot" }[t], did = { event: "x_did_ev", content: "x_did_ct", project: "x_did_pj", other: "x_did_ot" }[t];
    var o = { 经历类型: t === "other" ? (p.a.x_type && p.a.x_type.other ? p.a.x_type.other : "其他") : EXP_TYPES[idx(p, "x_type")].split("（")[0], name: vText(p, "x_name"), audience: vText(p, aud), did: vText(p, did), level: vText(p, "x_level"),
      data: vText(p, "x_data"), data_source: answeredText(p, "x_data") ? vText(p, "x_src") : PEND, comparison: answeredText(p, "x_data") ? vText(p, "x_cmp") : PEND };
    if (t === "content") o.platforms = vText(p, "x_plat_ct");
    if (answeredText(p, "x_dir")) o.new_direction = p.a.x_dir.v.trim();
    if (p.pub) o.public_info = p.pub;
    return o;
  }
  function taskSearch(p, query, onSkip) {
    return T(p, "event_search", "查找这次活动的公开资料", "帮人查证过去活动的助手", ["只用 query 这个搜索词上网查（用户已经确认过）。给最多 3 个可能是它的结果，让用户自己确认是哪一个。", "每个结果写：label（A/B/C）、标题、时间、地点、主办方、来源链接、一句备注；不确定的字段留空字符串，不编。", "搜不到就返回空数组，并在 honest_note 里直说。不要下载或转载别人的图片。"],
      { query: query }, { type: "object", required: ["candidates", "honest_note"], properties: { candidates: { type: "array", maxItems: 3, items: { type: "object", required: ["label", "title"], properties: { label: STR(4), title: STR(120), date: { type: "string" }, place: { type: "string" }, organizer: { type: "string" }, source_url: { type: "string" }, note: { type: "string" } } } }, honest_note: { type: "string" } } },
      { search: true, onSkip: onSkip, skipText: "不查了，我自己贴一个链接或报道标题", factRule: "只报告搜到的公开信息和来源，不编；不转载图片。" });
  }

  /* ========== 展示模板：内容类目的版式由页面负责，AI 只给内容（#9） ========== */
  function pageHtml(title, kicker, body, extraCss) {
    return "<!DOCTYPE html>\n<html lang=\"zh-CN\">\n<head>\n<meta charset=\"UTF-8\">\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1\">\n<title>" + esc(title) + "</title>\n<style>\n" +
      "body{font-family:system-ui,\"PingFang SC\",\"Microsoft YaHei\",sans-serif;background:#f7f3eb;color:#2c2a26;margin:0;line-height:1.8}article{max-width:720px;margin:0 auto;padding:28px 20px 48px}\n" +
      ".kicker{color:#c45c26;font-size:.85rem;margin:0}h1{font-size:1.6rem;margin:4px 0 6px}.lead{font-size:1.05rem;color:#4a4540}h2{font-size:1.08rem;margin:24px 0 6px;border-left:4px solid #c45c26;padding-left:8px}\n" +
      ".pending{background:#f6ecd5;color:#8a6420;border-radius:4px;padding:0 4px}.meta{color:#7a746d;font-size:.85rem}.hypo{background:#fff8ec;border:1px dashed #d9a95c;border-radius:12px;padding:4px 14px 10px;margin-top:22px}mark{background:#ffe08a}footer{margin-top:30px;color:#9a948d;font-size:.8rem}\n" +
      (extraCss || "") + "\n</style>\n</head>\n<body>\n<article>\n<p class=\"kicker\">" + esc(kicker) + "</p>\n" + body + "\n<footer>做于另存人生 v" + VERSION + "</footer>\n</article>\n</body>\n</html>\n";
  }
  function pt(s) { return esc(s).replace(/待补/g, '<span class="pending">待补</span>'); }
  function paras(s) { return String(s || "").split(/\n+/).filter(function (x) { return x.trim(); }).map(function (x) { return "<p>" + pt(x.trim()) + "</p>"; }).join(""); }
  function ul(a, f) { return "<ul>" + (a || []).map(function (x) { return "<li>" + (f || pt)(x) + "</li>"; }).join("") + "</ul>"; }
  function renderOut(p, forDownload) {
    var o = p.out; if (!o) return "";
    if (o.html !== undefined) return o.html;
    if (p.cat === "create") {
      var cr = p.out, rt = cr.route || [];
      var bc = '<p class="lead">' + pt(cr.first_step) + '</p><p class="meta">' + pt([cr.time].concat(cr.tags || []).join(" · ")) + "</p><section><h2>框架</h2><ul>" +
        LQ.map(function (id) { var f = fieldById(p, id); return "<li><b>" + esc(f.short || f.lbl) + "</b>　" + pt(vText(p, id)) + "</li>"; }).join("") + "</ul></section>" + (cr.star ? "<section><h2>摘星</h2><p>" + pt(cr.star) + "</p></section>" : "") +
        (rt.length ? "<section><h2>之后 · " + esc(totalLabel(p, cr.total)) + "</h2><ol>" + rt.map(function (r) { return "<li>" + pt(r.step) + ' <span class="meta">' + pt(r.tool) + " · " + pt(r.time) + "</span></li>"; }).join("") + "</ol></section>" : "");
      return pageHtml(cr.title || "第一步", libName(p) + " · 第一步", "<h1>" + pt(cr.title || "第一步") + "</h1>" + bc);
    }
    if (p.cat === "novel") {
      var body = "<h1>" + pt(o.title) + "</h1>" + (o.logline ? '<p class="lead">' + pt(o.logline) + "</p>" : "") +
        o.sections.map(function (s, i) { return "<section><h2>" + pt(s.heading) + "</h2>" + (s.text ? paras(s.text) : '<p class="meta">结构：' + pt(s.summary || "") + "（这一段还没展开）</p>"); }).join("") + "</section>";
      return pageHtml(o.title, "小说 · " + vText(p, "n_type").replace(PEND, "") + "（虚构作品）", body, "section p{text-indent:2em}");
    }
    if (p.cat === "essay") {
      var be = "<h1>" + pt(o.title) + "</h1>" + o.sections.map(function (s) { return "<section>" + (o.sections.length > 1 ? "<h2>" + pt(s.heading) + "</h2>" : "") + paras(s.text) + "</section>"; }).join("") + (o.pending && o.pending.length && !forDownload ? '<div class="hypo"><h2>还可以补的真实细节（只给你自己看）</h2>' + ul(o.pending) + "</div>" : "");
      return pageHtml(o.title, "真实的记录", be, "section p{text-indent:2em}");
    }
    if (p.cat === "resume") {
      var b = "<h1>" + pt(o.headline) + '</h1><p class="lead">' + pt(o.summary) + "</p><h2>经历</h2>" + o.experiences.map(function (e) { return "<section><p><b>" + pt(e.org) + "</b> · " + pt(e.role) + ' <span class="meta">' + pt(e.period) + "</span></p>" + ul(e.bullets) + "</section>"; }).join("") +
        (o.transfer && o.transfer.length ? "<h2>和想去的方向有关的经验（可迁移）</h2>" + ul(o.transfer) : "") +
        (o.skills.length ? "<h2>技能与工具</h2><p>" + o.skills.map(pt).join("、") + "</p>" : "") + (o.pending.length && !forDownload ? '<h2>还要补的（只给你自己看）</h2>' + ul(o.pending) : "");
      return pageHtml(o.headline, "简历", b);
    }
    if (p.cat === "photo") {
      var imgs = imgsOf(p), cap = {}; (p.photos || []).forEach(function (x) { cap[x.id] = x; });
      var b2 = "<h1>" + pt(o.title) + '</h1><p class="lead">' + pt(o.intro) + "</p>" + o.groups.map(function (g) {
        return "<section><h2>" + pt(g.name) + "</h2>" + (g.note ? "<p>" + pt(g.note) + "</p>" : "") + '<div class="grid">' + g.photos.map(function (x) { var src = imgs[x.photo_id]; return "<figure>" + (src ? '<img src="' + src + '" alt="' + esc(x.note) + '">' : '<div class="ph">照片 ' + esc(x.photo_id) + "</div>") + "<figcaption>" + pt(x.note) + "</figcaption></figure>"; }).join("") + "</div></section>";
      }).join("");
      return pageHtml(o.title, "摄影作品", b2, ".grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px}figure{margin:0}img{width:100%;border-radius:8px;border:1px solid #e6dfd2}.ph{height:120px;background:#eee;border-radius:8px;display:flex;align-items:center;justify-content:center;color:#999}figcaption{font-size:.85rem;color:#6b6560}");
    }
    if (p.cat === "exp") {
      var unk = forDownload ? [] : (p.warn || []);
      var t = function (s) { var e = pt(s); return unk.length ? e.replace(/\d[\d,]*(?:\.\d+)?/g, function (n) { return unk.indexOf(normNum(n)) >= 0 ? "<mark>" + n + "</mark>" : n; }) : e; };
      var pub = p.pub ? "<section><h2>可以核对的公开信息</h2><p>" + esc([p.pub.title, p.pub.date, p.pub.place, p.pub.organizer].filter(Boolean).join(" · ")) + (safeUrl(p.pub.source_url) ? ' · <a href="' + esc(safeUrl(p.pub.source_url)) + '">来源</a>' : "") + "</p></section>" : "";
      var b3 = "<h1>" + t(o.title) + '</h1><p class="lead">' + t(o.one_line) + "</p><section><h2>背景</h2><p>" + t(o.background) + "</p></section><section><h2>我负责的部分</h2><p>" + t(o.my_role) + "</p></section>" +
        "<section><h2>我具体做了什么</h2>" + ul(o.what_i_did, t) + "</section><section><h2>结果</h2>" + ul(o.results, t) + "</section>" + pub +
        (o.transfer && o.transfer.length ? "<section><h2>和想去的方向有关的经验（可迁移）</h2>" + ul(o.transfer, t) + "</section>" : "") +
        "<section><h2>一句话</h2><p>" + t(o.evidence_sentence) + '</p></section><section class="hypo"><h2>如果再做一次（设想，不是已经发生的事）</h2>' + ul(o.if_again, t) + "</section>";
      return pageHtml(o.title, "经历复盘 · 过去真实发生过的事", b3);
    }
    var b4 = "<h1>" + pt(o.title) + '</h1><p class="lead">' + pt(o.summary) + "</p>" + o.sections.map(function (s) { return "<section><h2>" + pt(s.heading) + "</h2>" + ul(s.points) + "</section>"; }).join("") + (o.pending.length && !forDownload ? "<h2>还要补的</h2>" + ul(o.pending) : "");
    return pageHtml(o.title, CATS.generic.name.replace("（通用方式）", ""), b4);
  }
  function fileName(p) { var n = String((p.out && (p.out.title || p.out.headline)) || p.title || "作品").replace(/[\\\/:*?"<>|\s「」]+/g, "_").slice(0, 30); return (p.out && p.out.html !== undefined ? "index" : CATS[p.cat].name.replace(/（.*/, "") + "_" + n) + ".html"; }

  /* ========== 检查方式（类目自己定） ========== */
  function normNum(s) { return String(s).replace(/(\d),(?=\d{3}\b)/g, function (m, d) { return d; }); }
  function numsIn(s) { return normNum(s).match(/\d+(?:\.\d+)?/g) || []; }
  function unknownNums(texts, facts) { var known = numsIn(JSON.stringify(facts)), out = []; texts.forEach(function (t) { numsIn(t).forEach(function (n) { if (known.indexOf(n) < 0 && out.indexOf(n) < 0) out.push(n); }); }); return out; }
  var BRAG = /精通|显著提升|大幅提升|全面负责|全权负责|领导了|带领团队|行业领先|极大地/;
  function selfCheckTool(h) {
    return [["一个完整的文件（从开头到结尾都在）", /<html[\s>]/i.test(h) && /<\/html>/i.test(h)], ["不引用外部文件", !/(src|href)\s*=\s*["']?\s*(https?:)?\/\//i.test(h)],
      ["数据存在这台设备上", /localStorage/.test(h)], ["不用填 API 密钥", !/api[_-]?key|\bsk-[A-Za-z0-9]{8,}/i.test(h)], ["界面是中文", /[\u4e00-\u9fa5]/.test(h)]];
  }
  function toolNet(h) { var hit = (String(h).match(/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon|(src|href)\s*=\s*["']?\s*(https?:)?\/\//gi) || []); return hit.length ? "这个小网页会联网：检查到「" + hit.slice(0, 3).join("、") + "」。打开它时，它会自己连外部地址。" : "这个小网页本身不联网：没有检查到联网代码，数据只存在打开它的那个浏览器里。"; }
  function textsOf(o) { var a = []; (function walk(x) { if (typeof x === "string") a.push(x); else if (Array.isArray(x)) x.forEach(walk); else if (x && typeof x === "object") for (var k in x) if (k !== "photo_id") walk(x[k]); })(o); return a; }
  function novelChars(p) { return textsOf(p.out.sections.map(function (s) { return s.text || ""; })).join("").replace(/\s/g, "").length; }
  function autoChecks(p) {
    var o = p.out, L = [];
    if (!o) return L;
    if (p.cat === "novel") {
      var names = (answeredText(p, "n_chars") ? p.a.n_chars.v : "").split(/[，,、。；;\s：:]+/).filter(function (x) { return /^[\u4e00-\u9fa5]{2,3}$/.test(x) && !/岁|外卖|老师|学生|女孩|男孩|一个|喜欢|话不|心软|性格/.test(x); }).slice(0, 3);
      var all = o.sections.map(function (s) { return s.text || ""; }).join("");
      if (names.length) L.push(["人物名字和你的设定一致（" + names.join("、") + "）", names.every(function (n) { return all.indexOf(n) >= 0; })]);
      var n = novelChars(p), wrote = o.sections.filter(function (s) { return s.text; }).length;
      if (novelMode(p) === "outline") L.push(["结构里已经展开了 " + wrote + " 段，还有 " + (o.sections.length - wrote) + " 段没展开", wrote === o.sections.length, wrote < o.sections.length ? "可以在下面「继续展开下一段」" : ""]);
      else { var tgt = idx(p, "n_len") === 1 ? [2000, 4500] : [300, 900]; L.push(["篇幅：现在约 " + n + " 字", n >= tgt[0] && n <= tgt[1], "你选的是「" + vText(p, "n_len").split("（")[0] + "」"]); }
    } else if (p.cat === "essay") {
      var ef = inputsOf(p), eu = unknownNums(textsOf(o.sections), ef); p.warn = eu;
      L.push(["没有出现你没给过的数字", !eu.length, eu.length ? "请核对：" + eu.join("、") + "。是编的就选「写进了我没说过的事」改掉" : ""]);
      var en = textsOf(o.sections.map(function (s) { return s.text; })).join("").replace(/\s/g, "").length;
      L.push(["篇幅：现在约 " + en + " 字", en >= 200, "你选的是「" + vText(p, "e_len") + "」"]);
      if (o.pending && o.pending.length) L.push(["还可以补的真实细节列在预览最后（" + o.pending.length + " 条），没被编成事实", true]);
    } else if (p.cat === "resume" || p.cat === "exp" || (p.cat === "generic" && idx(p, "g_kind") !== 1 && o.html === undefined)) {
      var facts = p.cat === "exp" ? caseFacts(p) : inputsOf(p), unk = unknownNums(textsOf(o), facts); p.warn = unk;
      L.push(["没有出现你没给过的数字", !unk.length, unk.length ? "请核对：" + unk.join("、") + "（预览里标黄了）" : ""]);
      var brag = textsOf(o).join(" ").match(BRAG);
      L.push(["没有夸大的说法", !brag, brag ? "出现了「" + brag[0] + "」，可以在下面选「语气太夸张了」改掉" : ""]);
      var pend = pendingList(p);
      if (pend.length) L.push(["待补的地方原样标着「待补」，没有被编成事实：" + pend.join("、"), true]);
      var fab = newDirFabricated(p);
      if (fab) L.push(["没有把想去的新方向写成已经做过的工作", !fab.length, fab.length ? "「" + fab.join("、") + "」出现在你过去的经历里，但你的材料里没写过。没做过的，请选「有内容写错了」改掉" : ""]);
    } else if (p.cat === "photo") {
      var ids = (p.photos || []).map(function (x) { return x.id; }), used = [];
      o.groups.forEach(function (g) { g.photos.forEach(function (x) { used.push(x.photo_id); }); });
      var lost = ids.filter(function (id) { return used.indexOf(id) < 0; });
      L.push(["每张照片都排进去了，没有重复", !lost.length && used.length === ids.length, lost.length ? "没排进去：" + lost.join("、") : ""]);
      var nocap = (p.photos || []).filter(function (x) { return !x.cap; }).length;
      L.push([nocap ? "有 " + nocap + " 张照片还没写说明，页面标成「待补」" : "每张照片都有你写的说明", !nocap]);
    }
    if (o.html !== undefined) { selfCheckTool(o.html).forEach(function (c) { L.push(c); }); L.push([toolNet(o.html), !/会联网/.test(toolNet(o.html))]); }
    return L;
  }
  /* #20 验收：改写路径不出现编造的新领域经历。新方向里的词出现在「过去」部分、却不在用户自己的材料里 → 标出来 */
  function newDirFabricated(p) {
    var fid = p.cat === "resume" ? "r_target" : p.cat === "exp" ? "x_dir" : ""; if (!fid || !answeredText(p, fid) || !p.out) return null;
    var words = p.a[fid].v.split(/[\s、，,\/和与及的或]+|方向|岗位/).map(function (w) { return w.trim(); }).filter(function (w) { return w.length >= 2; });
    var own = JSON.stringify(p.a).replace(JSON.stringify(p.a[fid]), "") + " " + (p.idea || ""), o = p.out;
    var past = p.cat === "resume" ? textsOf((o.experiences || []).map(function (e) { return [e.org, e.role, e.bullets]; })).join(" ") : textsOf([o.my_role, o.what_i_did, o.results, o.background]).join(" ");
    return words.filter(function (w) { return past.toLowerCase().indexOf(w.toLowerCase()) >= 0 && own.toLowerCase().indexOf(w.toLowerCase()) < 0; });
  }
  /* 第 83、88 条：经历数据三级只作页面内部逻辑，页面不显示级别 */
  function tierOf(p) {
    var hasNum = answeredText(p, "x_data") && /\d/.test(p.a.x_data.v), src = idx(p, "x_src"), cmp = idx(p, "x_cmp");
    if (hasNum && src >= 0 && src !== 3) return (cmp === 0 || cmp === 1 || src === 2) ? "D3" : "D2";
    return "D1";
  }
  function tierHints(p) {
    var t = tierOf(p);
    if (t === "D3") return ["有数字、写明了来源，还有对比或旁证——这段经历已经很扎实了。"];
    if (t === "D2") return ["加一个对比（比上一次、比目标、比同类）或旁证（媒体报道、主办方或客户评价、获奖），会更有说服力。"];
    var hasNum = answeredText(p, "x_data") && /\d/.test(p.a.x_data.v), src = idx(p, "x_src");
    return [hasNum && src === 3 ? "自己估算的数字先不算数；换成主办方统计、平台后台或公开报道里的数，并写明从哪来，会更有说服力。" : hasNum ? "给这个数字写明从哪来（主办方统计、平台后台、公开报道），会更有说服力。" : "补一个结果数字（到场人数、曝光或阅读、互动、报名或转化），并写明从哪来，会更有说服力。"];
  }
  function safeUrl(u) { u = String(u || "").trim(); return /^https?:\/\/[^\s"'<>]+$/i.test(u) ? u : ""; }
  function imgsOf(p) { try { return JSON.parse(localStorage.getItem(LS_FILES + p.id) || "{}"); } catch (e) { return {}; } }
  function setImgs(p, m) { try { localStorage.setItem(LS_FILES + p.id, JSON.stringify(m)); return true; } catch (e) { toast("图片太大，这个浏览器存不下了"); return false; } }

  /* ========== 测试用模拟 AI（?ai=mock 才启用） ========== */
  function mockTool(title, note) {
    return "<!DOCTYPE html>\n<html lang=\"zh-CN\">\n<head>\n<meta charset=\"UTF-8\">\n<title>" + esc(title) + "</title>\n<style>body{font-family:system-ui,sans-serif;max-width:560px;margin:0 auto;padding:18px}input{width:100%;padding:8px}li{margin:4px 0}</style>\n</head>\n<body>\n<h1>" + esc(title) + "</h1>\n<p>" + esc(note || "记一笔，关掉再打开还在。") + "</p>\n<input id=\"v\" placeholder=\"写一句\"><button id=\"add\">记一笔</button>\n<p id=\"count\"></p><ul id=\"list\"></ul>\n<script>\nvar K='lc_tool',a=[];try{a=JSON.parse(localStorage.getItem(K)||'[]')}catch(e){}\nfunction d(){document.getElementById('list').innerHTML=a.map(function(x){return '<li>'+x.replace(/</g,'&lt;')+'</li>'}).join('');document.getElementById('count').textContent='一共 '+a.length+' 条';}\ndocument.getElementById('add').onclick=function(){var v=document.getElementById('v').value.trim();if(!v)return;a.unshift(v);localStorage.setItem(K,JSON.stringify(a));d();};d();\n<\/script>\n</body>\n</html>\n";
  }
  function setVal(inp, re) { var k; for (k in inp) if (re.test(k)) return inp[k]; return PEND; }
  var MOCK = {
    novel_outline: function (inp) { var s = inp.settings, who = String(setVal(s, /人物/)).split(/[，,]/)[0]; return { title: "雨夜的最后一单", logline: (who === PEND ? "一个人" : who) + "在雨夜遇见一只会说话的猫。", sections: [{ heading: "起：雨夜", summary: who + "冒雨送餐。" }, { heading: "承：猫", summary: "他捡到一只会说话的猫。" }, { heading: "转：最后一单", summary: "猫请他送最后一单。" }, { heading: "合：照片", summary: "天亮时只剩一张旧照片。" }], style_note: "温暖治愈，第三人称。" }; },
    novel_draft: function (inp) { var s = inp.settings, who = String(setVal(s, /人物/)).split(/[，,]/)[0]; if (who === PEND) who = "阿亮"; var long = /短篇/.test(setVal(s, /多长/)); var base = who + "把电动车停在楼下，雨下得很大。猫在纸箱里抬起头，说：你来晚了。"; var text = long ? new Array(60).join(base) : new Array(12).join(base); return { title: "雨夜的最后一单", sections: [{ heading: "雨夜", text: text }] }; },
    novel_section: function (inp) { var who = String(setVal(inp.settings, /人物/)).split(/[，,]/)[0]; if (who === PEND) who = "阿亮"; var h = inp.outline.sections[inp.index].heading; return { heading: h, text: new Array(30).join(who + "在这一段里继续往前走，雨还没停。") }; },
    novel_revise_section: function (inp) { return { heading: inp.current.heading, text: (inp.current.text || "") + "\n（按你说的改了：" + inp.request + "）" }; },
    novel_revise: function (inp) { var c = clone(inp.current); c.sections[0].text += "\n（按你说的改了：" + inp.request + "）"; return c; },
    resume_draft: function (inp) {
      var m = inp.materials, exp = String(setVal(m, /经历/)), res = setVal(m, /成果/), sk = setVal(m, /工具|技能/);
      var bullets = exp.split(/[：:；;。\n]/).map(function (x) { return x.trim(); }).filter(Boolean).slice(1, 4); if (!bullets.length) bullets = [exp.slice(0, 60)];
      var pend = []; if (res === PEND) pend.push("成果：待补（有数据的话写上来源）"); if (sk === PEND) pend.push("技能与工具：待补");
      var period = (exp.match(/\d{4}\s*[–-]\s*\d{4}/) || [PEND])[0];
      var tgt = setVal(m, /新方向/);
      return { headline: "活动策划" + (tgt === PEND ? "" : " · 想去：" + tgt), summary: "做过线下活动的方案和执行。", experiences: [{ org: (exp.match(/在(.{2,10}?)(做|负责)/) || [0, PEND])[1], role: "活动策划", period: period, bullets: bullets.concat(res === PEND ? ["成果：待补"] : [String(res)]) }], skills: sk === PEND ? [] : String(sk).split(/[、,，]/).slice(0, 6), pending: pend, transfer: tgt === PEND ? [] : ["做快闪时写宣传笔记、看曝光数据 → 和「" + tgt + "」里的内容策划、看数据有关"] }; 
    },
    resume_revise: function (inp) { var c = clone(inp.current); c.summary = c.summary + "（按你说的改了）"; return c; },
    essay_draft: function (inp) { var m = inp.materials, ab = String(setVal(m, /写谁/)), dt = setVal(m, /细节/); var line = (dt === PEND ? ab : String(dt)) + "。"; return { title: "关于" + short(ab, 10), sections: [{ heading: "那时候", text: new Array(14).join(line) + "\n" + (setVal(m, /感受/) === PEND ? "" : String(setVal(m, /感受/))) }], pending: ["那天是哪一年的冬天？"] }; },
    essay_revise: function (inp) { var c = clone(inp.current); c.sections[0].text += "\n（按你说的改了：" + inp.request + "）"; return c; },
    photo_layout: function (inp) { var ph = setVal(inp.materials, /照片/); ph = Array.isArray(ph) ? ph : []; return { title: "今年夏天", intro: "按你给的说明排了一下。", groups: [{ name: "第一组", note: "开头", photos: ph.map(function (x) { return { photo_id: x.photo_id, note: x.caption }; }) }] }; },
    photo_revise: function (inp) { var c = clone(inp.current); c.intro += "（按你说的重新排了）"; return c; },
    build_tool: function (inp) { return { html: mockTool("我的小工具", "按你说的做：" + String(setVal(inp.materials, /什么时候|想做出/)).slice(0, 30)), summary: "做了一个能记一笔、自动数条数的小网页。", how_to_use: ["点「下载」，存成 index.html", "双击打开，记一笔", "关掉再打开，看看还在不在"], next_tweaks: ["把标题改成你自己的叫法", "多加一个「备注」", "按日期从新到旧排"] }; },
    revise_tool: function (inp) { return { html: String(inp.current_html).replace("</h1>", "</h1>\n<p>按你说的改了：" + esc(inp.request) + "</p>"), summary: "改好了：" + inp.request, how_to_use: ["重新下载，整份覆盖原来的 index.html"], next_tweaks: ["换个颜色", "加一个导出按钮", "字再大一点"] }; },
    case_page: function (inp) { var f = inp.facts, noData = f.data === PEND; return { title: f.name === PEND ? "一段经历" : f.name, one_line: "面向" + f.audience + "，我" + String(f.level).split("：")[0] + "。", background: "「" + f.name + "」面向" + f.audience + "。", my_role: f.level, what_i_did: [String(f.did)], results: [noData ? "结果数据：待补" : f.data + "（来源：" + f.data_source + "）"], evidence_sentence: "我在「" + f.name + "」中负责" + String(f.did).split("、")[0] + "。", if_again: ["提前两周开始线上预热（设想）"], missing: noData ? ["结果数据"] : [] }; },
    create_concepts: function (inp) { var g = /游戏/.test(inp.idea); return { options: g ? ["猫在空房子里，找主人留下的东西", "末班地铁上，每站只和一个人说话", "一座每天少掉一种颜色的小镇", "一家只在雨天开门的修理铺"] : ["从「" + short(inp.idea, 10) + "」里的一个人讲起", "把它放进一个陌生的地方", "让一件小东西串起全部", "定一条反常的规则"] }; },
    create_plan: function (inp) { var s = inp.settings, c = String(setVal(s, /概念/)), g = /游戏/.test(setVal(s, /想做/)); if (inp.request) { return { goal: inp.current.goal, route: inp.current.route.slice(0, 3), total: "约 4 周", help: "帮我把第一个房间的谜题想清楚" }; }
      return { goal: /猫/.test(c) ? "猫在空房子里找主人旧物的解谜小游戏，玩完有点暖" : c === PEND ? String(setVal(s, /想做/)) : c, route: [{ step: "写策划", tool: "纸笔 · 备忘录", time: "约 2 周" }, { step: "纸面小原型", tool: "纸 · 便签", time: "约 1 周" }, { step: "做可玩版", tool: "Godot", time: "约 3 周" }, { step: "找人试玩", tool: "3 位朋友", time: "约 1 周" }], total: "约 7 周", help: "帮我把第一个房间的谜题想清楚" }; },
    create_step: function (inp) { var r = { title: "空房子里的猫", first_step: "在纸上画出第一个房间，藏好猫要找的第一样东西", time: "约 30 分钟", tags: ["纸和笔"] }; if (inp.request) r.first_step = "先列出房间里的三样东西，再挑一样藏起来"; if (inp.plan && inp.plan.路线 === PEND) { r.route = [{ step: "写策划", tool: "纸笔", time: "约 2 周" }, { step: "做小原型", tool: "纸 · 便签", time: "约 1 周" }, { step: "找人试试", tool: "3 位朋友", time: "约 1 周" }]; r.total = "约 4 周"; } return r; },
    generic_draft: function (inp) { var m = inp.materials; return { title: String(setVal(m, /想做出/)).slice(0, 20), summary: "先做了最小的一版。", sections: [{ heading: "第一部分", points: [String(setVal(m, /材料/))] }], pending: setVal(m, /材料/) === PEND ? ["已有材料：待补"] : [] }; },
    generic_revise: function (inp) { var c = clone(inp.current); c.summary += "（按你说的改了）"; return c; },
    event_search: function (inp) { return { candidates: [{ label: "A", title: inp.query + "（模拟结果 A）", date: "2024 年 5 月", place: "上海", organizer: "模拟主办方甲", source_url: "https://example.com/a", note: "测试用" }, { label: "B", title: inp.query + "（模拟结果 B）", date: "2023 年秋", place: "北京", organizer: "模拟主办方乙", source_url: "https://example.com/b", note: "测试用" }], honest_note: "这是测试用模拟结果，不是真的搜索。" }; },
    ask: function (inp) { return { answer: "（模拟回答）你问的是：「" + inp.question + "」。在「" + inp.where.stage + "」这一步，" + (inp.where.todo || "") + "。", back_to_step: "回到「" + inp.where.stage + "」，" + (inp.where.todo || "接着做") + "。" }; }
  };
