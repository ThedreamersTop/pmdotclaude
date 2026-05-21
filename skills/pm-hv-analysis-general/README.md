# pm-hv-analysis-general

横纵分析法（Horizontal-Vertical Analysis）**通用版**深度研究 Skill — 个人 fork of [KKKKhazix/khazix-skills/hv-analysis](https://github.com/KKKKhazix/khazix-skills/tree/main/hv-analysis)（由数字生命卡兹克 / Khazix 提出原方法论）。

适用于研究**任意复杂研究对象**：产品、公司、概念、方法、学派、技术、算法、开源项目、人物、历史事件、文化现象、科学话题。原版 `hv-analysis` 保留作为商业 DD 专用，本 fork 扩展到通用研究 + 新增个人快速 ramp up 用的简版模式。

---

## 这个 skill 在干什么

执行一次**双轴分析**：

- **纵轴（diachronic）**：研究对象从诞生到当下的完整生命历程，叙事化，不是年表流水账。
- **横轴（synchronic）**：当下时间截面上，与"对照系"做系统性对比。**对照系**按对象类型变义：产品=竞品；概念/方法=同代对话者与论敌；技术=同期路线；事件=平行事件；以此类推。
- **横纵交汇**：把纵向脉络和横向格局结合起来，给出综合判断 + 三个未来剧本。

方法论溯源：融合索绪尔的历时-共时分析（Saussure）、社会科学的纵向-横截面研究设计、商学院案例研究法、竞争战略分析。

---

## 与原版 hv-analysis 的差异

原版偏商业 DD（产品/公司/概念/人物 四类）；本 fork 在原作基础上加了几样东西：

| 维度 | 原版 hv-analysis | pm-hv-analysis-general |
|---|---|---|
| 对象类型 | 4 类（产品/公司/概念/人物） | **8 类**（+ 方法/学派、技术/算法/开源项目、历史事件、文化现象、科学话题） |
| 横轴框架 | 单 bucket "竞品" | **四象限**：前辈 / 同辈 / 异邦 / 后辈 |
| 词汇适配 | 业务化词汇硬套（"用户口碑""市场份额"） | 按对象类型自动替换（用户口碑→学术接受/社群反馈/同行评价/患者社区...） |
| 信息来源 | 一份业务化清单（G2/Reddit/...） | 按对象类型分支：学术 → SEP/Routledge/NDPR；技术 → paper/RFC/repo issues；医学 → PubMed/Cochrane；... |
| 必做问题 | 无 | **问题域确认（技术对象）+ 路线之争比分（横纵交汇必答）** |
| 产出模式 | 仅深度模式（10-30K 字 + PDF） | 深度模式 + **简版模式**（2-4K 字 markdown，10-15 分钟 ramp up 用） |
| CJK 字体 | 用 "Droid Sans Fallback"（Linux 默认没有） | 跨平台字体回退链：Noto CJK SC → PingFang SC → Microsoft YaHei → fallback |

**何时用本 fork vs. 原版**：
- 研究**产品/公司**的商业 DD：可以用原版（更紧凑），也可以用本 fork。
- 研究**概念/技术/算法/人物/事件/现象/科学话题**：用本 fork（原版会因为词汇错配跑偏）。
- 想**快速 ramp up 一个陌生领域而非交付正式报告**：用本 fork 的简版模式。

---

## 安装

### 1. 文件本体

把 `pm-hv-analysis-general` 目录放到 Claude Code 能识别的 skill 路径（项目级 `.claude/skills/` 或全局 `~/.claude/skills/`）。

### 2. Python 依赖（生成 PDF 用）

```bash
pip install weasyprint markdown --break-system-packages
```

### 3. CJK 字体（Linux / devcontainer 必装）

WeasyPrint 渲染中文需要系统装有 CJK 字体，否则中文会显示为豆腐字（□）：

```bash
sudo apt-get install -y fonts-noto-cjk
```

macOS（已有 PingFang SC）和 Windows（已有 Microsoft YaHei）通常无需额外安装。脚本的 CSS 已经做了跨平台字体回退链，确保字体存在就能跑。

---

## 使用

### 触发词（用户侧）

用户说出任意以下之一，Claude 都应该选择本 skill：

- 横纵分析、研究一下、帮我分析、深度研究、做个研究、调研一下、竞品分析
- 帮我了解 XX、XX 是什么来头、想搞懂 XX 的脉络
- 帮我 ramp up XX、帮我快速了解 XX 这个领域
- XX 流派/范式/学派是怎么演变的

### 模式选择

- **深度模式（默认）**：10,000-30,000 字完整报告 + 排版精美的 PDF。30-45 分钟。
- **简版模式**：2,000-4,000 字 markdown，不生成 PDF。10-15 分钟。

用户明确说"简版/快速/速读版/我只想快速搞懂"等任一信号时进入简版模式；否则默认深度模式。

### 调用示例

```
# 深度模式 — 商业对象
请用横纵分析法研究 Unipile

# 深度模式 — 技术议题
請幫我研究比特幣被量子電腦攻破的可能性

# 简版模式 — 个人 ramp up
帮我快速了解一下 CRDTs 这个技术，简版就行

# 概念研究
帮我搞懂解构主义（Derrida）的来龙去脉
```

---

## 产出

### 深度模式

- `[研究对象]_横纵分析报告.md` — markdown 源稿
- `[研究对象]_横纵分析报告.pdf` — 排版精美的 PDF（A4，封面页 + 页眉页脚 + 表格样式）

### 简版模式

- `[研究对象]_横纵速读.md` — markdown 速读稿，不生成 PDF

### 报告结构（深度模式）

```
封面页
目录
一、一句话定义 + 问题域确认（技术对象必做）
二、纵向分析：从诞生到当下（6,000-15,000 字）
三、横向分析：四象限对照系（3,000-10,000 字）
   前辈 / 同辈 / 异邦 / 后辈 + 代表性遭遇事件 + 共同前提分析
四、横纵交汇洞察（1,500-3,000 字）
   含强制比分：路线之争当前打到哪一步？必须给数字判断
五、信息来源
```

---

## 目录结构

```
pm-hv-analysis-general/
├── README.md            # 本文件
├── SKILL.md             # Claude 执行该 skill 时读取的指令文档
├── references/
│   └── schema.json      # 报告结构 schema
└── scripts/
    └── md_to_pdf.py     # WeasyPrint-based Markdown → PDF 转换器
                         #   - A4 + 封面页
                         #   - 跨平台 CJK 字体回退链
                         #   - 内置完整 CSS 排版规范
```

---

## 设计原则

1. **方法论骨架不变，词汇按对象类型替换**。"竞品 vs 用户口碑 vs 市场份额"是商业 DD 词汇；对其他对象类型自动用对应的"对照系 / 评价机制 / 影响力指标"。
2. **横轴四象限优于扁平列竞品**。即使是商业对象，"前辈/同辈/异邦/后辈"四类组织信息密度也大得多。
3. **强制具体判断**。"路线之争比分"那一栏不能骑墙——必须给数字判断（3:2 / 5:1 / 结构性落后）+ 转折性事件清单。
4. **代表性遭遇事件作为对比锚**。"X vs Y 各有优劣"是懒惰对比；找出一次具体的论战 / 倒戈 / 公开对峙作为分析杠杆。
5. **简版模式不省方法论骨架**。简版压缩的是篇幅，不是结构——纵向 + 横向 + 交汇三轴依然完整。交汇绝对不能省。

---

## 验证样本

本目录所在项目里已有几份用本 skill 生成的报告，可作样本参考：

- `Unipile_横纵分析报告.md/.pdf` — 商业对象（公司）/ 深度模式
- `比特币量子威胁_横纵分析报告_pm通用版.md/.pdf` — 技术议题 / 深度模式
- `CRDTs_横纵速读.md` — 技术对象 / 简版模式

---

## 致谢 / Attribution

- **原方法论**：数字生命卡兹克（Khazix），原版 [hv-analysis skill](https://github.com/KKKKhazix/khazix-skills/tree/main/hv-analysis)。
- **本 fork**：个人化扩展，依然遵循原作的 MIT License（见 [khazix-skills/LICENSE](https://github.com/KKKKhazix/khazix-skills/blob/main/LICENSE)）。
- **写作风格的卡兹克 voice**（节奏感、叙事驱动、敢下判断、文化升维、回环呼应）参考自数字生命卡兹克的[公众号写作](https://github.com/KKKKhazix/khazix-skills/tree/main/khazix-writer)。
